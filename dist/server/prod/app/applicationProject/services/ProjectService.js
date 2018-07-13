"use strict";
var ProjectRepository = require("../dataaccess/repository/ProjectRepository");
var BuildingRepository = require("../dataaccess/repository/BuildingRepository");
var UserService = require("./../../framework/services/UserService");
var ProjectAsset = require("../../framework/shared/projectasset");
var BuildingModel = require("../dataaccess/model/project/building/Building");
var AuthInterceptor = require("../../framework/interceptor/auth.interceptor");
var CostControllException = require("../exception/CostControllException");
var Rate = require("../dataaccess/model/project/building/Rate");
var CostHead = require("../dataaccess/model/project/building/CostHead");
var WorkItem = require("../dataaccess/model/project/building/WorkItem");
var RateAnalysisService = require("./RateAnalysisService");
var Category = require("../dataaccess/model/project/building/Category");
var alasql = require("alasql");
var BudgetCostRates = require("../dataaccess/model/project/reports/BudgetCostRates");
var ThumbRuleRate = require("../dataaccess/model/project/reports/ThumbRuleRate");
var Constants = require("../../applicationProject/shared/constants");
var CategoriesListWithRatesDTO = require("../dataaccess/dto/project/CategoriesListWithRatesDTO");
var CentralizedRate = require("../dataaccess/model/project/CentralizedRate");
var messages = require("../../applicationProject/shared/messages");
var CommonService_1 = require("../../applicationProject/shared/CommonService");
var WorkItemListWithRatesDTO = require("../dataaccess/dto/project/WorkItemListWithRatesDTO");
var path = require("path");
var multiparty = require("multiparty");
var AttachmentDetails_1 = require("../dataaccess/model/project/building/AttachmentDetails");
var config = require('config');
var log4js = require('log4js');
var mongoose = require("mongoose");
var SteelQuantityItems = require("../dataaccess/model/project/building/SteelQuantityItems");
var CCPromise = require('promise/lib/es6-extensions');
var logger = log4js.getLogger('Project service');
var fs = require('fs');
var ObjectId = mongoose.Types.ObjectId;
var ProjectService = (function () {
    function ProjectService() {
        this.showHideAddItemButton = true;
        this.projectRepository = new ProjectRepository();
        this.buildingRepository = new BuildingRepository();
        this.APP_NAME = ProjectAsset.APP_NAME;
        this.authInterceptor = new AuthInterceptor();
        this.userService = new UserService();
        this.commonService = new CommonService_1.CommonService();
    }
    ProjectService.prototype.createProject = function (data, user, callback) {
        var _this = this;
        if (!user._id) {
            callback(new CostControllException('UserId Not Found', null), null);
        }
        this.userService.checkForValidSubscription(user._id, function (err, resp) {
            if (err) {
                callback(err, null);
            }
            else {
                if (resp.subscription) {
                    if (resp.subscription.validity === 15 &&
                        resp.subscription.purchased.length === 1) {
                        var prefix = 'Trial Project ';
                        var projectName = prefix.concat(data.name);
                        data.name = projectName;
                    }
                    _this.projectRepository.create(data, function (err, res) {
                        if (err) {
                            callback(err, null);
                        }
                        else {
                            logger.info('Project service, create has been hit');
                            logger.debug('Project ID : ' + res._id);
                            logger.debug('Project Name : ' + res.name);
                            var projectId_1 = res._id;
                            _this.userService.findById(user._id, function (err, resp) {
                                logger.info('Project service, findOneAndUpdate has been hit');
                                if (err) {
                                    callback(err, null);
                                }
                                else {
                                    var subscriptionPackageList = resp.subscription;
                                    for (var _i = 0, subscriptionPackageList_1 = subscriptionPackageList; _i < subscriptionPackageList_1.length; _i++) {
                                        var subscription = subscriptionPackageList_1[_i];
                                        if (subscription.projectId.length === 0) {
                                            subscription.projectId.push(projectId_1);
                                        }
                                    }
                                    var newData = {
                                        $push: { project: projectId_1 },
                                        $set: { subscription: subscriptionPackageList }
                                    };
                                    var query = { _id: user._id };
                                    _this.userService.findOneAndUpdate(query, newData, { new: true }, function (err, resp) {
                                        logger.info('Project service, findOneAndUpdate has been hit');
                                        if (err) {
                                            callback(err, null);
                                        }
                                        else {
                                            delete res.category;
                                            delete res.rate;
                                            callback(null, res);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        });
    };
    ProjectService.prototype.getProjectById = function (projectId, user, callback) {
        var _this = this;
        var query = { _id: projectId };
        var populate = { path: 'building', select: ['name', 'totalSlabArea',] };
        this.projectRepository.findAndPopulate(query, populate, function (error, result) {
            logger.info('Project service, findAndPopulate has been hit');
            logger.debug('Project Name : ' + result[0].name);
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: result, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.getProjectAndBuildingDetails = function (projectId, callback) {
        logger.info('Project service, getProjectAndBuildingDetails for sync with rateAnalysis has been hit');
        var query = { _id: projectId };
        var populate = { path: 'buildings' };
        this.projectRepository.findAndPopulate(query, populate, function (error, result) {
            logger.info('Project service, findAndPopulate has been hit');
            if (error) {
                logger.error('Project service, getProjectAndBuildingDetails findAndPopulate failed ' + JSON.stringify(error));
                callback(error, null);
            }
            else {
                logger.debug('getProjectAndBuildingDetails success.');
                callback(null, { data: result });
            }
        });
    };
    ProjectService.prototype.updateProjectById = function (projectDetails, user, callback) {
        var _this = this;
        logger.info('Project service, updateProjectDetails has been hit');
        var query = { _id: projectDetails._id };
        var buildingId = '';
        this.getProjectAndBuildingDetails(projectDetails._id, function (error, projectAndBuildingDetails) {
            if (error) {
                logger.error('Project service, getProjectAndBuildingDetails failed');
                callback(error, null);
            }
            else {
                logger.info('Project service, syncProjectWithRateAnalysisData.');
                var projectData = projectAndBuildingDetails.data[0];
                var buildings = projectAndBuildingDetails.data[0].buildings;
                var buildingData = void 0;
                delete projectDetails._id;
                projectDetails.projectCostHeads = projectData.projectCostHeads;
                projectDetails.buildings = projectData.buildings;
                projectDetails.projectCostHeads = _this.calculateBudgetCostForCommonAmmenities(projectData.projectCostHeads, projectDetails);
                _this.projectRepository.findOneAndUpdate(query, projectDetails, { new: true }, function (error, result) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, { data: result, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.updateProjectStatus = function (projectId, user, activeStatus, callback) {
        var _this = this;
        var query = { '_id': projectId };
        var status = JSON.parse(activeStatus);
        var newData = { $set: { 'activeStatus': activeStatus } };
        this.projectRepository.findOneAndUpdate(query, newData, { new: true }, function (err, response) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (err) {
                callback(err, null);
            }
            else {
                callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateProjectNameById = function (projectId, name, user, callback) {
        var _this = this;
        var query = { '_id': projectId };
        var newData = { $set: { 'name': name } };
        this.projectRepository.findOneAndUpdate(query, newData, { new: true }, function (err, response) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (err) {
                callback(err, null);
            }
            else {
                callback(null, { data: response.name, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.createBuilding = function (projectId, buildingDetails, user, callback) {
        var _this = this;
        logger.info('Report Service, getMaterialFilters has been hit');
        var query = { _id: projectId };
        var populate = { path: 'buildings', select: ['name'] };
        this.projectRepository.findAndPopulate(query, populate, function (error, result) {
            logger.info('Report Service, findAndPopulate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var buildingName_1 = buildingDetails.name;
                var building = result[0].buildings.filter(function (building) {
                    return building.name === buildingName_1;
                });
                if (building.length === 0) {
                    _this.buildingRepository.create(buildingDetails, function (error, result) {
                        logger.info('Project service, create has been hit');
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            var query_1 = { _id: projectId };
                            var newData = { $push: { buildings: result._id } };
                            _this.projectRepository.findOneAndUpdate(query_1, newData, { new: true }, function (error, status) {
                                logger.info('Project service, findOneAndUpdate has been hit');
                                if (error) {
                                    callback(error, null);
                                }
                                else {
                                    callback(null, { data: result, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                                }
                            });
                        }
                    });
                }
                else {
                    var error_1 = new Error();
                    error_1.message = messages.MSG_ERROR_BUILDING_NAME_ALREADY_EXIST;
                    callback(error_1, null);
                }
            }
        });
    };
    ProjectService.prototype.updateBuildingById = function (projectId, buildingId, buildingDetails, user, callback) {
        var _this = this;
        logger.info('Project service, updateBuilding has been hit');
        var query = { _id: buildingId };
        var projection = { 'costHeads': 1 };
        this.buildingRepository.findByIdWithProjection(buildingId, projection, function (error, result) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                _this.getProjectAndBuildingDetails(projectId, function (error, projectAndBuildingDetails) {
                    if (error) {
                        logger.error('Project service, getProjectAndBuildingDetails failed');
                        callback(error, null);
                    }
                    else {
                        var projectData_1 = projectAndBuildingDetails.data[0];
                        var building = projectAndBuildingDetails.data[0].buildings.filter(function (building) {
                            return building.name === buildingDetails.name;
                        });
                        if (building.length === 0) {
                            buildingDetails.costHeads = _this.calculateBudgetCostForBuilding(result.costHeads, buildingDetails, projectData_1);
                            _this.buildingRepository.findOneAndUpdate(query, buildingDetails, { new: true }, function (error, result) {
                                logger.info('Project service, findOneAndUpdate has been hit');
                                if (error) {
                                    callback(error, null);
                                }
                                else {
                                    logger.info('Project service, syncProjectWithRateAnalysisData.');
                                    var projectCostHeads = _this.calculateBudgetCostForCommonAmmenities(projectData_1.projectCostHeads, projectData_1);
                                    var queryForProject = { '_id': projectId };
                                    var updateProjectCostHead = { $set: { 'projectCostHeads': projectCostHeads } };
                                    logger.info('Calling update project Costheads has been hit');
                                    _this.projectRepository.findOneAndUpdate(queryForProject, updateProjectCostHead, { new: true }, function (error, response) {
                                        if (error) {
                                            logger.error('Error update project Costheads : ' + JSON.stringify(error));
                                            callback(error, null);
                                        }
                                        else {
                                            logger.debug('Update project Costheads success');
                                            callback(null, { data: result, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            var error_2 = new Error();
                            error_2.message = messages.MSG_ERROR_BUILDING_NAME_ALREADY_EXIST;
                            callback(error_2, null);
                        }
                    }
                });
            }
        });
    };
    ProjectService.prototype.getInActiveProjectCostHeads = function (projectId, user, callback) {
        var _this = this;
        logger.info('Project service, getInActiveCostHead has been hit');
        this.projectRepository.findById(projectId, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                logger.info('Project service, findById has been hit');
                logger.debug('getting InActive CostHead for Project Name : ' + result.name);
                var response = result.projectCostHeads;
                var inActiveCostHead = [];
                for (var _i = 0, response_1 = response; _i < response_1.length; _i++) {
                    var costHeadItem = response_1[_i];
                    if (!costHeadItem.active) {
                        inActiveCostHead.push(costHeadItem);
                    }
                }
                callback(null, { data: inActiveCostHead, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.setProjectCostHeadStatus = function (projectId, costHeadId, costHeadActiveStatus, user, callback) {
        var _this = this;
        var query = { '_id': projectId, 'projectCostHeads.rateAnalysisId': costHeadId };
        var activeStatus = JSON.parse(costHeadActiveStatus);
        var newData = { $set: { 'projectCostHeads.$.active': activeStatus } };
        this.projectRepository.findOneAndUpdate(query, newData, { new: true }, function (err, response) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (err) {
                callback(err, null);
            }
            else {
                callback(null, { data: response, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.cloneBuildingDetails = function (projectId, buildingId, oldBuildingDetails, user, callback) {
        var _this = this;
        logger.info('Project service, cloneBuildingDetails has been hit');
        var query = { _id: projectId };
        var populate = { path: 'buildings', select: ['name'] };
        this.projectRepository.findAndPopulate(query, populate, function (error, result) {
            logger.info('Report Service, findAndPopulate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var buildingName_2 = oldBuildingDetails.name;
                var building = result[0].buildings.filter(function (building) {
                    return building.name === buildingName_2;
                });
                if (building.length === 0) {
                    _this.buildingRepository.findById(buildingId, function (error, building) {
                        logger.info('Project service, findById has been hit');
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            var costHeads_1 = building.costHeads;
                            var rateAnalysisData = void 0;
                            if (oldBuildingDetails.cloneItems && oldBuildingDetails.cloneItems.indexOf(Constants.RATE_ANALYSIS_CLONE) === -1) {
                                var rateAnalysisService_1 = new RateAnalysisService();
                                var costControlRegion = config.get('costControlRegionCode');
                                var query_2 = [
                                    {
                                        $match: { 'region': costControlRegion }
                                    }, {
                                        $project: { 'buildingCostHeads.categories.workItems': 1 }
                                    },
                                    { $unwind: '$buildingCostHeads' },
                                    { $unwind: '$buildingCostHeads.categories' },
                                    { $unwind: '$buildingCostHeads.categories.workItems' },
                                    {
                                        $project: { _id: 0, workItem: '$buildingCostHeads.categories.workItems' }
                                    }
                                ];
                                rateAnalysisService_1.getAggregateData(query_2, function (error, workItemAggregateData) {
                                    if (error) {
                                        callback(error, null);
                                    }
                                    else {
                                        var regionName = config.get('costControlRegionCode');
                                        var aggregateQuery = { 'region': regionName };
                                        rateAnalysisService_1.getCostControlRateAnalysis(aggregateQuery, { 'buildingRates': 1 }, function (err, data) {
                                            if (err) {
                                                callback(error, null);
                                            }
                                            else {
                                                _this.getRatesAndCostHeads(projectId, oldBuildingDetails, building, costHeads_1, workItemAggregateData, user, data.buildingRates, callback);
                                            }
                                        });
                                    }
                                });
                            }
                            else {
                                _this.getRatesAndCostHeads(projectId, oldBuildingDetails, building, costHeads_1, null, user, null, callback);
                            }
                        }
                    });
                }
                else {
                    var error_3 = new Error();
                    error_3.message = messages.MSG_ERROR_BUILDING_NAME_ALREADY_EXIST;
                    callback(error_3, null);
                }
            }
        });
    };
    ProjectService.prototype.getRatesAndCostHeads = function (projectId, oldBuildingDetails, building, costHeads, workItemAggregateData, user, centralizedRates, callback) {
        var _this = this;
        this.getProjectAndBuildingDetails(projectId, function (error, projectAndBuildingDetails) {
            if (error) {
                logger.error('Project service, getRatesAndCostHeads failed');
                callback(error, null);
            }
            else {
                var projectData = projectAndBuildingDetails.data[0];
                oldBuildingDetails.costHeads = _this.calculateBudgetCostForBuilding(building.costHeads, oldBuildingDetails, projectData);
                _this.cloneCostHeads(costHeads, oldBuildingDetails, workItemAggregateData);
                if (oldBuildingDetails.cloneItems.indexOf(Constants.RATE_ANALYSIS_CLONE) === -1) {
                    oldBuildingDetails.rates = centralizedRates;
                }
                else {
                    oldBuildingDetails.rates = building.rates;
                }
                _this.createBuilding(projectId, oldBuildingDetails, user, function (error, res) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, res);
                    }
                });
            }
        });
    };
    ProjectService.prototype.cloneCostHeads = function (costHeads, oldBuildingDetails, rateAnalysisData) {
        var isClone = (oldBuildingDetails.cloneItems && oldBuildingDetails.cloneItems.indexOf(Constants.COST_HEAD_CLONE) !== -1);
        for (var costHeadIndex in costHeads) {
            if (parseInt(costHeadIndex) < costHeads.length) {
                var costHead = costHeads[costHeadIndex];
                if (!isClone) {
                    costHead.active = false;
                }
                costHeads[costHeadIndex] = this.cloneCategory(costHead.categories, oldBuildingDetails.cloneItems, rateAnalysisData);
            }
        }
        return costHeads;
    };
    ProjectService.prototype.cloneCategory = function (categories, cloneItems, rateAnalysisData) {
        for (var categoryIndex in categories) {
            var category = categories[categoryIndex];
            categories[categoryIndex].workItems = this.cloneWorkItems(category.workItems, cloneItems, rateAnalysisData);
        }
        return categories;
    };
    ProjectService.prototype.cloneWorkItems = function (workItems, cloneItems, rateAnalysisData) {
        var isClone = (cloneItems && cloneItems.indexOf(Constants.WORK_ITEM_CLONE) !== -1);
        for (var workItemIndex in workItems) {
            var workItem = workItems[workItemIndex];
            if (!isClone) {
                workItem.active = false;
            }
            this.cloneRate(workItem, cloneItems, rateAnalysisData);
            this.cloneQuantity(workItem, cloneItems);
        }
        return workItems;
    };
    ProjectService.prototype.cloneRate = function (workItem, cloneItems, rateAnalysisData) {
        var isClone = cloneItems && cloneItems.indexOf(Constants.RATE_ANALYSIS_CLONE) !== -1;
        var rateAnalysisService = new RateAnalysisService();
        var configWorkItems = new Array();
        if (!isClone) {
            workItem = this.clonedWorkitemWithRateAnalysis(workItem, rateAnalysisData);
        }
    };
    ProjectService.prototype.cloneQuantity = function (workItem, cloneItems) {
        var isClone = (cloneItems && cloneItems.indexOf(Constants.QUANTITY_CLONE) !== -1);
        if (!isClone) {
            workItem.quantity.quantityItemDetails = [];
            workItem.quantity.isDirectQuantity = false;
            workItem.quantity.isEstimated = false;
            workItem.quantity.total = 0;
        }
        return workItem;
    };
    ProjectService.prototype.getBuildingById = function (projectId, buildingId, user, callback) {
        var _this = this;
        logger.info('Project service, getBuilding has been hit');
        this.buildingRepository.findById(buildingId, function (error, result) {
            logger.info('Project service, findById has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: result, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.getBuildingRateItemsByOriginalName = function (projectId, buildingId, originalRateItemName, user, callback) {
        var _this = this;
        var projection = { 'rates': 1, _id: 0 };
        this.buildingRepository.findByIdWithProjection(buildingId, projection, function (error, building) {
            logger.info('Project Service, getBuildingRateItemsByOriginalName has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var buildingRateItemsArray = building.rates;
                var centralizedRateItemsArray = _this.getRateItemsArray(buildingRateItemsArray, originalRateItemName);
                callback(null, { data: centralizedRateItemsArray, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.getRateItemsArray = function (originalRateItemsArray, originalRateItemName) {
        var centralizedRateItemsArray;
        centralizedRateItemsArray = alasql('SELECT * FROM ? where TRIM(originalItemName) = ?', [originalRateItemsArray, originalRateItemName]);
        return centralizedRateItemsArray;
    };
    ProjectService.prototype.getProjectRateItemsByOriginalName = function (projectId, originalRateItemName, user, callback) {
        var _this = this;
        var projection = { 'rates': 1, _id: 0 };
        this.projectRepository.findByIdWithProjection(projectId, projection, function (error, project) {
            logger.info('Project Service, getProjectRateItemsByOriginalName has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var projectRateItemsArray = project.rates;
                var centralizedRateItemsArray = _this.getRateItemsArray(projectRateItemsArray, originalRateItemName);
                callback(null, { data: centralizedRateItemsArray, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.getInActiveCostHead = function (projectId, buildingId, user, callback) {
        var _this = this;
        logger.info('Project service, getInActiveCostHead has been hit');
        this.buildingRepository.findById(buildingId, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                logger.info('Project service, findById has been hit');
                logger.debug('getting InActive CostHead for Building Name : ' + result.name);
                var response = result.costHeads;
                var inActiveCostHead = [];
                for (var _i = 0, response_2 = response; _i < response_2.length; _i++) {
                    var costHeadItem = response_2[_i];
                    if (!costHeadItem.active) {
                        inActiveCostHead.push(costHeadItem);
                    }
                }
                callback(null, { data: inActiveCostHead, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.getInActiveWorkItemsOfBuildingCostHeads = function (projectId, buildingId, costHeadId, categoryId, user, callback) {
        var _this = this;
        logger.info('Project service, add Workitem has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = building.costHeads;
                var inActiveWorkItems = new Array();
                for (var _i = 0, costHeadList_1 = costHeadList; _i < costHeadList_1.length; _i++) {
                    var costHeadData = costHeadList_1[_i];
                    if (costHeadId === costHeadData.rateAnalysisId) {
                        for (var _a = 0, _b = costHeadData.categories; _a < _b.length; _a++) {
                            var categoryData = _b[_a];
                            if (categoryId === categoryData.rateAnalysisId) {
                                for (var _c = 0, _d = categoryData.workItems; _c < _d.length; _c++) {
                                    var workItemData = _d[_c];
                                    if (!workItemData.active) {
                                        inActiveWorkItems.push(workItemData);
                                    }
                                }
                            }
                        }
                    }
                }
                var inActiveWorkItemsListWithBuildingRates = _this.getWorkItemListWithCentralizedRates(inActiveWorkItems, building.rates, false);
                callback(null, {
                    data: inActiveWorkItemsListWithBuildingRates.workItems,
                    access_token: _this.authInterceptor.issueTokenWithUid(user)
                });
            }
        });
    };
    ProjectService.prototype.getInActiveWorkItemsOfProjectCostHeads = function (projectId, costHeadId, categoryId, user, callback) {
        var _this = this;
        logger.info('Project service, Get In-Active WorkItems Of Project Cost Heads has been hit');
        this.projectRepository.findById(projectId, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = project.projectCostHeads;
                var inActiveWorkItems = new Array();
                for (var _i = 0, costHeadList_2 = costHeadList; _i < costHeadList_2.length; _i++) {
                    var costHeadData = costHeadList_2[_i];
                    if (costHeadId === costHeadData.rateAnalysisId) {
                        for (var _a = 0, _b = costHeadData.categories; _a < _b.length; _a++) {
                            var categoryData = _b[_a];
                            if (categoryId === categoryData.rateAnalysisId) {
                                for (var _c = 0, _d = categoryData.workItems; _c < _d.length; _c++) {
                                    var workItemData = _d[_c];
                                    if (!workItemData.active) {
                                        inActiveWorkItems.push(workItemData);
                                    }
                                }
                            }
                        }
                    }
                }
                var inActiveWorkItemsListWithProjectRates = _this.getWorkItemListWithCentralizedRates(inActiveWorkItems, project.rates, false);
                callback(null, {
                    data: inActiveWorkItemsListWithProjectRates.workItems,
                    access_token: _this.authInterceptor.issueTokenWithUid(user)
                });
            }
        });
    };
    ProjectService.prototype.getBuildingByIdForClone = function (projectId, buildingId, user, callback) {
        var _this = this;
        logger.info('Project service, getClonedBuilding has been hit');
        this.buildingRepository.findById(buildingId, function (error, result) {
            logger.info('Project service, findById has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var clonedBuilding = result.costHeads;
                var building = new BuildingModel();
                building.name = result.name;
                building.totalSlabArea = result.totalSlabArea;
                building.totalCarpetAreaOfUnit = result.totalCarpetAreaOfUnit;
                building.totalSaleableAreaOfUnit = result.totalSaleableAreaOfUnit;
                building.plinthArea = result.plinthArea;
                building.totalNumOfFloors = result.totalNumOfFloors;
                building.numOfParkingFloors = result.numOfParkingFloors;
                building.carpetAreaOfParking = result.carpetAreaOfParking;
                building.numOfOneBHK = result.numOfOneBHK;
                building.numOfTwoBHK = result.numOfTwoBHK;
                building.numOfThreeBHK = result.numOfThreeBHK;
                building.numOfFourBHK = result.numOfFourBHK;
                building.numOfFiveBHK = result.numOfFiveBHK;
                building.numOfLifts = result.numOfLifts;
                callback(null, { data: building, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.deleteBuildingById = function (projectId, buildingId, user, callback) {
        var _this = this;
        logger.info('Project service, deleteBuilding has been hit');
        var popBuildingId = buildingId;
        this.buildingRepository.delete(buildingId, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                var query = { _id: projectId };
                var newData = { $pull: { buildings: popBuildingId } };
                _this.projectRepository.findOneAndUpdate(query, newData, { new: true }, function (error, status) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, { data: status, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.getRate = function (projectId, buildingId, costHeadId, categoryId, workItemId, user, callback) {
        var _this = this;
        logger.info('Project service, getRate has been hit');
        var rateAnalysisServices = new RateAnalysisService();
        rateAnalysisServices.getRate(workItemId, function (error, rateData) {
            if (error) {
                callback(error, null);
            }
            else {
                var rate = new Rate();
                rate.rateItems = rateData;
                callback(null, { data: rateData, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateRateOfBuildingCostHeads = function (projectId, buildingId, costHeadId, categoryId, workItemId, rate, user, callback) {
        var _this = this;
        logger.info('Project service, updateRateOfBuildingCostHeads has been hit');
        rate.isEstimated = true;
        var query = { _id: buildingId };
        var updateQuery = { $set: { 'costHeads.$[costHead].categories.$[category].workItems.$[workItem].rate': rate
            } };
        var arrayFilter = [
            { 'costHead.rateAnalysisId': costHeadId },
            { 'category.rateAnalysisId': categoryId },
            { 'workItem.rateAnalysisId': workItemId }
        ];
        this.buildingRepository.findOneAndUpdate(query, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                if (result) {
                    console.log('building CostHeads Updated');
                    var rateItems = rate.rateItems;
                    var centralizedRates_1 = result.rates;
                    var promiseArrayForUpdateBuildingCentralizedRates = [];
                    for (var _i = 0, rateItems_1 = rateItems; _i < rateItems_1.length; _i++) {
                        var rate_1 = rateItems_1[_i];
                        var rateObjectExistSQL = 'SELECT * FROM ? AS rates WHERE rates.itemName= ?';
                        var rateExistArray = alasql(rateObjectExistSQL, [centralizedRates_1, rate_1.itemName]);
                        if (rateExistArray.length > 0) {
                            if (rateExistArray[0].rate !== rate_1.rate) {
                                var updateRatePromise = _this.updateCentralizedRateForBuilding(buildingId, rate_1.itemName, rate_1.rate);
                                promiseArrayForUpdateBuildingCentralizedRates.push(updateRatePromise);
                            }
                        }
                        else {
                            var rateItem = new CentralizedRate(rate_1.itemName, rate_1.originalItemName, rate_1.rate);
                            var addNewRateItemPromise = _this.addNewCentralizedRateForBuilding(buildingId, rateItem);
                            promiseArrayForUpdateBuildingCentralizedRates.push(addNewRateItemPromise);
                        }
                    }
                    if (promiseArrayForUpdateBuildingCentralizedRates.length !== 0) {
                        CCPromise.all(promiseArrayForUpdateBuildingCentralizedRates).then(function (data) {
                            console.log('Rates Array updated : ' + JSON.stringify(centralizedRates_1));
                            callback(null, { 'data': 'success' });
                        }).catch(function (e) {
                            logger.error(' Promise failed for convertCostHeadsFromRateAnalysisToCostControl ! :' + JSON.stringify(e.message));
                            CCPromise.reject(e.message);
                        });
                    }
                    else {
                        callback(null, { 'data': 'success' });
                    }
                }
            }
        });
    };
    ProjectService.prototype.updateDirectRateOfBuildingWorkItems = function (projectId, buildingId, costHeadId, categoryId, workItemId, directRate, user, callback) {
        var _this = this;
        logger.info('Project service, updateDirectRateOfBuildingWorkItems has been hit');
        var query = { _id: buildingId };
        var updateQuery = { $set: { 'costHeads.$[costHead].categories.$[category].workItems.$[workItem].rate.total': directRate,
                'costHeads.$[costHead].categories.$[category].workItems.$[workItem].rate.rateItems': [],
                'costHeads.$[costHead].categories.$[category].workItems.$[workItem].isDirectRate': true
            } };
        var arrayFilter = [
            { 'costHead.rateAnalysisId': costHeadId },
            { 'category.rateAnalysisId': categoryId },
            { 'workItem.rateAnalysisId': workItemId }
        ];
        this.buildingRepository.findOneAndUpdate(query, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, building) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateDirectRate = function (costHeadList, costHeadId, categoryId, workItemId, directRate) {
        var rate;
        for (var _i = 0, costHeadList_3 = costHeadList; _i < costHeadList_3.length; _i++) {
            var costHead = costHeadList_3[_i];
            if (costHeadId === costHead.rateAnalysisId) {
                var categoriesOfCostHead = costHead.categories;
                for (var _a = 0, categoriesOfCostHead_1 = categoriesOfCostHead; _a < categoriesOfCostHead_1.length; _a++) {
                    var categoryData = categoriesOfCostHead_1[_a];
                    if (categoryId === categoryData.rateAnalysisId) {
                        for (var _b = 0, _c = categoryData.workItems; _b < _c.length; _b++) {
                            var workItemData = _c[_b];
                            if (workItemId === workItemData.rateAnalysisId) {
                                rate = workItemData.rate;
                                rate.total = directRate;
                                rate.rateItems = [];
                                workItemData.isDirectRate = true;
                            }
                        }
                    }
                }
            }
        }
    };
    ProjectService.prototype.updateRateOfProjectCostHeads = function (projectId, costHeadId, categoryId, workItemId, rate, user, callback) {
        var _this = this;
        logger.info('Project service, Update rate of project cost heads has been hit');
        rate.isEstimated = true;
        var query = { _id: projectId };
        var updateQuery = { $set: { 'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].rate': rate
            } };
        var arrayFilter = [
            { 'costHead.rateAnalysisId': costHeadId },
            { 'category.rateAnalysisId': categoryId },
            { 'workItem.rateAnalysisId': workItemId }
        ];
        this.projectRepository.findOneAndUpdate(query, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                var rateItems = rate.rateItems;
                var centralizedRatesOfProjects_1 = result.rates;
                var promiseArrayForProjectCentralizedRates = [];
                for (var _i = 0, rateItems_2 = rateItems; _i < rateItems_2.length; _i++) {
                    var rate_2 = rateItems_2[_i];
                    var rateObjectExistSQL = 'SELECT * FROM ? AS rates WHERE rates.itemName= ?';
                    var rateExistArray = alasql(rateObjectExistSQL, [centralizedRatesOfProjects_1, rate_2.itemName]);
                    if (rateExistArray.length > 0) {
                        if (rateExistArray[0].rate !== rate_2.rate) {
                            var updateRateOfProjectPromise = _this.updateCentralizedRateForProject(projectId, rate_2.itemName, rate_2.rate);
                            promiseArrayForProjectCentralizedRates.push(updateRateOfProjectPromise);
                        }
                    }
                    else {
                        var rateItem = new CentralizedRate(rate_2.itemName, rate_2.originalItemName, rate_2.rate);
                        var addNewRateOfProjectPromise = _this.addNewCentralizedRateForProject(projectId, rateItem);
                        promiseArrayForProjectCentralizedRates.push(addNewRateOfProjectPromise);
                    }
                }
                if (promiseArrayForProjectCentralizedRates.length !== 0) {
                    CCPromise.all(promiseArrayForProjectCentralizedRates).then(function (data) {
                        console.log('Rates Array updated : ' + JSON.stringify(centralizedRatesOfProjects_1));
                        callback(null, { 'data': 'success' });
                    }).catch(function (e) {
                        logger.error(' Promise failed for convertCostHeadsFromRateAnalysisToCostControl ! :' + JSON.stringify(e.message));
                        var errorObj = new Error();
                        errorObj.message = e;
                        callback(errorObj, null);
                    });
                }
                else {
                    callback(null, { 'data': 'success' });
                }
            }
        });
    };
    ProjectService.prototype.updateDirectRateOfProjectWorkItems = function (projectId, costHeadId, categoryId, workItemId, directRate, user, callback) {
        var _this = this;
        logger.info('Project service, updateDirectRateOfProjectWorkItems has been hit');
        var query = { _id: projectId };
        var updateQuery = { $set: { 'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].rate.total': directRate,
                'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].rate.rateItems': [],
                'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].isDirectRate': true
            } };
        var arrayFilter = [
            { 'costHead.rateAnalysisId': costHeadId },
            { 'category.rateAnalysisId': categoryId },
            { 'workItem.rateAnalysisId': workItemId }
        ];
        this.projectRepository.findOneAndUpdate(query, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, building) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.deleteQuantityOfBuildingCostHeadsByName = function (projectId, buildingId, costHeadId, categoryId, workItemId, itemName, user, callback) {
        var _this = this;
        logger.info('Project service, deleteQuantity has been hit');
        var query = { _id: buildingId };
        var projection = { costHeads: {
                $elemMatch: { rateAnalysisId: costHeadId, categories: {
                        $elemMatch: { rateAnalysisId: categoryId, workItems: {
                                $elemMatch: { rateAnalysisId: workItemId }
                            } }
                    } }
            } };
        this.buildingRepository.retrieveWithProjection(query, projection, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var quantityItems = void 0;
                var updatedWorkItem = new WorkItem();
                for (var _i = 0, _a = building[0].costHeads; _i < _a.length; _i++) {
                    var costHead = _a[_i];
                    if (costHead.rateAnalysisId === costHeadId) {
                        for (var _b = 0, _c = costHead.categories; _b < _c.length; _b++) {
                            var category = _c[_b];
                            if (category.rateAnalysisId === categoryId) {
                                for (var _d = 0, _e = category.workItems; _d < _e.length; _d++) {
                                    var workItem = _e[_d];
                                    if (workItem.rateAnalysisId === workItemId) {
                                        quantityItems = workItem.quantity.quantityItemDetails;
                                        for (var quantityIndex = 0; quantityIndex < quantityItems.length; quantityIndex++) {
                                            if (quantityItems[quantityIndex].name === itemName) {
                                                quantityItems.splice(quantityIndex, 1);
                                            }
                                        }
                                        workItem.quantity.total = alasql('VALUE OF SELECT ROUND(SUM(total),2) FROM ?', [quantityItems]);
                                        updatedWorkItem = workItem;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
                var query_3 = { _id: buildingId };
                var updateQuery = { $set: { 'costHeads.$[costHead].categories.$[category].workItems.$[workItem]': updatedWorkItem } };
                var arrayFilter = [
                    { 'costHead.rateAnalysisId': costHeadId },
                    { 'category.rateAnalysisId': categoryId },
                    { 'workItem.rateAnalysisId': workItemId }
                ];
                _this.buildingRepository.findOneAndUpdate(query_3, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, building) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.deleteQuantityOfProjectCostHeadsByName = function (projectId, costHeadId, categoryId, workItemId, itemName, user, callback) {
        var _this = this;
        logger.info('Project service, deleteQuantity has been hit');
        var query = { _id: projectId };
        var projection = { projectCostHeads: {
                $elemMatch: { rateAnalysisId: costHeadId, categories: {
                        $elemMatch: { rateAnalysisId: categoryId, workItems: {
                                $elemMatch: { rateAnalysisId: workItemId }
                            } }
                    } }
            } };
        this.projectRepository.retrieveWithProjection(query, projection, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var quantityItems = void 0;
                var updatedWorkItem = new WorkItem();
                for (var _i = 0, _a = project[0].projectCostHeads; _i < _a.length; _i++) {
                    var costHead = _a[_i];
                    if (costHead.rateAnalysisId === costHeadId) {
                        for (var _b = 0, _c = costHead.categories; _b < _c.length; _b++) {
                            var category = _c[_b];
                            if (category.rateAnalysisId === categoryId) {
                                for (var _d = 0, _e = category.workItems; _d < _e.length; _d++) {
                                    var workItem = _e[_d];
                                    if (workItem.rateAnalysisId === workItemId) {
                                        quantityItems = workItem.quantity.quantityItemDetails;
                                        for (var quantityIndex = 0; quantityIndex < quantityItems.length; quantityIndex++) {
                                            if (quantityItems[quantityIndex].name === itemName) {
                                                quantityItems.splice(quantityIndex, 1);
                                            }
                                        }
                                        workItem.quantity.total = alasql('VALUE OF SELECT ROUND(SUM(total),2) FROM ?', [quantityItems]);
                                        updatedWorkItem = workItem;
                                        break;
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
                var query_4 = { _id: projectId };
                var updateQuery = { $set: { 'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem]': updatedWorkItem } };
                var arrayFilter = [
                    { 'costHead.rateAnalysisId': costHeadId },
                    { 'category.rateAnalysisId': categoryId },
                    { 'workItem.rateAnalysisId': workItemId }
                ];
                _this.projectRepository.findOneAndUpdate(query_4, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, project) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.deleteWorkitem = function (projectId, buildingId, costHeadId, categoryId, workItemId, user, callback) {
        var _this = this;
        logger.info('Project service, delete Workitem has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = building.costHeads;
                var categoryList = void 0;
                var WorkItemList = void 0;
                var flag = 0;
                for (var index = 0; index < costHeadList.length; index++) {
                    if (costHeadId === costHeadList[index].rateAnalysisId) {
                        categoryList = costHeadList[index].categories;
                        for (var categoryIndex = 0; categoryIndex < categoryList.length; categoryIndex++) {
                            if (categoryId === categoryList[categoryIndex].rateAnalysisId) {
                                WorkItemList = categoryList[categoryIndex].workItems;
                                for (var workitemIndex = 0; workitemIndex < WorkItemList.length; workitemIndex++) {
                                    if (workItemId === WorkItemList[workitemIndex].rateAnalysisId) {
                                        flag = 1;
                                        WorkItemList.splice(workitemIndex, 1);
                                    }
                                }
                            }
                        }
                    }
                }
                if (flag === 1) {
                    var query = { _id: buildingId };
                    _this.buildingRepository.findOneAndUpdate(query, building, { new: true }, function (error, WorkItemList) {
                        logger.info('Project service, findOneAndUpdate has been hit');
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            var message = 'WorkItem deleted.';
                            callback(null, { data: WorkItemList, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                        }
                    });
                }
                else {
                    callback(error, null);
                }
            }
        });
    };
    ProjectService.prototype.setCostHeadStatus = function (buildingId, costHeadId, costHeadActiveStatus, user, callback) {
        var _this = this;
        var query = { '_id': buildingId, 'costHeads.rateAnalysisId': costHeadId };
        var activeStatus = JSON.parse(costHeadActiveStatus);
        var newData = { $set: { 'costHeads.$.active': activeStatus } };
        this.buildingRepository.findOneAndUpdate(query, newData, { new: true }, function (err, response) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (err) {
                callback(err, null);
            }
            else {
                callback(null, { data: response, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateWorkItemStatusOfBuildingCostHeads = function (buildingId, costHeadId, categoryId, workItemId, workItemActiveStatus, user, callback) {
        var _this = this;
        logger.info('Project service, update Workitem has been hit');
        var query = { _id: buildingId };
        var updateQuery = { $set: { 'costHeads.$[costHead].categories.$[category].workItems.$[workItem].active': workItemActiveStatus } };
        var arrayFilter = [
            { 'costHead.rateAnalysisId': costHeadId },
            { 'category.rateAnalysisId': categoryId },
            { 'workItem.rateAnalysisId': workItemId }
        ];
        this.buildingRepository.findOneAndUpdate(query, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, response) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateWorkItemStatusOfProjectCostHeads = function (projectId, costHeadId, categoryId, workItemId, workItemActiveStatus, user, callback) {
        var _this = this;
        logger.info('Project service, Update WorkItem Status Of Project Cost Heads has been hit');
        var query = { _id: projectId };
        var updateQuery = { $set: { 'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].active': workItemActiveStatus } };
        var arrayFilter = [
            { 'costHead.rateAnalysisId': costHeadId },
            { 'category.rateAnalysisId': categoryId },
            { 'workItem.rateAnalysisId': workItemId }
        ];
        this.projectRepository.findOneAndUpdate(query, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, response) {
            logger.info('Project service, Update WorkItem Status Of Project Cost Heads ,findOneAndUpdate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateBudgetedCostForCostHead = function (buildingId, costHeadBudgetedAmount, user, callback) {
        var _this = this;
        logger.info('Project service, updateBudgetedCostForCostHead has been hit');
        var query = { '_id': buildingId, 'costHeads.name': costHeadBudgetedAmount.costHead };
        var newData = {
            $set: {
                'costHeads.$.budgetedCostAmount': costHeadBudgetedAmount.budgetedCostAmount,
            }
        };
        this.buildingRepository.findOneAndUpdate(query, newData, { new: true }, function (err, response) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (err) {
                callback(err, null);
            }
            else {
                callback(null, { data: response, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateBudgetedCostForProjectCostHead = function (projectId, costHeadBudgetedAmount, user, callback) {
        var _this = this;
        logger.info('Project service, updateBudgetedCostForCostHead has been hit');
        var query = { '_id': projectId, 'projectCostHeads.name': costHeadBudgetedAmount.costHead };
        var newData = {
            $set: {
                'projectCostHeads.$.budgetedCostAmount': costHeadBudgetedAmount.budgetedCostAmount,
            }
        };
        this.projectRepository.findOneAndUpdate(query, newData, { new: true }, function (err, response) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (err) {
                callback(err, null);
            }
            else {
                callback(null, { data: response, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateQuantityOfBuildingCostHeads = function (projectId, buildingId, costHeadId, categoryId, workItemId, quantityDetail, user, callback) {
        var _this = this;
        logger.info('Project service, updateQuantityOfBuildingCostHeads has been hit');
        var query = [
            { $match: { '_id': ObjectId(buildingId), 'costHeads.rateAnalysisId': costHeadId } },
            { $unwind: '$costHeads' },
            { $project: { 'costHeads': 1 } },
            { $unwind: '$costHeads.categories' },
            { $match: { 'costHeads.categories.rateAnalysisId': categoryId } },
            { $project: { 'costHeads.categories.workItems': 1 } },
            { $unwind: '$costHeads.categories.workItems' },
            { $match: { 'costHeads.categories.workItems.rateAnalysisId': workItemId } },
            { $project: { 'costHeads.categories.workItems.quantity': 1 } },
        ];
        this.buildingRepository.aggregate(query, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                if (result.length > 0) {
                    var quantity = result[0].costHeads.categories.workItems.quantity;
                    quantity.isEstimated = true;
                    if (quantity.isDirectQuantity === true) {
                        quantity.isDirectQuantity = false;
                    }
                    _this.updateQuantityItemsOfWorkItem(quantity, quantityDetail);
                    var query_5 = { _id: buildingId };
                    var updateQuery = { $set: { 'costHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity': quantity } };
                    var arrayFilter = [
                        { 'costHead.rateAnalysisId': costHeadId },
                        { 'category.rateAnalysisId': categoryId },
                        { 'workItem.rateAnalysisId': workItemId }
                    ];
                    _this.buildingRepository.findOneAndUpdate(query_5, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, building) {
                        logger.info('Project service, findOneAndUpdate has been hit');
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
                        }
                    });
                }
                else {
                    var error_4 = new Error();
                    error_4.message = messages.MSG_ERROR_EMPTY_RESPONSE;
                    callback(error_4, null);
                }
            }
        });
    };
    ProjectService.prototype.updateDirectQuantityOfBuildingWorkItems = function (projectId, buildingId, costHeadId, categoryId, workItemId, directQuantity, user, callback) {
        var _this = this;
        logger.info('Project service, updateDirectQuantityOfBuildingCostHeads has been hit');
        var projection = { costHeads: 1 };
        var query = { _id: buildingId };
        var updateQuery = { $set: { 'costHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity.isEstimated': true,
                'costHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity.isDirectQuantity': true,
                'costHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity.total': directQuantity,
                'costHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity.quantityItemDetails': [],
            } };
        var arrayFilter = [
            { 'costHead.rateAnalysisId': costHeadId },
            { 'category.rateAnalysisId': categoryId },
            { 'workItem.rateAnalysisId': workItemId }
        ];
        this.buildingRepository.findOneAndUpdate(query, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, building) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateDirectQuantityOfProjectWorkItems = function (projectId, costHeadId, categoryId, workItemId, directQuantity, user, callback) {
        var _this = this;
        logger.info('Project service, updateDirectQuantityOfProjectWorkItems has been hit');
        var query = { _id: projectId };
        var updateQuery = { $set: { 'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity.isEstimated': true,
                'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity.isDirectQuantity': true,
                'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity.total': directQuantity,
                'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity.quantityItemDetails': []
            } };
        var arrayFilter = [
            { 'costHead.rateAnalysisId': costHeadId },
            { 'category.rateAnalysisId': categoryId },
            { 'workItem.rateAnalysisId': workItemId }
        ];
        this.projectRepository.findOneAndUpdate(query, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, building) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateQuantityDetailsOfProject = function (projectId, costHeadId, categoryId, workItemId, quantityDetailsObj, user, callback) {
        var _this = this;
        var query = [
            { $match: { '_id': ObjectId(projectId), 'projectCostHeads.rateAnalysisId': costHeadId } },
            { $unwind: '$projectCostHeads' },
            { $project: { 'projectCostHeads': 1 } },
            { $unwind: '$projectCostHeads.categories' },
            { $match: { 'projectCostHeads.categories.rateAnalysisId': categoryId } },
            { $project: { 'projectCostHeads.categories.workItems': 1 } },
            { $unwind: '$projectCostHeads.categories.workItems' },
            { $match: { 'projectCostHeads.categories.workItems.rateAnalysisId': workItemId } },
            { $project: { 'projectCostHeads.categories.workItems.quantity': 1 } },
        ];
        this.projectRepository.aggregate(query, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                if (result.length > 0) {
                    var quantity = result[0].projectCostHeads.categories.workItems.quantity;
                    _this.updateQuantityDetails(quantity, quantityDetailsObj);
                    var query_6 = { _id: projectId };
                    var updateQuery = { $set: { 'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity': quantity } };
                    var arrayFilter = [
                        { 'costHead.rateAnalysisId': costHeadId },
                        { 'category.rateAnalysisId': categoryId },
                        { 'workItem.rateAnalysisId': workItemId }
                    ];
                    _this.projectRepository.findOneAndUpdate(query_6, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, building) {
                        logger.info('Project service, findOneAndUpdate has been hit');
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            callback(null, { data: quantityDetailsObj, status: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
                        }
                    });
                }
                else {
                    var error_5 = new Error();
                    error_5.message = messages.MSG_ERROR_EMPTY_RESPONSE;
                    callback(error_5, null);
                }
            }
        });
    };
    ProjectService.prototype.updateQuantityDetailsOfBuilding = function (projectId, buildingId, costHeadId, categoryId, workItemId, quantityDetailsObj, user, callback) {
        var _this = this;
        var query = [
            { $match: { '_id': ObjectId(buildingId), 'costHeads.rateAnalysisId': costHeadId } },
            { $unwind: '$costHeads' },
            { $project: { 'costHeads': 1 } },
            { $unwind: '$costHeads.categories' },
            { $match: { 'costHeads.categories.rateAnalysisId': categoryId } },
            { $project: { 'costHeads.categories.workItems': 1 } },
            { $unwind: '$costHeads.categories.workItems' },
            { $match: { 'costHeads.categories.workItems.rateAnalysisId': workItemId } },
            { $project: { 'costHeads.categories.workItems.quantity': 1 } },
        ];
        this.buildingRepository.aggregate(query, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                if (result.length > 0) {
                    var quantity = result[0].costHeads.categories.workItems.quantity;
                    _this.updateQuantityDetails(quantity, quantityDetailsObj);
                    var query_7 = { _id: buildingId };
                    var updateQuery = { $set: { 'costHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity': quantity } };
                    var arrayFilter = [
                        { 'costHead.rateAnalysisId': costHeadId },
                        { 'category.rateAnalysisId': categoryId },
                        { 'workItem.rateAnalysisId': workItemId }
                    ];
                    _this.buildingRepository.findOneAndUpdate(query_7, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, building) {
                        logger.info('Project service, findOneAndUpdate has been hit');
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            callback(null, { data: quantityDetailsObj, status: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
                        }
                    });
                }
                else {
                    var error_6 = new Error();
                    error_6.message = messages.MSG_ERROR_EMPTY_RESPONSE;
                    callback(error_6, null);
                }
            }
        });
    };
    ProjectService.prototype.updateQuantityDetails = function (quantity, quantityDetailsObj) {
        quantity.isEstimated = true;
        quantity.isDirectQuantity = false;
        var quantityDetails = quantity.quantityItemDetails;
        var current_date = new Date();
        var newQuantityId = current_date.getUTCMilliseconds();
        if (quantityDetails.length === 0) {
            quantityDetailsObj.id = newQuantityId;
            quantityDetailsObj.isDirectQuantity = false;
            quantityDetails.push(quantityDetailsObj);
        }
        else {
            var isDefaultExistsSQL = 'SELECT name from ? AS quantityDetails where quantityDetails.name="default"';
            var isDefaultExistsQuantityDetail = alasql(isDefaultExistsSQL, [quantityDetails]);
            if (isDefaultExistsQuantityDetail.length > 0) {
                quantity.quantityItemDetails = [];
                quantityDetailsObj.id = newQuantityId;
                quantityDetailsObj.isDirectQuantity = false;
                quantity.quantityItemDetails.push(quantityDetailsObj);
            }
            else {
                if (quantityDetailsObj.name !== 'default') {
                    var isItemAlreadyExistSQL = 'SELECT id from ? AS quantityDetails where quantityDetails.id=' + quantityDetailsObj.id + '';
                    var isItemAlreadyExists = alasql(isItemAlreadyExistSQL, [quantityDetails]);
                    if (isItemAlreadyExists.length > 0) {
                        for (var quantityIndex = 0; quantityIndex < quantityDetails.length; quantityIndex++) {
                            if (quantityDetails[quantityIndex].id === quantityDetailsObj.id) {
                                quantityDetails[quantityIndex].name = quantityDetailsObj.name;
                                if (quantityDetailsObj.quantityItems.length === 0 && quantityDetailsObj.steelQuantityItems.steelQuantityItem.length === 0) {
                                    quantityDetails[quantityIndex].quantityItems = [];
                                    quantityDetails[quantityIndex].steelQuantityItems = new SteelQuantityItems();
                                    quantityDetails[quantityIndex].isDirectQuantity = true;
                                }
                                else if (quantityDetailsObj.quantityItems.length !== 0 || quantityDetailsObj.steelQuantityItems.steelQuantityItem.length !== 0) {
                                    quantityDetails[quantityIndex].quantityItems = quantityDetailsObj.quantityItems;
                                    quantityDetails[quantityIndex].steelQuantityItems = quantityDetailsObj.steelQuantityItems;
                                    quantityDetails[quantityIndex].isDirectQuantity = false;
                                }
                                quantityDetails[quantityIndex].total = quantityDetailsObj.total;
                            }
                        }
                    }
                    else {
                        quantityDetailsObj.id = newQuantityId;
                        quantityDetailsObj.isDirectQuantity = false;
                        quantity.quantityItemDetails.push(quantityDetailsObj);
                    }
                }
            }
        }
    };
    ProjectService.prototype.updateQuantityItemsOfWorkItem = function (quantity, quantityDetail) {
        quantity.isEstimated = true;
        var current_date = new Date();
        var quantityId = current_date.getUTCMilliseconds();
        if (quantity.quantityItemDetails.length === 0) {
            if (quantityDetail.id === undefined) {
                quantityDetail.id = quantityId;
                quantity.quantityItemDetails.push(quantityDetail);
            }
            else {
                quantity.quantityItemDetails.push(quantityDetail);
            }
        }
        else {
            var isDefaultExistsSQL = 'SELECT name from ? AS quantityDetails where quantityDetails.name="default"';
            var isDefaultExistsQuantityDetail = alasql(isDefaultExistsSQL, [quantity.quantityItemDetails]);
            if (isDefaultExistsQuantityDetail.length > 0) {
                quantityDetail.id = quantityId;
                quantity.quantityItemDetails = [];
                quantity.quantityItemDetails.push(quantityDetail);
            }
            else {
                if (quantityDetail.name !== 'default') {
                    var isItemAlreadyExistSQL = 'SELECT id from ? AS quantityDetails where quantityDetails.id=' + quantityDetail.id + '';
                    var isItemAlreadyExists = alasql(isItemAlreadyExistSQL, [quantity.quantityItemDetails]);
                    if (isItemAlreadyExists.length > 0) {
                        for (var quantityIndex = 0; quantityIndex < quantity.quantityItemDetails.length; quantityIndex++) {
                            if (quantity.quantityItemDetails[quantityIndex].id === quantityDetail.id) {
                                quantity.quantityItemDetails[quantityIndex].isDirectQuantity = false;
                                if (quantityDetail.steelQuantityItems) {
                                    quantity.quantityItemDetails[quantityIndex].steelQuantityItems = quantityDetail.steelQuantityItems;
                                    quantity.quantityItemDetails[quantityIndex].total = quantityDetail.total;
                                }
                                else {
                                    quantity.quantityItemDetails[quantityIndex].quantityItems = quantityDetail.quantityItems;
                                    quantity.quantityItemDetails[quantityIndex].total = quantityDetail.total;
                                }
                            }
                        }
                    }
                    else {
                        quantityDetail.id = quantityId;
                        quantityDetail.isDirectQuantity = false;
                        quantity.quantityItemDetails.push(quantityDetail);
                    }
                }
                else {
                    quantity.quantityItemDetails = [];
                    quantityDetail.id = quantityId;
                    quantityDetail.isDirectQuantity = false;
                    quantity.quantityItemDetails.push(quantityDetail);
                }
            }
        }
        quantity.total = alasql('VALUE OF SELECT ROUND(SUM(total),2) FROM ?', [quantity.quantityItemDetails]);
    };
    ProjectService.prototype.updateQuantityOfProjectCostHeads = function (projectId, costHeadId, categoryId, workItemId, quantityDetails, user, callback) {
        var _this = this;
        logger.info('Project service, Update Quantity Of Project Cost Heads has been hit');
        var query = { _id: projectId };
        var projection = { projectCostHeads: {
                $elemMatch: { rateAnalysisId: costHeadId, categories: {
                        $elemMatch: { rateAnalysisId: categoryId, workItems: {
                                $elemMatch: { rateAnalysisId: workItemId }
                            } }
                    } }
            } };
        this.projectRepository.retrieveWithProjection(query, projection, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = project[0].projectCostHeads;
                var quantity = void 0;
                for (var _i = 0, costHeadList_4 = costHeadList; _i < costHeadList_4.length; _i++) {
                    var costHead = costHeadList_4[_i];
                    if (costHeadId === costHead.rateAnalysisId) {
                        var categoriesOfCostHead = costHead.categories;
                        for (var _a = 0, categoriesOfCostHead_2 = categoriesOfCostHead; _a < categoriesOfCostHead_2.length; _a++) {
                            var categoryData = categoriesOfCostHead_2[_a];
                            if (categoryId === categoryData.rateAnalysisId) {
                                var workItemsOfCategory = categoryData.workItems;
                                for (var _b = 0, workItemsOfCategory_1 = workItemsOfCategory; _b < workItemsOfCategory_1.length; _b++) {
                                    var workItemData = workItemsOfCategory_1[_b];
                                    if (workItemId === workItemData.rateAnalysisId) {
                                        quantity = workItemData.quantity;
                                        quantity.isEstimated = true;
                                        _this.updateQuantityItemsOfWorkItem(quantity, quantityDetails);
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
                var query_8 = { _id: projectId };
                var updateQuery = { $set: { 'projectCostHeads.$[costHead].categories.$[category].workItems.$[workItem].quantity': quantity } };
                var arrayFilter = [
                    { 'costHead.rateAnalysisId': costHeadId },
                    { 'category.rateAnalysisId': categoryId },
                    { 'workItem.rateAnalysisId': workItemId }
                ];
                _this.projectRepository.findOneAndUpdate(query_8, updateQuery, { arrayFilters: arrayFilter, new: true }, function (error, project) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, { data: 'success', access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.getInActiveCategoriesByCostHeadId = function (projectId, buildingId, costHeadId, user, callback) {
        var _this = this;
        this.buildingRepository.findById(buildingId, function (error, building) {
            logger.info('Project service, Get In-Active Categories By Cost Head Id has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var costHeads = building.costHeads;
                var categories = new Array();
                for (var costHeadIndex = 0; costHeadIndex < costHeads.length; costHeadIndex++) {
                    if (parseInt(costHeadId) === costHeads[costHeadIndex].rateAnalysisId) {
                        var categoriesList = costHeads[costHeadIndex].categories;
                        for (var categoryIndex = 0; categoryIndex < categoriesList.length; categoryIndex++) {
                            if (categoriesList[categoryIndex].active === false) {
                                categories.push(categoriesList[categoryIndex]);
                            }
                        }
                    }
                }
                callback(null, { data: categories, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.getWorkItemListOfBuildingCategory = function (projectId, buildingId, costHeadId, categoryId, user, callback) {
        var _this = this;
        logger.info('Project service, getWorkItemListOfBuildingCategory has been hit');
        var query = [
            { $match: { '_id': ObjectId(buildingId), 'costHeads.rateAnalysisId': costHeadId } },
            { $unwind: '$costHeads' },
            { $project: { 'costHeads': 1, 'rates': 1 } },
            { $unwind: '$costHeads.categories' },
            { $match: { 'costHeads.categories.rateAnalysisId': categoryId } },
            { $project: { 'costHeads.categories.workItems': 1, 'rates': 1 } }
        ];
        this.buildingRepository.aggregate(query, function (error, result) {
            logger.info('Project service, Get workitems for specific category has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                if (result.length > 0) {
                    var workItemsOfBuildingCategory = result[0].costHeads.categories.workItems;
                    var workItemsListWithBuildingRates = _this.getWorkItemListWithCentralizedRates(workItemsOfBuildingCategory, result[0].rates, true);
                    var workItemsListAndShowHideAddItemButton = {
                        workItems: workItemsListWithBuildingRates.workItems,
                        showHideAddButton: workItemsListWithBuildingRates.showHideAddItemButton
                    };
                    callback(null, {
                        data: workItemsListAndShowHideAddItemButton,
                        access_token: _this.authInterceptor.issueTokenWithUid(user)
                    });
                }
                else {
                    var error_7 = new Error();
                    error_7.message = messages.MSG_ERROR_EMPTY_RESPONSE;
                    callback(error_7, null);
                }
            }
        });
    };
    ProjectService.prototype.getWorkItemListOfProjectCategory = function (projectId, costHeadId, categoryId, user, callback) {
        var _this = this;
        logger.info('Project service, getWorkItemListOfProjectCategory has been hit');
        var query = [
            { $match: { '_id': ObjectId(projectId), 'projectCostHeads.rateAnalysisId': costHeadId } },
            { $unwind: '$projectCostHeads' },
            { $project: { 'projectCostHeads': 1, 'rates': 1 } },
            { $unwind: '$projectCostHeads.categories' },
            { $match: { 'projectCostHeads.categories.rateAnalysisId': categoryId } },
            { $project: { 'projectCostHeads.categories.workItems': 1, 'rates': 1 } }
        ];
        this.projectRepository.aggregate(query, function (error, result) {
            logger.info('Project service, Get workitems By Cost Head & category Id has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                if (result.length > 0) {
                    var workItemsOfCategory = result[0].projectCostHeads.categories.workItems;
                    var workItemsListWithRates = _this.getWorkItemListWithCentralizedRates(workItemsOfCategory, result[0].rates, true);
                    var workItemsListAndShowHideAddItemButton = {
                        workItems: workItemsListWithRates.workItems,
                        showHideAddButton: workItemsListWithRates.showHideAddItemButton
                    };
                    callback(null, {
                        data: workItemsListAndShowHideAddItemButton,
                        access_token: _this.authInterceptor.issueTokenWithUid(user)
                    });
                }
                else {
                    var error_8 = new Error();
                    error_8.message = messages.MSG_ERROR_EMPTY_RESPONSE;
                    callback(error_8, null);
                }
            }
        });
    };
    ProjectService.prototype.getWorkItemListWithCentralizedRates = function (workItemsOfCategory, centralizedRates, isWorkItemActive) {
        var workItemsListWithRates = new WorkItemListWithRatesDTO();
        for (var _i = 0, workItemsOfCategory_2 = workItemsOfCategory; _i < workItemsOfCategory_2.length; _i++) {
            var workItemData = workItemsOfCategory_2[_i];
            if (workItemData.active === isWorkItemActive) {
                var workItem = workItemData;
                var rateItemsOfWorkItem = workItemData.rate.rateItems;
                workItem.rate.rateItems = this.getRatesFromCentralizedrates(rateItemsOfWorkItem, centralizedRates);
                var arrayOfRateItems = workItem.rate.rateItems;
                var totalOfAllRateItems = alasql('VALUE OF SELECT SUM(totalAmount) FROM ?', [arrayOfRateItems]);
                var totalByUnit = totalOfAllRateItems / workItem.rate.quantity;
                if (!workItem.isDirectRate) {
                    workItem.rate.total = this.totalRateByUnit(workItem, totalByUnit);
                }
                var quantityItems = workItem.quantity.quantityItemDetails;
                if (!workItem.quantity.isDirectQuantity) {
                    workItem.quantity.total = alasql('VALUE OF SELECT ROUND(SUM(total),2) FROM ?', [quantityItems]);
                }
                if (workItem.rate.isEstimated && workItem.quantity.isEstimated) {
                    workItem.amount = this.commonService.decimalConversion(workItem.rate.total * workItem.quantity.total);
                    workItemsListWithRates.workItemsAmount = workItemsListWithRates.workItemsAmount + workItem.amount;
                }
                workItemsListWithRates.workItems.push(workItem);
            }
            else {
                workItemsListWithRates.showHideAddItemButton = false;
            }
        }
        return workItemsListWithRates;
    };
    ProjectService.prototype.totalRateByUnit = function (workItem, totalByUnit) {
        if (workItem.unit === 'Sqm' && workItem.rate.unit !== 'Sqm') {
            workItem.rate.total = totalByUnit * 10.764;
        }
        else if (workItem.unit === 'Rm' && workItem.rate.unit !== 'Rm') {
            workItem.rate.total = totalByUnit * 3.28;
        }
        else if (workItem.unit === 'cum' && workItem.rate.unit !== 'cum') {
            workItem.rate.total = totalByUnit * 35.28;
        }
        else {
            workItem.rate.total = totalByUnit;
        }
        return workItem.rate.total;
    };
    ProjectService.prototype.getRatesFromCentralizedrates = function (rateItemsOfWorkItem, centralizedRates) {
        var rateItemsSQL = 'SELECT rateItem.itemName, rateItem.originalItemName, rateItem.rateAnalysisId, rateItem.type,' +
            'rateItem.quantity, centralizedRates.rate, rateItem.unit, rateItem.totalAmount, rateItem.totalQuantity ' +
            'FROM ? AS rateItem JOIN ? AS centralizedRates ON rateItem.itemName = centralizedRates.itemName';
        var rateItemsForWorkItem = alasql(rateItemsSQL, [rateItemsOfWorkItem, centralizedRates]);
        return rateItemsForWorkItem;
    };
    ProjectService.prototype.addWorkitem = function (projectId, buildingId, costHeadId, categoryId, workItem, user, callback) {
        var _this = this;
        logger.info('Project service, addWorkitem has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var responseWorkitem_1 = null;
                for (var index = 0; building.costHeads.length > index; index++) {
                    if (building.costHeads[index].rateAnalysisId === costHeadId) {
                        var category = building.costHeads[index].categories;
                        for (var categoryIndex = 0; category.length > categoryIndex; categoryIndex++) {
                            if (category[categoryIndex].rateAnalysisId === categoryId) {
                                category[categoryIndex].workItems.push(workItem);
                                responseWorkitem_1 = category[categoryIndex].workItems;
                            }
                        }
                        var query = { _id: buildingId };
                        var newData = { $set: { 'costHeads': building.costHeads } };
                        _this.buildingRepository.findOneAndUpdate(query, newData, { new: true }, function (error, building) {
                            logger.info('Project service, findOneAndUpdate has been hit');
                            if (error) {
                                callback(error, null);
                            }
                            else {
                                callback(null, { data: responseWorkitem_1, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                            }
                        });
                    }
                }
            }
        });
    };
    ProjectService.prototype.addCategoryByCostHeadId = function (projectId, buildingId, costHeadId, categoryDetails, user, callback) {
        var _this = this;
        var categoryObj = new Category(categoryDetails.category, categoryDetails.categoryId);
        var query = { '_id': buildingId, 'costHeads.rateAnalysisId': parseInt(costHeadId) };
        var newData = { $push: { 'costHeads.$.categories': categoryObj } };
        this.buildingRepository.findOneAndUpdate(query, newData, { new: true }, function (error, building) {
            logger.info('Project service, addCategoryByCostHeadId has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: building, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.updateCategoryStatus = function (projectId, buildingId, costHeadId, categoryId, categoryActiveStatus, user, callback) {
        var _this = this;
        this.buildingRepository.findById(buildingId, function (error, building) {
            logger.info('Project service, update Category Status has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var costHeads = building.costHeads;
                var categories = new Array();
                var updatedCategories_1 = new Array();
                var index = void 0;
                for (var costHeadIndex = 0; costHeadIndex < costHeads.length; costHeadIndex++) {
                    if (costHeadId === costHeads[costHeadIndex].rateAnalysisId) {
                        categories = costHeads[costHeadIndex].categories;
                        for (var categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
                            if (categories[categoryIndex].rateAnalysisId === categoryId) {
                                categories[categoryIndex].active = categoryActiveStatus;
                                updatedCategories_1.push(categories[categoryIndex]);
                            }
                        }
                    }
                }
                var query = { '_id': buildingId, 'costHeads.rateAnalysisId': costHeadId };
                var newData = { '$set': { 'costHeads.$.categories': categories } };
                _this.buildingRepository.findOneAndUpdate(query, newData, { new: true }, function (error, building) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, { data: updatedCategories_1, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.getCategoriesOfBuildingCostHead = function (projectId, buildingId, costHeadId, user, callback) {
        var _this = this;
        logger.info('Project service, Get Active Categories has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var buildingCostHeads = building.costHeads;
                var categoriesListWithCentralizedRates = void 0;
                for (var _i = 0, buildingCostHeads_1 = buildingCostHeads; _i < buildingCostHeads_1.length; _i++) {
                    var costHeadData = buildingCostHeads_1[_i];
                    if (costHeadData.rateAnalysisId === costHeadId) {
                        categoriesListWithCentralizedRates = _this.getCategoriesListWithCentralizedRates(costHeadData.categories, building.rates);
                        break;
                    }
                }
                callback(null, {
                    data: categoriesListWithCentralizedRates,
                    access_token: _this.authInterceptor.issueTokenWithUid(user)
                });
            }
        });
    };
    ProjectService.prototype.getCategoriesOfProjectCostHead = function (projectId, costHeadId, user, callback) {
        var _this = this;
        logger.info('Project service, Get Project CostHead Categories has been hit');
        this.projectRepository.findById(projectId, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var projectCostHeads = project.projectCostHeads;
                var categoriesListWithCentralizedRates = void 0;
                for (var _i = 0, projectCostHeads_1 = projectCostHeads; _i < projectCostHeads_1.length; _i++) {
                    var costHeadData = projectCostHeads_1[_i];
                    if (costHeadData.rateAnalysisId === costHeadId) {
                        categoriesListWithCentralizedRates = _this.getCategoriesListWithCentralizedRates(costHeadData.categories, project.rates);
                        break;
                    }
                }
                callback(null, {
                    data: categoriesListWithCentralizedRates,
                    access_token: _this.authInterceptor.issueTokenWithUid(user)
                });
            }
        });
    };
    ProjectService.prototype.getCostHeadDetailsOfBuilding = function (projectId, buildingId, costHeadId, user, callback) {
        var _this = this;
        logger.info('Project service, Get Project CostHead Categories has been hit');
        var query = [
            { $match: { '_id': ObjectId(buildingId) } },
            { $project: { 'costHeads': 1, 'rates': 1 } },
            { $unwind: '$costHeads' },
            { $match: { 'costHeads.rateAnalysisId': costHeadId } },
            { $project: { 'costHeads': 1, '_id': 0, 'rates': 1 } }
        ];
        this.buildingRepository.aggregate(query, function (error, result) {
            logger.info('Project service, Get workitems for specific category has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                if (result.length > 0) {
                    var data = result[0].costHeads;
                    var categoriesListWithCentralizedRates = _this.getCategoriesListWithCentralizedRates(data.categories, result[0].rates);
                    callback(null, { data: data, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                }
                else {
                    var error_9 = new Error();
                    error_9.message = messages.MSG_ERROR_EMPTY_RESPONSE;
                    callback(error_9, null);
                }
            }
        });
    };
    ProjectService.prototype.getCategoriesListWithCentralizedRates = function (categoriesOfCostHead, centralizedRates) {
        var categoriesTotalAmount = 0;
        var categoriesListWithRates = new CategoriesListWithRatesDTO;
        for (var _i = 0, categoriesOfCostHead_3 = categoriesOfCostHead; _i < categoriesOfCostHead_3.length; _i++) {
            var categoryData = categoriesOfCostHead_3[_i];
            var workItems = this.getWorkItemListWithCentralizedRates(categoryData.workItems, centralizedRates, true);
            categoryData.amount = workItems.workItemsAmount;
            categoriesTotalAmount = categoriesTotalAmount + workItems.workItemsAmount;
            categoriesListWithRates.categories.push(categoryData);
        }
        if (categoriesTotalAmount !== 0) {
            categoriesListWithRates.categoriesAmount = categoriesTotalAmount;
        }
        return categoriesListWithRates;
    };
    ProjectService.prototype.syncProjectWithRateAnalysisData = function (projectId, buildingId, user, callback) {
        var _this = this;
        logger.info('Project service, syncProjectWithRateAnalysisData has been hit');
        this.getProjectAndBuildingDetails(projectId, function (error, projectAndBuildingDetails) {
            if (error) {
                logger.error('Project service, getProjectAndBuildingDetails failed');
                callback(error, null);
            }
            else {
                logger.info('Project service, syncProjectWithRateAnalysisData.');
                var projectData = projectAndBuildingDetails.data[0];
                var buildings = projectAndBuildingDetails.data[0].buildings;
                var buildingData = void 0;
                for (var _i = 0, buildings_1 = buildings; _i < buildings_1.length; _i++) {
                    var building = buildings_1[_i];
                    if (building._id == buildingId) {
                        buildingData = building;
                        break;
                    }
                }
                if (projectData.projectCostHeads.length > 0) {
                    logger.info('Project service, syncWithRateAnalysisData building Only.');
                    _this.updateCostHeadsForBuildingAndProject(callback, projectData, buildingData, buildingId, projectId);
                }
                else {
                    logger.info('Project service, calling promise for syncProjectWithRateAnalysisData for Project and Building.');
                    var syncBuildingCostHeadsPromise = _this.updateBudgetRatesForBuildingCostHeads(Constants.BUILDING, buildingId, projectData, buildingData);
                    var syncProjectCostHeadsPromise = _this.updateBudgetRatesForProjectCostHeads(Constants.AMENITIES, projectId, projectData, buildingData);
                    CCPromise.all([
                        syncBuildingCostHeadsPromise,
                        syncProjectCostHeadsPromise
                    ]).then(function (data) {
                        logger.info('Promise for syncProjectWithRateAnalysisData for Project and Building success');
                        var buildingCostHeadsData = data[0];
                        var projectCostHeadsData = data[1];
                        callback(null, { status: 200 });
                    }).catch(function (e) {
                        logger.error(' Promise failed for syncProjectWithRateAnalysisData ! :' + JSON.stringify(e.message));
                        CCPromise.reject(e.message);
                    });
                }
            }
        });
    };
    ProjectService.prototype.updateCostHeadsForBuildingAndProject = function (callback, projectData, buildingData, buildingId, projectId) {
        logger.info('updateCostHeadsForBuildingAndProject has been hit');
        var rateAnalysisService = new RateAnalysisService();
        var buildingRepository = new BuildingRepository();
        var projectRepository = new ProjectRepository();
        var query = { 'region': config.get('costControlRegionCode') };
        rateAnalysisService.getCostControlRateAnalysis(query, {}, function (error, rateAnalysis) {
            if (error) {
                logger.error('Error in updateCostHeadsForBuildingAndProject : convertCostHeadsFromRateAnalysisToCostControl : '
                    + JSON.stringify(error));
                callback(error, null);
            }
            else {
                logger.info('GetAllDataFromRateAnalysis success');
                var buildingCostHeads = rateAnalysis.buildingCostHeads;
                var projectService_1 = new ProjectService();
                buildingCostHeads = projectService_1.calculateBudgetCostForBuilding(buildingCostHeads, buildingData, projectData);
                var queryForBuilding = { '_id': buildingId };
                var updateCostHead = { $set: { 'costHeads': buildingCostHeads, 'rates': rateAnalysis.buildingRates } };
                buildingRepository.findOneAndUpdate(queryForBuilding, updateCostHead, { new: true }, function (error, response) {
                    if (error) {
                        logger.error('Error in Update convertCostHeadsFromRateAnalysisToCostControl buildingCostHeadsData  : '
                            + JSON.stringify(error));
                        callback(error, null);
                    }
                    else {
                        logger.info('UpdateBuildingCostHead success');
                        var projectCostHeads = projectService_1.calculateBudgetCostForCommonAmmenities(projectData.projectCostHeads, projectData);
                        var queryForProject = { '_id': projectId };
                        var updateProjectCostHead = { $set: { 'projectCostHeads': projectCostHeads } };
                        logger.info('Calling update project Costheads has been hit');
                        projectRepository.findOneAndUpdate(queryForProject, updateProjectCostHead, { new: true }, function (error, response) {
                            if (error) {
                                logger.error('Error update project Costheads : ' + JSON.stringify(error));
                                callback(error, null);
                            }
                            else {
                                logger.debug('Update project Costheads success');
                                callback(null, response);
                            }
                        });
                    }
                });
            }
        });
    };
    ProjectService.prototype.updateBudgetRatesForBuildingCostHeads = function (entity, buildingId, projectDetails, buildingDetails) {
        return new CCPromise(function (resolve, reject) {
            var rateAnalysisService = new RateAnalysisService();
            var projectService = new ProjectService();
            var buildingRepository = new BuildingRepository();
            logger.info('Inside updateBudgetRatesForBuildingCostHeads promise.');
            var query = { 'region': config.get('costControlRegionCode') };
            rateAnalysisService.getCostControlRateAnalysis(query, {}, function (error, rateAnalysis) {
                if (error) {
                    logger.error('Error in promise updateBudgetRatesForBuildingCostHeads : ' + JSON.stringify(error));
                    reject(error);
                }
                else {
                    logger.info('Inside updateBudgetRatesForBuildingCostHeads success');
                    var projectService_2 = new ProjectService();
                    var buildingCostHeads = rateAnalysis.buildingCostHeads;
                    buildingCostHeads = projectService_2.calculateBudgetCostForBuilding(buildingCostHeads, buildingDetails, projectDetails);
                    var query_9 = { '_id': buildingId };
                    var newData = { $set: { 'costHeads': buildingCostHeads, 'rates': rateAnalysis.buildingRates } };
                    buildingRepository.findOneAndUpdate(query_9, newData, { new: true }, function (error, response) {
                        logger.info('Project service, getAllDataFromRateAnalysis has been hit');
                        if (error) {
                            logger.error('Error in Update buildingCostHeadsData  : ' + JSON.stringify(error));
                            reject(error);
                        }
                        else {
                            logger.debug('Updated buildingCostHeadsData');
                            resolve('Done');
                        }
                    });
                }
            });
        }).catch(function (e) {
            logger.error('Error in updateBudgetRatesForBuildingCostHeads :' + JSON.stringify(e.message));
            CCPromise.reject(e.message);
        });
    };
    ProjectService.prototype.getRates = function (result, costHeads) {
        var getRatesListSQL = 'SELECT * FROM ? AS q WHERE q.C4 IN (SELECT t.rateAnalysisId ' +
            'FROM ? AS t)';
        var rateItems = alasql(getRatesListSQL, [result.rates, costHeads]);
        var rateItemsRateAnalysisSQL = 'SELECT rateItem.C2 AS itemName, rateItem.C2 AS originalItemName,' +
            'rateItem.C12 AS rateAnalysisId, rateItem.C6 AS type,' +
            'ROUND(rateItem.C7,2) AS quantity, ROUND(rateItem.C3,2) AS rate, unit.C2 AS unit,' +
            'ROUND(rateItem.C3 * rateItem.C7,2) AS totalAmount, rateItem.C5 AS totalQuantity ' +
            'FROM ? AS rateItem JOIN ? AS unit ON unit.C1 = rateItem.C9';
        var rateItemsList = alasql(rateItemsRateAnalysisSQL, [rateItems, result.units]);
        var distinctItemsSQL = 'select DISTINCT itemName,originalItemName,rate FROM ?';
        var distinctRates = alasql(distinctItemsSQL, [rateItemsList]);
        return distinctRates;
    };
    ProjectService.prototype.getCentralizedRates = function (result, costHeads) {
        var getRatesListSQL = 'SELECT * FROM ? AS q WHERE q.C4 IN (SELECT t.rateAnalysisId ' +
            'FROM ? AS t)';
        var rateItems = alasql(getRatesListSQL, [result.rates, costHeads]);
        var rateItemsRateAnalysisSQL = 'SELECT rateItem.C2 AS itemName, rateItem.C2 AS originalItemName,' +
            'rateItem.C12 AS rateAnalysisId, rateItem.C6 AS type,' +
            'ROUND(rateItem.C7,2) AS quantity, ROUND(rateItem.C3,2) AS rate, unit.C2 AS unit,' +
            'ROUND(rateItem.C3 * rateItem.C7,2) AS totalAmount, rateItem.C5 AS totalQuantity ' +
            'FROM ? AS rateItem JOIN ? AS unit ON unit.C1 = rateItem.C9';
        var rateItemsList = alasql(rateItemsRateAnalysisSQL, [rateItems, result.units]);
        var distinctItemsSQL = 'select DISTINCT itemName,originalItemName,rate FROM ?';
        var distinctRates = alasql(distinctItemsSQL, [rateItemsList]);
        return distinctRates;
    };
    ProjectService.prototype.convertConfigCostHeads = function (configCostHeads, costHeadsData) {
        for (var _i = 0, configCostHeads_1 = configCostHeads; _i < configCostHeads_1.length; _i++) {
            var configCostHead = configCostHeads_1[_i];
            var costHead = new CostHead();
            costHead.name = configCostHead.name;
            costHead.priorityId = configCostHead.priorityId;
            costHead.rateAnalysisId = configCostHead.rateAnalysisId;
            var categoriesList = new Array();
            for (var _a = 0, _b = configCostHead.categories; _a < _b.length; _a++) {
                var configCategory = _b[_a];
                var category = new Category(configCategory.name, configCategory.rateAnalysisId);
                var workItemsList = new Array();
                for (var _c = 0, _d = configCategory.workItems; _c < _d.length; _c++) {
                    var configWorkItem = _d[_c];
                    var workItem = new WorkItem(configWorkItem.name, configWorkItem.rateAnalysisId);
                    workItem.isDirectRate = true;
                    workItem.unit = configWorkItem.measurementUnit;
                    workItem.isMeasurementSheet = configWorkItem.isMeasurementSheet;
                    workItem.isRateAnalysis = configWorkItem.isRateAnalysis;
                    workItem.rateAnalysisPerUnit = configWorkItem.rateAnalysisPerUnit;
                    workItem.isItemBreakdownRequired = configWorkItem.isItemBreakdownRequired;
                    workItem.length = configWorkItem.length;
                    workItem.breadthOrWidth = configWorkItem.breadthOrWidth;
                    workItem.height = configWorkItem.height;
                    if (configWorkItem.directRate !== null) {
                        workItem.rate.total = configWorkItem.directRate;
                    }
                    else {
                        workItem.rate.total = 0;
                    }
                    workItem.rate.isEstimated = true;
                    workItemsList.push(workItem);
                }
                category.workItems = workItemsList;
                categoriesList.push(category);
            }
            costHead.categories = categoriesList;
            costHead.thumbRuleRate = config.get(Constants.THUMBRULE_RATE);
            costHeadsData.push(costHead);
        }
        return costHeadsData;
    };
    ProjectService.prototype.updateBudgetRatesForProjectCostHeads = function (entity, projectId, projectDetails, buildingDetails) {
        return new CCPromise(function (resolve, reject) {
            var rateAnalysisService = new RateAnalysisService();
            var projectRepository = new ProjectRepository();
            logger.info('Inside updateBudgetRatesForProjectCostHeads promise.');
            var query = { 'region': config.get('costControlRegionCode') };
            rateAnalysisService.getCostControlRateAnalysis(query, {}, function (error, rateAnalysis) {
                if (error) {
                    logger.error('Error in updateBudgetRatesForProjectCostHeads promise : ' + JSON.stringify(error));
                    reject(error);
                }
                else {
                    var projectService = new ProjectService();
                    var projectCostHeads = rateAnalysis.projectCostHeads;
                    projectCostHeads = projectService.calculateBudgetCostForCommonAmmenities(projectCostHeads, projectDetails);
                    var query_10 = { '_id': projectId };
                    var newData = { $set: { 'projectCostHeads': projectCostHeads, 'rates': rateAnalysis.projectRates } };
                    projectRepository.findOneAndUpdate(query_10, newData, { new: true }, function (error, response) {
                        logger.info('Project service, getAllDataFromRateAnalysis has been hit');
                        if (error) {
                            logger.error('Error in Update buildingCostHeadsData  : ' + JSON.stringify(error));
                            reject(error);
                        }
                        else {
                            logger.debug('Updated projectCostHeads');
                            resolve('Done');
                        }
                    });
                }
            });
        }).catch(function (e) {
            logger.error('Error in updateBudgetRatesForProjectCostHeads :' + JSON.stringify(e.message));
            CCPromise.reject(e.message);
        });
    };
    ProjectService.prototype.calculateBudgetCostForBuilding = function (costHeadsRateAnalysis, buildingDetails, projectDetails) {
        logger.info('Project service, calculateBudgetCostForBuilding has been hit');
        var costHeads = new Array();
        var budgetedCostAmount;
        var calculateBudgtedCost;
        for (var _i = 0, costHeadsRateAnalysis_1 = costHeadsRateAnalysis; _i < costHeadsRateAnalysis_1.length; _i++) {
            var costHead = costHeadsRateAnalysis_1[_i];
            var budgetCostFormulae = void 0;
            switch (costHead.name) {
                case Constants.RCC: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.SLAB_AREA, buildingDetails.totalSlabArea);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.EXTERNAL_PLASTER: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.FABRICATION: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.PAINTING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.KITCHEN_PLATFORMS: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.SOLING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLINTH_AREA, buildingDetails.plinthArea);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.MASONRY: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.INTERNAL_PLASTER: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.GYPSUM_PUNNING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.WATER_PROOFING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.DEWATERING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.SALEABLE_AREA, buildingDetails.totalSaleableAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.GARBAGE_CHUTE: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_FLOORS, buildingDetails.totalNumOfFloors)
                        .replace(Constants.NUM_OF_PARKING_FLOORS, buildingDetails.numOfParkingFloors);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.LIFT: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + 'Lift').toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_FLOORS, buildingDetails.totalNumOfFloors)
                        .replace(Constants.NUM_OF_LIFTS, buildingDetails.numOfLifts);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.DOORS_WITH_FRAMES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK)
                        .replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.EXCAVATION: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLINTH_AREA, buildingDetails.plinthArea);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.BACKFILLING_PLINTH: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLINTH_AREA, buildingDetails.plinthArea);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.FLOORING_SKIRTING_DADO_WALL_TILING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.WINDOWS_SILLS_OR_JAMBS: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.STAIRCASE_TREADS_AND_RISERS: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.DOORS_WITH_FRAMES_AND_HARDWARE: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.WINDOWS_AND_GLASS_DOORS: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.ELECTRIFICATION: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.ELECTRICAL_LIGHT_FITTINGS_IN_COMMON_AREAS_OF_BUILDINGS: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA_OF_PARKING, buildingDetails.carpetAreaOfParking)
                        .replace(Constants.PLOT_PERIPHERY_LENGTH, projectDetails.plotPeriphery)
                        .replace(Constants.NUM_OF_FLOORS, buildingDetails.totalNumOfFloors);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.PEST_CONTROL: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.SOLAR_WATER_HEATING_SYSTEM: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.PIPED_GAS_SYSTEM: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.SKY_LOUNGE_ON_TOP_TERRACE: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.SLAB_AREA, buildingDetails.totalSlabArea)
                        .replace(Constants.NUM_OF_FLOORS, buildingDetails.totalNumOfFloors)
                        .replace(Constants.NUM_OF_PARKING_FLOORS, buildingDetails.numOfParkingFloors);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.FIRE_FIGHTING_SYSTEM: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_FLOORS, buildingDetails.totalNumOfFloors);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.SAFETY_AND_SECURITY_AUTOMATION: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK)
                        .replace(Constants.TOTAL_NUM_OF_BUILDINGS, projectDetails.totalNumOfBuildings);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.SHOWER_ENCLOSURES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.FALSE_CEILING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.SPECIAL_ELEVATIONAL_FEATURES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + 'Special elevational features').toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.BOARDS_AND_SIGNAGES_INSIDE_BUILDING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK)
                        .replace(Constants.NUM_OF_FLOORS, buildingDetails.totalNumOfFloors);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.INTERNAL_PLUMBING_WITH_VERTICAL_LINES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK)
                        .replace(Constants.NUM_OF_ONE_BHK, buildingDetails.numOfOneBHK)
                        .replace(Constants.NUM_OF_TWO_BHK, buildingDetails.numOfTwoBHK)
                        .replace(Constants.NUM_OF_THREE_BHK, buildingDetails.numOfThreeBHK)
                        .replace(Constants.NUM_OF_FOUR_BHK, buildingDetails.numOfFourBHK)
                        .replace(Constants.NUM_OF_FIVE_BHK, buildingDetails.numOfFiveBHK);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.WINDOWS_SLIDING_DOORS: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                default: {
                    break;
                }
            }
        }
        return costHeads;
    };
    ProjectService.prototype.calculateBudgetCostForCommonAmmenities = function (costHeadsRateAnalysis, projectDetails) {
        logger.info('Project service, calculateBudgetCostForCommonAmmenities has been hit');
        var costHeads = new Array();
        var budgetedCostAmount;
        var budgetCostFormulae;
        var calculateBudgtedCost;
        var calculateProjectData = 'SELECT ROUND(SUM(building.totalCarpetAreaOfUnit),2) AS totalCarpetArea, ' +
            'ROUND(SUM(building.totalSlabArea),2) AS totalSlabAreaProject,' +
            'ROUND(SUM(building.numOfOneBHK),2) AS totalNumberOfOneBHK,' +
            'ROUND(SUM(building.numOfTwoBHK),2) AS totalNumberOfTwoBHK,' +
            'ROUND(SUM(building.numOfThreeBHK),2) AS totalNumberOfThreeBHK,' +
            'ROUND(SUM(building.numOfFourBHK),2) AS totalNumberOfFourBHK,' +
            'ROUND(SUM(building.numOfFiveBHK),2) AS totalNumberOfFiveBHK,' +
            'ROUND(SUM(building.carpetAreaOfParking),2) AS totalCarpetAreaOfParking,' +
            'ROUND(SUM(building.totalSaleableAreaOfUnit),2) AS totalSaleableArea  FROM ? AS building';
        var projectData = alasql(calculateProjectData, [projectDetails.buildings]);
        var totalSlabAreaOfProject = projectData[0].totalSlabAreaProject;
        var totalSaleableAreaOfProject = projectData[0].totalSaleableArea;
        var totalCarpetAreaOfProject = projectData[0].totalCarpetArea;
        var totalCarpetAreaOfParking = projectData[0].totalCarpetAreaOfParking;
        var totalNumberOfOneBHKInProject = projectData[0].totalNumberOfOneBHK;
        var totalNumberOfTwoBHKInProject = projectData[0].totalNumberOfTwoBHK;
        var totalNumberOfThreeBHKInProject = projectData[0].totalNumberOfThreeBHK;
        var totalNumberOfFourBHKInProject = projectData[0].totalNumberOfFourBHK;
        var totalNumberOfFiveBHKInProject = projectData[0].totalNumberOfFiveBHK;
        for (var _i = 0, costHeadsRateAnalysis_2 = costHeadsRateAnalysis; _i < costHeadsRateAnalysis_2.length; _i++) {
            var costHead = costHeadsRateAnalysis_2[_i];
            switch (costHead.name) {
                case Constants.SAFETY_MEASURES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.CLUB_HOUSE: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_SLAB_AREA_OF_CLUB_HOUSE, projectDetails.slabArea);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SWIMMING_POOL: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.SWIMMING_POOL_CAPACITY, projectDetails.poolCapacity);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.CHILDREN_PLAY_AREA: {
                    this.setFixedBudgetedCost(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.GYM: {
                    this.setFixedBudgetedCost(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.D_G_SET_BACKUP: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.PODIUM: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PODIUM_AREA, projectDetails.podiumArea);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.LANDSCAPING_OF_OPEN_SPACES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.OPEN_SPACE, projectDetails.openSpace).replace(Constants.PLOT_PERIPHERY_LENGTH, projectDetails.plotPeriphery);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.RAIN_WATER_HARVESTING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLOT_AREA, projectDetails.plotArea);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.BOARDS_AND_SIGNAGES_IN_COMMON_AREAS: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_NUMBER_OF_BUILDINGS, projectDetails.totalNumOfBuildings);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.ELECTRICAL_LIGHT_FITTINGS_IN_COMMON_AREAS_OF_PROJECT: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLOT_PERIPHERY_LENGTH, projectDetails.plotPeriphery).replace(Constants.OPEN_SPACE, projectDetails.openSpace);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SITE_DEV_ELECTRICAL_INFRASTRUCTURE: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.NUM_OF_ONE_BHK, totalNumberOfOneBHKInProject)
                        .replace(Constants.NUM_OF_TWO_BHK, totalNumberOfTwoBHKInProject).replace(Constants.NUM_OF_THREE_BHK, totalNumberOfThreeBHKInProject)
                        .replace(Constants.NUM_OF_FOUR_BHK, totalNumberOfFourBHKInProject).replace(Constants.NUM_OF_FIVE_BHK, totalNumberOfFiveBHKInProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SITE_DEV_PLUMBING_AND_DRAINAGE_SYSTEM: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SITE_DEV_BACKFILLING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLOT_AREA, projectDetails.plotArea);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SITE_DEV_ROAD_WORK: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLOT_AREA, projectDetails.plotArea);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.PROJECT_ENTRANCE_GATE: {
                    this.setFixedBudgetedCost(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.COMPOUND_WALL: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLOT_PERIPHERY_LENGTH, projectDetails.plotPeriphery);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.CAR_PARK_SYSTEMS: {
                    budgetedCostAmount = 0;
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.CAR_PARK_MARKING_PARKING_ACCESSORIES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA_OF_PARKING, totalCarpetAreaOfParking);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.CLEANING_AND_SHIFTING_OF_DEBRIS: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.ELECTRICITY_AND_DIESEL_CHARGES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject)
                        .replace(Constants.TARGETED_PROJECT_COMPLETION_PERIOD, projectDetails.projectDuration);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.MATERIAL_TESTING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.DEPARTMENTAL_LABOUR: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLOT_AREA, projectDetails.plotArea)
                        .replace(Constants.TARGETED_PROJECT_COMPLETION_PERIOD, projectDetails.projectDuration);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.CLEANING_OF_UNITS_BEFORE_POSSESSION: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SAMPLE_FLAT: {
                    this.setFixedBudgetedCost(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.LABOUR_CAMP: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SITE_PREPARATION_TEMPORARY_FENCING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLOT_PERIPHERY_LENGTH, projectDetails.plotPeriphery);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SITE_PREPARATION_TEMPORARY_STRUCTURES_STORES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.SALEABLE_AREA, totalSaleableAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.TEMPORARY_ELECTRIFICATION: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.TEMPORARY_PLUMBING_AND_DRAINAGE: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.SALEABLE_AREA, totalSaleableAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SITE_SALES_OFFICE: {
                    this.setFixedBudgetedCost(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SOCIETY_OFFICE_WITH_FURNITURE: {
                    this.setFixedBudgetedCost(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.WATER_CHARGES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject)
                        .replace(Constants.TARGETED_PROJECT_COMPLETION_PERIOD, projectDetails.projectDuration);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.REPAIRS_MAINTENANCE_CHARGES_IN_DEFECT_LIABILITY_PERIOD_OF_5_YEARS: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.PROFFESSIONAL_FEES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SALES_AND_MARKETING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.FINANCE_COST: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.ADMINISTRATIVE_CHARGES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.LOCAL_BODY_PROJECT_SANCTIONING_CHARGES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.TOTAL_CARPET_AREA, totalCarpetAreaOfProject);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                case Constants.SITE_SECURITY: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.PLOT_AREA, projectDetails.plotArea)
                        .replace(Constants.TARGETED_PROJECT_COMPLETION_PERIOD, projectDetails.projectDuration);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
                    break;
                }
                default: {
                    break;
                }
            }
        }
        return costHeads;
    };
    ProjectService.prototype.setFixedBudgetedCost = function (budgetedCostAmount, costHead, projectDetails, costHeads) {
        budgetedCostAmount = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name);
        this.calculateThumbRuleReportForProjectCostHead(budgetedCostAmount, costHead, projectDetails, costHeads);
    };
    ProjectService.prototype.addNewCentralizedRateForBuilding = function (buildingId, rateItem) {
        return new CCPromise(function (resolve, reject) {
            logger.info('createPromiseForAddingNewRateItem has been hit for buildingId: ' + buildingId + ', rateItem : ' + rateItem);
            var buildingRepository = new BuildingRepository();
            var queryAddNewRateItem = { '_id': buildingId };
            var addNewRateRateData = { $push: { 'rates': rateItem } };
            buildingRepository.findOneAndUpdate(queryAddNewRateItem, addNewRateRateData, { new: true }, function (error, result) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        }).catch(function (e) {
            logger.error('Promise failed for individual createPromiseForAddingNewRateItem! error :' + JSON.stringify(e.message));
            CCPromise.reject(e.message);
        });
    };
    ProjectService.prototype.updateCentralizedRateForBuilding = function (buildingId, rateItem, rateItemRate) {
        return new CCPromise(function (resolve, reject) {
            logger.info('createPromiseForRateUpdate has been hit for buildingId : ' + buildingId + ', rateItem : ' + rateItem);
            var buildingRepository = new BuildingRepository();
            var queryUpdateRate = { '_id': buildingId, 'rates.itemName': rateItem };
            var updateRate = { $set: { 'rates.$.rate': rateItemRate } };
            buildingRepository.findOneAndUpdate(queryUpdateRate, updateRate, { new: true }, function (error, result) {
                if (error) {
                    reject(error);
                }
                else {
                    console.log('Rate Updated');
                    resolve(result);
                }
            });
        }).catch(function (e) {
            logger.error('Promise failed for individual createPromiseForRateUpdate ! Error: ' + JSON.stringify(e.message));
            CCPromise.reject(e.message);
        });
    };
    ProjectService.prototype.addNewCentralizedRateForProject = function (projectId, rateItem) {
        return new CCPromise(function (resolve, reject) {
            logger.info('createPromiseForAddingNewRateItemInProjectRates has been hit for projectId : ' + projectId + ', rateItem : ' + rateItem);
            var projectRepository = new ProjectRepository();
            var addNewRateItemQueryProject = { '_id': projectId };
            var addNewRateRateDataProject = { $push: { 'rates': rateItem } };
            projectRepository.findOneAndUpdate(addNewRateItemQueryProject, addNewRateRateDataProject, { new: true }, function (error, result) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        }).catch(function (e) {
            logger.error('Promise failed for individual createPromiseForAddingNewRateItemInProjectRates ! error :' + JSON.stringify(e.message));
            CCPromise.reject(e.message);
        });
    };
    ProjectService.prototype.updateCentralizedRateForProject = function (projectId, rateItem, rateItemRate) {
        return new CCPromise(function (resolve, reject) {
            logger.info('createPromiseForRateUpdateOfProjectRates has been hit for projectId : ' + projectId + ', rateItem : ' + rateItem);
            var projectRepository = new ProjectRepository();
            var queryUpdateRateForProject = { '_id': projectId, 'rates.itemName': rateItem };
            var updateRateForProject = { $set: { 'rates.$.rate': rateItemRate } };
            projectRepository.findOneAndUpdate(queryUpdateRateForProject, updateRateForProject, { new: true }, function (error, result) {
                if (error) {
                    reject(error);
                }
                else {
                    console.log('Rate Updated for Project rates');
                    resolve(result);
                }
            });
        }).catch(function (e) {
            logger.error('Promise failed for individual createPromiseForRateUpdateOfProjectRates ! Error: ' + JSON.stringify(e.message));
            CCPromise.reject(e.message);
        });
    };
    ProjectService.prototype.addAttachmentToWorkItem = function (projectId, buildingId, costHeadId, categoryId, workItemId, fileData, callback) {
        var _this = this;
        this.addAttachment(fileData, function (error, attachmentObject) {
            if (error) {
                callback(error, null);
            }
            else {
                var projection = { costHeads: 1 };
                _this.buildingRepository.findByIdWithProjection(buildingId, projection, function (error, building) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var costHeadList = building.costHeads;
                        var costHeads = _this.uploadFile(costHeadList, costHeadId, categoryId, workItemId, attachmentObject);
                        var query = { _id: buildingId };
                        var updateData = { $set: { 'costHeads': costHeads } };
                        _this.buildingRepository.findOneAndUpdate(query, updateData, { new: true }, function (error, response) {
                            if (error) {
                                callback(error, null);
                            }
                            else {
                                callback(null, { data: 'success' });
                            }
                        });
                    }
                });
            }
        });
    };
    ProjectService.prototype.addAttachment = function (fileData, callback) {
        __dirname = path.resolve() + config.get('application.attachmentPath');
        var form = new multiparty.Form({ uploadDir: __dirname });
        form.parse(fileData, function (err, fields, files) {
            if (err) {
                callback(err, null);
            }
            else {
                var file_path = files.file[0].path;
                var assignedFileName = file_path.substr(files.file[0].path.lastIndexOf('\/') + 1);
                logger.info('Attached assigned fileName : ' + assignedFileName);
                var attachmentObject = new AttachmentDetails_1.AttachmentDetailsModel();
                attachmentObject.fileName = files.file[0].originalFilename;
                attachmentObject.assignedFileName = assignedFileName;
                callback(null, attachmentObject);
            }
        });
    };
    ProjectService.prototype.uploadFile = function (costHeadList, costHeadId, categoryId, workItemId, attachmentObject) {
        var costHead = costHeadList.filter(function (currentCostHead) { return currentCostHead.rateAnalysisId === costHeadId; });
        var categories = costHead[0].categories;
        var category = categories.filter(function (currentCategory) { return currentCategory.rateAnalysisId === categoryId; });
        var workItems = category[0].workItems;
        var workItem = workItems.filter(function (currentWorkItem) {
            if (currentWorkItem.rateAnalysisId === workItemId) {
                currentWorkItem.attachmentDetails.push(attachmentObject);
            }
            return;
        });
        return costHeadList;
    };
    ProjectService.prototype.getPresentFilesForBuildingWorkItem = function (projectId, buildingId, costHeadId, categoryId, workItemId, callback) {
        var _this = this;
        logger.info('Project service, getPresentFilesForBuildingWorkItem has been hit');
        var projection = { costHeads: 1 };
        this.buildingRepository.findByIdWithProjection(buildingId, projection, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = building.costHeads;
                var attachmentList = _this.getPresentFiles(costHeadList, costHeadId, categoryId, workItemId);
                callback(null, { data: attachmentList });
            }
        });
    };
    ProjectService.prototype.getPresentFiles = function (costHeadList, costHeadId, categoryId, workItemId) {
        var attachmentList = new Array();
        var costHead = costHeadList.filter(function (currentCostHead) { return currentCostHead.rateAnalysisId === costHeadId; });
        var categories = costHead[0].categories;
        var category = categories.filter(function (currentCategory) { return currentCategory.rateAnalysisId === categoryId; });
        var workItems = category[0].workItems;
        var workItem = workItems.filter(function (currentWorkItem) { return currentWorkItem.rateAnalysisId === workItemId; });
        attachmentList = workItem[0].attachmentDetails;
        return attachmentList;
    };
    ProjectService.prototype.removeAttachmentOfBuildingWorkItem = function (projectId, buildingId, costHeadId, categoryId, workItemId, assignedFileName, callback) {
        var _this = this;
        logger.info('Project service, removeAttachmentOfBuildingWorkItem has been hit');
        var projection = { costHeads: 1 };
        this.buildingRepository.findByIdWithProjection(buildingId, projection, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = building.costHeads;
                _this.deleteFile(costHeadList, costHeadId, categoryId, workItemId, assignedFileName);
                var query = { _id: buildingId };
                var data = { $set: { 'costHeads': building.costHeads } };
                _this.buildingRepository.findOneAndUpdate(query, data, { new: true }, function (error, building) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        fs.unlink('.' + config.get('application.attachmentPath') + '/' + assignedFileName, function (err) {
                            if (err) {
                                callback(error, null);
                            }
                        });
                        callback(null, { data: 'success' });
                    }
                });
            }
        });
    };
    ProjectService.prototype.deleteFile = function (costHeadList, costHeadId, categoryId, workItemId, assignedFileName) {
        var costHead = costHeadList.filter(function (currentCostHead) { return currentCostHead.rateAnalysisId === costHeadId; });
        var categories = costHead[0].categories;
        var category = categories.filter(function (currentCategory) { return currentCategory.rateAnalysisId === categoryId; });
        var workItems = category[0].workItems;
        var workItem = workItems.filter(function (currentWorkItem) {
            if (currentWorkItem.rateAnalysisId === workItemId) {
                var attachmentList = currentWorkItem.attachmentDetails;
                for (var fileIndex in attachmentList) {
                    if (attachmentList[fileIndex].assignedFileName === assignedFileName) {
                        attachmentList.splice(parseInt(fileIndex), 1);
                        break;
                    }
                }
            }
            return;
        });
    };
    ProjectService.prototype.addAttachmentToProjectWorkItem = function (projectId, costHeadId, categoryId, workItemId, fileData, callback) {
        var _this = this;
        this.addAttachment(fileData, function (error, attachmentObject) {
            if (error) {
                callback(error, null);
            }
            else {
                var projection = { projectCostHeads: 1 };
                _this.projectRepository.findByIdWithProjection(projectId, projection, function (error, project) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var costHeadList = project.projectCostHeads;
                        var projectCostHeads = _this.uploadFile(costHeadList, costHeadId, categoryId, workItemId, attachmentObject);
                        var query = { _id: projectId };
                        var updateData = { $set: { 'projectCostHeads': projectCostHeads } };
                        _this.projectRepository.findOneAndUpdate(query, updateData, { new: true }, function (error, response) {
                            if (error) {
                                callback(error, null);
                            }
                            else {
                                callback(null, { data: 'success' });
                            }
                        });
                    }
                });
            }
        });
    };
    ProjectService.prototype.getPresentFilesForProjectWorkItem = function (projectId, costHeadId, categoryId, workItemId, callback) {
        var _this = this;
        logger.info('Project service, getPresentFilesForProjectWorkItem has been hit');
        var projection = { projectCostHeads: 1 };
        this.projectRepository.findByIdWithProjection(projectId, projection, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = project.projectCostHeads;
                var attachmentList = _this.getPresentFiles(costHeadList, costHeadId, categoryId, workItemId);
                callback(null, { data: attachmentList });
            }
        });
    };
    ProjectService.prototype.removeAttachmentOfProjectWorkItem = function (projectId, costHeadId, categoryId, workItemId, assignedFileName, callback) {
        var _this = this;
        logger.info('Project service, removeAttachmentOfProjectWorkItem has been hit');
        var projection = { projectCostHeads: 1 };
        this.projectRepository.findByIdWithProjection(projectId, projection, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = project.projectCostHeads;
                _this.deleteFile(costHeadList, costHeadId, categoryId, workItemId, assignedFileName);
                var query = { _id: projectId };
                var data = { $set: { 'projectCostHeads': project.projectCostHeads } };
                _this.projectRepository.findOneAndUpdate(query, data, { new: true }, function (error, project) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        fs.unlink('.' + config.get('application.attachmentPath') + '/' + assignedFileName, function (err) {
                            if (err) {
                                callback(error, null);
                            }
                        });
                        callback(null, { data: 'success' });
                    }
                });
            }
        });
    };
    ProjectService.prototype.calculateThumbRuleReportForCostHead = function (budgetedCostAmount, costHeadFromRateAnalysis, buildingData, costHeads) {
        if (budgetedCostAmount >= 0) {
            logger.info('Project service, calculateThumbRuleReportForCostHead has been hit');
            var costHead = costHeadFromRateAnalysis;
            costHead.budgetedCostAmount = budgetedCostAmount;
            var thumbRuleRate = new ThumbRuleRate();
            thumbRuleRate.saleableArea = this.calculateThumbRuleRateForArea(budgetedCostAmount, buildingData.totalSaleableAreaOfUnit);
            thumbRuleRate.slabArea = this.calculateThumbRuleRateForArea(budgetedCostAmount, buildingData.totalSlabArea);
            thumbRuleRate.carpetArea = this.calculateThumbRuleRateForArea(budgetedCostAmount, buildingData.totalCarpetAreaOfUnit);
            costHead.thumbRuleRate = thumbRuleRate;
            costHeads.push(costHead);
        }
    };
    ProjectService.prototype.calculateThumbRuleReportForProjectCostHead = function (budgetedCostAmount, costHeadFromRateAnalysis, projectDetails, costHeads) {
        if (budgetedCostAmount >= 0) {
            logger.info('Project service, calculateThumbRuleReportForProjectCostHead has been hit');
            var calculateProjectData = 'SELECT ROUND(SUM(building.totalCarpetAreaOfUnit),2) AS totalCarpetArea, ' +
                'ROUND(SUM(building.totalSlabArea),2) AS totalSlabAreaProject,' +
                'ROUND(SUM(building.totalSaleableAreaOfUnit),2) AS totalSaleableArea  FROM ? AS building';
            var projectData = alasql(calculateProjectData, [projectDetails.buildings]);
            var totalSlabAreaOfProject = projectData[0].totalSlabAreaProject;
            var totalSaleableAreaOfProject = projectData[0].totalSaleableArea;
            var totalCarpetAreaOfProject = projectData[0].totalCarpetArea;
            var costHead = costHeadFromRateAnalysis;
            costHead.budgetedCostAmount = budgetedCostAmount;
            var thumbRuleRate = new ThumbRuleRate();
            thumbRuleRate.saleableArea = this.calculateThumbRuleRateForArea(budgetedCostAmount, totalSaleableAreaOfProject);
            thumbRuleRate.slabArea = this.calculateThumbRuleRateForArea(budgetedCostAmount, totalSlabAreaOfProject);
            thumbRuleRate.carpetArea = this.calculateThumbRuleRateForArea(budgetedCostAmount, totalCarpetAreaOfProject);
            costHead.thumbRuleRate = thumbRuleRate;
            costHeads.push(costHead);
        }
    };
    ProjectService.prototype.calculateThumbRuleRateForArea = function (budgetedCostAmount, area) {
        logger.info('Project service, calculateThumbRuleRateForArea has been hit');
        var budgetCostRates = new BudgetCostRates();
        budgetCostRates.sqft = (budgetedCostAmount / area);
        budgetCostRates.sqmt = (budgetCostRates.sqft * config.get(Constants.SQUARE_METER));
        return budgetCostRates;
    };
    ProjectService.prototype.clonedWorkitemWithRateAnalysis = function (workItem, workItemAggregateData) {
        for (var _i = 0, workItemAggregateData_1 = workItemAggregateData; _i < workItemAggregateData_1.length; _i++) {
            var aggregateData = workItemAggregateData_1[_i];
            if (workItem.rateAnalysisId === aggregateData.workItem.rateAnalysisId) {
                workItem.rate = aggregateData.workItem.rate;
                break;
            }
        }
    };
    return ProjectService;
}());
Object.seal(ProjectService);
module.exports = ProjectService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUHJvamVjdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDhFQUFpRjtBQUNqRixnRkFBbUY7QUFDbkYsb0VBQXVFO0FBQ3ZFLGtFQUFxRTtBQUlyRSw2RUFBZ0Y7QUFDaEYsOEVBQWlGO0FBQ2pGLDBFQUE2RTtBQUU3RSxnRUFBbUU7QUFDbkUsd0VBQTJFO0FBQzNFLHdFQUEyRTtBQUMzRSwyREFBOEQ7QUFDOUQsd0VBQTJFO0FBQzNFLCtCQUFrQztBQUNsQyxxRkFBd0Y7QUFDeEYsaUZBQW9GO0FBQ3BGLHFFQUF3RTtBQUd4RSxpR0FBb0c7QUFDcEcsNkVBQWdGO0FBQ2hGLG1FQUF1RTtBQUN2RSwrRUFBOEU7QUFDOUUsNkZBQWdHO0FBQ2hHLDJCQUE2QjtBQUM3Qix1Q0FBeUM7QUFDekMsNEZBQWdHO0FBQ2hHLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsbUNBQXFDO0FBRXJDLDRGQUErRjtBQUkvRixJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUN0RCxJQUFJLE1BQU0sR0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDL0MsSUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pCLElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO0FBQ3ZDO0lBY0U7UUFSQSwwQkFBcUIsR0FBUyxJQUFJLENBQUM7UUFTakMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUNqRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQ25ELElBQUksQ0FBQyxRQUFRLEdBQUcsWUFB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R0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUM7SUFDekIsQ0FBQztJQUVPLHVEQUE4QixHQUF0QyxVQUF1QyxRQUFpQixFQUFFLHFCQUEwQjtRQUVsRixHQUFHLENBQUEsQ0FBc0IsVUFBcUIsRUFBckIsK0NBQXFCLEVBQXJCLG1DQUFxQixFQUFyQixJQUFxQjtZQUExQyxJQUFJLGFBQWEsOEJBQUE7WUFDbkIsRUFBRSxDQUFBLENBQUMsUUFBUSxDQUFDLGNBQWMsS0FBSyxhQUFhLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFBLENBQUM7Z0JBQ3BFLFFBQVEsQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQzVDLEtBQUssQ0FBQztZQUNSLENBQUM7U0FDRjtJQUNILENBQUM7SUFDSCxxQkFBQztBQUFELENBbjRHQSxBQW00R0MsSUFBQTtBQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDNUIsaUJBQVMsY0FBYyxDQUFDIiwiZmlsZSI6ImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUHJvamVjdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUHJvamVjdFJlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvUHJvamVjdFJlcG9zaXRvcnknKTtcclxuaW1wb3J0IEJ1aWxkaW5nUmVwb3NpdG9yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvcmVwb3NpdG9yeS9CdWlsZGluZ1JlcG9zaXRvcnknKTtcclxuaW1wb3J0IFVzZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi8uLi8uLi9mcmFtZXdvcmsvc2VydmljZXMvVXNlclNlcnZpY2UnKTtcclxuaW1wb3J0IFByb2plY3RBc3NldCA9IHJlcXVpcmUoJy4uLy4uL2ZyYW1ld29yay9zaGFyZWQvcHJvamVjdGFzc2V0Jyk7XHJcbmltcG9ydCBVc2VyID0gcmVxdWlyZSgnLi4vLi4vZnJhbWV3b3JrL2RhdGFhY2Nlc3MvbW9uZ29vc2UvdXNlcicpO1xyXG5pbXBvcnQgUHJvamVjdCA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9uZ29vc2UvUHJvamVjdCcpO1xyXG5pbXBvcnQgQnVpbGRpbmcgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vbmdvb3NlL0J1aWxkaW5nJyk7XHJcbmltcG9ydCBCdWlsZGluZ01vZGVsID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL0J1aWxkaW5nJyk7XHJcbmltcG9ydCBBdXRoSW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi8uLi9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvcicpO1xyXG5pbXBvcnQgQ29zdENvbnRyb2xsRXhjZXB0aW9uID0gcmVxdWlyZSgnLi4vZXhjZXB0aW9uL0Nvc3RDb250cm9sbEV4Y2VwdGlvbicpO1xyXG5pbXBvcnQgUXVhbnRpdHkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUXVhbnRpdHknKTtcclxuaW1wb3J0IFJhdGUgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUmF0ZScpO1xyXG5pbXBvcnQgQ29zdEhlYWQgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvQ29zdEhlYWQnKTtcclxuaW1wb3J0IFdvcmtJdGVtID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1dvcmtJdGVtJyk7XHJcbmltcG9ydCBSYXRlQW5hbHlzaXNTZXJ2aWNlID0gcmVxdWlyZSgnLi9SYXRlQW5hbHlzaXNTZXJ2aWNlJyk7XHJcbmltcG9ydCBDYXRlZ29yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9idWlsZGluZy9DYXRlZ29yeScpO1xyXG5pbXBvcnQgYWxhc3FsID0gcmVxdWlyZSgnYWxhc3FsJyk7XHJcbmltcG9ydCBCdWRnZXRDb3N0UmF0ZXMgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9CdWRnZXRDb3N0UmF0ZXMnKTtcclxuaW1wb3J0IFRodW1iUnVsZVJhdGUgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9UaHVtYlJ1bGVSYXRlJyk7XHJcbmltcG9ydCBDb25zdGFudHMgPSByZXF1aXJlKCcuLi8uLi9hcHBsaWNhdGlvblByb2plY3Qvc2hhcmVkL2NvbnN0YW50cycpO1xyXG5pbXBvcnQgUXVhbnRpdHlEZXRhaWxzID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1F1YW50aXR5RGV0YWlscycpO1xyXG5pbXBvcnQgUmF0ZUl0ZW0gPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUmF0ZUl0ZW0nKTtcclxuaW1wb3J0IENhdGVnb3JpZXNMaXN0V2l0aFJhdGVzRFRPID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9kdG8vcHJvamVjdC9DYXRlZ29yaWVzTGlzdFdpdGhSYXRlc0RUTycpO1xyXG5pbXBvcnQgQ2VudHJhbGl6ZWRSYXRlID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L0NlbnRyYWxpemVkUmF0ZScpO1xyXG5pbXBvcnQgbWVzc2FnZXMgID0gcmVxdWlyZSgnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L3NoYXJlZC9tZXNzYWdlcycpO1xyXG5pbXBvcnQgeyBDb21tb25TZXJ2aWNlIH0gZnJvbSAnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L3NoYXJlZC9Db21tb25TZXJ2aWNlJztcclxuaW1wb3J0IFdvcmtJdGVtTGlzdFdpdGhSYXRlc0RUTyA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvZHRvL3Byb2plY3QvV29ya0l0ZW1MaXN0V2l0aFJhdGVzRFRPJyk7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIG11bHRpcGFydHkgZnJvbSAnbXVsdGlwYXJ0eSc7XHJcbmltcG9ydCB7IEF0dGFjaG1lbnREZXRhaWxzTW9kZWwgfSBmcm9tICcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvQXR0YWNobWVudERldGFpbHMnO1xyXG5sZXQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XHJcbmxldCBsb2c0anMgPSByZXF1aXJlKCdsb2c0anMnKTtcclxuaW1wb3J0ICogYXMgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnO1xyXG5pbXBvcnQgUmF0ZUFuYWx5c2lzID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9SYXRlQW5hbHlzaXMvUmF0ZUFuYWx5c2lzJyk7XHJcbmltcG9ydCBTdGVlbFF1YW50aXR5SXRlbXMgPSByZXF1aXJlKFwiLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1N0ZWVsUXVhbnRpdHlJdGVtc1wiKTtcclxuXHJcbi8vaW1wb3J0IFJhdGVJdGVtc0FuYWx5c2lzRGF0YSA9IHJlcXVpcmUoXCIuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUmF0ZUl0ZW1zQW5hbHlzaXNEYXRhXCIpO1xyXG5cclxubGV0IENDUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zJyk7XHJcbmxldCBsb2dnZXI9bG9nNGpzLmdldExvZ2dlcignUHJvamVjdCBzZXJ2aWNlJyk7XHJcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxubGV0IE9iamVjdElkID0gbW9uZ29vc2UuVHlwZXMuT2JqZWN0SWQ7XHJcbmNsYXNzIFByb2plY3RTZXJ2aWNlIHtcclxuICBBUFBfTkFNRTogc3RyaW5nO1xyXG4gIGNvbXBhbnlfbmFtZTogc3RyaW5nO1xyXG4gIGNvc3RIZWFkSWQ6IG51bWJlcjtcclxuICBjYXRlZ29yeUlkOiBudW1iZXI7XHJcbiAgd29ya0l0ZW1JZDogbnVtYmVyO1xyXG4gIHNob3dIaWRlQWRkSXRlbUJ1dHRvbjpib29sZWFuPXRydWU7XHJcbiAgcHJpdmF0ZSBwcm9qZWN0UmVwb3NpdG9yeTogUHJvamVjdFJlcG9zaXRvcnk7XHJcbiAgcHJpdmF0ZSBidWlsZGluZ1JlcG9zaXRvcnk6IEJ1aWxkaW5nUmVwb3NpdG9yeTtcclxuICBwcml2YXRlIGF1dGhJbnRlcmNlcHRvcjogQXV0aEludGVyY2VwdG9yO1xyXG4gIHByaXZhdGUgdXNlclNlcnZpY2U6IFVzZXJTZXJ2aWNlO1xyXG4gIHByaXZhdGUgY29tbW9uU2VydmljZTogQ29tbW9uU2VydmljZTtcclxuXHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeSA9IG5ldyBQcm9qZWN0UmVwb3NpdG9yeSgpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkgPSBuZXcgQnVpbGRpbmdSZXBvc2l0b3J5KCk7XHJcbiAgICB0aGlzLkFQUF9OQU1FID0gUHJvamVjdEFzc2V0LkFQUF9OQU1FO1xyXG4gICAgdGhpcy5hdXRoSW50ZXJjZXB0b3IgPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XHJcbiAgICB0aGlzLnVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XHJcbiAgICB0aGlzLmNvbW1vblNlcnZpY2UgPSBuZXcgQ29tbW9uU2VydmljZSgpO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlUHJvamVjdChkYXRhOiBQcm9qZWN0LCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBpZiAoIXVzZXIuX2lkKSB7XHJcbiAgICAgIGNhbGxiYWNrKG5ldyBDb3N0Q29udHJvbGxFeGNlcHRpb24oJ1VzZXJJZCBOb3QgRm91bmQnLCBudWxsKSwgbnVsbCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy51c2VyU2VydmljZS5jaGVja0ZvclZhbGlkU3Vic2NyaXB0aW9uKHVzZXIuX2lkLCAoZXJyLCByZXNwKSA9PiB7XHJcbiAgICAgIGlmKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYocmVzcC5zdWJzY3JpcHRpb24pIHtcclxuICAgICAgICAgIGlmKHJlc3Auc3Vic2NyaXB0aW9uLnZhbGlkaXR5ID09PSAxNSAmJlxyXG4gICAgICAgICAgICByZXNwLnN1YnNjcmlwdGlvbi5wdXJjaGFzZWQubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgIGxldCBwcmVmaXggPSAnVHJpYWwgUHJvamVjdCAnO1xyXG4gICAgICAgICAgICBsZXQgcHJvamVjdE5hbWUgPSBwcmVmaXguY29uY2F0KGRhdGEubmFtZSk7XHJcbiAgICAgICAgICAgIGRhdGEubmFtZSA9IHByb2plY3ROYW1lO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5jcmVhdGUoZGF0YSwgKGVyciwgcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNyZWF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ1Byb2plY3QgSUQgOiAnICsgcmVzLl9pZCk7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdQcm9qZWN0IE5hbWUgOiAnICsgcmVzLm5hbWUpO1xyXG4gICAgICAgICAgICAgIGxldCBwcm9qZWN0SWQgPSByZXMuX2lkO1xyXG5cclxuICAgICAgICAgICAgICB0aGlzLnVzZXJTZXJ2aWNlLmZpbmRCeUlkKHVzZXIuX2lkLCAoZXJyLCByZXNwKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGxldCBzdWJzY3JpcHRpb25QYWNrYWdlTGlzdCA9IHJlc3Auc3Vic2NyaXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgICBmb3IobGV0IHN1YnNjcmlwdGlvbiBvZiBzdWJzY3JpcHRpb25QYWNrYWdlTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHN1YnNjcmlwdGlvbi5wcm9qZWN0SWQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb24ucHJvamVjdElkLnB1c2gocHJvamVjdElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIGxldCBuZXdEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICRwdXNoOiB7cHJvamVjdDogcHJvamVjdElkfSxcclxuICAgICAgICAgICAgICAgICAgICAkc2V0IDogeyBzdWJzY3JpcHRpb24gOiBzdWJzY3JpcHRpb25QYWNrYWdlTGlzdH1cclxuICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGxldCBxdWVyeSA9IHtfaWQ6IHVzZXIuX2lkfTtcclxuICAgICAgICAgICAgICAgICAgdGhpcy51c2VyU2VydmljZS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVyciwgcmVzcCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJlcy5jYXRlZ29yeTtcclxuICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSByZXMucmF0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldFByb2plY3RCeUlkKHByb2plY3RJZDogc3RyaW5nLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSB7X2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHBvcHVsYXRlID0ge3BhdGg6ICdidWlsZGluZycsIHNlbGVjdDogWyduYW1lJywgJ3RvdGFsU2xhYkFyZWEnLF19O1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQW5kUG9wdWxhdGUocXVlcnksIHBvcHVsYXRlLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQW5kUG9wdWxhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGxvZ2dlci5kZWJ1ZygnUHJvamVjdCBOYW1lIDogJyArIHJlc3VsdFswXS5uYW1lKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzKHByb2plY3RJZDogc3RyaW5nLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzIGZvciBzeW5jIHdpdGggcmF0ZUFuYWx5c2lzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHF1ZXJ5ID0ge19pZDogcHJvamVjdElkfTtcclxuICAgIGxldCBwb3B1bGF0ZSA9IHtwYXRoOiAnYnVpbGRpbmdzJ307XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRBbmRQb3B1bGF0ZShxdWVyeSwgcG9wdWxhdGUsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRBbmRQb3B1bGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgbG9nZ2VyLmVycm9yKCdQcm9qZWN0IHNlcnZpY2UsIGdldFByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMgZmluZEFuZFBvcHVsYXRlIGZhaWxlZCAnICsgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzIHN1Y2Nlc3MuJyk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3VsdH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVByb2plY3RCeUlkKHByb2plY3REZXRhaWxzOiBQcm9qZWN0LCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGVQcm9qZWN0RGV0YWlscyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHtfaWQ6IHByb2plY3REZXRhaWxzLl9pZH07XHJcbiAgICBsZXQgYnVpbGRpbmdJZCA9ICcnO1xyXG5cclxuICAgIHRoaXMuZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyhwcm9qZWN0RGV0YWlscy5faWQsIChlcnJvciwgcHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBsb2dnZXIuZXJyb3IoJ1Byb2plY3Qgc2VydmljZSwgZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyBmYWlsZWQnKTtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHN5bmNQcm9qZWN0V2l0aFJhdGVBbmFseXNpc0RhdGEuJyk7XHJcbiAgICAgICAgbGV0IHByb2plY3REYXRhID0gcHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscy5kYXRhWzBdO1xyXG4gICAgICAgIGxldCBidWlsZGluZ3MgPSBwcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzLmRhdGFbMF0uYnVpbGRpbmdzO1xyXG4gICAgICAgIGxldCBidWlsZGluZ0RhdGE6IEJ1aWxkaW5nO1xyXG4gICAgICAgIGRlbGV0ZSBwcm9qZWN0RGV0YWlscy5faWQ7XHJcbiAgICAgICAgcHJvamVjdERldGFpbHMucHJvamVjdENvc3RIZWFkcyA9IHByb2plY3REYXRhLnByb2plY3RDb3N0SGVhZHM7XHJcbiAgICAgICAgcHJvamVjdERldGFpbHMuYnVpbGRpbmdzID0gcHJvamVjdERhdGEuYnVpbGRpbmdzO1xyXG4gICAgICAgIHByb2plY3REZXRhaWxzLnByb2plY3RDb3N0SGVhZHMgPSB0aGlzLmNhbGN1bGF0ZUJ1ZGdldENvc3RGb3JDb21tb25BbW1lbml0aWVzKHByb2plY3REYXRhLnByb2plY3RDb3N0SGVhZHMsIHByb2plY3REZXRhaWxzKTtcclxuXHJcbiAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBwcm9qZWN0RGV0YWlscywge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVQcm9qZWN0U3RhdHVzKHByb2plY3RJZDogc3RyaW5nLCB1c2VyOiBVc2VyLGFjdGl2ZVN0YXR1czpzdHJpbmcsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxldCBxdWVyeSA9IHsnX2lkJzogcHJvamVjdElkfTtcclxuICAgIGxldCBzdGF0dXMgPSBKU09OLnBhcnNlKGFjdGl2ZVN0YXR1cyk7XHJcbiAgICBsZXQgbmV3RGF0YSA9IHskc2V0OiB7J2FjdGl2ZVN0YXR1cyc6IGFjdGl2ZVN0YXR1c319O1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVyciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6J3N1Y2Nlc3MnLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuICB1cGRhdGVQcm9qZWN0TmFtZUJ5SWQocHJvamVjdElkOiBzdHJpbmcsIG5hbWU6c3RyaW5nLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSB7J19pZCc6IHByb2plY3RJZH07XHJcbiAgICBsZXQgbmV3RGF0YSA9IHskc2V0OiB7J25hbWUnOiBuYW1lfX07XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXc6IHRydWV9LCAoZXJyLCByZXNwb25zZSkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTpyZXNwb25zZS5uYW1lLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuICBjcmVhdGVCdWlsZGluZyhwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdEZXRhaWxzOiBCdWlsZGluZywgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZ2V0TWF0ZXJpYWxGaWx0ZXJzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHF1ZXJ5ID0geyBfaWQ6IHByb2plY3RJZH07XHJcbiAgICBsZXQgcG9wdWxhdGUgPSB7cGF0aCA6ICdidWlsZGluZ3MnLCBzZWxlY3Q6IFsnbmFtZSddfTtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZEFuZFBvcHVsYXRlKHF1ZXJ5LCBwb3B1bGF0ZSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1JlcG9ydCBTZXJ2aWNlLCBmaW5kQW5kUG9wdWxhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBidWlsZGluZ05hbWUgPSBidWlsZGluZ0RldGFpbHMubmFtZTtcclxuXHJcbiAgICAgICAgbGV0IGJ1aWxkaW5nOiBBcnJheTxCdWlsZGluZz4gPSByZXN1bHRbMF0uYnVpbGRpbmdzLmZpbHRlcihcclxuICAgICAgICAgIGZ1bmN0aW9uIChidWlsZGluZzogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBidWlsZGluZy5uYW1lID09PSBidWlsZGluZ05hbWU7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYoYnVpbGRpbmcubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5jcmVhdGUoYnVpbGRpbmdEZXRhaWxzLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjcmVhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgICAgICAgIGxldCBuZXdEYXRhID0geyRwdXNoOiB7YnVpbGRpbmdzOiByZXN1bHQuX2lkfX07XHJcbiAgICAgICAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCBzdGF0dXMpID0+IHtcclxuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3VsdCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2VzLk1TR19FUlJPUl9CVUlMRElOR19OQU1FX0FMUkVBRFlfRVhJU1Q7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlQnVpbGRpbmdCeUlkKHByb2plY3RJZCA6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBidWlsZGluZ0RldGFpbHM6IGFueSwgdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgdXBkYXRlQnVpbGRpbmcgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcXVlcnkgPSB7X2lkOiBidWlsZGluZ0lkfTtcclxuICAgIGxldCBwcm9qZWN0aW9uID0geydjb3N0SGVhZHMnOiAxfTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkV2l0aFByb2plY3Rpb24oYnVpbGRpbmdJZCwgcHJvamVjdGlvbiwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyhwcm9qZWN0SWQsIChlcnJvciwgcHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscykgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcignUHJvamVjdCBzZXJ2aWNlLCBnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzIGZhaWxlZCcpO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgbGV0IHByb2plY3REYXRhID0gcHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscy5kYXRhWzBdO1xyXG4gICAgICAgICAgICBsZXQgYnVpbGRpbmc6IEFycmF5PEJ1aWxkaW5nPiA9IHByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMuZGF0YVswXS5idWlsZGluZ3MuZmlsdGVyKFxyXG4gICAgICAgICAgICAgIGZ1bmN0aW9uIChidWlsZGluZzogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVpbGRpbmcubmFtZSA9PT0gYnVpbGRpbmdEZXRhaWxzLm5hbWU7XHJcbiAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgaWYoYnVpbGRpbmcubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICBidWlsZGluZ0RldGFpbHMuY29zdEhlYWRzID0gdGhpcy5jYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQnVpbGRpbmcocmVzdWx0LmNvc3RIZWFkcywgYnVpbGRpbmdEZXRhaWxzLCBwcm9qZWN0RGF0YSk7XHJcbiAgICAgICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBidWlsZGluZ0RldGFpbHMsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAvKiB0aGlzLmdldFByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMocHJvamVjdElkLCBidWlsZGluZ0lkLCAoZXJyb3IsIHByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMpID0+IHtcclxuICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdQcm9qZWN0IHNlcnZpY2UsIGdldFByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMgZmFpbGVkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgKi9cclxuXHJcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBzeW5jUHJvamVjdFdpdGhSYXRlQW5hbHlzaXNEYXRhLicpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHByb2plY3RDb3N0SGVhZHMgPSB0aGlzLmNhbGN1bGF0ZUJ1ZGdldENvc3RGb3JDb21tb25BbW1lbml0aWVzKHByb2plY3REYXRhLnByb2plY3RDb3N0SGVhZHMsIHByb2plY3REYXRhKTtcclxuICAgICAgICAgICAgICAgIGxldCBxdWVyeUZvclByb2plY3QgPSB7J19pZCc6IHByb2plY3RJZH07XHJcbiAgICAgICAgICAgICAgICBsZXQgdXBkYXRlUHJvamVjdENvc3RIZWFkID0geyRzZXQ6IHsncHJvamVjdENvc3RIZWFkcyc6IHByb2plY3RDb3N0SGVhZHN9fTtcclxuXHJcbiAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdDYWxsaW5nIHVwZGF0ZSBwcm9qZWN0IENvc3RoZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5Rm9yUHJvamVjdCwgdXBkYXRlUHJvamVjdENvc3RIZWFkLCB7bmV3OiB0cnVlfSxcclxuICAgICAgICAgICAgICAgICAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgdXBkYXRlIHByb2plY3QgQ29zdGhlYWRzIDogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnVXBkYXRlIHByb2plY3QgQ29zdGhlYWRzIHN1Y2Nlc3MnKTtcclxuICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3VsdCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAvKiB9XHJcbiAgICAgICAgICAgICAgfSk7Ki9cclxuICAgICAgICAgICAgIH1cclxuICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgICAgICBsZXQgZXJyb3IgPSBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgICBlcnJvci5tZXNzYWdlID0gbWVzc2FnZXMuTVNHX0VSUk9SX0JVSUxESU5HX05BTUVfQUxSRUFEWV9FWElTVDtcclxuICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRJbkFjdGl2ZVByb2plY3RDb3N0SGVhZHMocHJvamVjdElkOiBzdHJpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldEluQWN0aXZlQ29zdEhlYWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkKHByb2plY3RJZCwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRCeUlkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnZ2V0dGluZyBJbkFjdGl2ZSBDb3N0SGVhZCBmb3IgUHJvamVjdCBOYW1lIDogJyArIHJlc3VsdC5uYW1lKTtcclxuICAgICAgICBsZXQgcmVzcG9uc2UgPSByZXN1bHQucHJvamVjdENvc3RIZWFkcztcclxuICAgICAgICBsZXQgaW5BY3RpdmVDb3N0SGVhZCA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGNvc3RIZWFkSXRlbSBvZiByZXNwb25zZSkge1xyXG4gICAgICAgICAgaWYgKCFjb3N0SGVhZEl0ZW0uYWN0aXZlKSB7XHJcbiAgICAgICAgICAgIGluQWN0aXZlQ29zdEhlYWQucHVzaChjb3N0SGVhZEl0ZW0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogaW5BY3RpdmVDb3N0SGVhZCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHNldFByb2plY3RDb3N0SGVhZFN0YXR1cyhwcm9qZWN0SWQ6IHN0cmluZywgY29zdEhlYWRJZDogbnVtYmVyLCBjb3N0SGVhZEFjdGl2ZVN0YXR1czogc3RyaW5nLCB1c2VyOiBVc2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSB7J19pZCc6IHByb2plY3RJZCwgJ3Byb2plY3RDb3N0SGVhZHMucmF0ZUFuYWx5c2lzSWQnOiBjb3N0SGVhZElkfTtcclxuICAgIGxldCBhY3RpdmVTdGF0dXMgPSBKU09OLnBhcnNlKGNvc3RIZWFkQWN0aXZlU3RhdHVzKTtcclxuICAgIGxldCBuZXdEYXRhID0geyRzZXQ6IHsncHJvamVjdENvc3RIZWFkcy4kLmFjdGl2ZSc6IGFjdGl2ZVN0YXR1c319O1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVyciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3BvbnNlLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcblxyXG4gIGNsb25lQnVpbGRpbmdEZXRhaWxzKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIG9sZEJ1aWxkaW5nRGV0YWlsczogQnVpbGRpbmcsIHVzZXI6IFVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlcnJvcjogRXJyb3IsIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjbG9uZUJ1aWxkaW5nRGV0YWlscyBoYXMgYmVlbiBoaXQnKTtcclxuXHJcbiAgICBsZXQgcXVlcnkgPSB7IF9pZDogcHJvamVjdElkfTtcclxuICAgIGxldCBwb3B1bGF0ZSA9IHtwYXRoIDogJ2J1aWxkaW5ncycsIHNlbGVjdDogWyduYW1lJ119O1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQW5kUG9wdWxhdGUocXVlcnksIHBvcHVsYXRlLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUmVwb3J0IFNlcnZpY2UsIGZpbmRBbmRQb3B1bGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGJ1aWxkaW5nTmFtZSA9IG9sZEJ1aWxkaW5nRGV0YWlscy5uYW1lO1xyXG5cclxuICAgICAgICBsZXQgYnVpbGRpbmc6IEFycmF5PEJ1aWxkaW5nPiA9IHJlc3VsdFswXS5idWlsZGluZ3MuZmlsdGVyKFxyXG4gICAgICAgICAgZnVuY3Rpb24gKGJ1aWxkaW5nOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGJ1aWxkaW5nLm5hbWUgPT09IGJ1aWxkaW5nTmFtZTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZihidWlsZGluZy5sZW5ndGggPT09IDApIHtcclxuXHJcbiAgICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRCeUlkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbGV0IGNvc3RIZWFkczpDb3N0SGVhZFtdID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgICAgICAgIGxldCByYXRlQW5hbHlzaXNEYXRhO1xyXG4gICAgICAgICAgICAgIGlmIChvbGRCdWlsZGluZ0RldGFpbHMuY2xvbmVJdGVtcyAmJiBvbGRCdWlsZGluZ0RldGFpbHMuY2xvbmVJdGVtcy5pbmRleE9mKENvbnN0YW50cy5SQVRFX0FOQUxZU0lTX0NMT05FKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGxldCByYXRlQW5hbHlzaXNTZXJ2aWNlOiBSYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICAgICAgICAgICAgICAgIGxldCBjb3N0Q29udHJvbFJlZ2lvbiA9IGNvbmZpZy5nZXQoJ2Nvc3RDb250cm9sUmVnaW9uQ29kZScpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHF1ZXJ5ID0gW1xyXG4gICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgJG1hdGNoOiB7ICdyZWdpb24nOiBjb3N0Q29udHJvbFJlZ2lvbiB9XHJcbiAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICRwcm9qZWN0OiB7ICdidWlsZGluZ0Nvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcyc6MSB9XHJcbiAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgIHskdW53aW5kOiAnJGJ1aWxkaW5nQ29zdEhlYWRzJ30sXHJcbiAgICAgICAgICAgICAgICAgIHskdW53aW5kOiAnJGJ1aWxkaW5nQ29zdEhlYWRzLmNhdGVnb3JpZXMnfSxcclxuICAgICAgICAgICAgICAgICAgeyR1bndpbmQ6ICckYnVpbGRpbmdDb3N0SGVhZHMuY2F0ZWdvcmllcy53b3JrSXRlbXMnfSxcclxuICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICRwcm9qZWN0OntfaWQ6MCx3b3JrSXRlbTonJGJ1aWxkaW5nQ29zdEhlYWRzLmNhdGVnb3JpZXMud29ya0l0ZW1zJ31cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgIHJhdGVBbmFseXNpc1NlcnZpY2UuZ2V0QWdncmVnYXRlRGF0YShxdWVyeSwoZXJyb3IsIHdvcmtJdGVtQWdncmVnYXRlRGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlZ2lvbk5hbWUgPSBjb25maWcuZ2V0KCdjb3N0Q29udHJvbFJlZ2lvbkNvZGUnKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYWdncmVnYXRlUXVlcnkgPSB7ICdyZWdpb24nIDogcmVnaW9uTmFtZSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHJhdGVBbmFseXNpc1NlcnZpY2UuZ2V0Q29zdENvbnRyb2xSYXRlQW5hbHlzaXMoYWdncmVnYXRlUXVlcnksXHJcbiAgICAgICAgICAgICAgICAgICAgICB7J2J1aWxkaW5nUmF0ZXMnOjF9LCAoZXJyOiBhbnksIGRhdGE6YW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZihlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdldFJhdGVzQW5kQ29zdEhlYWRzKHByb2plY3RJZCxvbGRCdWlsZGluZ0RldGFpbHMsIGJ1aWxkaW5nLCBjb3N0SGVhZHMsd29ya0l0ZW1BZ2dyZWdhdGVEYXRhLHVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5idWlsZGluZ1JhdGVzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldFJhdGVzQW5kQ29zdEhlYWRzKHByb2plY3RJZCxvbGRCdWlsZGluZ0RldGFpbHMsIGJ1aWxkaW5nLCBjb3N0SGVhZHMsbnVsbCwgdXNlcixcclxuICAgICAgICAgICAgICAgICAgbnVsbCwgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2VzLk1TR19FUlJPUl9CVUlMRElOR19OQU1FX0FMUkVBRFlfRVhJU1Q7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcblxyXG4gIH1cclxuXHJcbiAgZ2V0UmF0ZXNBbmRDb3N0SGVhZHMocHJvamVjdElkOiBzdHJpbmcsb2xkQnVpbGRpbmdEZXRhaWxzOiBCdWlsZGluZywgYnVpbGRpbmc6QnVpbGRpbmcsIGNvc3RIZWFkczogQ29zdEhlYWRbXSx3b3JrSXRlbUFnZ3JlZ2F0ZURhdGE6YW55LFxyXG4gICAgICAgICAgICAgIHVzZXI6IFVzZXIsIGNlbnRyYWxpemVkUmF0ZXM6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogRXJyb3IsIHJlc3VsdDogQnVpbGRpbmcpID0+IHZvaWQpIHtcclxuICAgIHRoaXMuZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyhwcm9qZWN0SWQsICAoZXJyb3IsIHByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgbG9nZ2VyLmVycm9yKCdQcm9qZWN0IHNlcnZpY2UsIGdldFJhdGVzQW5kQ29zdEhlYWRzIGZhaWxlZCcpO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcHJvamVjdERhdGEgPSBwcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzLmRhdGFbMF07XHJcbiAgICBvbGRCdWlsZGluZ0RldGFpbHMuY29zdEhlYWRzID0gdGhpcy5jYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQnVpbGRpbmcoYnVpbGRpbmcuY29zdEhlYWRzLCBvbGRCdWlsZGluZ0RldGFpbHMsIHByb2plY3REYXRhKTtcclxuICAgIHRoaXMuY2xvbmVDb3N0SGVhZHMoY29zdEhlYWRzLCBvbGRCdWlsZGluZ0RldGFpbHMsd29ya0l0ZW1BZ2dyZWdhdGVEYXRhKTtcclxuICAgIGlmKG9sZEJ1aWxkaW5nRGV0YWlscy5jbG9uZUl0ZW1zLmluZGV4T2YoQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQ0xPTkUpID09PSAtMSkge1xyXG4gICAgICAvL29sZEJ1aWxkaW5nRGV0YWlscy5yYXRlcz10aGlzLmdldENlbnRyYWxpemVkUmF0ZXMocmF0ZUFuYWx5c2lzRGF0YSwgb2xkQnVpbGRpbmdEZXRhaWxzLmNvc3RIZWFkcyk7XHJcbiAgICAgIG9sZEJ1aWxkaW5nRGV0YWlscy5yYXRlcyA9IGNlbnRyYWxpemVkUmF0ZXM7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBvbGRCdWlsZGluZ0RldGFpbHMucmF0ZXMgPSBidWlsZGluZy5yYXRlcztcclxuICAgIH1cclxuICAgIHRoaXMuY3JlYXRlQnVpbGRpbmcocHJvamVjdElkLCBvbGRCdWlsZGluZ0RldGFpbHMsIHVzZXIsIChlcnJvciwgcmVzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjbG9uZUNvc3RIZWFkcyhjb3N0SGVhZHM6IGFueVtdLCBvbGRCdWlsZGluZ0RldGFpbHM6IEJ1aWxkaW5nLHJhdGVBbmFseXNpc0RhdGE6YW55KSB7XHJcbiAgICBsZXQgaXNDbG9uZTogYm9vbGVhbiA9IChvbGRCdWlsZGluZ0RldGFpbHMuY2xvbmVJdGVtcyAmJiBvbGRCdWlsZGluZ0RldGFpbHMuY2xvbmVJdGVtcy5pbmRleE9mKENvbnN0YW50cy5DT1NUX0hFQURfQ0xPTkUpICE9PSAtMSk7XHJcbiAgICBmb3IgKGxldCBjb3N0SGVhZEluZGV4IGluIGNvc3RIZWFkcykge1xyXG4gICAgICBpZiAocGFyc2VJbnQoY29zdEhlYWRJbmRleCkgPCBjb3N0SGVhZHMubGVuZ3RoKSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkID0gY29zdEhlYWRzW2Nvc3RIZWFkSW5kZXhdO1xyXG4gICAgICAgIGlmICghaXNDbG9uZSkge1xyXG4gICAgICAgICAgY29zdEhlYWQuYWN0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvc3RIZWFkc1tjb3N0SGVhZEluZGV4XSA9IHRoaXMuY2xvbmVDYXRlZ29yeShjb3N0SGVhZC5jYXRlZ29yaWVzLCBvbGRCdWlsZGluZ0RldGFpbHMuY2xvbmVJdGVtcyxyYXRlQW5hbHlzaXNEYXRhKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNvc3RIZWFkcztcclxuICB9XHJcblxyXG4gIGNsb25lQ2F0ZWdvcnkoY2F0ZWdvcmllczogQ2F0ZWdvcnlbXSwgY2xvbmVJdGVtczogc3RyaW5nW10scmF0ZUFuYWx5c2lzRGF0YTphbnkpIHtcclxuICAgIGZvciAobGV0IGNhdGVnb3J5SW5kZXggaW4gY2F0ZWdvcmllcykge1xyXG4gICAgICBsZXQgY2F0ZWdvcnkgPSBjYXRlZ29yaWVzW2NhdGVnb3J5SW5kZXhdO1xyXG4gICAgICBjYXRlZ29yaWVzW2NhdGVnb3J5SW5kZXhdLndvcmtJdGVtcyA9IHRoaXMuY2xvbmVXb3JrSXRlbXMoY2F0ZWdvcnkud29ya0l0ZW1zLCBjbG9uZUl0ZW1zLHJhdGVBbmFseXNpc0RhdGEpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNhdGVnb3JpZXM7XHJcbiAgfVxyXG5cclxuICBjbG9uZVdvcmtJdGVtcyh3b3JrSXRlbXM6IFdvcmtJdGVtW10sIGNsb25lSXRlbXM6IHN0cmluZ1tdLHJhdGVBbmFseXNpc0RhdGE6YW55KSB7XHJcbiAgICBsZXQgaXNDbG9uZTogYm9vbGVhbiA9IChjbG9uZUl0ZW1zICYmIGNsb25lSXRlbXMuaW5kZXhPZihDb25zdGFudHMuV09SS19JVEVNX0NMT05FKSAhPT0gLTEpO1xyXG4gICAgZm9yIChsZXQgd29ya0l0ZW1JbmRleCBpbiB3b3JrSXRlbXMpIHtcclxuICAgICAgbGV0IHdvcmtJdGVtID0gd29ya0l0ZW1zW3dvcmtJdGVtSW5kZXhdO1xyXG4gICAgICBpZiAoIWlzQ2xvbmUpIHtcclxuICAgICAgICB3b3JrSXRlbS5hY3RpdmUgPSBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmNsb25lUmF0ZSh3b3JrSXRlbSwgY2xvbmVJdGVtcyxyYXRlQW5hbHlzaXNEYXRhKTtcclxuICAgICAgdGhpcy5jbG9uZVF1YW50aXR5KHdvcmtJdGVtLCBjbG9uZUl0ZW1zKTtcclxuICAgIH1cclxuICAgIHJldHVybiB3b3JrSXRlbXM7XHJcbiAgfVxyXG5cclxuICBjbG9uZVJhdGUod29ya0l0ZW06IFdvcmtJdGVtLCBjbG9uZUl0ZW1zOiBzdHJpbmdbXSxyYXRlQW5hbHlzaXNEYXRhOmFueSkge1xyXG4gICAgbGV0IGlzQ2xvbmU6IGJvb2xlYW4gPSBjbG9uZUl0ZW1zICYmIGNsb25lSXRlbXMuaW5kZXhPZihDb25zdGFudHMuUkFURV9BTkFMWVNJU19DTE9ORSkgIT09IC0xO1xyXG4gICAgbGV0IHJhdGVBbmFseXNpc1NlcnZpY2U6IFJhdGVBbmFseXNpc1NlcnZpY2UgPSBuZXcgUmF0ZUFuYWx5c2lzU2VydmljZSgpO1xyXG4gICAgbGV0IGNvbmZpZ1dvcmtJdGVtcyA9IG5ldyBBcnJheTxXb3JrSXRlbT4oKTtcclxuICAgIGlmICghaXNDbG9uZSkge1xyXG4gICAgICAvKndvcmtJdGVtID0gcmF0ZUFuYWx5c2lzU2VydmljZS5nZXRSYXRlQW5hbHlzaXMod29ya0l0ZW0sIGNvbmZpZ1dvcmtJdGVtcywgcmF0ZUFuYWx5c2lzRGF0YS5yYXRlcyxcclxuICAgICAgICByYXRlQW5hbHlzaXNEYXRhLnVuaXRzLCByYXRlQW5hbHlzaXNEYXRhLm5vdGVzKTsqL1xyXG4gICAgICB3b3JrSXRlbSA9IHRoaXMuY2xvbmVkV29ya2l0ZW1XaXRoUmF0ZUFuYWx5c2lzKHdvcmtJdGVtLCByYXRlQW5hbHlzaXNEYXRhKTtcclxuICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gIGNsb25lUXVhbnRpdHkod29ya0l0ZW06IFdvcmtJdGVtLCBjbG9uZUl0ZW1zOiBzdHJpbmdbXSkge1xyXG4gICAgbGV0IGlzQ2xvbmU6IGJvb2xlYW4gPSAoY2xvbmVJdGVtcyAmJiBjbG9uZUl0ZW1zLmluZGV4T2YoQ29uc3RhbnRzLlFVQU5USVRZX0NMT05FKSAhPT0gLTEpO1xyXG4gICAgaWYgKCFpc0Nsb25lKSB7XHJcbiAgICAgIHdvcmtJdGVtLnF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHMgPSBbXTtcclxuICAgICAgd29ya0l0ZW0ucXVhbnRpdHkuaXNEaXJlY3RRdWFudGl0eSA9IGZhbHNlO1xyXG4gICAgICB3b3JrSXRlbS5xdWFudGl0eS5pc0VzdGltYXRlZCA9IGZhbHNlO1xyXG4gICAgICB3b3JrSXRlbS5xdWFudGl0eS50b3RhbCA9IDA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gd29ya0l0ZW07XHJcbiAgfVxyXG5cclxuXHJcbiAgZ2V0QnVpbGRpbmdCeUlkKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldEJ1aWxkaW5nIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZEJ5SWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogcmVzdWx0LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0QnVpbGRpbmdSYXRlSXRlbXNCeU9yaWdpbmFsTmFtZShwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBvcmlnaW5hbFJhdGVJdGVtTmFtZTogc3RyaW5nLCB1c2VyOiBVc2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbGV0IHByb2plY3Rpb24gPSB7J3JhdGVzJzogMSwgX2lkOiAwfTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkV2l0aFByb2plY3Rpb24oYnVpbGRpbmdJZCwgcHJvamVjdGlvbiwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBTZXJ2aWNlLCBnZXRCdWlsZGluZ1JhdGVJdGVtc0J5T3JpZ2luYWxOYW1lIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGJ1aWxkaW5nUmF0ZUl0ZW1zQXJyYXkgPSBidWlsZGluZy5yYXRlcztcclxuICAgICAgICBsZXQgY2VudHJhbGl6ZWRSYXRlSXRlbXNBcnJheSA9IHRoaXMuZ2V0UmF0ZUl0ZW1zQXJyYXkoYnVpbGRpbmdSYXRlSXRlbXNBcnJheSwgb3JpZ2luYWxSYXRlSXRlbU5hbWUpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiBjZW50cmFsaXplZFJhdGVJdGVtc0FycmF5LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0UmF0ZUl0ZW1zQXJyYXkob3JpZ2luYWxSYXRlSXRlbXNBcnJheTogQXJyYXk8Q2VudHJhbGl6ZWRSYXRlPiwgb3JpZ2luYWxSYXRlSXRlbU5hbWU6IHN0cmluZykge1xyXG5cclxuICAgIGxldCBjZW50cmFsaXplZFJhdGVJdGVtc0FycmF5OiBBcnJheTxDZW50cmFsaXplZFJhdGU+O1xyXG4gICAgY2VudHJhbGl6ZWRSYXRlSXRlbXNBcnJheSA9IGFsYXNxbCgnU0VMRUNUICogRlJPTSA/IHdoZXJlIFRSSU0ob3JpZ2luYWxJdGVtTmFtZSkgPSA/JywgW29yaWdpbmFsUmF0ZUl0ZW1zQXJyYXksIG9yaWdpbmFsUmF0ZUl0ZW1OYW1lXSk7XHJcbiAgICByZXR1cm4gY2VudHJhbGl6ZWRSYXRlSXRlbXNBcnJheTtcclxuICB9XHJcblxyXG4gIGdldFByb2plY3RSYXRlSXRlbXNCeU9yaWdpbmFsTmFtZShwcm9qZWN0SWQ6IHN0cmluZywgb3JpZ2luYWxSYXRlSXRlbU5hbWU6IHN0cmluZywgdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbGV0IHByb2plY3Rpb24gPSB7J3JhdGVzJzogMSwgX2lkOiAwfTtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZEJ5SWRXaXRoUHJvamVjdGlvbihwcm9qZWN0SWQsIHByb2plY3Rpb24sIChlcnJvciwgcHJvamVjdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBTZXJ2aWNlLCBnZXRQcm9qZWN0UmF0ZUl0ZW1zQnlPcmlnaW5hbE5hbWUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcHJvamVjdFJhdGVJdGVtc0FycmF5ID0gcHJvamVjdC5yYXRlcztcclxuICAgICAgICBsZXQgY2VudHJhbGl6ZWRSYXRlSXRlbXNBcnJheSA9IHRoaXMuZ2V0UmF0ZUl0ZW1zQXJyYXkocHJvamVjdFJhdGVJdGVtc0FycmF5LCBvcmlnaW5hbFJhdGVJdGVtTmFtZSk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IGNlbnRyYWxpemVkUmF0ZUl0ZW1zQXJyYXksIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRJbkFjdGl2ZUNvc3RIZWFkKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldEluQWN0aXZlQ29zdEhlYWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZEJ5SWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdnZXR0aW5nIEluQWN0aXZlIENvc3RIZWFkIGZvciBCdWlsZGluZyBOYW1lIDogJyArIHJlc3VsdC5uYW1lKTtcclxuICAgICAgICBsZXQgcmVzcG9uc2UgPSByZXN1bHQuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBpbkFjdGl2ZUNvc3RIZWFkID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgY29zdEhlYWRJdGVtIG9mIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICBpZiAoIWNvc3RIZWFkSXRlbS5hY3RpdmUpIHtcclxuICAgICAgICAgICAgaW5BY3RpdmVDb3N0SGVhZC5wdXNoKGNvc3RIZWFkSXRlbSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiBpbkFjdGl2ZUNvc3RIZWFkLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0SW5BY3RpdmVXb3JrSXRlbXNPZkJ1aWxkaW5nQ29zdEhlYWRzKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBhZGQgV29ya2l0ZW0gaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nOiBCdWlsZGluZykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkTGlzdCA9IGJ1aWxkaW5nLmNvc3RIZWFkcztcclxuICAgICAgICBsZXQgaW5BY3RpdmVXb3JrSXRlbXM6IEFycmF5PFdvcmtJdGVtPiA9IG5ldyBBcnJheTxXb3JrSXRlbT4oKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY29zdEhlYWREYXRhIG9mIGNvc3RIZWFkTGlzdCkge1xyXG4gICAgICAgICAgaWYgKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkRGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYXRlZ29yeURhdGEgb2YgY29zdEhlYWREYXRhLmNhdGVnb3JpZXMpIHtcclxuICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnlJZCA9PT0gY2F0ZWdvcnlEYXRhLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB3b3JrSXRlbURhdGEgb2YgY2F0ZWdvcnlEYXRhLndvcmtJdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoIXdvcmtJdGVtRGF0YS5hY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbkFjdGl2ZVdvcmtJdGVtcy5wdXNoKHdvcmtJdGVtRGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGluQWN0aXZlV29ya0l0ZW1zTGlzdFdpdGhCdWlsZGluZ1JhdGVzID0gdGhpcy5nZXRXb3JrSXRlbUxpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyhpbkFjdGl2ZVdvcmtJdGVtcywgYnVpbGRpbmcucmF0ZXMsIGZhbHNlKTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7XHJcbiAgICAgICAgICBkYXRhOiBpbkFjdGl2ZVdvcmtJdGVtc0xpc3RXaXRoQnVpbGRpbmdSYXRlcy53b3JrSXRlbXMsXHJcbiAgICAgICAgICBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gR2V0IEluIEFjdGl2ZSBXb3JrSXRlbXMgT2YgUHJvamVjdCBDb3N0IEhlYWRzXHJcbiAgZ2V0SW5BY3RpdmVXb3JrSXRlbXNPZlByb2plY3RDb3N0SGVhZHMocHJvamVjdElkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIEdldCBJbi1BY3RpdmUgV29ya0l0ZW1zIE9mIFByb2plY3QgQ29zdCBIZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZEJ5SWQocHJvamVjdElkLCAoZXJyb3IsIHByb2plY3Q6IFByb2plY3QpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZExpc3QgPSBwcm9qZWN0LnByb2plY3RDb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IGluQWN0aXZlV29ya0l0ZW1zOiBBcnJheTxXb3JrSXRlbT4gPSBuZXcgQXJyYXk8V29ya0l0ZW0+KCk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGNvc3RIZWFkRGF0YSBvZiBjb3N0SGVhZExpc3QpIHtcclxuICAgICAgICAgIGlmIChjb3N0SGVhZElkID09PSBjb3N0SGVhZERhdGEucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnlEYXRhIG9mIGNvc3RIZWFkRGF0YS5jYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5SWQgPT09IGNhdGVnb3J5RGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgd29ya0l0ZW1EYXRhIG9mIGNhdGVnb3J5RGF0YS53b3JrSXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKCF3b3JrSXRlbURhdGEuYWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5BY3RpdmVXb3JrSXRlbXMucHVzaCh3b3JrSXRlbURhdGEpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBpbkFjdGl2ZVdvcmtJdGVtc0xpc3RXaXRoUHJvamVjdFJhdGVzID0gdGhpcy5nZXRXb3JrSXRlbUxpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyhpbkFjdGl2ZVdvcmtJdGVtcywgcHJvamVjdC5yYXRlcywgZmFsc2UpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtcclxuICAgICAgICAgIGRhdGE6IGluQWN0aXZlV29ya0l0ZW1zTGlzdFdpdGhQcm9qZWN0UmF0ZXMud29ya0l0ZW1zLFxyXG4gICAgICAgICAgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldEJ1aWxkaW5nQnlJZEZvckNsb25lKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldENsb25lZEJ1aWxkaW5nIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZEJ5SWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY2xvbmVkQnVpbGRpbmcgPSByZXN1bHQuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBidWlsZGluZyA9IG5ldyBCdWlsZGluZ01vZGVsKCk7XHJcbiAgICAgICAgYnVpbGRpbmcubmFtZSA9IHJlc3VsdC5uYW1lO1xyXG4gICAgICAgIGJ1aWxkaW5nLnRvdGFsU2xhYkFyZWEgPSByZXN1bHQudG90YWxTbGFiQXJlYTtcclxuICAgICAgICBidWlsZGluZy50b3RhbENhcnBldEFyZWFPZlVuaXQgPSByZXN1bHQudG90YWxDYXJwZXRBcmVhT2ZVbml0O1xyXG4gICAgICAgIGJ1aWxkaW5nLnRvdGFsU2FsZWFibGVBcmVhT2ZVbml0ID0gcmVzdWx0LnRvdGFsU2FsZWFibGVBcmVhT2ZVbml0O1xyXG4gICAgICAgIGJ1aWxkaW5nLnBsaW50aEFyZWEgPSByZXN1bHQucGxpbnRoQXJlYTtcclxuICAgICAgICBidWlsZGluZy50b3RhbE51bU9mRmxvb3JzID0gcmVzdWx0LnRvdGFsTnVtT2ZGbG9vcnM7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZQYXJraW5nRmxvb3JzID0gcmVzdWx0Lm51bU9mUGFya2luZ0Zsb29ycztcclxuICAgICAgICBidWlsZGluZy5jYXJwZXRBcmVhT2ZQYXJraW5nID0gcmVzdWx0LmNhcnBldEFyZWFPZlBhcmtpbmc7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZPbmVCSEsgPSByZXN1bHQubnVtT2ZPbmVCSEs7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZUd29CSEsgPSByZXN1bHQubnVtT2ZUd29CSEs7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZUaHJlZUJISyA9IHJlc3VsdC5udW1PZlRocmVlQkhLO1xyXG4gICAgICAgIGJ1aWxkaW5nLm51bU9mRm91ckJISyA9IHJlc3VsdC5udW1PZkZvdXJCSEs7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZGaXZlQkhLID0gcmVzdWx0Lm51bU9mRml2ZUJISztcclxuICAgICAgICBidWlsZGluZy5udW1PZkxpZnRzID0gcmVzdWx0Lm51bU9mTGlmdHM7XHJcblxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiBidWlsZGluZywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGRlbGV0ZUJ1aWxkaW5nQnlJZChwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBkZWxldGVCdWlsZGluZyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBwb3BCdWlsZGluZ0lkID0gYnVpbGRpbmdJZDtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmRlbGV0ZShidWlsZGluZ0lkLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogcHJvamVjdElkfTtcclxuICAgICAgICBsZXQgbmV3RGF0YSA9IHskcHVsbDoge2J1aWxkaW5nczogcG9wQnVpbGRpbmdJZH19O1xyXG4gICAgICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSwge25ldzogdHJ1ZX0sIChlcnJvciwgc3RhdHVzKSA9PiB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiBzdGF0dXMsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRSYXRlKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLCB3b3JrSXRlbUlkOiBudW1iZXIsIHVzZXI6IFVzZXIsXHJcbiAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRSYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG5cclxuICAgIGxldCByYXRlQW5hbHlzaXNTZXJ2aWNlczogUmF0ZUFuYWx5c2lzU2VydmljZSA9IG5ldyBSYXRlQW5hbHlzaXNTZXJ2aWNlKCk7XHJcbiAgICByYXRlQW5hbHlzaXNTZXJ2aWNlcy5nZXRSYXRlKHdvcmtJdGVtSWQsIChlcnJvciwgcmF0ZURhdGEpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCByYXRlOiBSYXRlID0gbmV3IFJhdGUoKTtcclxuICAgICAgICByYXRlLnJhdGVJdGVtcyA9IHJhdGVEYXRhO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByYXRlRGF0YSwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVJhdGVPZkJ1aWxkaW5nQ29zdEhlYWRzKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6IG51bWJlciwgcmF0ZTogUmF0ZSwgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgdXBkYXRlUmF0ZU9mQnVpbGRpbmdDb3N0SGVhZHMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICByYXRlLmlzRXN0aW1hdGVkID0gdHJ1ZTtcclxuICAgIGxldCBxdWVyeSA9IHtfaWQ6IGJ1aWxkaW5nSWR9O1xyXG4gICAgbGV0IHVwZGF0ZVF1ZXJ5ID0geyRzZXQ6eydjb3N0SGVhZHMuJFtjb3N0SGVhZF0uY2F0ZWdvcmllcy4kW2NhdGVnb3J5XS53b3JrSXRlbXMuJFt3b3JrSXRlbV0ucmF0ZSc6cmF0ZVxyXG4gICAgICB9fTtcclxuXHJcbiAgICBsZXQgYXJyYXlGaWx0ZXIgPSBbXHJcbiAgICAgIHsnY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQnOmNvc3RIZWFkSWR9LFxyXG4gICAgICB7J2NhdGVnb3J5LnJhdGVBbmFseXNpc0lkJzogY2F0ZWdvcnlJZH0sXHJcbiAgICAgIHsnd29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQnOndvcmtJdGVtSWR9XHJcbiAgICBdO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlUXVlcnkse2FycmF5RmlsdGVyczphcnJheUZpbHRlciwgbmV3OiB0cnVlfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmKHJlc3VsdCkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ2J1aWxkaW5nIENvc3RIZWFkcyBVcGRhdGVkJyk7XHJcblxyXG4gICAgICAgICAgbGV0IHJhdGVJdGVtcyA9IHJhdGUucmF0ZUl0ZW1zO1xyXG4gICAgICAgICAgbGV0IGNlbnRyYWxpemVkUmF0ZXMgPSByZXN1bHQucmF0ZXM7XHJcbiAgICAgICAgICBsZXQgcHJvbWlzZUFycmF5Rm9yVXBkYXRlQnVpbGRpbmdDZW50cmFsaXplZFJhdGVzID1bXTtcclxuXHJcbiAgICAgICAgICBmb3IobGV0IHJhdGUgb2YgcmF0ZUl0ZW1zKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgcmF0ZU9iamVjdEV4aXN0U1FMID0gJ1NFTEVDVCAqIEZST00gPyBBUyByYXRlcyBXSEVSRSByYXRlcy5pdGVtTmFtZT0gPyc7XHJcbiAgICAgICAgICAgIGxldCByYXRlRXhpc3RBcnJheSA9IGFsYXNxbChyYXRlT2JqZWN0RXhpc3RTUUwsW2NlbnRyYWxpemVkUmF0ZXMscmF0ZS5pdGVtTmFtZV0pO1xyXG4gICAgICAgICAgICBpZihyYXRlRXhpc3RBcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgaWYocmF0ZUV4aXN0QXJyYXlbMF0ucmF0ZSAhPT0gcmF0ZS5yYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAvL3VwZGF0ZSByYXRlIG9mIHJhdGVJdGVtXHJcbiAgICAgICAgICAgICAgICBsZXQgdXBkYXRlUmF0ZVByb21pc2UgPSB0aGlzLnVwZGF0ZUNlbnRyYWxpemVkUmF0ZUZvckJ1aWxkaW5nKGJ1aWxkaW5nSWQsIHJhdGUuaXRlbU5hbWUsIHJhdGUucmF0ZSk7XHJcbiAgICAgICAgICAgICAgICBwcm9taXNlQXJyYXlGb3JVcGRhdGVCdWlsZGluZ0NlbnRyYWxpemVkUmF0ZXMucHVzaCh1cGRhdGVSYXRlUHJvbWlzZSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vY3JlYXRlIG5ldyByYXRlSXRlbVxyXG4gICAgICAgICAgICAgIGxldCByYXRlSXRlbSA6IENlbnRyYWxpemVkUmF0ZSA9IG5ldyBDZW50cmFsaXplZFJhdGUocmF0ZS5pdGVtTmFtZSxyYXRlLm9yaWdpbmFsSXRlbU5hbWUsIHJhdGUucmF0ZSk7XHJcbiAgICAgICAgICAgICAgbGV0IGFkZE5ld1JhdGVJdGVtUHJvbWlzZSA9IHRoaXMuYWRkTmV3Q2VudHJhbGl6ZWRSYXRlRm9yQnVpbGRpbmcoYnVpbGRpbmdJZCwgcmF0ZUl0ZW0pO1xyXG4gICAgICAgICAgICAgIHByb21pc2VBcnJheUZvclVwZGF0ZUJ1aWxkaW5nQ2VudHJhbGl6ZWRSYXRlcy5wdXNoKGFkZE5ld1JhdGVJdGVtUHJvbWlzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZihwcm9taXNlQXJyYXlGb3JVcGRhdGVCdWlsZGluZ0NlbnRyYWxpemVkUmF0ZXMubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgICAgIENDUHJvbWlzZS5hbGwocHJvbWlzZUFycmF5Rm9yVXBkYXRlQnVpbGRpbmdDZW50cmFsaXplZFJhdGVzKS50aGVuKGZ1bmN0aW9uKGRhdGE6IEFycmF5PGFueT4pIHtcclxuXHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JhdGVzIEFycmF5IHVwZGF0ZWQgOiAnK0pTT04uc3RyaW5naWZ5KGNlbnRyYWxpemVkUmF0ZXMpKTtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ICdkYXRhJyA6ICdzdWNjZXNzJyB9KTtcclxuXHJcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGU6YW55KSB7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCcgUHJvbWlzZSBmYWlsZWQgZm9yIGNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbCAhIDonICtKU09OLnN0cmluZ2lmeShlLm1lc3NhZ2UpKTtcclxuICAgICAgICAgICAgICBDQ1Byb21pc2UucmVqZWN0KGUubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgeyAnZGF0YScgOiAnc3VjY2VzcycgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIC8qdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCBidWlsZGluZzpCdWlsZGluZykgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQnlJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZHMgPSBidWlsZGluZy5jb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IGNlbnRyYWxpemVkUmF0ZXMgPSBidWlsZGluZy5yYXRlcztcclxuICAgICAgICBmb3IgKGxldCBjb3N0SGVhZERhdGEgb2YgY29zdEhlYWRzKSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWREYXRhLnJhdGVBbmFseXNpc0lkID09PSBjb3N0SGVhZElkKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNhdGVnb3J5RGF0YSBvZiBjb3N0SGVhZERhdGEuY2F0ZWdvcmllcykge1xyXG4gICAgICAgICAgICAgIGlmIChjYXRlZ29yeURhdGEucmF0ZUFuYWx5c2lzSWQgPT09IGNhdGVnb3J5SWQpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHdvcmtJdGVtRGF0YSBvZiBjYXRlZ29yeURhdGEud29ya0l0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbURhdGEucmF0ZUFuYWx5c2lzSWQgPT09IHdvcmtJdGVtSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB3b3JrSXRlbURhdGEucmF0ZSA9IHJhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1EYXRhLnJhdGUuaXNFc3RpbWF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJzogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgbGV0IG5ld0RhdGEgPSB7JHNldDogeydjb3N0SGVhZHMnOiBjb3N0SGVhZHN9fTtcclxuXHJcbiAgICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlUXVlcnkse2FycmF5RmlsdGVyczphcnJheUZpbHRlciwgbmV3OiB0cnVlfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2J1aWxkaW5nIENvc3RIZWFkcyBVcGRhdGVkJyk7XHJcblxyXG4gICAgICAgICAgICAgIGxldCByYXRlSXRlbXMgPSByYXRlLnJhdGVJdGVtcztcclxuICAgICAgICAgICAgICBsZXQgcHJvbWlzZUFycmF5Rm9yVXBkYXRlQnVpbGRpbmdDZW50cmFsaXplZFJhdGVzID0gW107XHJcblxyXG4gICAgICAgICAgICAgIGZvciAobGV0IHJhdGUgb2YgcmF0ZUl0ZW1zKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHJhdGVPYmplY3RFeGlzdFNRTCA9ICdTRUxFQ1QgKiBGUk9NID8gQVMgcmF0ZXMgV0hFUkUgcmF0ZXMuaXRlbU5hbWU9ID8nO1xyXG4gICAgICAgICAgICAgICAgbGV0IHJhdGVFeGlzdEFycmF5ID0gYWxhc3FsKHJhdGVPYmplY3RFeGlzdFNRTCwgW2NlbnRyYWxpemVkUmF0ZXMsIHJhdGUuaXRlbU5hbWVdKTtcclxuICAgICAgICAgICAgICAgIGlmIChyYXRlRXhpc3RBcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChyYXRlRXhpc3RBcnJheVswXS5yYXRlICE9PSByYXRlLnJhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSByYXRlIG9mIHJhdGVJdGVtXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHVwZGF0ZVJhdGVQcm9taXNlID0gdGhpcy51cGRhdGVDZW50cmFsaXplZFJhdGVGb3JCdWlsZGluZyhidWlsZGluZ0lkLCByYXRlLml0ZW1OYW1lLCByYXRlLnJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2VBcnJheUZvclVwZGF0ZUJ1aWxkaW5nQ2VudHJhbGl6ZWRSYXRlcy5wdXNoKHVwZGF0ZVJhdGVQcm9taXNlKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgLy9jcmVhdGUgbmV3IHJhdGVJdGVtXHJcbiAgICAgICAgICAgICAgICAgIGxldCByYXRlSXRlbTogQ2VudHJhbGl6ZWRSYXRlID0gbmV3IENlbnRyYWxpemVkUmF0ZShyYXRlLml0ZW1OYW1lLCByYXRlLm9yaWdpbmFsSXRlbU5hbWUsIHJhdGUucmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgIGxldCBhZGROZXdSYXRlSXRlbVByb21pc2UgPSB0aGlzLmFkZE5ld0NlbnRyYWxpemVkUmF0ZUZvckJ1aWxkaW5nKGJ1aWxkaW5nSWQsIHJhdGVJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgcHJvbWlzZUFycmF5Rm9yVXBkYXRlQnVpbGRpbmdDZW50cmFsaXplZFJhdGVzLnB1c2goYWRkTmV3UmF0ZUl0ZW1Qcm9taXNlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGlmIChwcm9taXNlQXJyYXlGb3JVcGRhdGVCdWlsZGluZ0NlbnRyYWxpemVkUmF0ZXMubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBDQ1Byb21pc2UuYWxsKHByb21pc2VBcnJheUZvclVwZGF0ZUJ1aWxkaW5nQ2VudHJhbGl6ZWRSYXRlcykudGhlbihmdW5jdGlvbiAoZGF0YTogQXJyYXk8YW55Pikge1xyXG5cclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JhdGVzIEFycmF5IHVwZGF0ZWQgOiAnICsgSlNPTi5zdHJpbmdpZnkoY2VudHJhbGl6ZWRSYXRlcykpO1xyXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7J2RhdGEnOiAnc3VjY2Vzcyd9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignIFByb21pc2UgZmFpbGVkIGZvciBjb252ZXJ0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpc1RvQ29zdENvbnRyb2wgISA6JyArIEpTT04uc3RyaW5naWZ5KGUubWVzc2FnZSkpO1xyXG4gICAgICAgICAgICAgICAgICBDQ1Byb21pc2UucmVqZWN0KGUubWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgeydkYXRhJzogJ3N1Y2Nlc3MnfSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pOyovXHJcbiAgfVxyXG5cclxuICAvL1VwZGF0ZSBEaXJlY3QgUmF0ZSBvZiBidWlsZGluZyBjb3N0aGVhZHNcclxuICB1cGRhdGVEaXJlY3RSYXRlT2ZCdWlsZGluZ1dvcmtJdGVtcyhwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgd29ya0l0ZW1JZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdFJhdGU6IG51bWJlciwgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZURpcmVjdFJhdGVPZkJ1aWxkaW5nV29ya0l0ZW1zIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHF1ZXJ5ID0ge19pZDogYnVpbGRpbmdJZH07XHJcbiAgICBsZXQgdXBkYXRlUXVlcnkgPSB7JHNldDp7J2Nvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5yYXRlLnRvdGFsJzpkaXJlY3RSYXRlLFxyXG4gICAgICAgICdjb3N0SGVhZHMuJFtjb3N0SGVhZF0uY2F0ZWdvcmllcy4kW2NhdGVnb3J5XS53b3JrSXRlbXMuJFt3b3JrSXRlbV0ucmF0ZS5yYXRlSXRlbXMnOltdLFxyXG4gICAgICAgICdjb3N0SGVhZHMuJFtjb3N0SGVhZF0uY2F0ZWdvcmllcy4kW2NhdGVnb3J5XS53b3JrSXRlbXMuJFt3b3JrSXRlbV0uaXNEaXJlY3RSYXRlJzogdHJ1ZVxyXG4gICAgICB9fTtcclxuXHJcbiAgICBsZXQgYXJyYXlGaWx0ZXIgPSBbXHJcbiAgICAgIHsnY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQnOmNvc3RIZWFkSWR9LFxyXG4gICAgICB7J2NhdGVnb3J5LnJhdGVBbmFseXNpc0lkJzogY2F0ZWdvcnlJZH0sXHJcbiAgICAgIHsnd29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQnOndvcmtJdGVtSWR9XHJcbiAgICBdO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlUXVlcnkse2FycmF5RmlsdGVyczphcnJheUZpbHRlciwgbmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgICAgLypsZXQgcHJvamVjdGlvbiA9IHsnY29zdEhlYWRzJzoxfTtcclxuICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWRXaXRoUHJvamVjdGlvbihidWlsZGluZ0lkLCBwcm9qZWN0aW9uLCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIHRoaXMudXBkYXRlRGlyZWN0UmF0ZShjb3N0SGVhZExpc3QsIGNvc3RIZWFkSWQsIGNhdGVnb3J5SWQsIHdvcmtJdGVtSWQsIGRpcmVjdFJhdGUpO1xyXG5cclxuICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBidWlsZGluZ0lkfTtcclxuICAgICAgICBsZXQgZGF0YSA9IHskc2V0OiB7J2Nvc3RIZWFkcyc6IGNvc3RIZWFkTGlzdH19O1xyXG4gICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGRhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiAnc3VjY2VzcycsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7Ki9cclxuICB9XHJcblxyXG4gIHVwZGF0ZURpcmVjdFJhdGUoY29zdEhlYWRMaXN0OiBBcnJheTxDb3N0SGVhZD4sIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgd29ya0l0ZW1JZDogbnVtYmVyLCBkaXJlY3RSYXRlOiBudW1iZXIpIHtcclxuICAgIGxldCByYXRlOiBSYXRlO1xyXG4gICAgZm9yIChsZXQgY29zdEhlYWQgb2YgY29zdEhlYWRMaXN0KSB7XHJcbiAgICAgIGlmIChjb3N0SGVhZElkID09PSBjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgIGxldCBjYXRlZ29yaWVzT2ZDb3N0SGVhZCA9IGNvc3RIZWFkLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnlEYXRhIG9mIGNhdGVnb3JpZXNPZkNvc3RIZWFkKSB7XHJcbiAgICAgICAgICBpZiAoY2F0ZWdvcnlJZCA9PT0gY2F0ZWdvcnlEYXRhLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHdvcmtJdGVtRGF0YSBvZiBjYXRlZ29yeURhdGEud29ya0l0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHdvcmtJdGVtSWQgPT09IHdvcmtJdGVtRGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgcmF0ZSA9IHdvcmtJdGVtRGF0YS5yYXRlO1xyXG4gICAgICAgICAgICAgICAgcmF0ZS50b3RhbCA9IGRpcmVjdFJhdGU7XHJcbiAgICAgICAgICAgICAgICByYXRlLnJhdGVJdGVtcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgd29ya0l0ZW1EYXRhLmlzRGlyZWN0UmF0ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuLy9VcGRhdGUgcmF0ZSBvZiBwcm9qZWN0IGNvc3QgaGVhZHNcclxuICB1cGRhdGVSYXRlT2ZQcm9qZWN0Q29zdEhlYWRzKHByb2plY3RJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6IG51bWJlciwgcmF0ZTogUmF0ZSwgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgVXBkYXRlIHJhdGUgb2YgcHJvamVjdCBjb3N0IGhlYWRzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgcmF0ZS5pc0VzdGltYXRlZCA9IHRydWU7XHJcbiAgICBsZXQgcXVlcnkgPSB7X2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHVwZGF0ZVF1ZXJ5ID0geyRzZXQ6eydwcm9qZWN0Q29zdEhlYWRzLiRbY29zdEhlYWRdLmNhdGVnb3JpZXMuJFtjYXRlZ29yeV0ud29ya0l0ZW1zLiRbd29ya0l0ZW1dLnJhdGUnOnJhdGVcclxuICAgICAgfX07XHJcblxyXG4gICAgbGV0IGFycmF5RmlsdGVyID0gW1xyXG4gICAgICB7J2Nvc3RIZWFkLnJhdGVBbmFseXNpc0lkJzpjb3N0SGVhZElkfSxcclxuICAgICAgeydjYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCc6IGNhdGVnb3J5SWR9LFxyXG4gICAgICB7J3dvcmtJdGVtLnJhdGVBbmFseXNpc0lkJzp3b3JrSXRlbUlkfVxyXG4gICAgXTtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlUXVlcnkse2FycmF5RmlsdGVyczphcnJheUZpbHRlciwgbmV3OiB0cnVlfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICBsZXQgcmF0ZUl0ZW1zID0gcmF0ZS5yYXRlSXRlbXM7XHJcbiAgICAgICAgbGV0IGNlbnRyYWxpemVkUmF0ZXNPZlByb2plY3RzID0gcmVzdWx0LnJhdGVzO1xyXG4gICAgICAgIGxldCBwcm9taXNlQXJyYXlGb3JQcm9qZWN0Q2VudHJhbGl6ZWRSYXRlcyA9W107XHJcblxyXG4gICAgICAgIGZvcihsZXQgcmF0ZSBvZiByYXRlSXRlbXMpIHtcclxuXHJcbiAgICAgICAgICBsZXQgcmF0ZU9iamVjdEV4aXN0U1FMID0gJ1NFTEVDVCAqIEZST00gPyBBUyByYXRlcyBXSEVSRSByYXRlcy5pdGVtTmFtZT0gPyc7XHJcbiAgICAgICAgICBsZXQgcmF0ZUV4aXN0QXJyYXkgPSBhbGFzcWwocmF0ZU9iamVjdEV4aXN0U1FMLFtjZW50cmFsaXplZFJhdGVzT2ZQcm9qZWN0cyxyYXRlLml0ZW1OYW1lXSk7XHJcbiAgICAgICAgICBpZihyYXRlRXhpc3RBcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGlmKHJhdGVFeGlzdEFycmF5WzBdLnJhdGUgIT09IHJhdGUucmF0ZSkge1xyXG4gICAgICAgICAgICAgIC8vdXBkYXRlIHJhdGUgb2YgcmF0ZUl0ZW1cclxuICAgICAgICAgICAgICBsZXQgdXBkYXRlUmF0ZU9mUHJvamVjdFByb21pc2UgPSB0aGlzLnVwZGF0ZUNlbnRyYWxpemVkUmF0ZUZvclByb2plY3QocHJvamVjdElkLCByYXRlLml0ZW1OYW1lLCByYXRlLnJhdGUpO1xyXG4gICAgICAgICAgICAgIHByb21pc2VBcnJheUZvclByb2plY3RDZW50cmFsaXplZFJhdGVzLnB1c2godXBkYXRlUmF0ZU9mUHJvamVjdFByb21pc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL2NyZWF0ZSBuZXcgcmF0ZUl0ZW1cclxuICAgICAgICAgICAgbGV0IHJhdGVJdGVtIDogQ2VudHJhbGl6ZWRSYXRlID0gbmV3IENlbnRyYWxpemVkUmF0ZShyYXRlLml0ZW1OYW1lLHJhdGUub3JpZ2luYWxJdGVtTmFtZSwgcmF0ZS5yYXRlKTtcclxuICAgICAgICAgICAgbGV0IGFkZE5ld1JhdGVPZlByb2plY3RQcm9taXNlID0gdGhpcy5hZGROZXdDZW50cmFsaXplZFJhdGVGb3JQcm9qZWN0KHByb2plY3RJZCwgcmF0ZUl0ZW0pO1xyXG4gICAgICAgICAgICBwcm9taXNlQXJyYXlGb3JQcm9qZWN0Q2VudHJhbGl6ZWRSYXRlcy5wdXNoKGFkZE5ld1JhdGVPZlByb2plY3RQcm9taXNlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHByb21pc2VBcnJheUZvclByb2plY3RDZW50cmFsaXplZFJhdGVzLmxlbmd0aCAhPT0gMCkge1xyXG5cclxuICAgICAgICAgIENDUHJvbWlzZS5hbGwocHJvbWlzZUFycmF5Rm9yUHJvamVjdENlbnRyYWxpemVkUmF0ZXMpLnRoZW4oZnVuY3Rpb24oZGF0YTogQXJyYXk8YW55Pikge1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JhdGVzIEFycmF5IHVwZGF0ZWQgOiAnK0pTT04uc3RyaW5naWZ5KGNlbnRyYWxpemVkUmF0ZXNPZlByb2plY3RzKSk7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHsgJ2RhdGEnIDogJ3N1Y2Nlc3MnIH0pO1xyXG5cclxuICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGU6YW55KSB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcignIFByb21pc2UgZmFpbGVkIGZvciBjb252ZXJ0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpc1RvQ29zdENvbnRyb2wgISA6JyArSlNPTi5zdHJpbmdpZnkoZS5tZXNzYWdlKSk7XHJcbiAgICAgICAgICAgIGxldCBlcnJvck9iaiA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICBlcnJvck9iai5tZXNzYWdlID0gZTtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3JPYmosIG51bGwpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ICdkYXRhJyA6ICdzdWNjZXNzJyB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLyp0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkKHByb2plY3RJZCwgKGVycm9yLCBwcm9qZWN0IDogUHJvamVjdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQnlJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBwcm9qZWN0Q29zdEhlYWRzID0gcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjZW50cmFsaXplZFJhdGVzT2ZQcm9qZWN0cyA9IHByb2plY3QucmF0ZXM7XHJcbiAgICAgICAgZm9yIChsZXQgY29zdEhlYWREYXRhIG9mIHByb2plY3RDb3N0SGVhZHMpIHtcclxuICAgICAgICAgIGlmIChjb3N0SGVhZERhdGEucmF0ZUFuYWx5c2lzSWQgPT09IGNvc3RIZWFkSWQpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnlEYXRhIG9mIGNvc3RIZWFkRGF0YS5jYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5RGF0YS5yYXRlQW5hbHlzaXNJZCA9PT0gY2F0ZWdvcnlJZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgd29ya0l0ZW1EYXRhIG9mIGNhdGVnb3J5RGF0YS53b3JrSXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHdvcmtJdGVtRGF0YS5yYXRlQW5hbHlzaXNJZCA9PT0gd29ya0l0ZW1JZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtRGF0YS5yYXRlID0gcmF0ZTtcclxuICAgICAgICAgICAgICAgICAgICB3b3JrSXRlbURhdGEucmF0ZS5pc0VzdGltYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0geydfaWQnOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0geyRzZXQ6IHsncHJvamVjdENvc3RIZWFkcyc6IHByb2plY3RDb3N0SGVhZHN9fTtcclxuICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgcmF0ZUl0ZW1zID0gcmF0ZS5yYXRlSXRlbXM7XHJcbiAgICAgICAgICAgIGxldCBwcm9taXNlQXJyYXlGb3JQcm9qZWN0Q2VudHJhbGl6ZWRSYXRlcyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgcmF0ZSBvZiByYXRlSXRlbXMpIHtcclxuXHJcbiAgICAgICAgICAgICAgbGV0IHJhdGVPYmplY3RFeGlzdFNRTCA9ICdTRUxFQ1QgKiBGUk9NID8gQVMgcmF0ZXMgV0hFUkUgcmF0ZXMuaXRlbU5hbWU9ID8nO1xyXG4gICAgICAgICAgICAgIGxldCByYXRlRXhpc3RBcnJheSA9IGFsYXNxbChyYXRlT2JqZWN0RXhpc3RTUUwsIFtjZW50cmFsaXplZFJhdGVzT2ZQcm9qZWN0cywgcmF0ZS5pdGVtTmFtZV0pO1xyXG4gICAgICAgICAgICAgIGlmIChyYXRlRXhpc3RBcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocmF0ZUV4aXN0QXJyYXlbMF0ucmF0ZSAhPT0gcmF0ZS5yYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vdXBkYXRlIHJhdGUgb2YgcmF0ZUl0ZW1cclxuICAgICAgICAgICAgICAgICAgbGV0IHVwZGF0ZVJhdGVPZlByb2plY3RQcm9taXNlID0gdGhpcy51cGRhdGVDZW50cmFsaXplZFJhdGVGb3JQcm9qZWN0KHByb2plY3RJZCwgcmF0ZS5pdGVtTmFtZSwgcmF0ZS5yYXRlKTtcclxuICAgICAgICAgICAgICAgICAgcHJvbWlzZUFycmF5Rm9yUHJvamVjdENlbnRyYWxpemVkUmF0ZXMucHVzaCh1cGRhdGVSYXRlT2ZQcm9qZWN0UHJvbWlzZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vY3JlYXRlIG5ldyByYXRlSXRlbVxyXG4gICAgICAgICAgICAgICAgbGV0IHJhdGVJdGVtOiBDZW50cmFsaXplZFJhdGUgPSBuZXcgQ2VudHJhbGl6ZWRSYXRlKHJhdGUuaXRlbU5hbWUsIHJhdGUub3JpZ2luYWxJdGVtTmFtZSwgcmF0ZS5yYXRlKTtcclxuICAgICAgICAgICAgICAgIGxldCBhZGROZXdSYXRlT2ZQcm9qZWN0UHJvbWlzZSA9IHRoaXMuYWRkTmV3Q2VudHJhbGl6ZWRSYXRlRm9yUHJvamVjdChwcm9qZWN0SWQsIHJhdGVJdGVtKTtcclxuICAgICAgICAgICAgICAgIHByb21pc2VBcnJheUZvclByb2plY3RDZW50cmFsaXplZFJhdGVzLnB1c2goYWRkTmV3UmF0ZU9mUHJvamVjdFByb21pc2UpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHByb21pc2VBcnJheUZvclByb2plY3RDZW50cmFsaXplZFJhdGVzLmxlbmd0aCAhPT0gMCkge1xyXG5cclxuICAgICAgICAgICAgICBDQ1Byb21pc2UuYWxsKHByb21pc2VBcnJheUZvclByb2plY3RDZW50cmFsaXplZFJhdGVzKS50aGVuKGZ1bmN0aW9uIChkYXRhOiBBcnJheTxhbnk+KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JhdGVzIEFycmF5IHVwZGF0ZWQgOiAnICsgSlNPTi5zdHJpbmdpZnkoY2VudHJhbGl6ZWRSYXRlc09mUHJvamVjdHMpKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHsnZGF0YSc6ICdzdWNjZXNzJ30pO1xyXG5cclxuICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZTogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJyBQcm9taXNlIGZhaWxlZCBmb3IgY29udmVydENvc3RIZWFkc0Zyb21SYXRlQW5hbHlzaXNUb0Nvc3RDb250cm9sICEgOicgKyBKU09OLnN0cmluZ2lmeShlLm1lc3NhZ2UpKTtcclxuICAgICAgICAgICAgICAgIGxldCBlcnJvck9iaiA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgZXJyb3JPYmoubWVzc2FnZSA9IGU7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvck9iaiwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHsnZGF0YSc6ICdzdWNjZXNzJ30pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pOyovXHJcbiAgfVxyXG5cclxuICAvL1VwZGF0ZSBEaXJlY3QgUmF0ZXMgb2YgUHJvamVjdCBDb3N0aGVhZHNcclxuICB1cGRhdGVEaXJlY3RSYXRlT2ZQcm9qZWN0V29ya0l0ZW1zKHByb2plY3RJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgd29ya0l0ZW1JZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0UmF0ZTogbnVtYmVyLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgdXBkYXRlRGlyZWN0UmF0ZU9mUHJvamVjdFdvcmtJdGVtcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHtfaWQ6IHByb2plY3RJZH07XHJcbiAgICBsZXQgdXBkYXRlUXVlcnkgPSB7JHNldDp7J3Byb2plY3RDb3N0SGVhZHMuJFtjb3N0SGVhZF0uY2F0ZWdvcmllcy4kW2NhdGVnb3J5XS53b3JrSXRlbXMuJFt3b3JrSXRlbV0ucmF0ZS50b3RhbCc6ZGlyZWN0UmF0ZSxcclxuICAgICAgICAncHJvamVjdENvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5yYXRlLnJhdGVJdGVtcyc6W10sXHJcbiAgICAgICAgJ3Byb2plY3RDb3N0SGVhZHMuJFtjb3N0SGVhZF0uY2F0ZWdvcmllcy4kW2NhdGVnb3J5XS53b3JrSXRlbXMuJFt3b3JrSXRlbV0uaXNEaXJlY3RSYXRlJzogdHJ1ZVxyXG4gICAgICB9fTtcclxuXHJcbiAgICBsZXQgYXJyYXlGaWx0ZXIgPSBbXHJcbiAgICAgIHsnY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQnOmNvc3RIZWFkSWR9LFxyXG4gICAgICB7J2NhdGVnb3J5LnJhdGVBbmFseXNpc0lkJzogY2F0ZWdvcnlJZH0sXHJcbiAgICAgIHsnd29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQnOndvcmtJdGVtSWR9XHJcbiAgICBdO1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVRdWVyeSx7YXJyYXlGaWx0ZXJzOmFycmF5RmlsdGVyLCBuZXc6IHRydWV9LCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLypsZXQgcHJvamVjdGlvbiA9IHsncHJvamVjdENvc3RIZWFkcyc6MX07XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkV2l0aFByb2plY3Rpb24ocHJvamVjdElkLCBwcm9qZWN0aW9uLCAoZXJyb3IsIHByb2plY3QpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzO1xyXG4gICAgICAgIHRoaXMudXBkYXRlRGlyZWN0UmF0ZShjb3N0SGVhZExpc3QsIGNvc3RIZWFkSWQsIGNhdGVnb3J5SWQsIHdvcmtJdGVtSWQsIGRpcmVjdFJhdGUpO1xyXG5cclxuICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgIGxldCBkYXRhID0geyRzZXQ6IHsncHJvamVjdENvc3RIZWFkcyc6IGNvc3RIZWFkTGlzdH19O1xyXG4gICAgICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgZGF0YSwge25ldzogdHJ1ZX0sIChlcnJvciwgcHJvamVjdCkgPT4ge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pOyovXHJcbiAgfVxyXG5cclxuICBkZWxldGVRdWFudGl0eU9mQnVpbGRpbmdDb3N0SGVhZHNCeU5hbWUocHJvamVjdElkOiBzdHJpbmcsIGJ1aWxkaW5nSWQ6IHN0cmluZywgY29zdEhlYWRJZDogbnVtYmVyLCBjYXRlZ29yeUlkOiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6IG51bWJlciwgaXRlbU5hbWU6IHN0cmluZywgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZGVsZXRlUXVhbnRpdHkgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcXVlcnkgPSB7X2lkOiBidWlsZGluZ0lkfTtcclxuICAgIGxldCBwcm9qZWN0aW9uID0ge2Nvc3RIZWFkczp7XHJcbiAgICAgICAgJGVsZW1NYXRjaCA6e3JhdGVBbmFseXNpc0lkIDogY29zdEhlYWRJZCwgY2F0ZWdvcmllczoge1xyXG4gICAgICAgICAgICAkZWxlbU1hdGNoOntyYXRlQW5hbHlzaXNJZDogY2F0ZWdvcnlJZCx3b3JrSXRlbXM6IHtcclxuICAgICAgICAgICAgICAgICRlbGVtTWF0Y2g6IHtyYXRlQW5hbHlzaXNJZDp3b3JrSXRlbUlkfX19fX19fVxyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkucmV0cmlldmVXaXRoUHJvamVjdGlvbihxdWVyeSwgcHJvamVjdGlvbiwoZXJyb3IsIGJ1aWxkaW5nOkJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcXVhbnRpdHlJdGVtczogQXJyYXk8UXVhbnRpdHlEZXRhaWxzPjtcclxuICAgICAgICBsZXQgdXBkYXRlZFdvcmtJdGVtOiBXb3JrSXRlbSA9IG5ldyBXb3JrSXRlbSgpO1xyXG4gICAgICAgIGZvcihsZXQgY29zdEhlYWQgb2YgYnVpbGRpbmdbMF0uY29zdEhlYWRzKSB7XHJcbiAgICAgICAgICBpZihjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCA9PT0gY29zdEhlYWRJZCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYXRlZ29yeSBvZiBjb3N0SGVhZC5jYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5LnJhdGVBbmFseXNpc0lkID09PSBjYXRlZ29yeUlkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB3b3JrSXRlbSBvZiBjYXRlZ29yeS53b3JrSXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHdvcmtJdGVtLnJhdGVBbmFseXNpc0lkID09PSB3b3JrSXRlbUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlJdGVtcyA9IHdvcmtJdGVtLnF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHM7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgcXVhbnRpdHlJbmRleCA9IDA7IHF1YW50aXR5SW5kZXggPCBxdWFudGl0eUl0ZW1zLmxlbmd0aDsgcXVhbnRpdHlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocXVhbnRpdHlJdGVtc1txdWFudGl0eUluZGV4XS5uYW1lID09PSBpdGVtTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWFudGl0eUl0ZW1zLnNwbGljZShxdWFudGl0eUluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW0ucXVhbnRpdHkudG90YWwgPSBhbGFzcWwoJ1ZBTFVFIE9GIFNFTEVDVCBST1VORChTVU0odG90YWwpLDIpIEZST00gPycsW3F1YW50aXR5SXRlbXNdKTtcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkV29ya0l0ZW0gPSB3b3JrSXRlbTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKmxldCBxdWVyeSA9IHsgX2lkIDogYnVpbGRpbmdJZCwgY29zdEhlYWRzOntcclxuICAgICAgICAgICAgJGVsZW1NYXRjaCA6e3JhdGVBbmFseXNpc0lkIDogY29zdEhlYWRJZCwgY2F0ZWdvcmllczoge1xyXG4gICAgICAgICAgICAgICAgJGVsZW1NYXRjaDp7cmF0ZUFuYWx5c2lzSWQ6IGNhdGVnb3J5SWQsd29ya0l0ZW1zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGVsZW1NYXRjaDoge3JhdGVBbmFseXNpc0lkOndvcmtJdGVtSWQsICdxdWFudGl0eS4kLnF1YW50aXR5SXRlbURldGFpbHMnOnskZWxlbU1hdGNoOntuYW1lOiBpdGVtTmFtZX19fX19fX19IH07XHJcbiAgICAgICAgLy9sZXQgZGF0YSA9IHsgJHNldCA6IHsnY29zdEhlYWRzJyA6IGJ1aWxkaW5nLmNvc3RIZWFkcyB9fTtcclxuICAgICAgICBsZXQgdXBkYXRlUXVlcnkgPSB7JHNldDp7J2Nvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS4kLnF1YW50aXR5SXRlbURldGFpbHMuJFtxdWFudGl0eUl0ZW1EZXRhaWxdLnRvdGFsJzpcclxuICAgICAgICAgICAgICB7JHN1YnRyYWN0OlxyXG4gICAgICAgICAgICAgICAgICBbJ2Nvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS4kLnRvdGFsJyxcclxuICAgICAgICAgICAgICAgICAgJ2Nvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS4kLnF1YW50aXR5SXRlbURldGFpbHMuJFtxdWFudGl0eUl0ZW1EZXRhaWxdLnRvdGFsJ119fSxcclxuICAgICAgICAkcHVsbDp7J2Nvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS4kLnF1YW50aXR5SXRlbURldGFpbHMuJFtxdWFudGl0eUl0ZW1EZXRhaWxdLm5hbWUnOml0ZW1OYW1lfX07XHJcbiAgICAgICAgbGV0IGFycmF5RmlsdGVyID0gW1xyXG4gICAgICAgICAgeydjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCc6Y29zdEhlYWRJZH0sXHJcbiAgICAgICAgICB7J2NhdGVnb3J5LnJhdGVBbmFseXNpc0lkJzogY2F0ZWdvcnlJZH0sXHJcbiAgICAgICAgICB7J3dvcmtJdGVtLnJhdGVBbmFseXNpc0lkJzp3b3JrSXRlbUlkfSxcclxuICAgICAgICAgIHsncXVhbnRpdHlJdGVtRGV0YWlsLm5hbWUnOml0ZW1OYW1lfVxyXG4gICAgICAgIF07Ki9cclxuXHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgbGV0IHVwZGF0ZVF1ZXJ5ID0geyRzZXQ6eydjb3N0SGVhZHMuJFtjb3N0SGVhZF0uY2F0ZWdvcmllcy4kW2NhdGVnb3J5XS53b3JrSXRlbXMuJFt3b3JrSXRlbV0nOnVwZGF0ZWRXb3JrSXRlbX19O1xyXG4gICAgICAgIGxldCBhcnJheUZpbHRlciA9IFtcclxuICAgICAgICAgIHsnY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQnOmNvc3RIZWFkSWR9LFxyXG4gICAgICAgICAgeydjYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCc6IGNhdGVnb3J5SWR9LFxyXG4gICAgICAgICAgeyd3b3JrSXRlbS5yYXRlQW5hbHlzaXNJZCc6d29ya0l0ZW1JZH1cclxuICAgICAgICBdO1xyXG4gICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZVF1ZXJ5LHthcnJheUZpbHRlcnM6YXJyYXlGaWx0ZXIsIG5ldzogdHJ1ZX0sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vRGVsZXRlIFF1YW50aXR5IE9mIFByb2plY3QgQ29zdCBIZWFkcyBCeSBOYW1lXHJcbiAgZGVsZXRlUXVhbnRpdHlPZlByb2plY3RDb3N0SGVhZHNCeU5hbWUocHJvamVjdElkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6IG51bWJlciwgaXRlbU5hbWU6IHN0cmluZywgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZGVsZXRlUXVhbnRpdHkgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcXVlcnkgPSB7X2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHByb2plY3Rpb24gPSB7cHJvamVjdENvc3RIZWFkczp7XHJcbiAgICAgICAgJGVsZW1NYXRjaCA6e3JhdGVBbmFseXNpc0lkIDogY29zdEhlYWRJZCwgY2F0ZWdvcmllczoge1xyXG4gICAgICAgICAgICAkZWxlbU1hdGNoOntyYXRlQW5hbHlzaXNJZDogY2F0ZWdvcnlJZCx3b3JrSXRlbXM6IHtcclxuICAgICAgICAgICAgICAgICRlbGVtTWF0Y2g6IHtyYXRlQW5hbHlzaXNJZDp3b3JrSXRlbUlkfX19fX19fVxyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5yZXRyaWV2ZVdpdGhQcm9qZWN0aW9uKHF1ZXJ5LCBwcm9qZWN0aW9uLCAoZXJyb3IsIHByb2plY3Q6UHJvamVjdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHF1YW50aXR5SXRlbXM6IEFycmF5PFF1YW50aXR5RGV0YWlscz47XHJcbiAgICAgICAgbGV0IHVwZGF0ZWRXb3JrSXRlbTogV29ya0l0ZW0gPSBuZXcgV29ya0l0ZW0oKTtcclxuICAgICAgICBmb3IobGV0IGNvc3RIZWFkIG9mIHByb2plY3RbMF0ucHJvamVjdENvc3RIZWFkcykge1xyXG4gICAgICAgICAgaWYoY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQgPT09IGNvc3RIZWFkSWQpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnkgb2YgY29zdEhlYWQuY2F0ZWdvcmllcykge1xyXG4gICAgICAgICAgICAgIGlmIChjYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCA9PT0gY2F0ZWdvcnlJZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgd29ya0l0ZW0gb2YgY2F0ZWdvcnkud29ya0l0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbS5yYXRlQW5hbHlzaXNJZCA9PT0gd29ya0l0ZW1JZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5SXRlbXMgPSB3b3JrSXRlbS5xdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHF1YW50aXR5SW5kZXggPSAwOyBxdWFudGl0eUluZGV4IDwgcXVhbnRpdHlJdGVtcy5sZW5ndGg7IHF1YW50aXR5SW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHF1YW50aXR5SXRlbXNbcXVhbnRpdHlJbmRleF0ubmFtZSA9PT0gaXRlbU5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlJdGVtcy5zcGxpY2UocXVhbnRpdHlJbmRleCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtLnF1YW50aXR5LnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHRvdGFsKSwyKSBGUk9NID8nLFtxdWFudGl0eUl0ZW1zXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZFdvcmtJdGVtID0gd29ya0l0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBxdWVyeSA9IHtfaWQ6IHByb2plY3RJZH07XHJcbiAgICAgICAgbGV0IHVwZGF0ZVF1ZXJ5ID0geyRzZXQ6eydwcm9qZWN0Q29zdEhlYWRzLiRbY29zdEhlYWRdLmNhdGVnb3JpZXMuJFtjYXRlZ29yeV0ud29ya0l0ZW1zLiRbd29ya0l0ZW1dJzp1cGRhdGVkV29ya0l0ZW19fTtcclxuICAgICAgICBsZXQgYXJyYXlGaWx0ZXIgPSBbXHJcbiAgICAgICAgICB7J2Nvc3RIZWFkLnJhdGVBbmFseXNpc0lkJzpjb3N0SGVhZElkfSxcclxuICAgICAgICAgIHsnY2F0ZWdvcnkucmF0ZUFuYWx5c2lzSWQnOiBjYXRlZ29yeUlkfSxcclxuICAgICAgICAgIHsnd29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQnOndvcmtJdGVtSWR9XHJcbiAgICAgICAgXVxyXG4gICAgICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlUXVlcnkse2FycmF5RmlsdGVyczphcnJheUZpbHRlciwgbmV3OiB0cnVlfSwgKGVycm9yLCBwcm9qZWN0KSA9PiB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiAnc3VjY2VzcycsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBkZWxldGVXb3JraXRlbShwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgd29ya0l0ZW1JZDogbnVtYmVyLCB1c2VyOiBVc2VyLFxyXG4gICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGRlbGV0ZSBXb3JraXRlbSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkKGJ1aWxkaW5nSWQsIChlcnJvciwgYnVpbGRpbmc6IEJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjYXRlZ29yeUxpc3Q6IENhdGVnb3J5W107XHJcbiAgICAgICAgbGV0IFdvcmtJdGVtTGlzdDogV29ya0l0ZW1bXTtcclxuICAgICAgICB2YXIgZmxhZyA9IDA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3N0SGVhZExpc3QubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWRJZCA9PT0gY29zdEhlYWRMaXN0W2luZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBjYXRlZ29yeUxpc3QgPSBjb3N0SGVhZExpc3RbaW5kZXhdLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNhdGVnb3J5SW5kZXggPSAwOyBjYXRlZ29yeUluZGV4IDwgY2F0ZWdvcnlMaXN0Lmxlbmd0aDsgY2F0ZWdvcnlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5SWQgPT09IGNhdGVnb3J5TGlzdFtjYXRlZ29yeUluZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgV29ya0l0ZW1MaXN0ID0gY2F0ZWdvcnlMaXN0W2NhdGVnb3J5SW5kZXhdLndvcmtJdGVtcztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHdvcmtpdGVtSW5kZXggPSAwOyB3b3JraXRlbUluZGV4IDwgV29ya0l0ZW1MaXN0Lmxlbmd0aDsgd29ya2l0ZW1JbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbUlkID09PSBXb3JrSXRlbUxpc3Rbd29ya2l0ZW1JbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBmbGFnID0gMTtcclxuICAgICAgICAgICAgICAgICAgICBXb3JrSXRlbUxpc3Quc3BsaWNlKHdvcmtpdGVtSW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZmxhZyA9PT0gMSkge1xyXG4gICAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBidWlsZGluZywge25ldzogdHJ1ZX0sIChlcnJvciwgV29ya0l0ZW1MaXN0KSA9PiB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBsZXQgbWVzc2FnZSA9ICdXb3JrSXRlbSBkZWxldGVkLic7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IFdvcmtJdGVtTGlzdCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBzZXRDb3N0SGVhZFN0YXR1cyhidWlsZGluZ0lkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgY29zdEhlYWRBY3RpdmVTdGF0dXM6IHN0cmluZywgdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSB7J19pZCc6IGJ1aWxkaW5nSWQsICdjb3N0SGVhZHMucmF0ZUFuYWx5c2lzSWQnOiBjb3N0SGVhZElkfTtcclxuICAgIGxldCBhY3RpdmVTdGF0dXMgPSBKU09OLnBhcnNlKGNvc3RIZWFkQWN0aXZlU3RhdHVzKTtcclxuICAgIGxldCBuZXdEYXRhID0geyRzZXQ6IHsnY29zdEhlYWRzLiQuYWN0aXZlJzogYWN0aXZlU3RhdHVzfX07XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVyciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3BvbnNlLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlV29ya0l0ZW1TdGF0dXNPZkJ1aWxkaW5nQ29zdEhlYWRzKGJ1aWxkaW5nSWQ6IHN0cmluZywgY29zdEhlYWRJZDogbnVtYmVyLCBjYXRlZ29yeUlkOiBudW1iZXIsIHdvcmtJdGVtSWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1BY3RpdmVTdGF0dXM6IGJvb2xlYW4sIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZSBXb3JraXRlbSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHtfaWQ6IGJ1aWxkaW5nSWR9O1xyXG4gICAgbGV0IHVwZGF0ZVF1ZXJ5ID0geyRzZXQ6eydjb3N0SGVhZHMuJFtjb3N0SGVhZF0uY2F0ZWdvcmllcy4kW2NhdGVnb3J5XS53b3JrSXRlbXMuJFt3b3JrSXRlbV0uYWN0aXZlJzp3b3JrSXRlbUFjdGl2ZVN0YXR1c319O1xyXG4gICAgbGV0IGFycmF5RmlsdGVyID0gW1xyXG4gICAgICB7J2Nvc3RIZWFkLnJhdGVBbmFseXNpc0lkJzpjb3N0SGVhZElkfSxcclxuICAgICAgeydjYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCc6IGNhdGVnb3J5SWR9LFxyXG4gICAgICB7J3dvcmtJdGVtLnJhdGVBbmFseXNpc0lkJzp3b3JrSXRlbUlkfVxyXG4gICAgXTtcclxuXHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVRdWVyeSwge2FycmF5RmlsdGVyczphcnJheUZpbHRlciwgbmV3OiB0cnVlfSwgKGVycm9yLCByZXNwb25zZSkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSBXb3JrSXRlbSBTdGF0dXMgT2YgUHJvamVjdCBDb3N0SGVhZHNcclxuICB1cGRhdGVXb3JrSXRlbVN0YXR1c09mUHJvamVjdENvc3RIZWFkcyhwcm9qZWN0SWQ6IHN0cmluZywgY29zdEhlYWRJZDogbnVtYmVyLCBjYXRlZ29yeUlkOiBudW1iZXIsIHdvcmtJdGVtSWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrSXRlbUFjdGl2ZVN0YXR1czogYm9vbGVhbiwgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgVXBkYXRlIFdvcmtJdGVtIFN0YXR1cyBPZiBQcm9qZWN0IENvc3QgSGVhZHMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcXVlcnkgPSB7X2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHVwZGF0ZVF1ZXJ5ID0geyRzZXQ6eydwcm9qZWN0Q29zdEhlYWRzLiRbY29zdEhlYWRdLmNhdGVnb3JpZXMuJFtjYXRlZ29yeV0ud29ya0l0ZW1zLiRbd29ya0l0ZW1dLmFjdGl2ZSc6d29ya0l0ZW1BY3RpdmVTdGF0dXN9fTtcclxuICAgIGxldCBhcnJheUZpbHRlciA9IFtcclxuICAgICAgeydjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCc6Y29zdEhlYWRJZH0sXHJcbiAgICAgIHsnY2F0ZWdvcnkucmF0ZUFuYWx5c2lzSWQnOiBjYXRlZ29yeUlkfSxcclxuICAgICAgeyd3b3JrSXRlbS5yYXRlQW5hbHlzaXNJZCc6d29ya0l0ZW1JZH1cclxuICAgIF07XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZVF1ZXJ5LCB7YXJyYXlGaWx0ZXJzOmFycmF5RmlsdGVyLCBuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIFVwZGF0ZSBXb3JrSXRlbSBTdGF0dXMgT2YgUHJvamVjdCBDb3N0IEhlYWRzICxmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUJ1ZGdldGVkQ29zdEZvckNvc3RIZWFkKGJ1aWxkaW5nSWQ6IHN0cmluZywgY29zdEhlYWRCdWRnZXRlZEFtb3VudDogYW55LCB1c2VyOiBVc2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZUJ1ZGdldGVkQ29zdEZvckNvc3RIZWFkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHF1ZXJ5ID0geydfaWQnOiBidWlsZGluZ0lkLCAnY29zdEhlYWRzLm5hbWUnOiBjb3N0SGVhZEJ1ZGdldGVkQW1vdW50LmNvc3RIZWFkfTtcclxuXHJcbiAgICBsZXQgbmV3RGF0YSA9IHtcclxuICAgICAgJHNldDoge1xyXG4gICAgICAgICdjb3N0SGVhZHMuJC5idWRnZXRlZENvc3RBbW91bnQnOiBjb3N0SGVhZEJ1ZGdldGVkQW1vdW50LmJ1ZGdldGVkQ29zdEFtb3VudCxcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVyciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3BvbnNlLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlQnVkZ2V0ZWRDb3N0Rm9yUHJvamVjdENvc3RIZWFkKHByb2plY3RJZDogc3RyaW5nLCBjb3N0SGVhZEJ1ZGdldGVkQW1vdW50OiBhbnksIHVzZXI6IFVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZUJ1ZGdldGVkQ29zdEZvckNvc3RIZWFkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHF1ZXJ5ID0geydfaWQnOiBwcm9qZWN0SWQsICdwcm9qZWN0Q29zdEhlYWRzLm5hbWUnOiBjb3N0SGVhZEJ1ZGdldGVkQW1vdW50LmNvc3RIZWFkfTtcclxuXHJcbiAgICBsZXQgbmV3RGF0YSA9IHtcclxuICAgICAgJHNldDoge1xyXG4gICAgICAgICdwcm9qZWN0Q29zdEhlYWRzLiQuYnVkZ2V0ZWRDb3N0QW1vdW50JzogY29zdEhlYWRCdWRnZXRlZEFtb3VudC5idWRnZXRlZENvc3RBbW91bnQsXHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVyciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3BvbnNlLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcblxyXG4gIHVwZGF0ZVF1YW50aXR5T2ZCdWlsZGluZ0Nvc3RIZWFkcyhwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgd29ya0l0ZW1JZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbDogUXVhbnRpdHlEZXRhaWxzLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGVRdWFudGl0eU9mQnVpbGRpbmdDb3N0SGVhZHMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgLyogIGxldCBxdWVyeSA9IHtfaWQ6IGJ1aWxkaW5nSWR9O1xyXG4gICAgbGV0IHByb2plY3Rpb24gPSB7Y29zdEhlYWRzOntcclxuICAgICAgICAkZWxlbU1hdGNoIDp7cmF0ZUFuYWx5c2lzSWQgOiBjb3N0SGVhZElkLCBjYXRlZ29yaWVzOiB7XHJcbiAgICAgICAgICAgICRlbGVtTWF0Y2g6e3JhdGVBbmFseXNpc0lkOiBjYXRlZ29yeUlkLHdvcmtJdGVtczoge1xyXG4gICAgICAgICAgICAgICAgJGVsZW1NYXRjaDoge3JhdGVBbmFseXNpc0lkOndvcmtJdGVtSWR9fX19fX19XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5yZXRyaWV2ZVdpdGhQcm9qZWN0aW9uKHF1ZXJ5LCBwcm9qZWN0aW9uLChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZExpc3QgPSBidWlsZGluZ1swXS5jb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IHF1YW50aXR5ICA6IFF1YW50aXR5O1xyXG4gICAgICAgIGZvciAobGV0IGNvc3RIZWFkIG9mIGNvc3RIZWFkTGlzdCkge1xyXG4gICAgICAgICAgICBsZXQgY2F0ZWdvcmllc09mQ29zdEhlYWQgPSBjb3N0SGVhZC5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYXRlZ29yeURhdGEgb2YgY2F0ZWdvcmllc09mQ29zdEhlYWQpIHtcclxuICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnlJZCA9PT0gY2F0ZWdvcnlEYXRhLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB3b3JrSXRlbURhdGEgb2YgY2F0ZWdvcnlEYXRhLndvcmtJdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICBpZiAod29ya0l0ZW1JZCA9PT0gd29ya0l0ZW1EYXRhLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHkgPSB3b3JrSXRlbURhdGEucXVhbnRpdHk7XHJcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHkuaXNFc3RpbWF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHF1YW50aXR5LmlzRGlyZWN0UXVhbnRpdHkgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHF1YW50aXR5LmlzRGlyZWN0UXVhbnRpdHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVRdWFudGl0eUl0ZW1zT2ZXb3JrSXRlbSggcXVhbnRpdHksIHF1YW50aXR5RGV0YWlsKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGxldCBxdWVyeSA9IHtfaWQ6IGJ1aWxkaW5nSWR9O1xyXG4gICAgICAgICAgbGV0IHVwZGF0ZVF1ZXJ5ID0geyRzZXQ6eydjb3N0SGVhZHMuJFtjb3N0SGVhZF0uY2F0ZWdvcmllcy4kW2NhdGVnb3J5XS53b3JrSXRlbXMuJFt3b3JrSXRlbV0ucXVhbnRpdHknOnF1YW50aXR5fX07XHJcbiAgICAgICAgICBsZXQgYXJyYXlGaWx0ZXIgPSBbXHJcbiAgICAgICAgICAgIHsnY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQnOmNvc3RIZWFkSWR9LFxyXG4gICAgICAgICAgICB7J2NhdGVnb3J5LnJhdGVBbmFseXNpc0lkJzogY2F0ZWdvcnlJZH0sXHJcbiAgICAgICAgICAgIHsnd29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQnOndvcmtJdGVtSWR9XHJcbiAgICAgICAgICBdO1xyXG4gICAgICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlUXVlcnksIHthcnJheUZpbHRlcnM6YXJyYXlGaWx0ZXIsIG5ldzogdHJ1ZX0sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiAnc3VjY2VzcycsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7Ki9cclxuICAgIGxldCBxdWVyeSA9IFtcclxuICAgICAgeyRtYXRjaDogeydfaWQnOiBPYmplY3RJZChidWlsZGluZ0lkKSwgJ2Nvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCc6IGNvc3RIZWFkSWR9fSxcclxuICAgICAgeyR1bndpbmQ6ICckY29zdEhlYWRzJ30sXHJcbiAgICAgIHskcHJvamVjdDogeydjb3N0SGVhZHMnOiAxfX0sXHJcbiAgICAgIHskdW53aW5kOiAnJGNvc3RIZWFkcy5jYXRlZ29yaWVzJ30sXHJcbiAgICAgIHskbWF0Y2g6IHsnY29zdEhlYWRzLmNhdGVnb3JpZXMucmF0ZUFuYWx5c2lzSWQnOiBjYXRlZ29yeUlkfX0sXHJcbiAgICAgIHskcHJvamVjdDogeydjb3N0SGVhZHMuY2F0ZWdvcmllcy53b3JrSXRlbXMnOiAxfX0sXHJcbiAgICAgIHskdW53aW5kOiAnJGNvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcyd9LFxyXG4gICAgICB7JG1hdGNoOiB7J2Nvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcy5yYXRlQW5hbHlzaXNJZCc6IHdvcmtJdGVtSWR9fSxcclxuICAgICAgeyRwcm9qZWN0OiB7J2Nvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcy5xdWFudGl0eSc6IDF9fSxcclxuICAgIF07XHJcblxyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuYWdncmVnYXRlKHF1ZXJ5LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBsZXQgcXVhbnRpdHk9IHJlc3VsdFswXS5jb3N0SGVhZHMuY2F0ZWdvcmllcy53b3JrSXRlbXMucXVhbnRpdHk7XHJcbiAgICAgICAgICBxdWFudGl0eS5pc0VzdGltYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICBpZihxdWFudGl0eS5pc0RpcmVjdFF1YW50aXR5ID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgIHF1YW50aXR5LmlzRGlyZWN0UXVhbnRpdHkgPSBmYWxzZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHRoaXMudXBkYXRlUXVhbnRpdHlJdGVtc09mV29ya0l0ZW0oIHF1YW50aXR5LCBxdWFudGl0eURldGFpbCk7XHJcblxyXG4gICAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgICBsZXQgdXBkYXRlUXVlcnkgPSB7JHNldDp7J2Nvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eSc6cXVhbnRpdHl9fTtcclxuICAgICAgICAgIGxldCBhcnJheUZpbHRlciA9IFtcclxuICAgICAgICAgICAgeydjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCc6Y29zdEhlYWRJZH0sXHJcbiAgICAgICAgICAgIHsnY2F0ZWdvcnkucmF0ZUFuYWx5c2lzSWQnOiBjYXRlZ29yeUlkfSxcclxuICAgICAgICAgICAgeyd3b3JrSXRlbS5yYXRlQW5hbHlzaXNJZCc6d29ya0l0ZW1JZH1cclxuICAgICAgICAgIF07XHJcbiAgICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVRdWVyeSwge2FycmF5RmlsdGVyczphcnJheUZpbHRlciwgbmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICBsZXQgZXJyb3IgPSBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgIGVycm9yLm1lc3NhZ2UgPSBtZXNzYWdlcy5NU0dfRVJST1JfRU1QVFlfUkVTUE9OU0U7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZURpcmVjdFF1YW50aXR5T2ZCdWlsZGluZ1dvcmtJdGVtcyhwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgd29ya0l0ZW1JZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3RRdWFudGl0eTogbnVtYmVyLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGVEaXJlY3RRdWFudGl0eU9mQnVpbGRpbmdDb3N0SGVhZHMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcHJvamVjdGlvbiA9IHtjb3N0SGVhZHM6IDF9O1xyXG4gICAgbGV0IHF1ZXJ5ID0ge19pZDogYnVpbGRpbmdJZH07XHJcbiAgICBsZXQgdXBkYXRlUXVlcnkgPSB7JHNldDp7J2Nvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS5pc0VzdGltYXRlZCc6dHJ1ZSxcclxuICAgICAgICAnY29zdEhlYWRzLiRbY29zdEhlYWRdLmNhdGVnb3JpZXMuJFtjYXRlZ29yeV0ud29ya0l0ZW1zLiRbd29ya0l0ZW1dLnF1YW50aXR5LmlzRGlyZWN0UXVhbnRpdHknOnRydWUsXHJcbiAgICAgICAgJ2Nvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS50b3RhbCc6ZGlyZWN0UXVhbnRpdHksXHJcbiAgICAgICAgJ2Nvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzJzpbXSxcclxuICAgICAgfX07XHJcblxyXG4gICAgbGV0IGFycmF5RmlsdGVyID0gW1xyXG4gICAgICB7J2Nvc3RIZWFkLnJhdGVBbmFseXNpc0lkJzpjb3N0SGVhZElkfSxcclxuICAgICAgeydjYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCc6IGNhdGVnb3J5SWR9LFxyXG4gICAgICB7J3dvcmtJdGVtLnJhdGVBbmFseXNpc0lkJzp3b3JrSXRlbUlkfVxyXG4gICAgXTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZVF1ZXJ5LCB7YXJyYXlGaWx0ZXJzOmFycmF5RmlsdGVyLCBuZXc6IHRydWV9LCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgLypsZXQgcHJvamVjdGlvbiA9IHsgY29zdEhlYWRzIDogMSB9O1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWRXaXRoUHJvamVjdGlvbihidWlsZGluZ0lkLCBwcm9qZWN0aW9uLCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIHRoaXMudXBkYXRlUXVhbnRpdHlEZXRhaWxzKGNvc3RIZWFkTGlzdCwgY29zdEhlYWRJZCwgY2F0ZWdvcnlJZCwgd29ya0l0ZW1JZCwgZGlyZWN0UXVhbnRpdHkpO1xyXG5cclxuICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBidWlsZGluZ0lkfTtcclxuICAgICAgICBsZXQgZGF0YSA9IHskc2V0OiB7J2Nvc3RIZWFkcyc6IGNvc3RIZWFkTGlzdH19O1xyXG4gICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGRhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiAnc3VjY2VzcycsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7Ki9cclxuICB9XHJcblxyXG4gIHVwZGF0ZURpcmVjdFF1YW50aXR5T2ZQcm9qZWN0V29ya0l0ZW1zKHByb2plY3RJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgd29ya0l0ZW1JZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdFF1YW50aXR5OiBudW1iZXIsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZURpcmVjdFF1YW50aXR5T2ZQcm9qZWN0V29ya0l0ZW1zIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHF1ZXJ5ID0ge19pZDogcHJvamVjdElkfTtcclxuICAgIGxldCB1cGRhdGVRdWVyeSA9IHskc2V0OnsncHJvamVjdENvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS5pc0VzdGltYXRlZCc6dHJ1ZSxcclxuICAgICAgICAncHJvamVjdENvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS5pc0RpcmVjdFF1YW50aXR5Jzp0cnVlLFxyXG4gICAgICAgICdwcm9qZWN0Q29zdEhlYWRzLiRbY29zdEhlYWRdLmNhdGVnb3JpZXMuJFtjYXRlZ29yeV0ud29ya0l0ZW1zLiRbd29ya0l0ZW1dLnF1YW50aXR5LnRvdGFsJzpkaXJlY3RRdWFudGl0eSxcclxuICAgICAgICAncHJvamVjdENvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzJzpbXVxyXG4gICAgICB9fTtcclxuXHJcbiAgICBsZXQgYXJyYXlGaWx0ZXIgPSBbXHJcbiAgICAgIHsnY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQnOmNvc3RIZWFkSWR9LFxyXG4gICAgICB7J2NhdGVnb3J5LnJhdGVBbmFseXNpc0lkJzogY2F0ZWdvcnlJZH0sXHJcbiAgICAgIHsnd29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQnOndvcmtJdGVtSWR9XHJcbiAgICBdO1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVRdWVyeSwge2FycmF5RmlsdGVyczphcnJheUZpbHRlciwgbmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIC8qbGV0IHByb2plY3Rpb24gPSB7IHByb2plY3RDb3N0SGVhZHMgOiAxIH07XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkV2l0aFByb2plY3Rpb24ocHJvamVjdElkLCBwcm9qZWN0aW9uLChlcnJvciwgcHJvamVjdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkTGlzdCA9IHByb2plY3QucHJvamVjdENvc3RIZWFkcztcclxuICAgICAgICB0aGlzLnVwZGF0ZVF1YW50aXR5RGV0YWlscyhjb3N0SGVhZExpc3QsIGNvc3RIZWFkSWQsIGNhdGVnb3J5SWQsIHdvcmtJdGVtSWQsIGRpcmVjdFF1YW50aXR5KTtcclxuXHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogcHJvamVjdElkfTtcclxuICAgICAgICBsZXQgZGF0YSA9IHskc2V0OiB7J3Byb2plY3RDb3N0SGVhZHMnOiBjb3N0SGVhZExpc3R9fTtcclxuICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGRhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiAnc3VjY2VzcycsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7Ki9cclxuICB9XHJcblxyXG4gIHVwZGF0ZVF1YW50aXR5RGV0YWlsc09mUHJvamVjdChwcm9qZWN0SWQ6IHN0cmluZywgY29zdEhlYWRJZDogbnVtYmVyLCBjYXRlZ29yeUlkOiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6IG51bWJlciwgcXVhbnRpdHlEZXRhaWxzT2JqOiBRdWFudGl0eURldGFpbHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxldCBxdWVyeSA9IFtcclxuICAgICAgeyRtYXRjaDogeydfaWQnOiBPYmplY3RJZChwcm9qZWN0SWQpLCAncHJvamVjdENvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCc6IGNvc3RIZWFkSWR9fSxcclxuICAgICAgeyR1bndpbmQ6ICckcHJvamVjdENvc3RIZWFkcyd9LFxyXG4gICAgICB7JHByb2plY3Q6IHsncHJvamVjdENvc3RIZWFkcyc6IDF9fSxcclxuICAgICAgeyR1bndpbmQ6ICckcHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzJ30sXHJcbiAgICAgIHskbWF0Y2g6IHsncHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzLnJhdGVBbmFseXNpc0lkJzogY2F0ZWdvcnlJZH19LFxyXG4gICAgICB7JHByb2plY3Q6IHsncHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcyc6IDF9fSxcclxuICAgICAgeyR1bndpbmQ6ICckcHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcyd9LFxyXG4gICAgICB7JG1hdGNoOiB7J3Byb2plY3RDb3N0SGVhZHMuY2F0ZWdvcmllcy53b3JrSXRlbXMucmF0ZUFuYWx5c2lzSWQnOiB3b3JrSXRlbUlkfX0sXHJcbiAgICAgIHskcHJvamVjdDogeydwcm9qZWN0Q29zdEhlYWRzLmNhdGVnb3JpZXMud29ya0l0ZW1zLnF1YW50aXR5JzogMX19LFxyXG4gICAgXTtcclxuXHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmFnZ3JlZ2F0ZShxdWVyeSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChyZXN1bHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgbGV0IHF1YW50aXR5PSByZXN1bHRbMF0ucHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcy5xdWFudGl0eTtcclxuICAgICAgICAgIHRoaXMudXBkYXRlUXVhbnRpdHlEZXRhaWxzKHF1YW50aXR5LCBxdWFudGl0eURldGFpbHNPYmopO1xyXG5cclxuICAgICAgICAgIGxldCBxdWVyeSA9IHtfaWQ6IHByb2plY3RJZH07XHJcbiAgICAgICAgICBsZXQgdXBkYXRlUXVlcnkgPSB7JHNldDp7J3Byb2plY3RDb3N0SGVhZHMuJFtjb3N0SGVhZF0uY2F0ZWdvcmllcy4kW2NhdGVnb3J5XS53b3JrSXRlbXMuJFt3b3JrSXRlbV0ucXVhbnRpdHknOnF1YW50aXR5fX07XHJcbiAgICAgICAgICBsZXQgYXJyYXlGaWx0ZXIgPSBbXHJcbiAgICAgICAgICAgIHsnY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQnOmNvc3RIZWFkSWR9LFxyXG4gICAgICAgICAgICB7J2NhdGVnb3J5LnJhdGVBbmFseXNpc0lkJzogY2F0ZWdvcnlJZH0sXHJcbiAgICAgICAgICAgIHsnd29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQnOndvcmtJdGVtSWR9XHJcbiAgICAgICAgICBdO1xyXG4gICAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVRdWVyeSwge2FycmF5RmlsdGVyczphcnJheUZpbHRlciwgbmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHF1YW50aXR5RGV0YWlsc09iaiwgc3RhdHVzIDonc3VjY2VzcycsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgbGV0IGVycm9yID0gbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICBlcnJvci5tZXNzYWdlID0gbWVzc2FnZXMuTVNHX0VSUk9SX0VNUFRZX1JFU1BPTlNFO1xyXG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuXHJcbiAgdXBkYXRlUXVhbnRpdHlEZXRhaWxzT2ZCdWlsZGluZyhwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6IG51bWJlciwgcXVhbnRpdHlEZXRhaWxzT2JqOiBRdWFudGl0eURldGFpbHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSBbXHJcbiAgICAgICAgeyRtYXRjaDogeydfaWQnOiBPYmplY3RJZChidWlsZGluZ0lkKSwgJ2Nvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCc6IGNvc3RIZWFkSWR9fSxcclxuICAgICAgICB7JHVud2luZDogJyRjb3N0SGVhZHMnfSxcclxuICAgICAgICB7JHByb2plY3Q6IHsnY29zdEhlYWRzJzogMX19LFxyXG4gICAgICAgIHskdW53aW5kOiAnJGNvc3RIZWFkcy5jYXRlZ29yaWVzJ30sXHJcbiAgICAgICAgeyRtYXRjaDogeydjb3N0SGVhZHMuY2F0ZWdvcmllcy5yYXRlQW5hbHlzaXNJZCc6IGNhdGVnb3J5SWR9fSxcclxuICAgICAgICB7JHByb2plY3Q6IHsnY29zdEhlYWRzLmNhdGVnb3JpZXMud29ya0l0ZW1zJzogMX19LFxyXG4gICAgICAgIHskdW53aW5kOiAnJGNvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcyd9LFxyXG4gICAgICAgIHskbWF0Y2g6IHsnY29zdEhlYWRzLmNhdGVnb3JpZXMud29ya0l0ZW1zLnJhdGVBbmFseXNpc0lkJzogd29ya0l0ZW1JZH19LFxyXG4gICAgICAgIHskcHJvamVjdDogeydjb3N0SGVhZHMuY2F0ZWdvcmllcy53b3JrSXRlbXMucXVhbnRpdHknOiAxfX0sXHJcbiAgICAgIF07XHJcblxyXG4gICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5hZ2dyZWdhdGUocXVlcnksIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBsZXQgcXVhbnRpdHk9IHJlc3VsdFswXS5jb3N0SGVhZHMuY2F0ZWdvcmllcy53b3JrSXRlbXMucXVhbnRpdHk7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUXVhbnRpdHlEZXRhaWxzKHF1YW50aXR5LCBxdWFudGl0eURldGFpbHNPYmopO1xyXG5cclxuICAgICAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgICAgIGxldCB1cGRhdGVRdWVyeSA9IHskc2V0OnsnY29zdEhlYWRzLiRbY29zdEhlYWRdLmNhdGVnb3JpZXMuJFtjYXRlZ29yeV0ud29ya0l0ZW1zLiRbd29ya0l0ZW1dLnF1YW50aXR5JzpxdWFudGl0eX19O1xyXG4gICAgICAgICAgICBsZXQgYXJyYXlGaWx0ZXIgPSBbXHJcbiAgICAgICAgICAgICAgeydjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCc6Y29zdEhlYWRJZH0sXHJcbiAgICAgICAgICAgICAgeydjYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCc6IGNhdGVnb3J5SWR9LFxyXG4gICAgICAgICAgICAgIHsnd29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQnOndvcmtJdGVtSWR9XHJcbiAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZVF1ZXJ5LCB7YXJyYXlGaWx0ZXJzOmFycmF5RmlsdGVyLCBuZXc6IHRydWV9LCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHF1YW50aXR5RGV0YWlsc09iaiwgc3RhdHVzIDonc3VjY2VzcycsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgZXJyb3IgPSBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2VzLk1TR19FUlJPUl9FTVBUWV9SRVNQT05TRTtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gIHVwZGF0ZVF1YW50aXR5RGV0YWlscyhxdWFudGl0eTogUXVhbnRpdHksIHF1YW50aXR5RGV0YWlsc09iajogUXVhbnRpdHlEZXRhaWxzKSB7XHJcbiAgICBxdWFudGl0eS5pc0VzdGltYXRlZCA9IHRydWU7XHJcbiAgICBxdWFudGl0eS5pc0RpcmVjdFF1YW50aXR5ID0gZmFsc2U7XHJcbiAgICBsZXQgcXVhbnRpdHlEZXRhaWxzID0gcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscztcclxuICAgIGxldCBjdXJyZW50X2RhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgbGV0IG5ld1F1YW50aXR5SWQgPSBjdXJyZW50X2RhdGUuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XHJcblxyXG4gICAgaWYgKHF1YW50aXR5RGV0YWlscy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBxdWFudGl0eURldGFpbHNPYmouaWQgPSBuZXdRdWFudGl0eUlkO1xyXG4gICAgICAgIHF1YW50aXR5RGV0YWlsc09iai5pc0RpcmVjdFF1YW50aXR5ID0gZmFsc2U7XHJcbiAgICAgICAgcXVhbnRpdHlEZXRhaWxzLnB1c2gocXVhbnRpdHlEZXRhaWxzT2JqKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGxldCBpc0RlZmF1bHRFeGlzdHNTUUwgPSAnU0VMRUNUIG5hbWUgZnJvbSA/IEFTIHF1YW50aXR5RGV0YWlscyB3aGVyZSBxdWFudGl0eURldGFpbHMubmFtZT1cImRlZmF1bHRcIic7XHJcbiAgICAgIGxldCBpc0RlZmF1bHRFeGlzdHNRdWFudGl0eURldGFpbCA9IGFsYXNxbChpc0RlZmF1bHRFeGlzdHNTUUwsIFtxdWFudGl0eURldGFpbHNdKTtcclxuXHJcbiAgICAgIGlmIChpc0RlZmF1bHRFeGlzdHNRdWFudGl0eURldGFpbC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscyA9IFtdO1xyXG4gICAgICAgIHF1YW50aXR5RGV0YWlsc09iai5pZCA9IG5ld1F1YW50aXR5SWQ7XHJcbiAgICAgICAgcXVhbnRpdHlEZXRhaWxzT2JqLmlzRGlyZWN0UXVhbnRpdHkgPSBmYWxzZTtcclxuICAgICAgICBxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzLnB1c2gocXVhbnRpdHlEZXRhaWxzT2JqKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAocXVhbnRpdHlEZXRhaWxzT2JqLm5hbWUgIT09ICdkZWZhdWx0Jykge1xyXG4gICAgICAgICAgbGV0IGlzSXRlbUFscmVhZHlFeGlzdFNRTCA9ICdTRUxFQ1QgaWQgZnJvbSA/IEFTIHF1YW50aXR5RGV0YWlscyB3aGVyZSBxdWFudGl0eURldGFpbHMuaWQ9JyArIHF1YW50aXR5RGV0YWlsc09iai5pZCArICcnO1xyXG4gICAgICAgICAgbGV0IGlzSXRlbUFscmVhZHlFeGlzdHMgPSBhbGFzcWwoaXNJdGVtQWxyZWFkeUV4aXN0U1FMLCBbcXVhbnRpdHlEZXRhaWxzXSk7XHJcblxyXG4gICAgICAgICAgaWYgKGlzSXRlbUFscmVhZHlFeGlzdHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBxdWFudGl0eUluZGV4ID0gMDsgcXVhbnRpdHlJbmRleCA8IHF1YW50aXR5RGV0YWlscy5sZW5ndGg7IHF1YW50aXR5SW5kZXgrKykge1xyXG4gICAgICAgICAgICAgIGlmIChxdWFudGl0eURldGFpbHNbcXVhbnRpdHlJbmRleF0uaWQgPT09IHF1YW50aXR5RGV0YWlsc09iai5pZCkge1xyXG4gICAgICAgICAgICAgICAgcXVhbnRpdHlEZXRhaWxzW3F1YW50aXR5SW5kZXhdLm5hbWUgPSBxdWFudGl0eURldGFpbHNPYmoubmFtZTtcclxuICAgICAgICAgICAgLyogICAgaWYoIHF1YW50aXR5RGV0YWlsc09iai5xdWFudGl0eUl0ZW1zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbHNbcXVhbnRpdHlJbmRleF0ucXVhbnRpdHlJdGVtcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbHNbcXVhbnRpdHlJbmRleF0uaXNEaXJlY3RRdWFudGl0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbHNbcXVhbnRpdHlJbmRleF0ucXVhbnRpdHlJdGVtcyA9IHF1YW50aXR5RGV0YWlsc09iai5xdWFudGl0eUl0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbHNbcXVhbnRpdHlJbmRleF0uaXNEaXJlY3RRdWFudGl0eSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgaWYocXVhbnRpdHlEZXRhaWxzT2JqLnN0ZWVsUXVhbnRpdHlJdGVtcykge1xyXG4gICAgICAgICAgICAgIHF1YW50aXR5RGV0YWlsc1txdWFudGl0eUluZGV4XS5zdGVlbFF1YW50aXR5SXRlbXMgPSBuZXcgU3RlZWxRdWFudGl0eUl0ZW1zKCk7XHJcbiAgICAgICAgICAgIH1lbHNlIGlmKHF1YW50aXR5RGV0YWlsc09iai5xdWFudGl0eUl0ZW1zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgIHF1YW50aXR5RGV0YWlsc1txdWFudGl0eUluZGV4XS5xdWFudGl0eUl0ZW1zID0gW107XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0qL1xyXG4gICAgICAgICAgICAgICAgaWYoIHF1YW50aXR5RGV0YWlsc09iai5xdWFudGl0eUl0ZW1zLmxlbmd0aCA9PT0gMCAmJiBxdWFudGl0eURldGFpbHNPYmouc3RlZWxRdWFudGl0eUl0ZW1zLnN0ZWVsUXVhbnRpdHlJdGVtLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbHNbcXVhbnRpdHlJbmRleF0ucXVhbnRpdHlJdGVtcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbHNbcXVhbnRpdHlJbmRleF0uc3RlZWxRdWFudGl0eUl0ZW1zID0gbmV3IFN0ZWVsUXVhbnRpdHlJdGVtcygpO1xyXG4gICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbHNbcXVhbnRpdHlJbmRleF0uaXNEaXJlY3RRdWFudGl0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYocXVhbnRpdHlEZXRhaWxzT2JqLnF1YW50aXR5SXRlbXMubGVuZ3RoICE9PSAwIHx8IHF1YW50aXR5RGV0YWlsc09iai5zdGVlbFF1YW50aXR5SXRlbXMuc3RlZWxRdWFudGl0eUl0ZW0ubGVuZ3RoICE9PTAgKSB7XHJcbiAgICAgICAgICAgICAgICAgIHF1YW50aXR5RGV0YWlsc1txdWFudGl0eUluZGV4XS5xdWFudGl0eUl0ZW1zID0gcXVhbnRpdHlEZXRhaWxzT2JqLnF1YW50aXR5SXRlbXM7XHJcbiAgICAgICAgICAgICAgICAgIHF1YW50aXR5RGV0YWlsc1txdWFudGl0eUluZGV4XS5zdGVlbFF1YW50aXR5SXRlbXMgPSBxdWFudGl0eURldGFpbHNPYmouc3RlZWxRdWFudGl0eUl0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbHNbcXVhbnRpdHlJbmRleF0uaXNEaXJlY3RRdWFudGl0eSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcXVhbnRpdHlEZXRhaWxzW3F1YW50aXR5SW5kZXhdLnRvdGFsID0gcXVhbnRpdHlEZXRhaWxzT2JqLnRvdGFsO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcXVhbnRpdHlEZXRhaWxzT2JqLmlkID0gbmV3UXVhbnRpdHlJZDtcclxuICAgICAgICAgICAgcXVhbnRpdHlEZXRhaWxzT2JqLmlzRGlyZWN0UXVhbnRpdHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscy5wdXNoKHF1YW50aXR5RGV0YWlsc09iaik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB1cGRhdGVRdWFudGl0eUl0ZW1zT2ZXb3JrSXRlbShxdWFudGl0eTogUXVhbnRpdHksIHF1YW50aXR5RGV0YWlsOiBRdWFudGl0eURldGFpbHMpIHtcclxuXHJcbiAgICBxdWFudGl0eS5pc0VzdGltYXRlZCA9IHRydWU7XHJcbiAgICBsZXQgY3VycmVudF9kYXRlID0gbmV3IERhdGUoKTtcclxuICAgIGxldCBxdWFudGl0eUlkID0gY3VycmVudF9kYXRlLmdldFVUQ01pbGxpc2Vjb25kcygpO1xyXG5cclxuICAgIGlmIChxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGlmKHF1YW50aXR5RGV0YWlsLmlkID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIHF1YW50aXR5RGV0YWlsLmlkID0gcXVhbnRpdHlJZDtcclxuICAgICAgICAgIC8vcXVhbnRpdHlEZXRhaWwudG90YWwgPSBhbGFzcWwoJ1ZBTFVFIE9GIFNFTEVDVCBST1VORChTVU0ocXVhbnRpdHkpLDIpIEZST00gPycsIFtxdWFudGl0eURldGFpbC5xdWFudGl0eUl0ZW1zXSk7XHJcbiAgICAgICAgICBxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzLnB1c2gocXVhbnRpdHlEZXRhaWwpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvL3F1YW50aXR5RGV0YWlsLnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHF1YW50aXR5KSwyKSBGUk9NID8nLCBbcXVhbnRpdHlEZXRhaWwucXVhbnRpdHlJdGVtc10pO1xyXG4gICAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscy5wdXNoKHF1YW50aXR5RGV0YWlsKTtcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgbGV0IGlzRGVmYXVsdEV4aXN0c1NRTCA9ICdTRUxFQ1QgbmFtZSBmcm9tID8gQVMgcXVhbnRpdHlEZXRhaWxzIHdoZXJlIHF1YW50aXR5RGV0YWlscy5uYW1lPVwiZGVmYXVsdFwiJztcclxuICAgICAgbGV0IGlzRGVmYXVsdEV4aXN0c1F1YW50aXR5RGV0YWlsID0gYWxhc3FsKGlzRGVmYXVsdEV4aXN0c1NRTCwgW3F1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHNdKTtcclxuXHJcbiAgICAgIGlmIChpc0RlZmF1bHRFeGlzdHNRdWFudGl0eURldGFpbC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcXVhbnRpdHlEZXRhaWwuaWQgPSBxdWFudGl0eUlkO1xyXG4gICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHMgPSBbXTtcclxuICAgICAgLy8gIHF1YW50aXR5RGV0YWlsLnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHF1YW50aXR5KSwyKSBGUk9NID8nLCBbcXVhbnRpdHlEZXRhaWwucXVhbnRpdHlJdGVtc10pO1xyXG4gICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHMucHVzaChxdWFudGl0eURldGFpbCk7XHJcblxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChxdWFudGl0eURldGFpbC5uYW1lICE9PSAnZGVmYXVsdCcpIHtcclxuICAgICAgICAgIGxldCBpc0l0ZW1BbHJlYWR5RXhpc3RTUUwgPSAnU0VMRUNUIGlkIGZyb20gPyBBUyBxdWFudGl0eURldGFpbHMgd2hlcmUgcXVhbnRpdHlEZXRhaWxzLmlkPScgKyBxdWFudGl0eURldGFpbC5pZCArICcnO1xyXG4gICAgICAgICAgbGV0IGlzSXRlbUFscmVhZHlFeGlzdHMgPSBhbGFzcWwoaXNJdGVtQWxyZWFkeUV4aXN0U1FMLCBbcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlsc10pO1xyXG5cclxuICAgICAgICAgIGlmIChpc0l0ZW1BbHJlYWR5RXhpc3RzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgcXVhbnRpdHlJbmRleCA9IDA7IHF1YW50aXR5SW5kZXggPCBxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzLmxlbmd0aDsgcXVhbnRpdHlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHNbcXVhbnRpdHlJbmRleF0uaWQgPT09IHF1YW50aXR5RGV0YWlsLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzW3F1YW50aXR5SW5kZXhdLmlzRGlyZWN0UXVhbnRpdHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmIChxdWFudGl0eURldGFpbC5zdGVlbFF1YW50aXR5SXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlsc1txdWFudGl0eUluZGV4XS5zdGVlbFF1YW50aXR5SXRlbXMgPSBxdWFudGl0eURldGFpbC5zdGVlbFF1YW50aXR5SXRlbXM7XHJcbiAgICAgICAgICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHNbcXVhbnRpdHlJbmRleF0udG90YWwgPSBxdWFudGl0eURldGFpbC50b3RhbDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHNbcXVhbnRpdHlJbmRleF0ucXVhbnRpdHlJdGVtcyA9IHF1YW50aXR5RGV0YWlsLnF1YW50aXR5SXRlbXM7XHJcbiAgICAgICAgICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHNbcXVhbnRpdHlJbmRleF0udG90YWwgPSBxdWFudGl0eURldGFpbC50b3RhbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHF1YW50aXR5RGV0YWlsLmlkID0gcXVhbnRpdHlJZDtcclxuICAgICAgICAgICAgcXVhbnRpdHlEZXRhaWwuaXNEaXJlY3RRdWFudGl0eSA9IGZhbHNlO1xyXG4gICAgICAgICAgIC8vIHF1YW50aXR5RGV0YWlsLnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHF1YW50aXR5KSwyKSBGUk9NID8nLCBbcXVhbnRpdHlEZXRhaWwucXVhbnRpdHlJdGVtc10pO1xyXG4gICAgICAgICAgICBxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzLnB1c2gocXVhbnRpdHlEZXRhaWwpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLyplbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgaWYocXVhbnRpdHlEZXRhaWwuaWQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlEZXRhaWwuaWQgPSBxdWFudGl0eUlkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlEZXRhaWwuaXNEaXJlY3RRdWFudGl0eSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBxdWFudGl0eURldGFpbC50b3RhbCA9IGFsYXNxbCgnVkFMVUUgT0YgU0VMRUNUIFJPVU5EKFNVTShxdWFudGl0eSksMikgRlJPTSA/JywgW3F1YW50aXR5RGV0YWlsLnF1YW50aXR5SXRlbXNdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHMucHVzaChxdWFudGl0eURldGFpbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgcXVhbnRpdHlJbmRleCA9IDA7IHF1YW50aXR5SW5kZXggPCBxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzLmxlbmd0aDsgcXVhbnRpdHlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzW3F1YW50aXR5SW5kZXhdLmlkID09PSBxdWFudGl0eURldGFpbC5pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHNbcXVhbnRpdHlJbmRleF0ubmFtZSA9IHF1YW50aXR5RGV0YWlsLm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlsc1txdWFudGl0eUluZGV4XS5pc0RpcmVjdFF1YW50aXR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlsc1txdWFudGl0eUluZGV4XS5xdWFudGl0eUl0ZW1zID0gcXVhbnRpdHlEZXRhaWwucXVhbnRpdHlJdGVtcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzW3F1YW50aXR5SW5kZXhdLnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHF1YW50aXR5KSwyKSBGUk9NID8nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgW3F1YW50aXR5RGV0YWlsLnF1YW50aXR5SXRlbXNdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgfSovXHJcbiAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscyA9IFtdO1xyXG4gICAgICAgLy8gICBjb25zb2xlLmxvZygncXVhbnRpdHkgOiAnK0pTT04uc3RyaW5naWZ5KHF1YW50aXR5KSk7XHJcbiAgICAgICAgICBxdWFudGl0eURldGFpbC5pZCA9IHF1YW50aXR5SWQ7XHJcbiAgICAgICAgICBxdWFudGl0eURldGFpbC5pc0RpcmVjdFF1YW50aXR5ID0gZmFsc2U7XHJcbiAgICAgICAgIC8vIHF1YW50aXR5RGV0YWlsLnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHF1YW50aXR5KSwyKSBGUk9NID8nLCBbcXVhbnRpdHlEZXRhaWwucXVhbnRpdHlJdGVtc10pO1xyXG4gICAgICAgIC8vICBjb25zb2xlLmxvZyhxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzKTtcclxuICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHMucHVzaChxdWFudGl0eURldGFpbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBxdWFudGl0eS50b3RhbCA9IGFsYXNxbCgnVkFMVUUgT0YgU0VMRUNUIFJPVU5EKFNVTSh0b3RhbCksMikgRlJPTSA/JywgW3F1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHNdKTtcclxuICB9XHJcblxyXG4vL1VwZGF0ZSBRdWFudGl0eSBPZiBQcm9qZWN0IENvc3QgSGVhZHNcclxuICB1cGRhdGVRdWFudGl0eU9mUHJvamVjdENvc3RIZWFkcyhwcm9qZWN0SWQ6IHN0cmluZywgY29zdEhlYWRJZDogbnVtYmVyLCBjYXRlZ29yeUlkOiBudW1iZXIsIHdvcmtJdGVtSWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWFudGl0eURldGFpbHM6IFF1YW50aXR5RGV0YWlscywgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgVXBkYXRlIFF1YW50aXR5IE9mIFByb2plY3QgQ29zdCBIZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHtfaWQ6IHByb2plY3RJZH07XHJcbiAgICBsZXQgcHJvamVjdGlvbiA9IHtwcm9qZWN0Q29zdEhlYWRzOntcclxuICAgICAgICAkZWxlbU1hdGNoIDp7cmF0ZUFuYWx5c2lzSWQgOiBjb3N0SGVhZElkLCBjYXRlZ29yaWVzOiB7XHJcbiAgICAgICAgICAgICRlbGVtTWF0Y2g6e3JhdGVBbmFseXNpc0lkOiBjYXRlZ29yeUlkLHdvcmtJdGVtczoge1xyXG4gICAgICAgICAgICAgICAgJGVsZW1NYXRjaDoge3JhdGVBbmFseXNpc0lkOndvcmtJdGVtSWR9fX19fX19XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LnJldHJpZXZlV2l0aFByb2plY3Rpb24ocXVlcnksIHByb2plY3Rpb24sIChlcnJvciwgcHJvamVjdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkTGlzdCA9IHByb2plY3RbMF0ucHJvamVjdENvc3RIZWFkcztcclxuICAgICAgICBsZXQgcXVhbnRpdHkgIDogUXVhbnRpdHk7XHJcbiAgICAgICAgZm9yIChsZXQgY29zdEhlYWQgb2YgY29zdEhlYWRMaXN0KSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWRJZCA9PT0gY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgbGV0IGNhdGVnb3JpZXNPZkNvc3RIZWFkID0gY29zdEhlYWQuY2F0ZWdvcmllcztcclxuICAgICAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnlEYXRhIG9mIGNhdGVnb3JpZXNPZkNvc3RIZWFkKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5SWQgPT09IGNhdGVnb3J5RGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHdvcmtJdGVtc09mQ2F0ZWdvcnkgPSBjYXRlZ29yeURhdGEud29ya0l0ZW1zO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgd29ya0l0ZW1EYXRhIG9mIHdvcmtJdGVtc09mQ2F0ZWdvcnkpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHdvcmtJdGVtSWQgPT09IHdvcmtJdGVtRGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5ID0gd29ya0l0ZW1EYXRhLnF1YW50aXR5O1xyXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5LmlzRXN0aW1hdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVF1YW50aXR5SXRlbXNPZldvcmtJdGVtKCBxdWFudGl0eSwgcXVhbnRpdHlEZXRhaWxzKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgIGxldCB1cGRhdGVRdWVyeSA9IHskc2V0OnsncHJvamVjdENvc3RIZWFkcy4kW2Nvc3RIZWFkXS5jYXRlZ29yaWVzLiRbY2F0ZWdvcnldLndvcmtJdGVtcy4kW3dvcmtJdGVtXS5xdWFudGl0eSc6cXVhbnRpdHl9fTtcclxuICAgICAgICBsZXQgYXJyYXlGaWx0ZXIgPSBbXHJcbiAgICAgICAgICB7J2Nvc3RIZWFkLnJhdGVBbmFseXNpc0lkJzpjb3N0SGVhZElkfSxcclxuICAgICAgICAgIHsnY2F0ZWdvcnkucmF0ZUFuYWx5c2lzSWQnOiBjYXRlZ29yeUlkfSxcclxuICAgICAgICAgIHsnd29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQnOndvcmtJdGVtSWR9XHJcbiAgICAgICAgXTtcclxuICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZVF1ZXJ5LCB7YXJyYXlGaWx0ZXJzOmFycmF5RmlsdGVyLCBuZXc6IHRydWV9LCAoZXJyb3IsIHByb2plY3QpID0+IHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vR2V0IEluLUFjdGl2ZSBDYXRlZ29yaWVzIEZyb20gRGF0YWJhc2VcclxuICBnZXRJbkFjdGl2ZUNhdGVnb3JpZXNCeUNvc3RIZWFkSWQocHJvamVjdElkOiBzdHJpbmcsIGJ1aWxkaW5nSWQ6IHN0cmluZywgY29zdEhlYWRJZDogc3RyaW5nLCB1c2VyOiBVc2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcblxyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBHZXQgSW4tQWN0aXZlIENhdGVnb3JpZXMgQnkgQ29zdCBIZWFkIElkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkcyA9IGJ1aWxkaW5nLmNvc3RIZWFkcztcclxuICAgICAgICBsZXQgY2F0ZWdvcmllczogQXJyYXk8Q2F0ZWdvcnk+ID0gbmV3IEFycmF5PENhdGVnb3J5PigpO1xyXG4gICAgICAgIGZvciAobGV0IGNvc3RIZWFkSW5kZXggPSAwOyBjb3N0SGVhZEluZGV4IDwgY29zdEhlYWRzLmxlbmd0aDsgY29zdEhlYWRJbmRleCsrKSB7XHJcbiAgICAgICAgICBpZiAocGFyc2VJbnQoY29zdEhlYWRJZCkgPT09IGNvc3RIZWFkc1tjb3N0SGVhZEluZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBsZXQgY2F0ZWdvcmllc0xpc3QgPSBjb3N0SGVhZHNbY29zdEhlYWRJbmRleF0uY2F0ZWdvcmllcztcclxuICAgICAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnlJbmRleCA9IDA7IGNhdGVnb3J5SW5kZXggPCBjYXRlZ29yaWVzTGlzdC5sZW5ndGg7IGNhdGVnb3J5SW5kZXgrKykge1xyXG4gICAgICAgICAgICAgIGlmIChjYXRlZ29yaWVzTGlzdFtjYXRlZ29yeUluZGV4XS5hY3RpdmUgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yaWVzLnB1c2goY2F0ZWdvcmllc0xpc3RbY2F0ZWdvcnlJbmRleF0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogY2F0ZWdvcmllcywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldFdvcmtJdGVtTGlzdE9mQnVpbGRpbmdDYXRlZ29yeShwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZ2V0V29ya0l0ZW1MaXN0T2ZCdWlsZGluZ0NhdGVnb3J5IGhhcyBiZWVuIGhpdCcpO1xyXG5cclxuICAgIGxldCBxdWVyeSA9IFtcclxuICAgICAgeyRtYXRjaDogeydfaWQnOiBPYmplY3RJZChidWlsZGluZ0lkKSwgJ2Nvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCc6IGNvc3RIZWFkSWR9fSxcclxuICAgICAgeyR1bndpbmQ6ICckY29zdEhlYWRzJ30sXHJcbiAgICAgIHskcHJvamVjdDogeydjb3N0SGVhZHMnOiAxLCAncmF0ZXMnOiAxfX0sXHJcbiAgICAgIHskdW53aW5kOiAnJGNvc3RIZWFkcy5jYXRlZ29yaWVzJ30sXHJcbiAgICAgIHskbWF0Y2g6IHsnY29zdEhlYWRzLmNhdGVnb3JpZXMucmF0ZUFuYWx5c2lzSWQnOiBjYXRlZ29yeUlkfX0sXHJcbiAgICAgIHskcHJvamVjdDogeydjb3N0SGVhZHMuY2F0ZWdvcmllcy53b3JrSXRlbXMnOiAxLCAncmF0ZXMnOiAxfX1cclxuICAgIF07XHJcblxyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuYWdncmVnYXRlKHF1ZXJ5LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBHZXQgd29ya2l0ZW1zIGZvciBzcGVjaWZpYyBjYXRlZ29yeSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChyZXN1bHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgbGV0IHdvcmtJdGVtc09mQnVpbGRpbmdDYXRlZ29yeSA9IHJlc3VsdFswXS5jb3N0SGVhZHMuY2F0ZWdvcmllcy53b3JrSXRlbXM7XHJcbiAgICAgICAgICBsZXQgd29ya0l0ZW1zTGlzdFdpdGhCdWlsZGluZ1JhdGVzID0gdGhpcy5nZXRXb3JrSXRlbUxpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyh3b3JrSXRlbXNPZkJ1aWxkaW5nQ2F0ZWdvcnksIHJlc3VsdFswXS5yYXRlcywgdHJ1ZSk7XHJcbiAgICAgICAgICBsZXQgd29ya0l0ZW1zTGlzdEFuZFNob3dIaWRlQWRkSXRlbUJ1dHRvbj0ge1xyXG4gICAgICAgICAgICB3b3JrSXRlbXM6d29ya0l0ZW1zTGlzdFdpdGhCdWlsZGluZ1JhdGVzLndvcmtJdGVtcyxcclxuICAgICAgICAgICAgc2hvd0hpZGVBZGRCdXR0b246d29ya0l0ZW1zTGlzdFdpdGhCdWlsZGluZ1JhdGVzLnNob3dIaWRlQWRkSXRlbUJ1dHRvblxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtcclxuICAgICAgICAgICAgZGF0YTogd29ya0l0ZW1zTGlzdEFuZFNob3dIaWRlQWRkSXRlbUJ1dHRvbixcclxuICAgICAgICAgICAgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2VzLk1TR19FUlJPUl9FTVBUWV9SRVNQT05TRTtcclxuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0V29ya0l0ZW1MaXN0T2ZQcm9qZWN0Q2F0ZWdvcnkocHJvamVjdElkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLCB1c2VyOiBVc2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldFdvcmtJdGVtTGlzdE9mUHJvamVjdENhdGVnb3J5IGhhcyBiZWVuIGhpdCcpO1xyXG5cclxuICAgIGxldCBxdWVyeSA9IFtcclxuICAgICAgeyRtYXRjaDogeydfaWQnOiBPYmplY3RJZChwcm9qZWN0SWQpLCAncHJvamVjdENvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCc6IGNvc3RIZWFkSWR9fSxcclxuICAgICAgeyR1bndpbmQ6ICckcHJvamVjdENvc3RIZWFkcyd9LFxyXG4gICAgICB7JHByb2plY3Q6IHsncHJvamVjdENvc3RIZWFkcyc6IDEsICdyYXRlcyc6IDF9fSxcclxuICAgICAgeyR1bndpbmQ6ICckcHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzJ30sXHJcbiAgICAgIHskbWF0Y2g6IHsncHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzLnJhdGVBbmFseXNpc0lkJzogY2F0ZWdvcnlJZH19LFxyXG4gICAgICB7JHByb2plY3Q6IHsncHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcyc6IDEsICdyYXRlcyc6IDF9fVxyXG4gICAgXTtcclxuXHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmFnZ3JlZ2F0ZShxdWVyeSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgR2V0IHdvcmtpdGVtcyBCeSBDb3N0IEhlYWQgJiBjYXRlZ29yeSBJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChyZXN1bHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgbGV0IHdvcmtJdGVtc09mQ2F0ZWdvcnkgPSByZXN1bHRbMF0ucHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcztcclxuICAgICAgICAgIGxldCB3b3JrSXRlbXNMaXN0V2l0aFJhdGVzID0gdGhpcy5nZXRXb3JrSXRlbUxpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyh3b3JrSXRlbXNPZkNhdGVnb3J5LCByZXN1bHRbMF0ucmF0ZXMsIHRydWUpO1xyXG4gICAgICAgICAgbGV0IHdvcmtJdGVtc0xpc3RBbmRTaG93SGlkZUFkZEl0ZW1CdXR0b249IHtcclxuICAgICAgICAgICAgd29ya0l0ZW1zOndvcmtJdGVtc0xpc3RXaXRoUmF0ZXMud29ya0l0ZW1zLFxyXG4gICAgICAgICAgICBzaG93SGlkZUFkZEJ1dHRvbjp3b3JrSXRlbXNMaXN0V2l0aFJhdGVzLnNob3dIaWRlQWRkSXRlbUJ1dHRvblxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtcclxuICAgICAgICAgICAgZGF0YTogd29ya0l0ZW1zTGlzdEFuZFNob3dIaWRlQWRkSXRlbUJ1dHRvbixcclxuICAgICAgICAgICAgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2VzLk1TR19FUlJPUl9FTVBUWV9SRVNQT05TRTtcclxuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0V29ya0l0ZW1MaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMod29ya0l0ZW1zT2ZDYXRlZ29yeTogQXJyYXk8V29ya0l0ZW0+LCBjZW50cmFsaXplZFJhdGVzOiBBcnJheTxhbnk+LCBpc1dvcmtJdGVtQWN0aXZlOiBib29sZWFuKSB7XHJcblxyXG4gICAgbGV0IHdvcmtJdGVtc0xpc3RXaXRoUmF0ZXM6IFdvcmtJdGVtTGlzdFdpdGhSYXRlc0RUTyA9IG5ldyBXb3JrSXRlbUxpc3RXaXRoUmF0ZXNEVE8oKTtcclxuICAgIGZvciAobGV0IHdvcmtJdGVtRGF0YSBvZiB3b3JrSXRlbXNPZkNhdGVnb3J5KSB7XHJcbiAgICAgIGlmICh3b3JrSXRlbURhdGEuYWN0aXZlID09PSBpc1dvcmtJdGVtQWN0aXZlKSB7XHJcbiAgICAgICAgbGV0IHdvcmtJdGVtOiBXb3JrSXRlbSA9IHdvcmtJdGVtRGF0YTtcclxuICAgICAgICBsZXQgcmF0ZUl0ZW1zT2ZXb3JrSXRlbSA9IHdvcmtJdGVtRGF0YS5yYXRlLnJhdGVJdGVtcztcclxuICAgICAgICB3b3JrSXRlbS5yYXRlLnJhdGVJdGVtcyA9IHRoaXMuZ2V0UmF0ZXNGcm9tQ2VudHJhbGl6ZWRyYXRlcyhyYXRlSXRlbXNPZldvcmtJdGVtLCBjZW50cmFsaXplZFJhdGVzKTtcclxuXHJcbiAgICAgICAgbGV0IGFycmF5T2ZSYXRlSXRlbXMgPSB3b3JrSXRlbS5yYXRlLnJhdGVJdGVtcztcclxuICAgICAgICBsZXQgdG90YWxPZkFsbFJhdGVJdGVtcyA9IGFsYXNxbCgnVkFMVUUgT0YgU0VMRUNUIFNVTSh0b3RhbEFtb3VudCkgRlJPTSA/JywgW2FycmF5T2ZSYXRlSXRlbXNdKTtcclxuICAgICAgICBsZXQgdG90YWxCeVVuaXQgPSB0b3RhbE9mQWxsUmF0ZUl0ZW1zIC8gd29ya0l0ZW0ucmF0ZS5xdWFudGl0eTtcclxuICAgICAgICBpZiAoIXdvcmtJdGVtLmlzRGlyZWN0UmF0ZSkge1xyXG4gICAgICAgICAgd29ya0l0ZW0ucmF0ZS50b3RhbCA9IHRoaXMudG90YWxSYXRlQnlVbml0KHdvcmtJdGVtLCB0b3RhbEJ5VW5pdCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBxdWFudGl0eUl0ZW1zID0gd29ya0l0ZW0ucXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscztcclxuXHJcbiAgICAgICAgaWYgKCF3b3JrSXRlbS5xdWFudGl0eS5pc0RpcmVjdFF1YW50aXR5KSB7XHJcbiAgICAgICAgICB3b3JrSXRlbS5xdWFudGl0eS50b3RhbCA9IGFsYXNxbCgnVkFMVUUgT0YgU0VMRUNUIFJPVU5EKFNVTSh0b3RhbCksMikgRlJPTSA/JywgW3F1YW50aXR5SXRlbXNdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh3b3JrSXRlbS5yYXRlLmlzRXN0aW1hdGVkICYmIHdvcmtJdGVtLnF1YW50aXR5LmlzRXN0aW1hdGVkKSB7XHJcbiAgICAgICAgICB3b3JrSXRlbS5hbW91bnQgPSB0aGlzLmNvbW1vblNlcnZpY2UuZGVjaW1hbENvbnZlcnNpb24od29ya0l0ZW0ucmF0ZS50b3RhbCAqIHdvcmtJdGVtLnF1YW50aXR5LnRvdGFsKTtcclxuICAgICAgICAgIHdvcmtJdGVtc0xpc3RXaXRoUmF0ZXMud29ya0l0ZW1zQW1vdW50ID0gd29ya0l0ZW1zTGlzdFdpdGhSYXRlcy53b3JrSXRlbXNBbW91bnQgKyB3b3JrSXRlbS5hbW91bnQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdvcmtJdGVtc0xpc3RXaXRoUmF0ZXMud29ya0l0ZW1zLnB1c2god29ya0l0ZW0pO1xyXG4gICAgICB9ZWxzZSB7XHJcbiAgICAgICAgd29ya0l0ZW1zTGlzdFdpdGhSYXRlcy5zaG93SGlkZUFkZEl0ZW1CdXR0b249ZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB3b3JrSXRlbXNMaXN0V2l0aFJhdGVzO1xyXG4gIH1cclxuXHJcbiAgdG90YWxSYXRlQnlVbml0KHdvcmtJdGVtOiBXb3JrSXRlbSwgdG90YWxCeVVuaXQ6IG51bWJlcikge1xyXG4gICAgaWYgKHdvcmtJdGVtLnVuaXQgPT09ICdTcW0nICYmIHdvcmtJdGVtLnJhdGUudW5pdCAhPT0gJ1NxbScpIHtcclxuICAgICAgd29ya0l0ZW0ucmF0ZS50b3RhbCA9IHRvdGFsQnlVbml0ICogMTAuNzY0O1xyXG4gICAgfSBlbHNlIGlmICh3b3JrSXRlbS51bml0ID09PSAnUm0nICYmIHdvcmtJdGVtLnJhdGUudW5pdCAhPT0gJ1JtJykge1xyXG4gICAgICB3b3JrSXRlbS5yYXRlLnRvdGFsID0gdG90YWxCeVVuaXQgKiAzLjI4O1xyXG4gICAgfSBlbHNlIGlmICh3b3JrSXRlbS51bml0ID09PSAnY3VtJyAmJiB3b3JrSXRlbS5yYXRlLnVuaXQgIT09ICdjdW0nKSB7XHJcbiAgICAgIHdvcmtJdGVtLnJhdGUudG90YWwgPSB0b3RhbEJ5VW5pdCAqIDM1LjI4O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgd29ya0l0ZW0ucmF0ZS50b3RhbCA9IHRvdGFsQnlVbml0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHdvcmtJdGVtLnJhdGUudG90YWw7XHJcbiAgfVxyXG5cclxuICBnZXRSYXRlc0Zyb21DZW50cmFsaXplZHJhdGVzKHJhdGVJdGVtc09mV29ya0l0ZW06IEFycmF5PFJhdGVJdGVtPiwgY2VudHJhbGl6ZWRSYXRlczogQXJyYXk8YW55Pikge1xyXG4gICAgbGV0IHJhdGVJdGVtc1NRTCA9ICdTRUxFQ1QgcmF0ZUl0ZW0uaXRlbU5hbWUsIHJhdGVJdGVtLm9yaWdpbmFsSXRlbU5hbWUsIHJhdGVJdGVtLnJhdGVBbmFseXNpc0lkLCByYXRlSXRlbS50eXBlLCcgK1xyXG4gICAgICAncmF0ZUl0ZW0ucXVhbnRpdHksIGNlbnRyYWxpemVkUmF0ZXMucmF0ZSwgcmF0ZUl0ZW0udW5pdCwgcmF0ZUl0ZW0udG90YWxBbW91bnQsIHJhdGVJdGVtLnRvdGFsUXVhbnRpdHkgJyArXHJcbiAgICAgICdGUk9NID8gQVMgcmF0ZUl0ZW0gSk9JTiA/IEFTIGNlbnRyYWxpemVkUmF0ZXMgT04gcmF0ZUl0ZW0uaXRlbU5hbWUgPSBjZW50cmFsaXplZFJhdGVzLml0ZW1OYW1lJztcclxuICAgIGxldCByYXRlSXRlbXNGb3JXb3JrSXRlbSA9IGFsYXNxbChyYXRlSXRlbXNTUUwsIFtyYXRlSXRlbXNPZldvcmtJdGVtLCBjZW50cmFsaXplZFJhdGVzXSk7XHJcbiAgICByZXR1cm4gcmF0ZUl0ZW1zRm9yV29ya0l0ZW07XHJcbiAgfVxyXG5cclxuICBhZGRXb3JraXRlbShwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgd29ya0l0ZW06IFdvcmtJdGVtLFxyXG4gICAgICAgICAgICAgIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGFkZFdvcmtpdGVtIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCBidWlsZGluZzogQnVpbGRpbmcpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCByZXNwb25zZVdvcmtpdGVtOiBBcnJheTxXb3JrSXRlbT4gPSBudWxsO1xyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgYnVpbGRpbmcuY29zdEhlYWRzLmxlbmd0aCA+IGluZGV4OyBpbmRleCsrKSB7XHJcbiAgICAgICAgICBpZiAoYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5yYXRlQW5hbHlzaXNJZCA9PT0gY29zdEhlYWRJZCkge1xyXG4gICAgICAgICAgICBsZXQgY2F0ZWdvcnkgPSBidWlsZGluZy5jb3N0SGVhZHNbaW5kZXhdLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNhdGVnb3J5SW5kZXggPSAwOyBjYXRlZ29yeS5sZW5ndGggPiBjYXRlZ29yeUluZGV4OyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnlbY2F0ZWdvcnlJbmRleF0ucmF0ZUFuYWx5c2lzSWQgPT09IGNhdGVnb3J5SWQpIHtcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5W2NhdGVnb3J5SW5kZXhdLndvcmtJdGVtcy5wdXNoKHdvcmtJdGVtKTtcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlV29ya2l0ZW0gPSBjYXRlZ29yeVtjYXRlZ29yeUluZGV4XS53b3JrSXRlbXM7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBxdWVyeSA9IHtfaWQ6IGJ1aWxkaW5nSWR9O1xyXG4gICAgICAgICAgICBsZXQgbmV3RGF0YSA9IHskc2V0OiB7J2Nvc3RIZWFkcyc6IGJ1aWxkaW5nLmNvc3RIZWFkc319O1xyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXNwb25zZVdvcmtpdGVtLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYWRkQ2F0ZWdvcnlCeUNvc3RIZWFkSWQocHJvamVjdElkOiBzdHJpbmcsIGJ1aWxkaW5nSWQ6IHN0cmluZywgY29zdEhlYWRJZDogc3RyaW5nLCBjYXRlZ29yeURldGFpbHM6IGFueSwgdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcblxyXG4gICAgbGV0IGNhdGVnb3J5T2JqOiBDYXRlZ29yeSA9IG5ldyBDYXRlZ29yeShjYXRlZ29yeURldGFpbHMuY2F0ZWdvcnksIGNhdGVnb3J5RGV0YWlscy5jYXRlZ29yeUlkKTtcclxuXHJcbiAgICBsZXQgcXVlcnkgPSB7J19pZCc6IGJ1aWxkaW5nSWQsICdjb3N0SGVhZHMucmF0ZUFuYWx5c2lzSWQnOiBwYXJzZUludChjb3N0SGVhZElkKX07XHJcbiAgICBsZXQgbmV3RGF0YSA9IHskcHVzaDogeydjb3N0SGVhZHMuJC5jYXRlZ29yaWVzJzogY2F0ZWdvcnlPYmp9fTtcclxuXHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBhZGRDYXRlZ29yeUJ5Q29zdEhlYWRJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiBidWlsZGluZywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vVXBkYXRlIHN0YXR1cyAoIHRydWUvZmFsc2UgKSBvZiBjYXRlZ29yeVxyXG4gIHVwZGF0ZUNhdGVnb3J5U3RhdHVzKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5QWN0aXZlU3RhdHVzOiBib29sZWFuLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcblxyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCBidWlsZGluZzogQnVpbGRpbmcpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgdXBkYXRlIENhdGVnb3J5IFN0YXR1cyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZHMgPSBidWlsZGluZy5jb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IGNhdGVnb3JpZXM6IEFycmF5PENhdGVnb3J5PiA9IG5ldyBBcnJheTxDYXRlZ29yeT4oKTtcclxuICAgICAgICBsZXQgdXBkYXRlZENhdGVnb3JpZXM6IEFycmF5PENhdGVnb3J5PiA9IG5ldyBBcnJheTxDYXRlZ29yeT4oKTtcclxuICAgICAgICBsZXQgaW5kZXg6IG51bWJlcjtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY29zdEhlYWRJbmRleCA9IDA7IGNvc3RIZWFkSW5kZXggPCBjb3N0SGVhZHMubGVuZ3RoOyBjb3N0SGVhZEluZGV4KyspIHtcclxuICAgICAgICAgIGlmIChjb3N0SGVhZElkID09PSBjb3N0SGVhZHNbY29zdEhlYWRJbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgY2F0ZWdvcmllcyA9IGNvc3RIZWFkc1tjb3N0SGVhZEluZGV4XS5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYXRlZ29yeUluZGV4ID0gMDsgY2F0ZWdvcnlJbmRleCA8IGNhdGVnb3JpZXMubGVuZ3RoOyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgICBpZiAoY2F0ZWdvcmllc1tjYXRlZ29yeUluZGV4XS5yYXRlQW5hbHlzaXNJZCA9PT0gY2F0ZWdvcnlJZCkge1xyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcmllc1tjYXRlZ29yeUluZGV4XS5hY3RpdmUgPSBjYXRlZ29yeUFjdGl2ZVN0YXR1cztcclxuICAgICAgICAgICAgICAgIHVwZGF0ZWRDYXRlZ29yaWVzLnB1c2goY2F0ZWdvcmllc1tjYXRlZ29yeUluZGV4XSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcXVlcnkgPSB7J19pZCc6IGJ1aWxkaW5nSWQsICdjb3N0SGVhZHMucmF0ZUFuYWx5c2lzSWQnOiBjb3N0SGVhZElkfTtcclxuICAgICAgICBsZXQgbmV3RGF0YSA9IHsnJHNldCc6IHsnY29zdEhlYWRzLiQuY2F0ZWdvcmllcyc6IGNhdGVnb3JpZXN9fTtcclxuXHJcbiAgICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSwge25ldzogdHJ1ZX0sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogdXBkYXRlZENhdGVnb3JpZXMsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvL0dldCBhY3RpdmUgY2F0ZWdvcmllcyBmcm9tIGRhdGFiYXNlXHJcbiAgZ2V0Q2F0ZWdvcmllc09mQnVpbGRpbmdDb3N0SGVhZChwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIHVzZXI6IFVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBHZXQgQWN0aXZlIENhdGVnb3JpZXMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nOiBCdWlsZGluZykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGJ1aWxkaW5nQ29zdEhlYWRzID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjYXRlZ29yaWVzTGlzdFdpdGhDZW50cmFsaXplZFJhdGVzOiBDYXRlZ29yaWVzTGlzdFdpdGhSYXRlc0RUTztcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY29zdEhlYWREYXRhIG9mIGJ1aWxkaW5nQ29zdEhlYWRzKSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWREYXRhLnJhdGVBbmFseXNpc0lkID09PSBjb3N0SGVhZElkKSB7XHJcbiAgICAgICAgICAgIGNhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMgPSB0aGlzLmdldENhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMoY29zdEhlYWREYXRhLmNhdGVnb3JpZXMsIGJ1aWxkaW5nLnJhdGVzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtcclxuICAgICAgICAgIGRhdGE6IGNhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMsXHJcbiAgICAgICAgICBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy9HZXQgY2F0ZWdvcmllcyBvZiBwcm9qZWN0Q29zdEhlYWRzIGZyb20gZGF0YWJhc2VcclxuICBnZXRDYXRlZ29yaWVzT2ZQcm9qZWN0Q29zdEhlYWQocHJvamVjdElkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIEdldCBQcm9qZWN0IENvc3RIZWFkIENhdGVnb3JpZXMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkKHByb2plY3RJZCwgKGVycm9yLCBwcm9qZWN0OiBQcm9qZWN0KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcHJvamVjdENvc3RIZWFkcyA9IHByb2plY3QucHJvamVjdENvc3RIZWFkcztcclxuICAgICAgICBsZXQgY2F0ZWdvcmllc0xpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlczogQ2F0ZWdvcmllc0xpc3RXaXRoUmF0ZXNEVE87XHJcblxyXG4gICAgICAgIGZvciAobGV0IGNvc3RIZWFkRGF0YSBvZiBwcm9qZWN0Q29zdEhlYWRzKSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWREYXRhLnJhdGVBbmFseXNpc0lkID09PSBjb3N0SGVhZElkKSB7XHJcbiAgICAgICAgICAgIGNhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMgPSB0aGlzLmdldENhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMoY29zdEhlYWREYXRhLmNhdGVnb3JpZXMsIHByb2plY3QucmF0ZXMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge1xyXG4gICAgICAgICAgZGF0YTogY2F0ZWdvcmllc0xpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyxcclxuICAgICAgICAgIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcilcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRDb3N0SGVhZERldGFpbHNPZkJ1aWxkaW5nKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBHZXQgUHJvamVjdCBDb3N0SGVhZCBDYXRlZ29yaWVzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHF1ZXJ5ID0gW1xyXG4gICAgICB7JG1hdGNoOiB7J19pZCc6IE9iamVjdElkKGJ1aWxkaW5nSWQpfX0sXHJcbiAgICAgIHskcHJvamVjdDogeydjb3N0SGVhZHMnOiAxLCAncmF0ZXMnOiAxfX0sXHJcbiAgICAgIHskdW53aW5kOiAnJGNvc3RIZWFkcyd9LFxyXG4gICAgICB7JG1hdGNoOiB7J2Nvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCc6IGNvc3RIZWFkSWR9fSxcclxuICAgICAgeyRwcm9qZWN0OiB7J2Nvc3RIZWFkcyc6IDEsICdfaWQnOiAwLCAncmF0ZXMnOiAxfX1cclxuICAgIF07XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5hZ2dyZWdhdGUocXVlcnksIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIEdldCB3b3JraXRlbXMgZm9yIHNwZWNpZmljIGNhdGVnb3J5IGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBsZXQgZGF0YSA9IHJlc3VsdFswXS5jb3N0SGVhZHM7XHJcbiAgICAgICAgICBsZXQgY2F0ZWdvcmllc0xpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyA9IHRoaXMuZ2V0Q2F0ZWdvcmllc0xpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyhkYXRhLmNhdGVnb3JpZXMsIHJlc3VsdFswXS5yYXRlcyk7XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogZGF0YSwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBsZXQgZXJyb3IgPSBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgIGVycm9yLm1lc3NhZ2UgPSBtZXNzYWdlcy5NU0dfRVJST1JfRU1QVFlfUkVTUE9OU0U7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vR2V0IGNhdGVnb3J5IGxpc3Qgd2l0aCBjZW50cmFsaXplZCByYXRlXHJcbiAgZ2V0Q2F0ZWdvcmllc0xpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyhjYXRlZ29yaWVzT2ZDb3N0SGVhZDogQXJyYXk8Q2F0ZWdvcnk+LCBjZW50cmFsaXplZFJhdGVzOiBBcnJheTxDZW50cmFsaXplZFJhdGU+KSB7XHJcbiAgICBsZXQgY2F0ZWdvcmllc1RvdGFsQW1vdW50ID0gMDtcclxuXHJcbiAgICBsZXQgY2F0ZWdvcmllc0xpc3RXaXRoUmF0ZXM6IENhdGVnb3JpZXNMaXN0V2l0aFJhdGVzRFRPID0gbmV3IENhdGVnb3JpZXNMaXN0V2l0aFJhdGVzRFRPO1xyXG5cclxuICAgIGZvciAobGV0IGNhdGVnb3J5RGF0YSBvZiBjYXRlZ29yaWVzT2ZDb3N0SGVhZCkge1xyXG4gICAgICBsZXQgd29ya0l0ZW1zID0gdGhpcy5nZXRXb3JrSXRlbUxpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyhjYXRlZ29yeURhdGEud29ya0l0ZW1zLCBjZW50cmFsaXplZFJhdGVzLCB0cnVlKTtcclxuICAgICAgY2F0ZWdvcnlEYXRhLmFtb3VudCA9IHdvcmtJdGVtcy53b3JrSXRlbXNBbW91bnQ7XHJcbiAgICAgIGNhdGVnb3JpZXNUb3RhbEFtb3VudCA9IGNhdGVnb3JpZXNUb3RhbEFtb3VudCArIHdvcmtJdGVtcy53b3JrSXRlbXNBbW91bnQ7XHJcbiAgICAgIC8vZGVsZXRlIGNhdGVnb3J5RGF0YS53b3JrSXRlbXM7XHJcbiAgICAgIGNhdGVnb3JpZXNMaXN0V2l0aFJhdGVzLmNhdGVnb3JpZXMucHVzaChjYXRlZ29yeURhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjYXRlZ29yaWVzVG90YWxBbW91bnQgIT09IDApIHtcclxuICAgICAgY2F0ZWdvcmllc0xpc3RXaXRoUmF0ZXMuY2F0ZWdvcmllc0Ftb3VudCA9IGNhdGVnb3JpZXNUb3RhbEFtb3VudDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gY2F0ZWdvcmllc0xpc3RXaXRoUmF0ZXM7XHJcbiAgfVxyXG5cclxuICBzeW5jUHJvamVjdFdpdGhSYXRlQW5hbHlzaXNEYXRhKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHN5bmNQcm9qZWN0V2l0aFJhdGVBbmFseXNpc0RhdGEgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmdldFByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMocHJvamVjdElkLCAgKGVycm9yLCBwcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGxvZ2dlci5lcnJvcignUHJvamVjdCBzZXJ2aWNlLCBnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzIGZhaWxlZCcpO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBzeW5jUHJvamVjdFdpdGhSYXRlQW5hbHlzaXNEYXRhLicpO1xyXG4gICAgICAgIGxldCBwcm9qZWN0RGF0YSA9IHByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMuZGF0YVswXTtcclxuICAgICAgICBsZXQgYnVpbGRpbmdzID0gcHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscy5kYXRhWzBdLmJ1aWxkaW5ncztcclxuICAgICAgICBsZXQgYnVpbGRpbmdEYXRhOiBhbnk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGJ1aWxkaW5nIG9mIGJ1aWxkaW5ncykge1xyXG4gICAgICAgICAgaWYgKGJ1aWxkaW5nLl9pZCA9PSBidWlsZGluZ0lkKSB7XHJcbiAgICAgICAgICAgIGJ1aWxkaW5nRGF0YSA9IGJ1aWxkaW5nO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwcm9qZWN0RGF0YS5wcm9qZWN0Q29zdEhlYWRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHN5bmNXaXRoUmF0ZUFuYWx5c2lzRGF0YSBidWlsZGluZyBPbmx5LicpO1xyXG4gICAgICAgICAgdGhpcy51cGRhdGVDb3N0SGVhZHNGb3JCdWlsZGluZ0FuZFByb2plY3QoY2FsbGJhY2ssIHByb2plY3REYXRhLCBidWlsZGluZ0RhdGEsIGJ1aWxkaW5nSWQsIHByb2plY3RJZCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNhbGxpbmcgcHJvbWlzZSBmb3Igc3luY1Byb2plY3RXaXRoUmF0ZUFuYWx5c2lzRGF0YSBmb3IgUHJvamVjdCBhbmQgQnVpbGRpbmcuJyk7XHJcbiAgICAgICAgICBsZXQgc3luY0J1aWxkaW5nQ29zdEhlYWRzUHJvbWlzZSA9IHRoaXMudXBkYXRlQnVkZ2V0UmF0ZXNGb3JCdWlsZGluZ0Nvc3RIZWFkcyhDb25zdGFudHMuQlVJTERJTkcsXHJcbiAgICAgICAgICAgIGJ1aWxkaW5nSWQsIHByb2plY3REYXRhLCBidWlsZGluZ0RhdGEpO1xyXG4gICAgICAgICAgbGV0IHN5bmNQcm9qZWN0Q29zdEhlYWRzUHJvbWlzZSA9IHRoaXMudXBkYXRlQnVkZ2V0UmF0ZXNGb3JQcm9qZWN0Q29zdEhlYWRzKENvbnN0YW50cy5BTUVOSVRJRVMsXHJcbiAgICAgICAgICAgIHByb2plY3RJZCwgcHJvamVjdERhdGEsIGJ1aWxkaW5nRGF0YSk7XHJcblxyXG4gICAgICAgICAgQ0NQcm9taXNlLmFsbChbXHJcbiAgICAgICAgICAgIHN5bmNCdWlsZGluZ0Nvc3RIZWFkc1Byb21pc2UsXHJcbiAgICAgICAgICAgIHN5bmNQcm9qZWN0Q29zdEhlYWRzUHJvbWlzZVxyXG4gICAgICAgICAgXSkudGhlbihmdW5jdGlvbiAoZGF0YTogQXJyYXk8YW55Pikge1xyXG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvbWlzZSBmb3Igc3luY1Byb2plY3RXaXRoUmF0ZUFuYWx5c2lzRGF0YSBmb3IgUHJvamVjdCBhbmQgQnVpbGRpbmcgc3VjY2VzcycpO1xyXG4gICAgICAgICAgICBsZXQgYnVpbGRpbmdDb3N0SGVhZHNEYXRhID0gZGF0YVswXTtcclxuICAgICAgICAgICAgbGV0IHByb2plY3RDb3N0SGVhZHNEYXRhID0gZGF0YVsxXTtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge3N0YXR1czogMjAwfSk7XHJcbiAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcignIFByb21pc2UgZmFpbGVkIGZvciBzeW5jUHJvamVjdFdpdGhSYXRlQW5hbHlzaXNEYXRhICEgOicgKyBKU09OLnN0cmluZ2lmeShlLm1lc3NhZ2UpKTtcclxuICAgICAgICAgICAgQ0NQcm9taXNlLnJlamVjdChlLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUNvc3RIZWFkc0ZvckJ1aWxkaW5nQW5kUHJvamVjdChjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0RGF0YTogYW55LCBidWlsZGluZ0RhdGE6IGFueSwgYnVpbGRpbmdJZDogc3RyaW5nLCBwcm9qZWN0SWQ6IHN0cmluZykge1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCd1cGRhdGVDb3N0SGVhZHNGb3JCdWlsZGluZ0FuZFByb2plY3QgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcmF0ZUFuYWx5c2lzU2VydmljZSA9IG5ldyBSYXRlQW5hbHlzaXNTZXJ2aWNlKCk7XHJcbiAgICBsZXQgYnVpbGRpbmdSZXBvc2l0b3J5ID0gbmV3IEJ1aWxkaW5nUmVwb3NpdG9yeSgpO1xyXG4gICAgbGV0IHByb2plY3RSZXBvc2l0b3J5ID0gbmV3IFByb2plY3RSZXBvc2l0b3J5KCk7XHJcbiAgICBsZXQgcXVlcnkgPSB7ICdyZWdpb24nIDogY29uZmlnLmdldCgnY29zdENvbnRyb2xSZWdpb25Db2RlJyl9O1xyXG4gICAgcmF0ZUFuYWx5c2lzU2VydmljZS5nZXRDb3N0Q29udHJvbFJhdGVBbmFseXNpcyhxdWVyeSwge30sKGVycm9yOiBhbnksIHJhdGVBbmFseXNpczogUmF0ZUFuYWx5c2lzKSA9PiB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGluIHVwZGF0ZUNvc3RIZWFkc0ZvckJ1aWxkaW5nQW5kUHJvamVjdCA6IGNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbCA6ICdcclxuICAgICAgICAgICAgKyBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnR2V0QWxsRGF0YUZyb21SYXRlQW5hbHlzaXMgc3VjY2VzcycpO1xyXG4gICAgICAgICAgbGV0IGJ1aWxkaW5nQ29zdEhlYWRzID0gcmF0ZUFuYWx5c2lzLmJ1aWxkaW5nQ29zdEhlYWRzO1xyXG4gICAgICAgICAgbGV0IHByb2plY3RTZXJ2aWNlID0gbmV3IFByb2plY3RTZXJ2aWNlKCk7XHJcbiAgICAgICAgICBidWlsZGluZ0Nvc3RIZWFkcyA9IHByb2plY3RTZXJ2aWNlLmNhbGN1bGF0ZUJ1ZGdldENvc3RGb3JCdWlsZGluZyhidWlsZGluZ0Nvc3RIZWFkcywgYnVpbGRpbmdEYXRhLCBwcm9qZWN0RGF0YSk7XHJcbiAgICAgICAgICBsZXQgcXVlcnlGb3JCdWlsZGluZyA9IHsnX2lkJzogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgICBsZXQgdXBkYXRlQ29zdEhlYWQgPSB7JHNldDogeydjb3N0SGVhZHMnOiBidWlsZGluZ0Nvc3RIZWFkcywgJ3JhdGVzJzogcmF0ZUFuYWx5c2lzLmJ1aWxkaW5nUmF0ZXN9fTtcclxuXHJcbiAgICAgICAgICBidWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeUZvckJ1aWxkaW5nLCB1cGRhdGVDb3N0SGVhZCwge25ldzogdHJ1ZX0sIChlcnJvcjogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gVXBkYXRlIGNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbCBidWlsZGluZ0Nvc3RIZWFkc0RhdGEgIDogJ1xyXG4gICAgICAgICAgICAgICAgKyBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnVXBkYXRlQnVpbGRpbmdDb3N0SGVhZCBzdWNjZXNzJyk7XHJcbiAgICAgICAgICAgICAgbGV0IHByb2plY3RDb3N0SGVhZHMgPSBwcm9qZWN0U2VydmljZS5jYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQ29tbW9uQW1tZW5pdGllcyhcclxuICAgICAgICAgICAgICAgIHByb2plY3REYXRhLnByb2plY3RDb3N0SGVhZHMsIHByb2plY3REYXRhKTtcclxuICAgICAgICAgICAgICBsZXQgcXVlcnlGb3JQcm9qZWN0ID0geydfaWQnOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgICAgICAgIGxldCB1cGRhdGVQcm9qZWN0Q29zdEhlYWQgPSB7JHNldDogeydwcm9qZWN0Q29zdEhlYWRzJzogcHJvamVjdENvc3RIZWFkc319O1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdDYWxsaW5nIHVwZGF0ZSBwcm9qZWN0IENvc3RoZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgICBwcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5Rm9yUHJvamVjdCwgdXBkYXRlUHJvamVjdENvc3RIZWFkLCB7bmV3OiB0cnVlfSxcclxuICAgICAgICAgICAgICAgIChlcnJvcjogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgdXBkYXRlIHByb2plY3QgQ29zdGhlYWRzIDogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnVXBkYXRlIHByb2plY3QgQ29zdGhlYWRzIHN1Y2Nlc3MnKTtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlQnVkZ2V0UmF0ZXNGb3JCdWlsZGluZ0Nvc3RIZWFkcyhlbnRpdHk6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBwcm9qZWN0RGV0YWlsczogUHJvamVjdCwgYnVpbGRpbmdEZXRhaWxzOiBCdWlsZGluZykge1xyXG4gICAgcmV0dXJuIG5ldyBDQ1Byb21pc2UoZnVuY3Rpb24gKHJlc29sdmU6IGFueSwgcmVqZWN0OiBhbnkpIHtcclxuICAgICAgbGV0IHJhdGVBbmFseXNpc1NlcnZpY2UgPSBuZXcgUmF0ZUFuYWx5c2lzU2VydmljZSgpO1xyXG4gICAgICBsZXQgcHJvamVjdFNlcnZpY2UgPSBuZXcgUHJvamVjdFNlcnZpY2UoKTtcclxuICAgICAgbGV0IGJ1aWxkaW5nUmVwb3NpdG9yeSA9IG5ldyBCdWlsZGluZ1JlcG9zaXRvcnkoKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ0luc2lkZSB1cGRhdGVCdWRnZXRSYXRlc0ZvckJ1aWxkaW5nQ29zdEhlYWRzIHByb21pc2UuJyk7XHJcbiAgICAgIGxldCBxdWVyeSA9IHsgJ3JlZ2lvbicgOiBjb25maWcuZ2V0KCdjb3N0Q29udHJvbFJlZ2lvbkNvZGUnKX07XHJcbiAgICAgIHJhdGVBbmFseXNpc1NlcnZpY2UuZ2V0Q29zdENvbnRyb2xSYXRlQW5hbHlzaXMoIHF1ZXJ5LCB7fSwoZXJyb3I6IGFueSwgcmF0ZUFuYWx5c2lzOiBSYXRlQW5hbHlzaXMpID0+IHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gcHJvbWlzZSB1cGRhdGVCdWRnZXRSYXRlc0ZvckJ1aWxkaW5nQ29zdEhlYWRzIDogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnSW5zaWRlIHVwZGF0ZUJ1ZGdldFJhdGVzRm9yQnVpbGRpbmdDb3N0SGVhZHMgc3VjY2VzcycpO1xyXG4gICAgICAgICAgbGV0IHByb2plY3RTZXJ2aWNlID0gbmV3IFByb2plY3RTZXJ2aWNlKCk7XHJcbiAgICAgICAgICBsZXQgYnVpbGRpbmdDb3N0SGVhZHMgPSByYXRlQW5hbHlzaXMuYnVpbGRpbmdDb3N0SGVhZHM7XHJcblxyXG4gICAgICAgICAgYnVpbGRpbmdDb3N0SGVhZHMgPSBwcm9qZWN0U2VydmljZS5jYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQnVpbGRpbmcoYnVpbGRpbmdDb3N0SGVhZHMsIGJ1aWxkaW5nRGV0YWlscywgcHJvamVjdERldGFpbHMpO1xyXG5cclxuICAgICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJzogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgICBsZXQgbmV3RGF0YSA9IHskc2V0OiB7J2Nvc3RIZWFkcyc6IGJ1aWxkaW5nQ29zdEhlYWRzLCAncmF0ZXMnOiByYXRlQW5hbHlzaXMuYnVpbGRpbmdSYXRlc319O1xyXG4gICAgICAgICAgYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRBbGxEYXRhRnJvbVJhdGVBbmFseXNpcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBpbiBVcGRhdGUgYnVpbGRpbmdDb3N0SGVhZHNEYXRhICA6ICcgKyBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdVcGRhdGVkIGJ1aWxkaW5nQ29zdEhlYWRzRGF0YScpO1xyXG4gICAgICAgICAgICAgIHJlc29sdmUoJ0RvbmUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBpbiB1cGRhdGVCdWRnZXRSYXRlc0ZvckJ1aWxkaW5nQ29zdEhlYWRzIDonICsgSlNPTi5zdHJpbmdpZnkoZS5tZXNzYWdlKSk7XHJcbiAgICAgIENDUHJvbWlzZS5yZWplY3QoZS5tZXNzYWdlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0UmF0ZXMocmVzdWx0OiBhbnksIGNvc3RIZWFkczogQXJyYXk8Q29zdEhlYWQ+KSB7XHJcbiAgICBsZXQgZ2V0UmF0ZXNMaXN0U1FMID0gJ1NFTEVDVCAqIEZST00gPyBBUyBxIFdIRVJFIHEuQzQgSU4gKFNFTEVDVCB0LnJhdGVBbmFseXNpc0lkICcgK1xyXG4gICAgICAnRlJPTSA/IEFTIHQpJztcclxuICAgIGxldCByYXRlSXRlbXMgPSBhbGFzcWwoZ2V0UmF0ZXNMaXN0U1FMLCBbcmVzdWx0LnJhdGVzLCBjb3N0SGVhZHNdKTtcclxuXHJcbiAgICBsZXQgcmF0ZUl0ZW1zUmF0ZUFuYWx5c2lzU1FMID0gJ1NFTEVDVCByYXRlSXRlbS5DMiBBUyBpdGVtTmFtZSwgcmF0ZUl0ZW0uQzIgQVMgb3JpZ2luYWxJdGVtTmFtZSwnICtcclxuICAgICAgJ3JhdGVJdGVtLkMxMiBBUyByYXRlQW5hbHlzaXNJZCwgcmF0ZUl0ZW0uQzYgQVMgdHlwZSwnICtcclxuICAgICAgJ1JPVU5EKHJhdGVJdGVtLkM3LDIpIEFTIHF1YW50aXR5LCBST1VORChyYXRlSXRlbS5DMywyKSBBUyByYXRlLCB1bml0LkMyIEFTIHVuaXQsJyArXHJcbiAgICAgICdST1VORChyYXRlSXRlbS5DMyAqIHJhdGVJdGVtLkM3LDIpIEFTIHRvdGFsQW1vdW50LCByYXRlSXRlbS5DNSBBUyB0b3RhbFF1YW50aXR5ICcgK1xyXG4gICAgICAnRlJPTSA/IEFTIHJhdGVJdGVtIEpPSU4gPyBBUyB1bml0IE9OIHVuaXQuQzEgPSByYXRlSXRlbS5DOSc7XHJcblxyXG4gICAgbGV0IHJhdGVJdGVtc0xpc3QgPSBhbGFzcWwocmF0ZUl0ZW1zUmF0ZUFuYWx5c2lzU1FMLCBbcmF0ZUl0ZW1zLCByZXN1bHQudW5pdHNdKTtcclxuXHJcbiAgICBsZXQgZGlzdGluY3RJdGVtc1NRTCA9ICdzZWxlY3QgRElTVElOQ1QgaXRlbU5hbWUsb3JpZ2luYWxJdGVtTmFtZSxyYXRlIEZST00gPyc7XHJcbiAgICB2YXIgZGlzdGluY3RSYXRlcyA9IGFsYXNxbChkaXN0aW5jdEl0ZW1zU1FMLCBbcmF0ZUl0ZW1zTGlzdF0pO1xyXG5cclxuICAgIHJldHVybiBkaXN0aW5jdFJhdGVzO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q2VudHJhbGl6ZWRSYXRlcyhyZXN1bHQ6IGFueSwgY29zdEhlYWRzIDogQXJyYXk8Q29zdEhlYWQ+KSB7XHJcblxyXG4gICAgbGV0IGdldFJhdGVzTGlzdFNRTCA9ICdTRUxFQ1QgKiBGUk9NID8gQVMgcSBXSEVSRSBxLkM0IElOIChTRUxFQ1QgdC5yYXRlQW5hbHlzaXNJZCAnICtcclxuICAgICAgJ0ZST00gPyBBUyB0KSc7XHJcbiAgICBsZXQgcmF0ZUl0ZW1zID0gYWxhc3FsKGdldFJhdGVzTGlzdFNRTCwgW3Jlc3VsdC5yYXRlcywgY29zdEhlYWRzXSk7XHJcblxyXG4gICAgbGV0IHJhdGVJdGVtc1JhdGVBbmFseXNpc1NRTCA9ICdTRUxFQ1QgcmF0ZUl0ZW0uQzIgQVMgaXRlbU5hbWUsIHJhdGVJdGVtLkMyIEFTIG9yaWdpbmFsSXRlbU5hbWUsJyArXHJcbiAgICAgICdyYXRlSXRlbS5DMTIgQVMgcmF0ZUFuYWx5c2lzSWQsIHJhdGVJdGVtLkM2IEFTIHR5cGUsJyArXHJcbiAgICAgICdST1VORChyYXRlSXRlbS5DNywyKSBBUyBxdWFudGl0eSwgUk9VTkQocmF0ZUl0ZW0uQzMsMikgQVMgcmF0ZSwgdW5pdC5DMiBBUyB1bml0LCcgK1xyXG4gICAgICAnUk9VTkQocmF0ZUl0ZW0uQzMgKiByYXRlSXRlbS5DNywyKSBBUyB0b3RhbEFtb3VudCwgcmF0ZUl0ZW0uQzUgQVMgdG90YWxRdWFudGl0eSAnICtcclxuICAgICAgJ0ZST00gPyBBUyByYXRlSXRlbSBKT0lOID8gQVMgdW5pdCBPTiB1bml0LkMxID0gcmF0ZUl0ZW0uQzknO1xyXG5cclxuICAgIGxldCByYXRlSXRlbXNMaXN0ID0gYWxhc3FsKHJhdGVJdGVtc1JhdGVBbmFseXNpc1NRTCwgW3JhdGVJdGVtcywgcmVzdWx0LnVuaXRzXSk7XHJcblxyXG4gICAgbGV0IGRpc3RpbmN0SXRlbXNTUUwgPSAnc2VsZWN0IERJU1RJTkNUIGl0ZW1OYW1lLG9yaWdpbmFsSXRlbU5hbWUscmF0ZSBGUk9NID8nO1xyXG4gICAgdmFyIGRpc3RpbmN0UmF0ZXMgPSBhbGFzcWwoZGlzdGluY3RJdGVtc1NRTCwgW3JhdGVJdGVtc0xpc3RdKTtcclxuXHJcbiAgICByZXR1cm4gZGlzdGluY3RSYXRlcztcclxuICB9XHJcblxyXG5cclxuICBjb252ZXJ0Q29uZmlnQ29zdEhlYWRzKGNvbmZpZ0Nvc3RIZWFkczogQXJyYXk8YW55PiwgY29zdEhlYWRzRGF0YTogQXJyYXk8Q29zdEhlYWQ+KSB7XHJcblxyXG4gICAgZm9yIChsZXQgY29uZmlnQ29zdEhlYWQgb2YgY29uZmlnQ29zdEhlYWRzKSB7XHJcblxyXG4gICAgICBsZXQgY29zdEhlYWQ6IENvc3RIZWFkID0gbmV3IENvc3RIZWFkKCk7XHJcbiAgICAgIGNvc3RIZWFkLm5hbWUgPSBjb25maWdDb3N0SGVhZC5uYW1lO1xyXG4gICAgICBjb3N0SGVhZC5wcmlvcml0eUlkID0gY29uZmlnQ29zdEhlYWQucHJpb3JpdHlJZDtcclxuICAgICAgY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQgPSBjb25maWdDb3N0SGVhZC5yYXRlQW5hbHlzaXNJZDtcclxuICAgICAgbGV0IGNhdGVnb3JpZXNMaXN0ID0gbmV3IEFycmF5PENhdGVnb3J5PigpO1xyXG5cclxuICAgICAgZm9yIChsZXQgY29uZmlnQ2F0ZWdvcnkgb2YgY29uZmlnQ29zdEhlYWQuY2F0ZWdvcmllcykge1xyXG5cclxuICAgICAgICBsZXQgY2F0ZWdvcnk6IENhdGVnb3J5ID0gbmV3IENhdGVnb3J5KGNvbmZpZ0NhdGVnb3J5Lm5hbWUsIGNvbmZpZ0NhdGVnb3J5LnJhdGVBbmFseXNpc0lkKTtcclxuICAgICAgICBsZXQgd29ya0l0ZW1zTGlzdDogQXJyYXk8V29ya0l0ZW0+ID0gbmV3IEFycmF5PFdvcmtJdGVtPigpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBjb25maWdXb3JrSXRlbSBvZiBjb25maWdDYXRlZ29yeS53b3JrSXRlbXMpIHtcclxuXHJcbiAgICAgICAgICBsZXQgd29ya0l0ZW06IFdvcmtJdGVtID0gbmV3IFdvcmtJdGVtKGNvbmZpZ1dvcmtJdGVtLm5hbWUsIGNvbmZpZ1dvcmtJdGVtLnJhdGVBbmFseXNpc0lkKTtcclxuICAgICAgICAgIHdvcmtJdGVtLmlzRGlyZWN0UmF0ZSA9IHRydWU7XHJcbiAgICAgICAgICB3b3JrSXRlbS51bml0ID0gY29uZmlnV29ya0l0ZW0ubWVhc3VyZW1lbnRVbml0O1xyXG4gICAgICAgICAgd29ya0l0ZW0uaXNNZWFzdXJlbWVudFNoZWV0ID0gY29uZmlnV29ya0l0ZW0uaXNNZWFzdXJlbWVudFNoZWV0O1xyXG4gICAgICAgICAgd29ya0l0ZW0uaXNSYXRlQW5hbHlzaXMgPSBjb25maWdXb3JrSXRlbS5pc1JhdGVBbmFseXNpcztcclxuICAgICAgICAgIHdvcmtJdGVtLnJhdGVBbmFseXNpc1BlclVuaXQgPSBjb25maWdXb3JrSXRlbS5yYXRlQW5hbHlzaXNQZXJVbml0O1xyXG4gICAgICAgICAgd29ya0l0ZW0uaXNJdGVtQnJlYWtkb3duUmVxdWlyZWQgPSBjb25maWdXb3JrSXRlbS5pc0l0ZW1CcmVha2Rvd25SZXF1aXJlZDtcclxuICAgICAgICAgIHdvcmtJdGVtLmxlbmd0aCA9IGNvbmZpZ1dvcmtJdGVtLmxlbmd0aDtcclxuICAgICAgICAgIHdvcmtJdGVtLmJyZWFkdGhPcldpZHRoID0gY29uZmlnV29ya0l0ZW0uYnJlYWR0aE9yV2lkdGg7XHJcbiAgICAgICAgICB3b3JrSXRlbS5oZWlnaHQgPSBjb25maWdXb3JrSXRlbS5oZWlnaHQ7XHJcblxyXG4gICAgICAgICAgaWYgKGNvbmZpZ1dvcmtJdGVtLmRpcmVjdFJhdGUgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgd29ya0l0ZW0ucmF0ZS50b3RhbCA9IGNvbmZpZ1dvcmtJdGVtLmRpcmVjdFJhdGU7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB3b3JrSXRlbS5yYXRlLnRvdGFsID0gMDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHdvcmtJdGVtLnJhdGUuaXNFc3RpbWF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgd29ya0l0ZW1zTGlzdC5wdXNoKHdvcmtJdGVtKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0ZWdvcnkud29ya0l0ZW1zID0gd29ya0l0ZW1zTGlzdDtcclxuICAgICAgICBjYXRlZ29yaWVzTGlzdC5wdXNoKGNhdGVnb3J5KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29zdEhlYWQuY2F0ZWdvcmllcyA9IGNhdGVnb3JpZXNMaXN0O1xyXG4gICAgICBjb3N0SGVhZC50aHVtYlJ1bGVSYXRlID0gY29uZmlnLmdldChDb25zdGFudHMuVEhVTUJSVUxFX1JBVEUpO1xyXG4gICAgICBjb3N0SGVhZHNEYXRhLnB1c2goY29zdEhlYWQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNvc3RIZWFkc0RhdGE7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVCdWRnZXRSYXRlc0ZvclByb2plY3RDb3N0SGVhZHMoZW50aXR5OiBzdHJpbmcsIHByb2plY3RJZDogc3RyaW5nLCBwcm9qZWN0RGV0YWlsczogUHJvamVjdCwgYnVpbGRpbmdEZXRhaWxzOiBCdWlsZGluZykge1xyXG4gICAgcmV0dXJuIG5ldyBDQ1Byb21pc2UoZnVuY3Rpb24gKHJlc29sdmU6IGFueSwgcmVqZWN0OiBhbnkpIHtcclxuICAgICAgbGV0IHJhdGVBbmFseXNpc1NlcnZpY2UgPSBuZXcgUmF0ZUFuYWx5c2lzU2VydmljZSgpO1xyXG4gICAgICBsZXQgcHJvamVjdFJlcG9zaXRvcnkgPSBuZXcgUHJvamVjdFJlcG9zaXRvcnkoKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ0luc2lkZSB1cGRhdGVCdWRnZXRSYXRlc0ZvclByb2plY3RDb3N0SGVhZHMgcHJvbWlzZS4nKTtcclxuICAgICAgbGV0IHF1ZXJ5ID0geyAncmVnaW9uJyA6IGNvbmZpZy5nZXQoJ2Nvc3RDb250cm9sUmVnaW9uQ29kZScpfTtcclxuICAgICAgcmF0ZUFuYWx5c2lzU2VydmljZS5nZXRDb3N0Q29udHJvbFJhdGVBbmFseXNpcyhxdWVyeSx7fSwoZXJyb3I6IGFueSwgcmF0ZUFuYWx5c2lzOiBSYXRlQW5hbHlzaXMpID0+IHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gdXBkYXRlQnVkZ2V0UmF0ZXNGb3JQcm9qZWN0Q29zdEhlYWRzIHByb21pc2UgOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcclxuICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICBsZXQgcHJvamVjdFNlcnZpY2UgPSBuZXcgUHJvamVjdFNlcnZpY2UoKTtcclxuICAgICAgICAgIGxldCBwcm9qZWN0Q29zdEhlYWRzID0gcmF0ZUFuYWx5c2lzLnByb2plY3RDb3N0SGVhZHM7XHJcbiAgICAgICAgICBwcm9qZWN0Q29zdEhlYWRzID0gcHJvamVjdFNlcnZpY2UuY2FsY3VsYXRlQnVkZ2V0Q29zdEZvckNvbW1vbkFtbWVuaXRpZXMoXHJcbiAgICAgICAgICAgIHByb2plY3RDb3N0SGVhZHMsIHByb2plY3REZXRhaWxzKTtcclxuXHJcbiAgICAgICAgICBsZXQgcXVlcnkgPSB7J19pZCc6IHByb2plY3RJZH07XHJcbiAgICAgICAgICBsZXQgbmV3RGF0YSA9IHskc2V0OiB7J3Byb2plY3RDb3N0SGVhZHMnOiBwcm9qZWN0Q29zdEhlYWRzLCAncmF0ZXMnOiByYXRlQW5hbHlzaXMucHJvamVjdFJhdGVzfX07XHJcblxyXG4gICAgICAgICAgcHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSwge25ldzogdHJ1ZX0sIChlcnJvcjogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldEFsbERhdGFGcm9tUmF0ZUFuYWx5c2lzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGluIFVwZGF0ZSBidWlsZGluZ0Nvc3RIZWFkc0RhdGEgIDogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ1VwZGF0ZWQgcHJvamVjdENvc3RIZWFkcycpO1xyXG4gICAgICAgICAgICAgIHJlc29sdmUoJ0RvbmUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBpbiB1cGRhdGVCdWRnZXRSYXRlc0ZvclByb2plY3RDb3N0SGVhZHMgOicgKyBKU09OLnN0cmluZ2lmeShlLm1lc3NhZ2UpKTtcclxuICAgICAgQ0NQcm9taXNlLnJlamVjdChlLm1lc3NhZ2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQnVpbGRpbmcoY29zdEhlYWRzUmF0ZUFuYWx5c2lzOiBhbnksIGJ1aWxkaW5nRGV0YWlsczogYW55LCBwcm9qZWN0RGV0YWlsczogYW55KSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQnVpbGRpbmcgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgY29zdEhlYWRzOiBBcnJheTxDb3N0SGVhZD4gPSBuZXcgQXJyYXk8Q29zdEhlYWQ+KCk7XHJcbiAgICBsZXQgYnVkZ2V0ZWRDb3N0QW1vdW50OiBudW1iZXI7XHJcbiAgICBsZXQgY2FsY3VsYXRlQnVkZ3RlZENvc3Q6IHN0cmluZztcclxuXHJcbiAgICBmb3IgKGxldCBjb3N0SGVhZCBvZiBjb3N0SGVhZHNSYXRlQW5hbHlzaXMpIHtcclxuXHJcbiAgICAgIGxldCBidWRnZXRDb3N0Rm9ybXVsYWU6IHN0cmluZztcclxuXHJcbiAgICAgIHN3aXRjaCAoY29zdEhlYWQubmFtZSkge1xyXG5cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5SQ0MgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlNMQUJfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsU2xhYkFyZWEpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5FWFRFUk5BTF9QTEFTVEVSIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkZBQlJJQ0FUSU9OIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlBBSU5USU5HIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLktJVENIRU5fUExBVEZPUk1TIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfT05FX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mT25lQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX1RXT19CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZlR3b0JISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9USFJFRV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZlRocmVlQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX0ZPVVJfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZGb3VyQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX0ZJVkVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZGaXZlQkhLKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG5cclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlNPTElORyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuUExJTlRIX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy5wbGludGhBcmVhKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuTUFTT05SWSA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5JTlRFUk5BTF9QTEFTVEVSIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkdZUFNVTV9QVU5OSU5HIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLldBVEVSX1BST09GSU5HIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkRFV0FURVJJTkcgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlNBTEVBQkxFX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbFNhbGVhYmxlQXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkdBUkJBR0VfQ0hVVEUgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GTE9PUlMsIGJ1aWxkaW5nRGV0YWlscy50b3RhbE51bU9mRmxvb3JzKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX1BBUktJTkdfRkxPT1JTLCBidWlsZGluZ0RldGFpbHMubnVtT2ZQYXJraW5nRmxvb3JzKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuTElGVCA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyAnTGlmdCcpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRkxPT1JTLCBidWlsZGluZ0RldGFpbHMudG90YWxOdW1PZkZsb29ycylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9MSUZUUywgYnVpbGRpbmdEZXRhaWxzLm51bU9mTGlmdHMpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5ET09SU19XSVRIX0ZSQU1FUyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuTlVNX09GX09ORV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZk9uZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9UV09fQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUd29CSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVEhSRUVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUaHJlZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GT1VSX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRm91ckJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GSVZFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRml2ZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9PTkVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZPbmVCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVFdPX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mVHdvQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX1RIUkVFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mVGhyZWVCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRk9VUl9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZvdXJCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRklWRV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZpdmVCSEspO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5FWENBVkFUSU9OIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5QTElOVEhfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnBsaW50aEFyZWEpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5CQUNLRklMTElOR19QTElOVEggOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlBMSU5USF9BUkVBLCBidWlsZGluZ0RldGFpbHMucGxpbnRoQXJlYSk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkZMT09SSU5HX1NLSVJUSU5HX0RBRE9fV0FMTF9USUxJTkcgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLkNBUlBFVF9BUkVBLCBidWlsZGluZ0RldGFpbHMudG90YWxDYXJwZXRBcmVhT2ZVbml0KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuV0lORE9XU19TSUxMU19PUl9KQU1CUyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5TVEFJUkNBU0VfVFJFQURTX0FORF9SSVNFUlMgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLkNBUlBFVF9BUkVBLCBidWlsZGluZ0RldGFpbHMudG90YWxDYXJwZXRBcmVhT2ZVbml0KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkRPT1JTX1dJVEhfRlJBTUVTX0FORF9IQVJEV0FSRSA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuTlVNX09GX09ORV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZk9uZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9UV09fQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUd29CSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVEhSRUVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUaHJlZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GT1VSX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRm91ckJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GSVZFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRml2ZUJISyk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLldJTkRPV1NfQU5EX0dMQVNTX0RPT1JTIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkVMRUNUUklGSUNBVElPTiA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgLyogIGNhc2UgQ29uc3RhbnRzLlBMVU1CSU5HIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfT05FX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mT25lQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX1RXT19CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZlR3b0JISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9USFJFRV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZlRocmVlQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX0ZPVVJfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZGb3VyQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX0ZJVkVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZGaXZlQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX09ORV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZk9uZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9UV09fQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUd29CSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVEhSRUVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUaHJlZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GT1VSX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRm91ckJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GSVZFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRml2ZUJISyk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfSovXHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuRUxFQ1RSSUNBTF9MSUdIVF9GSVRUSU5HU19JTl9DT01NT05fQVJFQVNfT0ZfQlVJTERJTkdTIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQV9PRl9QQVJLSU5HLCBidWlsZGluZ0RldGFpbHMuY2FycGV0QXJlYU9mUGFya2luZylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLlBMT1RfUEVSSVBIRVJZX0xFTkdUSCwgcHJvamVjdERldGFpbHMucGxvdFBlcmlwaGVyeSlcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GTE9PUlMsIGJ1aWxkaW5nRGV0YWlscy50b3RhbE51bU9mRmxvb3JzKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuUEVTVF9DT05UUk9MIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlNPTEFSX1dBVEVSX0hFQVRJTkdfU1lTVEVNIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlBJUEVEX0dBU19TWVNURU0gOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9PTkVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZPbmVCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVFdPX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mVHdvQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX1RIUkVFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mVGhyZWVCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRk9VUl9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZvdXJCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRklWRV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZpdmVCSEspO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5TS1lfTE9VTkdFX09OX1RPUF9URVJSQUNFIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5TTEFCX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbFNsYWJBcmVhKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX0ZMT09SUywgYnVpbGRpbmdEZXRhaWxzLnRvdGFsTnVtT2ZGbG9vcnMpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfUEFSS0lOR19GTE9PUlMsIGJ1aWxkaW5nRGV0YWlscy5udW1PZlBhcmtpbmdGbG9vcnMpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5GSVJFX0ZJR0hUSU5HX1NZU1RFTSA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuTlVNX09GX0ZMT09SUywgYnVpbGRpbmdEZXRhaWxzLnRvdGFsTnVtT2ZGbG9vcnMpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5TQUZFVFlfQU5EX1NFQ1VSSVRZX0FVVE9NQVRJT04gOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9PTkVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZPbmVCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVFdPX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mVHdvQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX1RIUkVFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mVGhyZWVCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRk9VUl9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZvdXJCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRklWRV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZpdmVCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5UT1RBTF9OVU1fT0ZfQlVJTERJTkdTLCBwcm9qZWN0RGV0YWlscy50b3RhbE51bU9mQnVpbGRpbmdzKTsgLy90b3RhbCBudW1iZXIgb2YgYnVpbGRpbmdzXHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlNIT1dFUl9FTkNMT1NVUkVTIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfT05FX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mT25lQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX1RXT19CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZlR3b0JISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9USFJFRV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZlRocmVlQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX0ZPVVJfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZGb3VyQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX0ZJVkVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZGaXZlQkhLKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuRkFMU0VfQ0VJTElORyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuTlVNX09GX09ORV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZk9uZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9UV09fQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUd29CSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVEhSRUVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUaHJlZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GT1VSX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRm91ckJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GSVZFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRml2ZUJISyk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlNQRUNJQUxfRUxFVkFUSU9OQUxfRkVBVFVSRVMgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgJ1NwZWNpYWwgZWxldmF0aW9uYWwgZmVhdHVyZXMnKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5CT0FSRFNfQU5EX1NJR05BR0VTX0lOU0lERV9CVUlMRElORyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuTlVNX09GX09ORV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZk9uZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9UV09fQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUd29CSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVEhSRUVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUaHJlZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GT1VSX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRm91ckJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GSVZFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRml2ZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GTE9PUlMsIGJ1aWxkaW5nRGV0YWlscy50b3RhbE51bU9mRmxvb3JzKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuSU5URVJOQUxfUExVTUJJTkdfV0lUSF9WRVJUSUNBTF9MSU5FUyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuTlVNX09GX09ORV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZk9uZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9UV09fQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUd29CSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVEhSRUVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUaHJlZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GT1VSX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRm91ckJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GSVZFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRml2ZUJISylcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9PTkVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZPbmVCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVFdPX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mVHdvQkhLKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX1RIUkVFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mVGhyZWVCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRk9VUl9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZvdXJCSEspXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRklWRV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZpdmVCSEspO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5XSU5ET1dTX1NMSURJTkdfRE9PUlMgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLkNBUlBFVF9BUkVBLCBidWlsZGluZ0RldGFpbHMudG90YWxDYXJwZXRBcmVhT2ZVbml0KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVmYXVsdCA6IHtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIHJldHVybiBjb3N0SGVhZHM7XHJcbiAgfVxyXG5cclxuICBjYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQ29tbW9uQW1tZW5pdGllcyhjb3N0SGVhZHNSYXRlQW5hbHlzaXM6IGFueSwgcHJvamVjdERldGFpbHM6IFByb2plY3QpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNhbGN1bGF0ZUJ1ZGdldENvc3RGb3JDb21tb25BbW1lbml0aWVzIGhhcyBiZWVuIGhpdCcpO1xyXG5cclxuICAgIGxldCBjb3N0SGVhZHM6IEFycmF5PENvc3RIZWFkPiA9IG5ldyBBcnJheTxDb3N0SGVhZD4oKTtcclxuICAgIGxldCBidWRnZXRlZENvc3RBbW91bnQ6IG51bWJlcjtcclxuICAgIGxldCBidWRnZXRDb3N0Rm9ybXVsYWU6IHN0cmluZztcclxuICAgIGxldCBjYWxjdWxhdGVCdWRndGVkQ29zdDogc3RyaW5nO1xyXG5cclxuICAgIGxldCBjYWxjdWxhdGVQcm9qZWN0RGF0YSA9ICdTRUxFQ1QgUk9VTkQoU1VNKGJ1aWxkaW5nLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCksMikgQVMgdG90YWxDYXJwZXRBcmVhLCAnICtcclxuICAgICAgJ1JPVU5EKFNVTShidWlsZGluZy50b3RhbFNsYWJBcmVhKSwyKSBBUyB0b3RhbFNsYWJBcmVhUHJvamVjdCwnICtcclxuICAgICAgJ1JPVU5EKFNVTShidWlsZGluZy5udW1PZk9uZUJISyksMikgQVMgdG90YWxOdW1iZXJPZk9uZUJISywnICtcclxuICAgICAgJ1JPVU5EKFNVTShidWlsZGluZy5udW1PZlR3b0JISyksMikgQVMgdG90YWxOdW1iZXJPZlR3b0JISywnICtcclxuICAgICAgJ1JPVU5EKFNVTShidWlsZGluZy5udW1PZlRocmVlQkhLKSwyKSBBUyB0b3RhbE51bWJlck9mVGhyZWVCSEssJyArXHJcbiAgICAgICdST1VORChTVU0oYnVpbGRpbmcubnVtT2ZGb3VyQkhLKSwyKSBBUyB0b3RhbE51bWJlck9mRm91ckJISywnICtcclxuICAgICAgJ1JPVU5EKFNVTShidWlsZGluZy5udW1PZkZpdmVCSEspLDIpIEFTIHRvdGFsTnVtYmVyT2ZGaXZlQkhLLCcgK1xyXG4gICAgICAnUk9VTkQoU1VNKGJ1aWxkaW5nLmNhcnBldEFyZWFPZlBhcmtpbmcpLDIpIEFTIHRvdGFsQ2FycGV0QXJlYU9mUGFya2luZywnICtcclxuICAgICAgJ1JPVU5EKFNVTShidWlsZGluZy50b3RhbFNhbGVhYmxlQXJlYU9mVW5pdCksMikgQVMgdG90YWxTYWxlYWJsZUFyZWEgIEZST00gPyBBUyBidWlsZGluZyc7XHJcbiAgICBsZXQgcHJvamVjdERhdGEgPSBhbGFzcWwoY2FsY3VsYXRlUHJvamVjdERhdGEsIFtwcm9qZWN0RGV0YWlscy5idWlsZGluZ3NdKTtcclxuICAgIGxldCB0b3RhbFNsYWJBcmVhT2ZQcm9qZWN0OiBudW1iZXIgPSBwcm9qZWN0RGF0YVswXS50b3RhbFNsYWJBcmVhUHJvamVjdDtcclxuICAgIGxldCB0b3RhbFNhbGVhYmxlQXJlYU9mUHJvamVjdDogbnVtYmVyID0gcHJvamVjdERhdGFbMF0udG90YWxTYWxlYWJsZUFyZWE7XHJcbiAgICBsZXQgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0OiBudW1iZXIgPSBwcm9qZWN0RGF0YVswXS50b3RhbENhcnBldEFyZWE7XHJcbiAgICBsZXQgdG90YWxDYXJwZXRBcmVhT2ZQYXJraW5nOiBudW1iZXIgPSBwcm9qZWN0RGF0YVswXS50b3RhbENhcnBldEFyZWFPZlBhcmtpbmc7XHJcbiAgICBsZXQgdG90YWxOdW1iZXJPZk9uZUJIS0luUHJvamVjdDogbnVtYmVyID0gcHJvamVjdERhdGFbMF0udG90YWxOdW1iZXJPZk9uZUJISztcclxuICAgIGxldCB0b3RhbE51bWJlck9mVHdvQkhLSW5Qcm9qZWN0OiBudW1iZXIgPSBwcm9qZWN0RGF0YVswXS50b3RhbE51bWJlck9mVHdvQkhLO1xyXG4gICAgbGV0IHRvdGFsTnVtYmVyT2ZUaHJlZUJIS0luUHJvamVjdDogbnVtYmVyID0gcHJvamVjdERhdGFbMF0udG90YWxOdW1iZXJPZlRocmVlQkhLO1xyXG4gICAgbGV0IHRvdGFsTnVtYmVyT2ZGb3VyQkhLSW5Qcm9qZWN0OiBudW1iZXIgPSBwcm9qZWN0RGF0YVswXS50b3RhbE51bWJlck9mRm91ckJISztcclxuICAgIGxldCB0b3RhbE51bWJlck9mRml2ZUJIS0luUHJvamVjdDogbnVtYmVyID0gcHJvamVjdERhdGFbMF0udG90YWxOdW1iZXJPZkZpdmVCSEs7XHJcblxyXG4gICAgZm9yIChsZXQgY29zdEhlYWQgb2YgY29zdEhlYWRzUmF0ZUFuYWx5c2lzKSB7XHJcblxyXG4gICAgICBzd2l0Y2ggKGNvc3RIZWFkLm5hbWUpIHtcclxuXHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuU0FGRVRZX01FQVNVUkVTIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5UT1RBTF9DQVJQRVRfQVJFQSwgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuQ0xVQl9IT1VTRSA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuVE9UQUxfU0xBQl9BUkVBX09GX0NMVUJfSE9VU0UsIHByb2plY3REZXRhaWxzLnNsYWJBcmVhKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuU1dJTU1JTkdfUE9PTCA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuU1dJTU1JTkdfUE9PTF9DQVBBQ0lUWSwgcHJvamVjdERldGFpbHMucG9vbENhcGFjaXR5KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuQ0hJTERSRU5fUExBWV9BUkVBIDoge1xyXG4gICAgICAgICAgdGhpcy5zZXRGaXhlZEJ1ZGdldGVkQ29zdChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5HWU0gOiB7XHJcbiAgICAgICAgICB0aGlzLnNldEZpeGVkQnVkZ2V0ZWRDb3N0KGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkRfR19TRVRfQkFDS1VQIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5UT1RBTF9DQVJQRVRfQVJFQSwgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuUE9ESVVNIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5QT0RJVU1fQVJFQSwgcHJvamVjdERldGFpbHMucG9kaXVtQXJlYSk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkxBTkRTQ0FQSU5HX09GX09QRU5fU1BBQ0VTIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5PUEVOX1NQQUNFLCBwcm9qZWN0RGV0YWlscy5vcGVuU3BhY2UpLnJlcGxhY2UoQ29uc3RhbnRzLlBMT1RfUEVSSVBIRVJZX0xFTkdUSCwgcHJvamVjdERldGFpbHMucGxvdFBlcmlwaGVyeSk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlJBSU5fV0FURVJfSEFSVkVTVElORyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuUExPVF9BUkVBLCBwcm9qZWN0RGV0YWlscy5wbG90QXJlYSk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkJPQVJEU19BTkRfU0lHTkFHRVNfSU5fQ09NTU9OX0FSRUFTIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5UT1RBTF9OVU1CRVJfT0ZfQlVJTERJTkdTLCBwcm9qZWN0RGV0YWlscy50b3RhbE51bU9mQnVpbGRpbmdzKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuRUxFQ1RSSUNBTF9MSUdIVF9GSVRUSU5HU19JTl9DT01NT05fQVJFQVNfT0ZfUFJPSkVDVCA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuUExPVF9QRVJJUEhFUllfTEVOR1RILCBwcm9qZWN0RGV0YWlscy5wbG90UGVyaXBoZXJ5KS5yZXBsYWNlKENvbnN0YW50cy5PUEVOX1NQQUNFLCBwcm9qZWN0RGV0YWlscy5vcGVuU3BhY2UpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5TSVRFX0RFVl9FTEVDVFJJQ0FMX0lORlJBU1RSVUNUVVJFIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfT05FX0JISywgdG90YWxOdW1iZXJPZk9uZUJIS0luUHJvamVjdClcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9UV09fQkhLLCB0b3RhbE51bWJlck9mVHdvQkhLSW5Qcm9qZWN0KS5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVEhSRUVfQkhLLCB0b3RhbE51bWJlck9mVGhyZWVCSEtJblByb2plY3QpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRk9VUl9CSEssIHRvdGFsTnVtYmVyT2ZGb3VyQkhLSW5Qcm9qZWN0KS5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRklWRV9CSEssIHRvdGFsTnVtYmVyT2ZGaXZlQkhLSW5Qcm9qZWN0KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuU0lURV9ERVZfUExVTUJJTkdfQU5EX0RSQUlOQUdFX1NZU1RFTSA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuVE9UQUxfQ0FSUEVUX0FSRUEsIHRvdGFsQ2FycGV0QXJlYU9mUHJvamVjdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlNJVEVfREVWX0JBQ0tGSUxMSU5HIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5QTE9UX0FSRUEsIHByb2plY3REZXRhaWxzLnBsb3RBcmVhKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuU0lURV9ERVZfUk9BRF9XT1JLIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5QTE9UX0FSRUEsIHByb2plY3REZXRhaWxzLnBsb3RBcmVhKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIC8qICBjYXNlIENvbnN0YW50cy5LRVJCSU5HIDogeyAgICAvLyBUb0RvIDogd2FpdGluZyBmb3IgaW5kcmFqZWV0J3MgYW5zXHJcbiAgICAgICAgICAvISpidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlNXSU1NSU5HX1BPT0xfQ0FQQUNJVFksIHByb2plY3REZXRhaWxzLnBvb2xDYXBhY2l0eSk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTsqIS9cclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IDE7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH0qL1xyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlBST0pFQ1RfRU5UUkFOQ0VfR0FURSA6IHtcclxuICAgICAgICAgIHRoaXMuc2V0Rml4ZWRCdWRnZXRlZENvc3QoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuQ09NUE9VTkRfV0FMTCA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuUExPVF9QRVJJUEhFUllfTEVOR1RILCBwcm9qZWN0RGV0YWlscy5wbG90UGVyaXBoZXJ5KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuQ0FSX1BBUktfU1lTVEVNUyA6IHsgICAvLyBUb0RvIDogd2FpdGluZyBmb3IgaW5kcmFqZWV0J3MgYW5zXHJcbiAgICAgICAgICAvKmJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuU1dJTU1JTkdfUE9PTF9DQVBBQ0lUWSwgcHJvamVjdERldGFpbHMucG9vbENhcGFjaXR5KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpOyovXHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSAwO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuQ0FSX1BBUktfTUFSS0lOR19QQVJLSU5HX0FDQ0VTU09SSUVTIDogeyAgICAgIC8vIFRvRG8gOiB3YWl0aW5nIGZvciBpbmRyYWplZXQncyBhbnNcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUFfT0ZfUEFSS0lORywgdG90YWxDYXJwZXRBcmVhT2ZQYXJraW5nKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuQ0xFQU5JTkdfQU5EX1NISUZUSU5HX09GX0RFQlJJUyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuVE9UQUxfQ0FSUEVUX0FSRUEsIHRvdGFsQ2FycGV0QXJlYU9mUHJvamVjdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLkVMRUNUUklDSVRZX0FORF9ESUVTRUxfQ0hBUkdFUyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuVE9UQUxfQ0FSUEVUX0FSRUEsIHRvdGFsQ2FycGV0QXJlYU9mUHJvamVjdClcclxuICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLlRBUkdFVEVEX1BST0pFQ1RfQ09NUExFVElPTl9QRVJJT0QsIHByb2plY3REZXRhaWxzLnByb2plY3REdXJhdGlvbik7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLk1BVEVSSUFMX1RFU1RJTkcgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlRPVEFMX0NBUlBFVF9BUkVBLCB0b3RhbENhcnBldEFyZWFPZlByb2plY3QpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5ERVBBUlRNRU5UQUxfTEFCT1VSIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5QTE9UX0FSRUEsIHByb2plY3REZXRhaWxzLnBsb3RBcmVhKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuVEFSR0VURURfUFJPSkVDVF9DT01QTEVUSU9OX1BFUklPRCwgcHJvamVjdERldGFpbHMucHJvamVjdER1cmF0aW9uKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuQ0xFQU5JTkdfT0ZfVU5JVFNfQkVGT1JFX1BPU1NFU1NJT04gOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlRPVEFMX0NBUlBFVF9BUkVBLCB0b3RhbENhcnBldEFyZWFPZlByb2plY3QpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5TQU1QTEVfRkxBVCA6IHtcclxuICAgICAgICAgIHRoaXMuc2V0Rml4ZWRCdWRnZXRlZENvc3QoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuTEFCT1VSX0NBTVAgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlRPVEFMX0NBUlBFVF9BUkVBLCB0b3RhbENhcnBldEFyZWFPZlByb2plY3QpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5TSVRFX1BSRVBBUkFUSU9OX1RFTVBPUkFSWV9GRU5DSU5HIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5QTE9UX1BFUklQSEVSWV9MRU5HVEgsIHByb2plY3REZXRhaWxzLnBsb3RQZXJpcGhlcnkpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5TSVRFX1BSRVBBUkFUSU9OX1RFTVBPUkFSWV9TVFJVQ1RVUkVTX1NUT1JFUyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuU0FMRUFCTEVfQVJFQSwgdG90YWxTYWxlYWJsZUFyZWFPZlByb2plY3QpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5URU1QT1JBUllfRUxFQ1RSSUZJQ0FUSU9OIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5UT1RBTF9DQVJQRVRfQVJFQSwgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuVEVNUE9SQVJZX1BMVU1CSU5HX0FORF9EUkFJTkFHRSA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuU0FMRUFCTEVfQVJFQSwgdG90YWxTYWxlYWJsZUFyZWFPZlByb2plY3QpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5TSVRFX1NBTEVTX09GRklDRSA6IHtcclxuICAgICAgICAgIHRoaXMuc2V0Rml4ZWRCdWRnZXRlZENvc3QoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuU09DSUVUWV9PRkZJQ0VfV0lUSF9GVVJOSVRVUkUgOiB7XHJcbiAgICAgICAgICB0aGlzLnNldEZpeGVkQnVkZ2V0ZWRDb3N0KGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLldBVEVSX0NIQVJHRVMgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlRPVEFMX0NBUlBFVF9BUkVBLCB0b3RhbENhcnBldEFyZWFPZlByb2plY3QpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5UQVJHRVRFRF9QUk9KRUNUX0NPTVBMRVRJT05fUEVSSU9ELCBwcm9qZWN0RGV0YWlscy5wcm9qZWN0RHVyYXRpb24pO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5SRVBBSVJTX01BSU5URU5BTkNFX0NIQVJHRVNfSU5fREVGRUNUX0xJQUJJTElUWV9QRVJJT0RfT0ZfNV9ZRUFSUyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuVE9UQUxfQ0FSUEVUX0FSRUEsIHRvdGFsQ2FycGV0QXJlYU9mUHJvamVjdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlBST0ZGRVNTSU9OQUxfRkVFUyA6IHtcclxuICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuVE9UQUxfQ0FSUEVUX0FSRUEsIHRvdGFsQ2FycGV0QXJlYU9mUHJvamVjdCk7XHJcbiAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgQ29uc3RhbnRzLlNBTEVTX0FORF9NQVJLRVRJTkcgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlRPVEFMX0NBUlBFVF9BUkVBLCB0b3RhbENhcnBldEFyZWFPZlByb2plY3QpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5GSU5BTkNFX0NPU1QgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlRPVEFMX0NBUlBFVF9BUkVBLCB0b3RhbENhcnBldEFyZWFPZlByb2plY3QpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5BRE1JTklTVFJBVElWRV9DSEFSR0VTIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5UT1RBTF9DQVJQRVRfQVJFQSwgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0KTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBDb25zdGFudHMuTE9DQUxfQk9EWV9QUk9KRUNUX1NBTkNUSU9OSU5HX0NIQVJHRVMgOiB7XHJcbiAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlRPVEFMX0NBUlBFVF9BUkVBLCB0b3RhbENhcnBldEFyZWFPZlByb2plY3QpO1xyXG4gICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBwcm9qZWN0RGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXNlIENvbnN0YW50cy5TSVRFX1NFQ1VSSVRZIDoge1xyXG4gICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5QTE9UX0FSRUEsIHByb2plY3REZXRhaWxzLnBsb3RBcmVhKVxyXG4gICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuVEFSR0VURURfUFJPSkVDVF9DT01QTEVUSU9OX1BFUklPRCwgcHJvamVjdERldGFpbHMucHJvamVjdER1cmF0aW9uKTtcclxuICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlZmF1bHQgOiB7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY29zdEhlYWRzO1xyXG4gIH1cclxuXHJcbiAgc2V0Rml4ZWRCdWRnZXRlZENvc3QoYnVkZ2V0ZWRDb3N0QW1vdW50IDogbnVtYmVyLCBjb3N0SGVhZCA6IGFueSwgcHJvamVjdERldGFpbHMgOiBQcm9qZWN0LCBjb3N0SGVhZHMgOiBBcnJheTxDb3N0SGVhZD4pIHtcclxuICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKTtcclxuICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gIH1cclxuXHJcbiAgYWRkTmV3Q2VudHJhbGl6ZWRSYXRlRm9yQnVpbGRpbmcoYnVpbGRpbmdJZDogc3RyaW5nLCByYXRlSXRlbTogYW55KSB7XHJcbiAgICByZXR1cm4gbmV3IENDUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZTogYW55LCByZWplY3Q6IGFueSkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnY3JlYXRlUHJvbWlzZUZvckFkZGluZ05ld1JhdGVJdGVtIGhhcyBiZWVuIGhpdCBmb3IgYnVpbGRpbmdJZDogJyArIGJ1aWxkaW5nSWQgKyAnLCByYXRlSXRlbSA6ICcgKyByYXRlSXRlbSk7XHJcblxyXG4gICAgICBsZXQgYnVpbGRpbmdSZXBvc2l0b3J5ID0gbmV3IEJ1aWxkaW5nUmVwb3NpdG9yeSgpO1xyXG4gICAgICBsZXQgcXVlcnlBZGROZXdSYXRlSXRlbSA9IHsnX2lkJzogYnVpbGRpbmdJZH07XHJcbiAgICAgIGxldCBhZGROZXdSYXRlUmF0ZURhdGEgPSB7JHB1c2g6IHsncmF0ZXMnOiByYXRlSXRlbX19O1xyXG4gICAgICBidWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeUFkZE5ld1JhdGVJdGVtLCBhZGROZXdSYXRlUmF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3I6IEVycm9yLCByZXN1bHQ6IEJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdQcm9taXNlIGZhaWxlZCBmb3IgaW5kaXZpZHVhbCBjcmVhdGVQcm9taXNlRm9yQWRkaW5nTmV3UmF0ZUl0ZW0hIGVycm9yIDonICsgSlNPTi5zdHJpbmdpZnkoZS5tZXNzYWdlKSk7XHJcbiAgICAgIENDUHJvbWlzZS5yZWplY3QoZS5tZXNzYWdlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlQ2VudHJhbGl6ZWRSYXRlRm9yQnVpbGRpbmcoYnVpbGRpbmdJZDogc3RyaW5nLCByYXRlSXRlbTogc3RyaW5nLCByYXRlSXRlbVJhdGU6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIG5ldyBDQ1Byb21pc2UoZnVuY3Rpb24gKHJlc29sdmU6IGFueSwgcmVqZWN0OiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ2NyZWF0ZVByb21pc2VGb3JSYXRlVXBkYXRlIGhhcyBiZWVuIGhpdCBmb3IgYnVpbGRpbmdJZCA6ICcgKyBidWlsZGluZ0lkICsgJywgcmF0ZUl0ZW0gOiAnICsgcmF0ZUl0ZW0pO1xyXG4gICAgICAvL3VwZGF0ZSByYXRlXHJcbiAgICAgIGxldCBidWlsZGluZ1JlcG9zaXRvcnkgPSBuZXcgQnVpbGRpbmdSZXBvc2l0b3J5KCk7XHJcbiAgICAgIGxldCBxdWVyeVVwZGF0ZVJhdGUgPSB7J19pZCc6IGJ1aWxkaW5nSWQsICdyYXRlcy5pdGVtTmFtZSc6IHJhdGVJdGVtfTtcclxuICAgICAgbGV0IHVwZGF0ZVJhdGUgPSB7JHNldDogeydyYXRlcy4kLnJhdGUnOiByYXRlSXRlbVJhdGV9fTtcclxuICAgICAgYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnlVcGRhdGVSYXRlLCB1cGRhdGVSYXRlLCB7bmV3OiB0cnVlfSwgKGVycm9yOiBFcnJvciwgcmVzdWx0OiBCdWlsZGluZykgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ1JhdGUgVXBkYXRlZCcpO1xyXG4gICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KS5jYXRjaChmdW5jdGlvbiAoZTogYW55KSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignUHJvbWlzZSBmYWlsZWQgZm9yIGluZGl2aWR1YWwgY3JlYXRlUHJvbWlzZUZvclJhdGVVcGRhdGUgISBFcnJvcjogJyArIEpTT04uc3RyaW5naWZ5KGUubWVzc2FnZSkpO1xyXG4gICAgICBDQ1Byb21pc2UucmVqZWN0KGUubWVzc2FnZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFkZE5ld0NlbnRyYWxpemVkUmF0ZUZvclByb2plY3QocHJvamVjdElkOiBzdHJpbmcsIHJhdGVJdGVtOiBhbnkpIHtcclxuICAgIHJldHVybiBuZXcgQ0NQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlOiBhbnksIHJlamVjdDogYW55KSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdjcmVhdGVQcm9taXNlRm9yQWRkaW5nTmV3UmF0ZUl0ZW1JblByb2plY3RSYXRlcyBoYXMgYmVlbiBoaXQgZm9yIHByb2plY3RJZCA6ICcgKyBwcm9qZWN0SWQgKyAnLCByYXRlSXRlbSA6ICcgKyByYXRlSXRlbSk7XHJcblxyXG4gICAgICBsZXQgcHJvamVjdFJlcG9zaXRvcnkgPSBuZXcgUHJvamVjdFJlcG9zaXRvcnkoKTtcclxuICAgICAgbGV0IGFkZE5ld1JhdGVJdGVtUXVlcnlQcm9qZWN0ID0geydfaWQnOiBwcm9qZWN0SWR9O1xyXG4gICAgICBsZXQgYWRkTmV3UmF0ZVJhdGVEYXRhUHJvamVjdCA9IHskcHVzaDogeydyYXRlcyc6IHJhdGVJdGVtfX07XHJcbiAgICAgIHByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUoYWRkTmV3UmF0ZUl0ZW1RdWVyeVByb2plY3QsIGFkZE5ld1JhdGVSYXRlRGF0YVByb2plY3QsXHJcbiAgICAgICAge25ldzogdHJ1ZX0sIChlcnJvcjogRXJyb3IsIHJlc3VsdDogQnVpbGRpbmcpID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSkuY2F0Y2goZnVuY3Rpb24gKGU6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ1Byb21pc2UgZmFpbGVkIGZvciBpbmRpdmlkdWFsIGNyZWF0ZVByb21pc2VGb3JBZGRpbmdOZXdSYXRlSXRlbUluUHJvamVjdFJhdGVzICEgZXJyb3IgOicgKyBKU09OLnN0cmluZ2lmeShlLm1lc3NhZ2UpKTtcclxuICAgICAgQ0NQcm9taXNlLnJlamVjdChlLm1lc3NhZ2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVDZW50cmFsaXplZFJhdGVGb3JQcm9qZWN0KHByb2plY3RJZDogc3RyaW5nLCByYXRlSXRlbTogc3RyaW5nLCByYXRlSXRlbVJhdGU6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIG5ldyBDQ1Byb21pc2UoZnVuY3Rpb24gKHJlc29sdmU6IGFueSwgcmVqZWN0OiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ2NyZWF0ZVByb21pc2VGb3JSYXRlVXBkYXRlT2ZQcm9qZWN0UmF0ZXMgaGFzIGJlZW4gaGl0IGZvciBwcm9qZWN0SWQgOiAnICsgcHJvamVjdElkICsgJywgcmF0ZUl0ZW0gOiAnICsgcmF0ZUl0ZW0pO1xyXG4gICAgICAvL3VwZGF0ZSByYXRlXHJcbiAgICAgIGxldCBwcm9qZWN0UmVwb3NpdG9yeSA9IG5ldyBQcm9qZWN0UmVwb3NpdG9yeSgpO1xyXG4gICAgICBsZXQgcXVlcnlVcGRhdGVSYXRlRm9yUHJvamVjdCA9IHsnX2lkJzogcHJvamVjdElkLCAncmF0ZXMuaXRlbU5hbWUnOiByYXRlSXRlbX07XHJcbiAgICAgIGxldCB1cGRhdGVSYXRlRm9yUHJvamVjdCA9IHskc2V0OiB7J3JhdGVzLiQucmF0ZSc6IHJhdGVJdGVtUmF0ZX19O1xyXG4gICAgICBwcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5VXBkYXRlUmF0ZUZvclByb2plY3QsIHVwZGF0ZVJhdGVGb3JQcm9qZWN0LCB7bmV3OiB0cnVlfSwgKGVycm9yOiBFcnJvciwgcmVzdWx0OiBQcm9qZWN0KSA9PiB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnUmF0ZSBVcGRhdGVkIGZvciBQcm9qZWN0IHJhdGVzJyk7XHJcbiAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdQcm9taXNlIGZhaWxlZCBmb3IgaW5kaXZpZHVhbCBjcmVhdGVQcm9taXNlRm9yUmF0ZVVwZGF0ZU9mUHJvamVjdFJhdGVzICEgRXJyb3I6ICcgKyBKU09OLnN0cmluZ2lmeShlLm1lc3NhZ2UpKTtcclxuICAgICAgQ0NQcm9taXNlLnJlamVjdChlLm1lc3NhZ2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBhZGRBdHRhY2htZW50VG9Xb3JrSXRlbShwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrSXRlbUlkOiBudW1iZXIsZmlsZURhdGE6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG5cclxuICAgICAgdGhpcy5hZGRBdHRhY2htZW50KGZpbGVEYXRhLCAoZXJyb3I6IGFueSwgYXR0YWNobWVudE9iamVjdDogQXR0YWNobWVudERldGFpbHNNb2RlbCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHByb2plY3Rpb24gPSB7Y29zdEhlYWRzOiAxfTtcclxuICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZFdpdGhQcm9qZWN0aW9uKGJ1aWxkaW5nSWQsIHByb2plY3Rpb24sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgICAgICBsZXQgY29zdEhlYWRzID0gdGhpcy51cGxvYWRGaWxlKGNvc3RIZWFkTGlzdCwgY29zdEhlYWRJZCwgY2F0ZWdvcnlJZCwgd29ya0l0ZW1JZCwgYXR0YWNobWVudE9iamVjdCk7XHJcbiAgICAgICAgICAgIGxldCBxdWVyeSA9IHtfaWQ6IGJ1aWxkaW5nSWR9O1xyXG4gICAgICAgICAgICBsZXQgdXBkYXRlRGF0YSA9IHskc2V0OiB7J2Nvc3RIZWFkcyc6IGNvc3RIZWFkc319O1xyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCByZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnfSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBhZGRBdHRhY2htZW50KGZpbGVEYXRhOiBhbnksIGNhbGxiYWNrIDooZXJyb3I6IGFueSwgcmVzdWx0IDphbnkpID0+IHZvaWQpIHtcclxuICAgIF9fZGlybmFtZSA9IHBhdGgucmVzb2x2ZSgpICsgY29uZmlnLmdldCgnYXBwbGljYXRpb24uYXR0YWNobWVudFBhdGgnKTtcclxuICAgIGxldCBmb3JtID0gbmV3IG11bHRpcGFydHkuRm9ybSh7dXBsb2FkRGlyOiBfX2Rpcm5hbWV9KTtcclxuICAgIGZvcm0ucGFyc2UoZmlsZURhdGEsIChlcnI6IEVycm9yLCBmaWVsZHM6IGFueSwgZmlsZXM6IGFueSkgPT4ge1xyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgbGV0IGZpbGVfcGF0aCA9IGZpbGVzLmZpbGVbMF0ucGF0aDtcclxuICAgICAgICBsZXQgYXNzaWduZWRGaWxlTmFtZSA9IGZpbGVfcGF0aC5zdWJzdHIoZmlsZXMuZmlsZVswXS5wYXRoLmxhc3RJbmRleE9mKCdcXC8nKSArIDEpO1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdBdHRhY2hlZCBhc3NpZ25lZCBmaWxlTmFtZSA6ICcrYXNzaWduZWRGaWxlTmFtZSk7XHJcblxyXG4gICAgICAgIGxldCBhdHRhY2htZW50T2JqZWN0OiBBdHRhY2htZW50RGV0YWlsc01vZGVsID0gbmV3IEF0dGFjaG1lbnREZXRhaWxzTW9kZWwoKTtcclxuICAgICAgICBhdHRhY2htZW50T2JqZWN0LmZpbGVOYW1lID0gZmlsZXMuZmlsZVswXS5vcmlnaW5hbEZpbGVuYW1lO1xyXG4gICAgICAgIGF0dGFjaG1lbnRPYmplY3QuYXNzaWduZWRGaWxlTmFtZSA9IGFzc2lnbmVkRmlsZU5hbWU7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgYXR0YWNobWVudE9iamVjdCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBsb2FkRmlsZShjb3N0SGVhZExpc3Q6IEFycmF5PENvc3RIZWFkPiwgY29zdEhlYWRJZDogbnVtYmVyLCBjYXRlZ29yeUlkOiBudW1iZXIsIHdvcmtJdGVtSWQ6IG51bWJlcixcclxuICAgICAgICAgICAgIGF0dGFjaG1lbnRPYmplY3Q6IEF0dGFjaG1lbnREZXRhaWxzTW9kZWwpIHtcclxuICAgIGxldCBjb3N0SGVhZCA9IGNvc3RIZWFkTGlzdC5maWx0ZXIoZnVuY3Rpb24oY3VycmVudENvc3RIZWFkOiBDb3N0SGVhZCl7IHJldHVybiBjdXJyZW50Q29zdEhlYWQucmF0ZUFuYWx5c2lzSWQgPT09IGNvc3RIZWFkSWQ7IH0pO1xyXG4gICAgbGV0IGNhdGVnb3JpZXMgPSBjb3N0SGVhZFswXS5jYXRlZ29yaWVzO1xyXG4gICAgbGV0IGNhdGVnb3J5ID0gY2F0ZWdvcmllcy5maWx0ZXIoZnVuY3Rpb24gKGN1cnJlbnRDYXRlZ29yeTogQ2F0ZWdvcnkpIHsgcmV0dXJuIGN1cnJlbnRDYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCA9PT0gY2F0ZWdvcnlJZDsgfSk7XHJcbiAgICBsZXQgd29ya0l0ZW1zID0gY2F0ZWdvcnlbMF0ud29ya0l0ZW1zO1xyXG4gICAgbGV0IHdvcmtJdGVtID0gd29ya0l0ZW1zLmZpbHRlcihmdW5jdGlvbiAoY3VycmVudFdvcmtJdGVtOiBXb3JrSXRlbSkge1xyXG4gICAgICAgaWYoY3VycmVudFdvcmtJdGVtLnJhdGVBbmFseXNpc0lkID09PSB3b3JrSXRlbUlkKSB7XHJcbiAgICAgICAgY3VycmVudFdvcmtJdGVtLmF0dGFjaG1lbnREZXRhaWxzLnB1c2goYXR0YWNobWVudE9iamVjdCk7XHJcbiAgICAgICB9XHJcbiAgICAgICByZXR1cm47XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBjb3N0SGVhZExpc3Q7XHJcbiAgfVxyXG5cclxuICBnZXRQcmVzZW50RmlsZXNGb3JCdWlsZGluZ1dvcmtJdGVtKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1JZDogbnVtYmVyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRQcmVzZW50RmlsZXNGb3JCdWlsZGluZ1dvcmtJdGVtIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHByb2plY3Rpb24gPSB7IGNvc3RIZWFkcyA6IDEgfTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkV2l0aFByb2plY3Rpb24oYnVpbGRpbmdJZCwgcHJvamVjdGlvbiwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkTGlzdCA9IGJ1aWxkaW5nLmNvc3RIZWFkcztcclxuICAgICAgIGxldCBhdHRhY2htZW50TGlzdCA9IHRoaXMuZ2V0UHJlc2VudEZpbGVzKGNvc3RIZWFkTGlzdCwgY29zdEhlYWRJZCwgY2F0ZWdvcnlJZCwgd29ya0l0ZW1JZCk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCx7ZGF0YTphdHRhY2htZW50TGlzdH0pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0UHJlc2VudEZpbGVzKGNvc3RIZWFkTGlzdDogQXJyYXk8Q29zdEhlYWQ+LCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgd29ya0l0ZW1JZDogbnVtYmVyKSB7XHJcblxyXG4gICAgbGV0IGF0dGFjaG1lbnRMaXN0ID0gbmV3IEFycmF5PEF0dGFjaG1lbnREZXRhaWxzTW9kZWw+KCk7XHJcbiAgICBsZXQgY29zdEhlYWQgPSBjb3N0SGVhZExpc3QuZmlsdGVyKGZ1bmN0aW9uKGN1cnJlbnRDb3N0SGVhZDogQ29zdEhlYWQpeyByZXR1cm4gY3VycmVudENvc3RIZWFkLnJhdGVBbmFseXNpc0lkID09PSBjb3N0SGVhZElkOyB9KTtcclxuICAgIGxldCBjYXRlZ29yaWVzID0gY29zdEhlYWRbMF0uY2F0ZWdvcmllcztcclxuICAgIGxldCBjYXRlZ29yeSA9IGNhdGVnb3JpZXMuZmlsdGVyKGZ1bmN0aW9uIChjdXJyZW50Q2F0ZWdvcnk6IENhdGVnb3J5KSB7IHJldHVybiBjdXJyZW50Q2F0ZWdvcnkucmF0ZUFuYWx5c2lzSWQgPT09IGNhdGVnb3J5SWQ7IH0pO1xyXG4gICAgbGV0IHdvcmtJdGVtcyA9IGNhdGVnb3J5WzBdLndvcmtJdGVtcztcclxuICAgIGxldCB3b3JrSXRlbSA9IHdvcmtJdGVtcy5maWx0ZXIoZnVuY3Rpb24gKGN1cnJlbnRXb3JrSXRlbTogV29ya0l0ZW0pIHsgcmV0dXJuIGN1cnJlbnRXb3JrSXRlbS5yYXRlQW5hbHlzaXNJZCA9PT0gd29ya0l0ZW1JZDsgfSk7XHJcbiAgICBhdHRhY2htZW50TGlzdCA9IHdvcmtJdGVtWzBdLmF0dGFjaG1lbnREZXRhaWxzO1xyXG4gICAgcmV0dXJuIGF0dGFjaG1lbnRMaXN0O1xyXG4gIH1cclxuXHJcbiAgcmVtb3ZlQXR0YWNobWVudE9mQnVpbGRpbmdXb3JrSXRlbShwcm9qZWN0SWQ6IHN0cmluZywgYnVpbGRpbmdJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6IG51bWJlciwgYXNzaWduZWRGaWxlTmFtZTogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCByZW1vdmVBdHRhY2htZW50T2ZCdWlsZGluZ1dvcmtJdGVtIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHByb2plY3Rpb24gPSB7IGNvc3RIZWFkcyA6IDEgfTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkV2l0aFByb2plY3Rpb24oYnVpbGRpbmdJZCwgcHJvamVjdGlvbiwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkTGlzdCA9IGJ1aWxkaW5nLmNvc3RIZWFkcztcclxuICAgICAgICB0aGlzLmRlbGV0ZUZpbGUoY29zdEhlYWRMaXN0LCBjb3N0SGVhZElkLCBjYXRlZ29yeUlkLCB3b3JrSXRlbUlkLCBhc3NpZ25lZEZpbGVOYW1lKTtcclxuXHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0geyBfaWQgOiBidWlsZGluZ0lkIH07XHJcbiAgICAgICAgbGV0IGRhdGEgPSB7ICRzZXQgOiB7J2Nvc3RIZWFkcycgOiBidWlsZGluZy5jb3N0SGVhZHMgfX07XHJcbiAgICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgZGF0YSx7bmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBmcy51bmxpbmsoJy4nKyBjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5hdHRhY2htZW50UGF0aCcpKycvJysgYXNzaWduZWRGaWxlTmFtZSwgKGVycjpFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YSA6J3N1Y2Nlc3MnfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcblxyXG4gIGRlbGV0ZUZpbGUoY29zdEhlYWRMaXN0OiBhbnksIGNvc3RIZWFkSWQ6IG51bWJlciwgY2F0ZWdvcnlJZDogbnVtYmVyLCB3b3JrSXRlbUlkOiBudW1iZXIsIGFzc2lnbmVkRmlsZU5hbWU6IGFueSkge1xyXG5cclxuICAgIGxldCBjb3N0SGVhZCA9IGNvc3RIZWFkTGlzdC5maWx0ZXIoZnVuY3Rpb24oY3VycmVudENvc3RIZWFkOiBDb3N0SGVhZCl7IHJldHVybiBjdXJyZW50Q29zdEhlYWQucmF0ZUFuYWx5c2lzSWQgPT09IGNvc3RIZWFkSWQ7IH0pO1xyXG4gICAgbGV0IGNhdGVnb3JpZXMgPSBjb3N0SGVhZFswXS5jYXRlZ29yaWVzO1xyXG4gICAgbGV0IGNhdGVnb3J5ID0gY2F0ZWdvcmllcy5maWx0ZXIoZnVuY3Rpb24gKGN1cnJlbnRDYXRlZ29yeTogQ2F0ZWdvcnkpIHsgcmV0dXJuIGN1cnJlbnRDYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCA9PT0gY2F0ZWdvcnlJZDsgfSk7XHJcbiAgICBsZXQgd29ya0l0ZW1zID0gY2F0ZWdvcnlbMF0ud29ya0l0ZW1zO1xyXG4gICAgbGV0IHdvcmtJdGVtID0gd29ya0l0ZW1zLmZpbHRlcihmdW5jdGlvbiAoY3VycmVudFdvcmtJdGVtOiBXb3JrSXRlbSkge1xyXG4gICAgICBpZihjdXJyZW50V29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQgPT09IHdvcmtJdGVtSWQpIHtcclxuICAgICAgICBsZXQgYXR0YWNobWVudExpc3QgPSBjdXJyZW50V29ya0l0ZW0uYXR0YWNobWVudERldGFpbHM7XHJcbiAgICAgICAgZm9yIChsZXQgZmlsZUluZGV4IGluIGF0dGFjaG1lbnRMaXN0KSB7XHJcbiAgICAgICAgICBpZiAoYXR0YWNobWVudExpc3RbZmlsZUluZGV4XS5hc3NpZ25lZEZpbGVOYW1lID09PSBhc3NpZ25lZEZpbGVOYW1lKSB7XHJcbiAgICAgICAgICAgIGF0dGFjaG1lbnRMaXN0LnNwbGljZShwYXJzZUludChmaWxlSW5kZXgpLCAxKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYWRkQXR0YWNobWVudFRvUHJvamVjdFdvcmtJdGVtKHByb2plY3RJZDogc3RyaW5nLCBjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1JZDogbnVtYmVyLGZpbGVEYXRhOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIHRoaXMuYWRkQXR0YWNobWVudChmaWxlRGF0YSwgKGVycm9yOiBhbnksIGF0dGFjaG1lbnRPYmplY3Q6IEF0dGFjaG1lbnREZXRhaWxzTW9kZWwpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBwcm9qZWN0aW9uID0ge3Byb2plY3RDb3N0SGVhZHM6IDF9O1xyXG4gICAgICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZEJ5SWRXaXRoUHJvamVjdGlvbihwcm9qZWN0SWQsIHByb2plY3Rpb24sIChlcnJvciwgcHJvamVjdCkgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCBjb3N0SGVhZExpc3QgPSBwcm9qZWN0LnByb2plY3RDb3N0SGVhZHM7XHJcbiAgICAgICAgICAgIGxldCBwcm9qZWN0Q29zdEhlYWRzID0gdGhpcy51cGxvYWRGaWxlKGNvc3RIZWFkTGlzdCwgY29zdEhlYWRJZCwgY2F0ZWdvcnlJZCwgd29ya0l0ZW1JZCwgYXR0YWNobWVudE9iamVjdCk7XHJcbiAgICAgICAgICAgIGxldCBxdWVyeSA9IHtfaWQ6IHByb2plY3RJZH07XHJcbiAgICAgICAgICAgIGxldCB1cGRhdGVEYXRhID0geyRzZXQgOiB7J3Byb2plY3RDb3N0SGVhZHMnIDogcHJvamVjdENvc3RIZWFkc319O1xyXG4gICAgICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiAnc3VjY2Vzcyd9KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldFByZXNlbnRGaWxlc0ZvclByb2plY3RXb3JrSXRlbShwcm9qZWN0SWQ6IHN0cmluZyxjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1JZDogbnVtYmVyLGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldFByZXNlbnRGaWxlc0ZvclByb2plY3RXb3JrSXRlbSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBwcm9qZWN0aW9uID0geyBwcm9qZWN0Q29zdEhlYWRzIDogMSB9O1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQnlJZFdpdGhQcm9qZWN0aW9uKHByb2plY3RJZCwgcHJvamVjdGlvbiwgKGVycm9yLCBwcm9qZWN0KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBhdHRhY2htZW50TGlzdCA9IHRoaXMuZ2V0UHJlc2VudEZpbGVzKGNvc3RIZWFkTGlzdCwgY29zdEhlYWRJZCwgY2F0ZWdvcnlJZCwgd29ya0l0ZW1JZCk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCx7ZGF0YTphdHRhY2htZW50TGlzdH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHJlbW92ZUF0dGFjaG1lbnRPZlByb2plY3RXb3JrSXRlbShwcm9qZWN0SWQ6IHN0cmluZywgY29zdEhlYWRJZDogbnVtYmVyLCBjYXRlZ29yeUlkOiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6IG51bWJlciwgYXNzaWduZWRGaWxlTmFtZTogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCByZW1vdmVBdHRhY2htZW50T2ZQcm9qZWN0V29ya0l0ZW0gaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcHJvamVjdGlvbiA9IHsgcHJvamVjdENvc3RIZWFkcyA6IDEgfTtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZEJ5SWRXaXRoUHJvamVjdGlvbihwcm9qZWN0SWQsIHByb2plY3Rpb24sIChlcnJvciwgcHJvamVjdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkTGlzdCA9IHByb2plY3QucHJvamVjdENvc3RIZWFkcztcclxuICAgICAgICB0aGlzLmRlbGV0ZUZpbGUoY29zdEhlYWRMaXN0LCBjb3N0SGVhZElkLCBjYXRlZ29yeUlkLCB3b3JrSXRlbUlkLCBhc3NpZ25lZEZpbGVOYW1lKTtcclxuXHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0geyBfaWQgOiBwcm9qZWN0SWQgfTtcclxuICAgICAgICBsZXQgZGF0YSA9IHsgJHNldCA6IHsncHJvamVjdENvc3RIZWFkcycgOiBwcm9qZWN0LnByb2plY3RDb3N0SGVhZHMgfX07XHJcbiAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBkYXRhLHtuZXc6IHRydWV9LCAoZXJyb3IsIHByb2plY3QpID0+IHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZnMudW5saW5rKCcuJysgY29uZmlnLmdldCgnYXBwbGljYXRpb24uYXR0YWNobWVudFBhdGgnKSsnLycrIGFzc2lnbmVkRmlsZU5hbWUsIChlcnI6RXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGEgOidzdWNjZXNzJ30pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG5cclxuICBwcml2YXRlIGNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudDogbnVtYmVyLCBjb3N0SGVhZEZyb21SYXRlQW5hbHlzaXM6IGFueSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkaW5nRGF0YTogYW55LCBjb3N0SGVhZHM6IEFycmF5PENvc3RIZWFkPikge1xyXG4gICAgaWYgKGJ1ZGdldGVkQ29zdEFtb3VudCA+PSAwKSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkIGhhcyBiZWVuIGhpdCcpO1xyXG5cclxuICAgICAgbGV0IGNvc3RIZWFkOiBDb3N0SGVhZCA9IGNvc3RIZWFkRnJvbVJhdGVBbmFseXNpcztcclxuICAgICAgY29zdEhlYWQuYnVkZ2V0ZWRDb3N0QW1vdW50ID0gYnVkZ2V0ZWRDb3N0QW1vdW50O1xyXG4gICAgICBsZXQgdGh1bWJSdWxlUmF0ZSA9IG5ldyBUaHVtYlJ1bGVSYXRlKCk7XHJcblxyXG4gICAgICB0aHVtYlJ1bGVSYXRlLnNhbGVhYmxlQXJlYSA9IHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmF0ZUZvckFyZWEoYnVkZ2V0ZWRDb3N0QW1vdW50LCBidWlsZGluZ0RhdGEudG90YWxTYWxlYWJsZUFyZWFPZlVuaXQpO1xyXG4gICAgICB0aHVtYlJ1bGVSYXRlLnNsYWJBcmVhID0gdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSYXRlRm9yQXJlYShidWRnZXRlZENvc3RBbW91bnQsIGJ1aWxkaW5nRGF0YS50b3RhbFNsYWJBcmVhKTtcclxuICAgICAgdGh1bWJSdWxlUmF0ZS5jYXJwZXRBcmVhID0gdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSYXRlRm9yQXJlYShidWRnZXRlZENvc3RBbW91bnQsIGJ1aWxkaW5nRGF0YS50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG5cclxuICAgICAgY29zdEhlYWQudGh1bWJSdWxlUmF0ZSA9IHRodW1iUnVsZVJhdGU7XHJcbiAgICAgIGNvc3RIZWFkcy5wdXNoKGNvc3RIZWFkKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudDogbnVtYmVyLCBjb3N0SGVhZEZyb21SYXRlQW5hbHlzaXM6IGFueSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0RGV0YWlsczogYW55LCBjb3N0SGVhZHM6IEFycmF5PENvc3RIZWFkPikge1xyXG4gICAgaWYgKGJ1ZGdldGVkQ29zdEFtb3VudCA+PSAwKSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZCBoYXMgYmVlbiBoaXQnKTtcclxuXHJcbiAgICAgIGxldCBjYWxjdWxhdGVQcm9qZWN0RGF0YSA9ICdTRUxFQ1QgUk9VTkQoU1VNKGJ1aWxkaW5nLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCksMikgQVMgdG90YWxDYXJwZXRBcmVhLCAnICtcclxuICAgICAgICAnUk9VTkQoU1VNKGJ1aWxkaW5nLnRvdGFsU2xhYkFyZWEpLDIpIEFTIHRvdGFsU2xhYkFyZWFQcm9qZWN0LCcgK1xyXG4gICAgICAgICdST1VORChTVU0oYnVpbGRpbmcudG90YWxTYWxlYWJsZUFyZWFPZlVuaXQpLDIpIEFTIHRvdGFsU2FsZWFibGVBcmVhICBGUk9NID8gQVMgYnVpbGRpbmcnO1xyXG4gICAgICBsZXQgcHJvamVjdERhdGEgPSBhbGFzcWwoY2FsY3VsYXRlUHJvamVjdERhdGEsIFtwcm9qZWN0RGV0YWlscy5idWlsZGluZ3NdKTtcclxuICAgICAgbGV0IHRvdGFsU2xhYkFyZWFPZlByb2plY3Q6IG51bWJlciA9IHByb2plY3REYXRhWzBdLnRvdGFsU2xhYkFyZWFQcm9qZWN0O1xyXG4gICAgICBsZXQgdG90YWxTYWxlYWJsZUFyZWFPZlByb2plY3Q6IG51bWJlciA9IHByb2plY3REYXRhWzBdLnRvdGFsU2FsZWFibGVBcmVhO1xyXG4gICAgICBsZXQgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0OiBudW1iZXIgPSBwcm9qZWN0RGF0YVswXS50b3RhbENhcnBldEFyZWE7XHJcblxyXG4gICAgICBsZXQgY29zdEhlYWQ6IENvc3RIZWFkID0gY29zdEhlYWRGcm9tUmF0ZUFuYWx5c2lzO1xyXG4gICAgICBjb3N0SGVhZC5idWRnZXRlZENvc3RBbW91bnQgPSBidWRnZXRlZENvc3RBbW91bnQ7XHJcbiAgICAgIGxldCB0aHVtYlJ1bGVSYXRlID0gbmV3IFRodW1iUnVsZVJhdGUoKTtcclxuXHJcbiAgICAgIHRodW1iUnVsZVJhdGUuc2FsZWFibGVBcmVhID0gdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSYXRlRm9yQXJlYShidWRnZXRlZENvc3RBbW91bnQsIHRvdGFsU2FsZWFibGVBcmVhT2ZQcm9qZWN0KTtcclxuICAgICAgdGh1bWJSdWxlUmF0ZS5zbGFiQXJlYSA9IHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmF0ZUZvckFyZWEoYnVkZ2V0ZWRDb3N0QW1vdW50LCB0b3RhbFNsYWJBcmVhT2ZQcm9qZWN0KTtcclxuICAgICAgdGh1bWJSdWxlUmF0ZS5jYXJwZXRBcmVhID0gdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSYXRlRm9yQXJlYShidWRnZXRlZENvc3RBbW91bnQsIHRvdGFsQ2FycGV0QXJlYU9mUHJvamVjdCk7XHJcblxyXG4gICAgICBjb3N0SGVhZC50aHVtYlJ1bGVSYXRlID0gdGh1bWJSdWxlUmF0ZTtcclxuICAgICAgY29zdEhlYWRzLnB1c2goY29zdEhlYWQpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjYWxjdWxhdGVUaHVtYlJ1bGVSYXRlRm9yQXJlYShidWRnZXRlZENvc3RBbW91bnQ6IG51bWJlciwgYXJlYTogbnVtYmVyKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjYWxjdWxhdGVUaHVtYlJ1bGVSYXRlRm9yQXJlYSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBidWRnZXRDb3N0UmF0ZXMgPSBuZXcgQnVkZ2V0Q29zdFJhdGVzKCk7XHJcbiAgICBidWRnZXRDb3N0UmF0ZXMuc3FmdCA9IChidWRnZXRlZENvc3RBbW91bnQgLyBhcmVhKTtcclxuICAgIGJ1ZGdldENvc3RSYXRlcy5zcW10ID0gKGJ1ZGdldENvc3RSYXRlcy5zcWZ0ICogY29uZmlnLmdldChDb25zdGFudHMuU1FVQVJFX01FVEVSKSk7XHJcbiAgICByZXR1cm4gYnVkZ2V0Q29zdFJhdGVzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjbG9uZWRXb3JraXRlbVdpdGhSYXRlQW5hbHlzaXMod29ya0l0ZW06V29ya0l0ZW0sIHdvcmtJdGVtQWdncmVnYXRlRGF0YTogYW55KSB7XHJcblxyXG4gICAgZm9yKGxldCBhZ2dyZWdhdGVEYXRhIG9mIHdvcmtJdGVtQWdncmVnYXRlRGF0YSkge1xyXG4gICAgICBpZih3b3JrSXRlbS5yYXRlQW5hbHlzaXNJZCA9PT0gYWdncmVnYXRlRGF0YS53b3JrSXRlbS5yYXRlQW5hbHlzaXNJZCl7XHJcbiAgICAgICAgd29ya0l0ZW0ucmF0ZSA9IGFnZ3JlZ2F0ZURhdGEud29ya0l0ZW0ucmF0ZTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuT2JqZWN0LnNlYWwoUHJvamVjdFNlcnZpY2UpO1xyXG5leHBvcnQgPSBQcm9qZWN0U2VydmljZTtcclxuIl19
