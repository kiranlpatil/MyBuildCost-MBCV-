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
var RateAnalysisService = require("./RateAnalysisService");
var Category = require("../dataaccess/model/project/building/Category");
var config = require('config');
var log4js = require('log4js');
var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;
var alasql = require("alasql");
var BudgetCostRates = require("../dataaccess/model/project/reports/BudgetCostRates");
var ThumbRuleRate = require("../dataaccess/model/project/reports/ThumbRuleRate");
var Constants = require("../../applicationProject/shared/constants");
var CategoriesListWithRatesDTO = require("../dataaccess/dto/project/CategoriesListWithRatesDTO");
var CentralizedRate = require("../dataaccess/model/project/CentralizedRate");
var messages = require("../../applicationProject/shared/messages");
var CommonService_1 = require("../../applicationProject/shared/CommonService");
var WorkItemListWithRatesDTO = require("../dataaccess/dto/project/WorkItemListWithRatesDTO");
var CCPromise = require('promise/lib/es6-extensions');
var logger = log4js.getLogger('Project service');
var ProjectService = (function () {
    function ProjectService() {
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
        this.projectRepository.create(data, function (err, res) {
            if (err) {
                callback(err, null);
            }
            else {
                logger.info('Project service, create has been hit');
                logger.debug('Project ID : ' + res._id);
                logger.debug('Project Name : ' + res.name);
                var projectId = res._id;
                var newData = { $push: { project: projectId } };
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
    ProjectService.prototype.getProjectAndBuildingDetails = function (projectId, buildingId, callback) {
        logger.info('Project service, getProjectAndBuildingDetails for sync with rateAnalysis has been hit');
        var query = { _id: projectId };
        var populate = { path: 'buildings' };
        this.projectRepository.findAndPopulate(query, populate, function (error, result) {
            logger.info('Project service, findAndPopulate has been hit');
            logger.debug('Project Name : ' + result[0].name);
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
        delete projectDetails._id;
        this.projectRepository.findOneAndUpdate(query, projectDetails, { new: true }, function (error, result) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: result, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.createBuilding = function (projectId, buildingDetails, user, callback) {
        var _this = this;
        this.buildingRepository.create(buildingDetails, function (error, result) {
            logger.info('Project service, create has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var query = { _id: projectId };
                var newData = { $push: { buildings: result._id } };
                _this.projectRepository.findOneAndUpdate(query, newData, { new: true }, function (error, status) {
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
    ProjectService.prototype.updateBuildingById = function (buildingId, buildingDetails, user, callback) {
        var _this = this;
        logger.info('Project service, updateBuilding has been hit');
        var query = { _id: buildingId };
        this.buildingRepository.findOneAndUpdate(query, buildingDetails, { new: true }, function (error, result) {
            logger.info('Project service, findOneAndUpdate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: result, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ProjectService.prototype.cloneBuildingDetails = function (buildingId, buildingDetails, user, callback) {
        var _this = this;
        logger.info('Project service, cloneBuildingDetails has been hit');
        var query = { _id: buildingId };
        this.buildingRepository.findById(buildingId, function (error, result) {
            logger.info('Project service, findById has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var clonedCostHeadDetails = [];
                var costHeads = buildingDetails.costHeads;
                var resultCostHeads = result.costHeads;
                for (var _i = 0, costHeads_1 = costHeads; _i < costHeads_1.length; _i++) {
                    var costHead = costHeads_1[_i];
                    for (var _a = 0, resultCostHeads_1 = resultCostHeads; _a < resultCostHeads_1.length; _a++) {
                        var resultCostHead = resultCostHeads_1[_a];
                        if (costHead.name === resultCostHead.name) {
                            var clonedCostHead = new CostHead;
                            clonedCostHead.name = resultCostHead.name;
                            clonedCostHead.rateAnalysisId = resultCostHead.rateAnalysisId;
                            clonedCostHead.active = costHead.active;
                            clonedCostHead.thumbRuleRate = resultCostHead.thumbRuleRate;
                            if (costHead.active) {
                                var categoryList = costHead.category;
                                var resultCategoryList = resultCostHead.categories;
                                for (var resultCategoryIndex = 0; resultCategoryIndex < resultCategoryList.length; resultCategoryIndex++) {
                                    for (var categoryIndex = 0; categoryIndex < categoryList.length; categoryIndex++) {
                                        if (categoryList[categoryIndex].name === resultCategoryList[resultCategoryIndex].name) {
                                            if (!categoryList[categoryIndex].active) {
                                                resultCategoryList.splice(resultCategoryIndex, 1);
                                            }
                                            else {
                                                var resultWorkitemList = resultCategoryList[resultCategoryIndex].workItems;
                                                var workItemList = categoryList[categoryIndex].workItems;
                                                for (var resultWorkitemIndex = 0; resultWorkitemIndex < resultWorkitemList.length; resultWorkitemIndex++) {
                                                    for (var workitemIndex = 0; workitemIndex < workItemList.length; workitemIndex++) {
                                                        if (!workItemList[workitemIndex].active) {
                                                            resultWorkitemList.splice(resultWorkitemIndex, 1);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                clonedCostHead.categories = resultCostHead.categories;
                            }
                            else {
                                clonedCostHead.categories = resultCostHead.categories;
                            }
                            clonedCostHeadDetails.push(clonedCostHead);
                        }
                    }
                }
                var updateBuildingCostHeads = { 'costHeads': clonedCostHeadDetails };
                _this.buildingRepository.findOneAndUpdate(query, updateBuildingCostHeads, { new: true }, function (error, result) {
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
                callback(null, { data: inActiveWorkItemsListWithBuildingRates.workItems, access_token: _this.authInterceptor.issueTokenWithUid(user) });
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
                callback(null, { data: inActiveWorkItemsListWithProjectRates.workItems, access_token: _this.authInterceptor.issueTokenWithUid(user) });
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
                building.costHeads = result.costHeads;
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
        this.buildingRepository.findById(buildingId, function (error, building) {
            logger.info('Project service, findById has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var costHeads = building.costHeads;
                var centralizedRates_1 = building.rates;
                for (var _i = 0, costHeads_2 = costHeads; _i < costHeads_2.length; _i++) {
                    var costHeadData = costHeads_2[_i];
                    if (costHeadData.rateAnalysisId === costHeadId) {
                        for (var _a = 0, _b = costHeadData.categories; _a < _b.length; _a++) {
                            var categoryData = _b[_a];
                            if (categoryData.rateAnalysisId === categoryId) {
                                for (var _c = 0, _d = categoryData.workItems; _c < _d.length; _c++) {
                                    var workItemData = _d[_c];
                                    if (workItemData.rateAnalysisId === workItemId) {
                                        workItemData.rate = rate;
                                        workItemData.rate.isEstimated = true;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                        break;
                    }
                }
                var query = { '_id': buildingId };
                var newData = { $set: { 'costHeads': costHeads } };
                _this.buildingRepository.findOneAndUpdate(query, newData, { new: true }, function (error, result) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        if (result) {
                            console.log('building CostHeads Updated');
                            var rateItems = rate.rateItems;
                            var promiseArrayForUpdateBuildingCentralizedRates = [];
                            for (var _i = 0, rateItems_1 = rateItems; _i < rateItems_1.length; _i++) {
                                var rate_1 = rateItems_1[_i];
                                var rateObjectExistSQL = "SELECT * FROM ? AS rates WHERE rates.itemName= '" + rate_1.itemName + "'";
                                var rateExistArray = alasql(rateObjectExistSQL, [centralizedRates_1]);
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
                                    logger.error(' Promise failed for convertCostHeadsFromRateAnalysisToCostControl ! :' + JSON.stringify(e));
                                    CCPromise.reject(e);
                                });
                            }
                            else {
                                callback(null, { 'data': 'success' });
                            }
                        }
                    }
                });
            }
        });
    };
    ProjectService.prototype.updateRateOfProjectCostHeads = function (projectId, costHeadId, categoryId, workItemId, rate, user, callback) {
        var _this = this;
        logger.info('Project service, Update rate of project cost heads has been hit');
        this.projectRepository.findById(projectId, function (error, project) {
            logger.info('Project service, findById has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var projectCostHeads = project.projectCostHeads;
                var centralizedRatesOfProjects_1 = project.rates;
                for (var _i = 0, projectCostHeads_1 = projectCostHeads; _i < projectCostHeads_1.length; _i++) {
                    var costHeadData = projectCostHeads_1[_i];
                    if (costHeadData.rateAnalysisId === costHeadId) {
                        for (var _a = 0, _b = costHeadData.categories; _a < _b.length; _a++) {
                            var categoryData = _b[_a];
                            if (categoryData.rateAnalysisId === categoryId) {
                                for (var _c = 0, _d = categoryData.workItems; _c < _d.length; _c++) {
                                    var workItemData = _d[_c];
                                    if (workItemData.rateAnalysisId === workItemId) {
                                        workItemData.rate = rate;
                                        workItemData.rate.isEstimated = true;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                        break;
                    }
                }
                var query = { '_id': projectId };
                var newData = { $set: { 'projectCostHeads': projectCostHeads } };
                _this.projectRepository.findOneAndUpdate(query, newData, { new: true }, function (error, result) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var rateItems = rate.rateItems;
                        var promiseArrayForProjectCentralizedRates = [];
                        for (var _i = 0, rateItems_2 = rateItems; _i < rateItems_2.length; _i++) {
                            var rate_2 = rateItems_2[_i];
                            var rateObjectExistSQL = "SELECT * FROM ? AS rates WHERE rates.itemName= '" + rate_2.itemName + "'";
                            var rateExistArray = alasql(rateObjectExistSQL, [centralizedRatesOfProjects_1]);
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
                                logger.error(' Promise failed for convertCostHeadsFromRateAnalysisToCostControl ! :' + JSON.stringify(e));
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
            }
        });
    };
    ProjectService.prototype.deleteQuantityOfBuildingCostHeadsByName = function (projectId, buildingId, costHeadId, categoryId, workItemId, itemName, user, callback) {
        var _this = this;
        logger.info('Project service, deleteQuantity has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var quantityItems = void 0;
                for (var _i = 0, _a = building.costHeads; _i < _a.length; _i++) {
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
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { _id: buildingId };
                var data = { $set: { 'costHeads': building.costHeads } };
                _this.buildingRepository.findOneAndUpdate(query, data, { new: true }, function (error, building) {
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
        this.projectRepository.findById(projectId, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var quantityItems = void 0;
                for (var _i = 0, _a = project.projectCostHeads; _i < _a.length; _i++) {
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
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { _id: projectId };
                var data = { $set: { 'projectCostHeads': project.projectCostHeads } };
                _this.projectRepository.findOneAndUpdate(query, data, { new: true }, function (error, project) {
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
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = building.costHeads;
                for (var _i = 0, costHeadList_3 = costHeadList; _i < costHeadList_3.length; _i++) {
                    var costHeadData = costHeadList_3[_i];
                    if (costHeadId === costHeadData.rateAnalysisId) {
                        for (var _a = 0, _b = costHeadData.categories; _a < _b.length; _a++) {
                            var categoryData = _b[_a];
                            if (categoryId === categoryData.rateAnalysisId) {
                                for (var _c = 0, _d = categoryData.workItems; _c < _d.length; _c++) {
                                    var workItemData = _d[_c];
                                    if (workItemId === workItemData.rateAnalysisId) {
                                        workItemData.active = workItemActiveStatus;
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { _id: buildingId };
                _this.buildingRepository.findOneAndUpdate(query, building, { new: true }, function (error, response) {
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
    ProjectService.prototype.updateWorkItemStatusOfProjectCostHeads = function (projectId, costHeadId, categoryId, workItemId, workItemActiveStatus, user, callback) {
        var _this = this;
        logger.info('Project service, Update WorkItem Status Of Project Cost Heads has been hit');
        this.projectRepository.findById(projectId, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = project.projectCostHeads;
                for (var _i = 0, costHeadList_4 = costHeadList; _i < costHeadList_4.length; _i++) {
                    var costHeadData = costHeadList_4[_i];
                    if (costHeadId === costHeadData.rateAnalysisId) {
                        for (var _a = 0, _b = costHeadData.categories; _a < _b.length; _a++) {
                            var categoryData = _b[_a];
                            if (categoryId === categoryData.rateAnalysisId) {
                                for (var _c = 0, _d = categoryData.workItems; _c < _d.length; _c++) {
                                    var workItemData = _d[_c];
                                    if (workItemId === workItemData.rateAnalysisId) {
                                        workItemData.active = workItemActiveStatus;
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { _id: projectId };
                _this.projectRepository.findOneAndUpdate(query, project, { new: true }, function (error, response) {
                    logger.info('Project service, Update WorkItem Status Of Project Cost Heads ,findOneAndUpdate has been hit');
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
    ProjectService.prototype.updateBudgetedCostForCostHead = function (buildingId, costHeadBudgetedAmount, user, callback) {
        var _this = this;
        logger.info('Project service, updateBudgetedCostForCostHead has been hit');
        var query = { '_id': buildingId, 'costHeads.name': costHeadBudgetedAmount.costHead };
        var newData = { $set: {
                'costHeads.$.budgetedCostAmount': costHeadBudgetedAmount.budgetedCostAmount,
            } };
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
        var newData = { $set: {
                'projectCostHeads.$.budgetedCostAmount': costHeadBudgetedAmount.budgetedCostAmount,
            } };
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
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = building.costHeads;
                var quantity = void 0;
                for (var _i = 0, costHeadList_5 = costHeadList; _i < costHeadList_5.length; _i++) {
                    var costHead = costHeadList_5[_i];
                    if (costHeadId === costHead.rateAnalysisId) {
                        var categoriesOfCostHead = costHead.categories;
                        for (var _a = 0, categoriesOfCostHead_1 = categoriesOfCostHead; _a < categoriesOfCostHead_1.length; _a++) {
                            var categoryData = categoriesOfCostHead_1[_a];
                            if (categoryId === categoryData.rateAnalysisId) {
                                for (var _b = 0, _c = categoryData.workItems; _b < _c.length; _b++) {
                                    var workItemData = _c[_b];
                                    if (workItemId === workItemData.rateAnalysisId) {
                                        quantity = workItemData.quantity;
                                        quantity.isEstimated = true;
                                        _this.updateQuantityItemsOfWorkItem(quantity, quantityDetail);
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { _id: buildingId };
                var data = { $set: { 'costHeads': costHeadList } };
                _this.buildingRepository.findOneAndUpdate(query, data, { new: true }, function (error, building) {
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
    ProjectService.prototype.updateQuantityItemsOfWorkItem = function (quantity, quantityDetail) {
        quantity.isEstimated = true;
        if (quantity.quantityItemDetails.length === 0) {
            quantityDetail.total = alasql('VALUE OF SELECT ROUND(SUM(quantity),2) FROM ?', [quantityDetail.quantityItems]);
            quantity.quantityItemDetails.push(quantityDetail);
        }
        else {
            var isDefaultExistsSQL = 'SELECT name from ? AS quantityDetails where quantityDetails.name="default"';
            var isDefaultExistsQuantityDetail = alasql(isDefaultExistsSQL, [quantity.quantityItemDetails]);
            if (isDefaultExistsQuantityDetail.length > 0) {
                quantity.quantityItemDetails = [];
                quantityDetail.total = alasql('VALUE OF SELECT ROUND(SUM(quantity),2) FROM ?', [quantityDetail.quantityItems]);
                quantity.quantityItemDetails.push(quantityDetail);
            }
            else {
                if (quantityDetail.name !== 'default') {
                    var isItemAlreadyExistSQL = 'SELECT name from ? AS quantityDetails where quantityDetails.name="' + quantityDetail.name + '"';
                    var isItemAlreadyExists = alasql(isItemAlreadyExistSQL, [quantity.quantityItemDetails]);
                    if (isItemAlreadyExists.length > 0) {
                        for (var quantityindex = 0; quantityindex < quantity.quantityItemDetails.length; quantityindex++) {
                            if (quantity.quantityItemDetails[quantityindex].name === quantityDetail.name) {
                                quantity.quantityItemDetails[quantityindex].quantityItems = quantityDetail.quantityItems;
                                quantity.quantityItemDetails[quantityindex].total = alasql('VALUE OF SELECT ROUND(SUM(quantity),2) FROM ?', [quantityDetail.quantityItems]);
                            }
                        }
                    }
                    else {
                        quantityDetail.total = alasql('VALUE OF SELECT ROUND(SUM(quantity),2) FROM ?', [quantityDetail.quantityItems]);
                        quantity.quantityItemDetails.push(quantityDetail);
                    }
                }
                else {
                    quantity.quantityItemDetails = [];
                    quantityDetail.total = alasql('VALUE OF SELECT ROUND(SUM(quantity),2) FROM ?', [quantityDetail.quantityItems]);
                    quantity.quantityItemDetails.push(quantityDetail);
                }
            }
        }
        quantity.total = alasql('VALUE OF SELECT ROUND(SUM(total),2) FROM ?', [quantity.quantityItemDetails]);
    };
    ProjectService.prototype.updateQuantityOfProjectCostHeads = function (projectId, costHeadId, categoryId, workItemId, quantityDetails, user, callback) {
        var _this = this;
        logger.info('Project service, Update Quantity Of Project Cost Heads has been hit');
        this.projectRepository.findById(projectId, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = project.projectCostHeads;
                var quantity = void 0;
                for (var _i = 0, costHeadList_6 = costHeadList; _i < costHeadList_6.length; _i++) {
                    var costHead = costHeadList_6[_i];
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
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { _id: projectId };
                var data = { $set: { 'projectCostHeads': costHeadList } };
                _this.projectRepository.findOneAndUpdate(query, data, { new: true }, function (error, project) {
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
                    callback(null, { data: workItemsListWithBuildingRates.workItems, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                }
                else {
                    var error_1 = new Error();
                    error_1.message = messages.MSG_ERROR_EMPTY_RESPONSE;
                    callback(error_1, null);
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
                    callback(null, { data: workItemsListWithRates.workItems, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                }
                else {
                    var error_2 = new Error();
                    error_2.message = messages.MSG_ERROR_EMPTY_RESPONSE;
                    callback(error_2, null);
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
                var totalOfAllRateItems = alasql('VALUE OF SELECT ROUND(SUM(totalAmount),2) FROM ?', [arrayOfRateItems]);
                workItem.rate.total = parseFloat((totalOfAllRateItems / workItem.rate.quantity).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
                var quantityItems = workItem.quantity.quantityItemDetails;
                workItem.quantity.total = alasql('VALUE OF SELECT ROUND(SUM(total),2) FROM ?', [quantityItems]);
                if (workItem.rate.isEstimated && workItem.quantity.isEstimated) {
                    workItem.amount = this.commonService.decimalConversion(workItem.rate.total * workItem.quantity.total);
                    workItemsListWithRates.workItemsAmount = workItemsListWithRates.workItemsAmount + workItem.amount;
                }
                workItemsListWithRates.workItems.push(workItem);
            }
        }
        return workItemsListWithRates;
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
                callback(null, { data: categoriesListWithCentralizedRates, access_token: _this.authInterceptor.issueTokenWithUid(user) });
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
                for (var _i = 0, projectCostHeads_2 = projectCostHeads; _i < projectCostHeads_2.length; _i++) {
                    var costHeadData = projectCostHeads_2[_i];
                    if (costHeadData.rateAnalysisId === costHeadId) {
                        categoriesListWithCentralizedRates = _this.getCategoriesListWithCentralizedRates(costHeadData.categories, project.rates);
                        break;
                    }
                }
                callback(null, { data: categoriesListWithCentralizedRates, access_token: _this.authInterceptor.issueTokenWithUid(user) });
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
            delete categoryData.workItems;
            categoriesListWithRates.categories.push(categoryData);
        }
        if (categoriesTotalAmount !== 0) {
            categoriesListWithRates.categoriesAmount = this.commonService.decimalConversion(categoriesTotalAmount);
        }
        return categoriesListWithRates;
    };
    ProjectService.prototype.syncProjectWithRateAnalysisData = function (projectId, buildingId, user, callback) {
        var _this = this;
        logger.info('Project service, syncProjectWithRateAnalysisData has been hit');
        this.getProjectAndBuildingDetails(projectId, buildingId, function (error, projectAndBuildingDetails) {
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
                        logger.error(' Promise failed for syncProjectWithRateAnalysisData ! :' + JSON.stringify(e));
                    });
                }
            }
        });
    };
    ProjectService.prototype.updateCostHeadsForBuildingAndProject = function (callback, projectData, buildingData, buildingId, projectId) {
        var _this = this;
        logger.info('updateCostHeadsForBuildingAndProject has been hit');
        var rateAnalysisService = new RateAnalysisService();
        var buildingRepository = new BuildingRepository();
        var projectRepository = new ProjectRepository();
        rateAnalysisService.convertCostHeadsFromRateAnalysisToCostControl(Constants.BUILDING, function (error, result) {
            if (error) {
                logger.error('Error in updateCostHeadsForBuildingAndProject : convertCostHeadsFromRateAnalysisToCostControl : ' + JSON.stringify(error));
                callback(error, null);
            }
            else {
                logger.info('GetAllDataFromRateAnalysis success');
                var projectService_1 = new ProjectService();
                var data = projectService_1.calculateBudgetCostForBuilding(result.buildingCostHeads, projectData, buildingData);
                var rates = _this.getRates(result, data);
                var queryForBuilding = { '_id': buildingId };
                var updateCostHead = { $set: { 'costHeads': data, 'rates': rates } };
                buildingRepository.findOneAndUpdate(queryForBuilding, updateCostHead, { new: true }, function (error, response) {
                    if (error) {
                        logger.error('Error in Update convertCostHeadsFromRateAnalysisToCostControl buildingCostHeadsData  : ' + JSON.stringify(error));
                        callback(error, null);
                    }
                    else {
                        logger.info('UpdateBuildingCostHead success');
                        var projectCostHeads = projectService_1.calculateBudgetCostForCommonAmmenities(projectData.projectCostHeads, projectData, buildingData);
                        var queryForProject = { '_id': projectId };
                        var updateProjectCostHead = { $set: { 'projectCostHeads': projectCostHeads } };
                        logger.info('Calling update project Costheads has been hit');
                        projectRepository.findOneAndUpdate(queryForProject, updateProjectCostHead, { new: true }, function (error, response) {
                            if (error) {
                                logger.err('Error update project Costheads : ' + JSON.stringify(error));
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
            rateAnalysisService.convertCostHeadsFromRateAnalysisToCostControl(entity, function (error, result) {
                if (error) {
                    logger.err('Error in promise updateBudgetRatesForBuildingCostHeads : ' + JSON.stringify(error));
                    reject(error);
                }
                else {
                    logger.info('Inside updateBudgetRatesForBuildingCostHeads success');
                    var projectService_2 = new ProjectService();
                    var buildingCostHeads = projectService_2.calculateBudgetCostForBuilding(result.buildingCostHeads, projectDetails, buildingDetails);
                    var rates = projectService_2.getRates(result, buildingCostHeads);
                    var query = { '_id': buildingId };
                    var newData = { $set: { 'costHeads': buildingCostHeads, 'rates': rates } };
                    buildingRepository.findOneAndUpdate(query, newData, { new: true }, function (error, response) {
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
            logger.error('Error in updateBudgetRatesForBuildingCostHeads :' + e);
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
    ProjectService.prototype.updateBudgetRatesForProjectCostHeads = function (entity, projectId, projectDetails, buildingDetails) {
        return new CCPromise(function (resolve, reject) {
            var rateAnalysisService = new RateAnalysisService();
            var projectRepository = new ProjectRepository();
            logger.info('Inside updateBudgetRatesForProjectCostHeads promise.');
            rateAnalysisService.convertCostHeadsFromRateAnalysisToCostControl(entity, function (error, result) {
                if (error) {
                    logger.err('Error in updateBudgetRatesForProjectCostHeads promise : ' + JSON.stringify(error));
                    reject(error);
                }
                else {
                    var projectService = new ProjectService();
                    var projectCostHeads = projectService.calculateBudgetCostForCommonAmmenities(result.buildingCostHeads, projectDetails, buildingDetails);
                    var rates = projectService.getRates(result, projectCostHeads);
                    var query = { '_id': projectId };
                    var newData = { $set: { 'projectCostHeads': projectCostHeads, 'rates': rates } };
                    projectRepository.findOneAndUpdate(query, newData, { new: true }, function (error, response) {
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
            logger.error('Error in updateBudgetRatesForProjectCostHeads :' + e);
        });
    };
    ProjectService.prototype.calculateBudgetCostForBuilding = function (costHeadsRateAnalysis, projectDetails, buildingDetails) {
        logger.info('Project service, calculateBudgetCostForBuilding has been hit');
        var costHeads = new Array();
        var budgetedCostAmount;
        var calculateBudgtedCost;
        for (var _i = 0, costHeadsRateAnalysis_1 = costHeadsRateAnalysis; _i < costHeadsRateAnalysis_1.length; _i++) {
            var costHead = costHeadsRateAnalysis_1[_i];
            var budgetCostFormulae = void 0;
            switch (costHead.name) {
                case Constants.RCC_BAND_OR_PATLI: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.SLAB_AREA, projectDetails.slabArea);
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
                case Constants.POINTING: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, buildingDetails.totalCarpetAreaOfUnit);
                    budgetedCostAmount = eval(calculateBudgtedCost);
                    this.calculateThumbRuleReportForCostHead(budgetedCostAmount, costHead, buildingDetails, costHeads);
                    break;
                }
                case Constants.KITCHEN_OTTA: {
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
                case Constants.GYPSUM_OR_POP_PLASTER: {
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
    ProjectService.prototype.calculateBudgetCostForCommonAmmenities = function (costHeadsRateAnalysis, projectDetails, buildingDetails) {
        logger.info('Project service, calculateBudgetCostForCommonAmmenities has been hit');
        var costHeads = new Array();
        var budgetedCostAmount;
        var budgetCostFormulae;
        var calculateBudgtedCost;
        var calculateProjectData = 'SELECT ROUND(SUM(building.totalCarpetAreaOfUnit),2) AS totalCarpetArea, ' +
            'ROUND(SUM(building.totalSlabArea),2) AS totalSlabAreaProject,' +
            'ROUND(SUM(building.totalSaleableAreaOfUnit),2) AS totalSaleableArea  FROM ? AS building';
        var projectData = alasql(calculateProjectData, [projectDetails.buildings]);
        var totalSlabAreaOfProject = projectData[0].totalSlabAreaProject;
        var totalSaleableAreaOfProject = projectData[0].totalSaleableArea;
        var totalCarpetAreaOfProject = projectData[0].totalCarpetArea;
        for (var _i = 0, costHeadsRateAnalysis_2 = costHeadsRateAnalysis; _i < costHeadsRateAnalysis_2.length; _i++) {
            var costHead = costHeadsRateAnalysis_2[_i];
            switch (costHead.name) {
                case Constants.SAFETY_MEASURES: {
                    budgetCostFormulae = config.get(Constants.BUDGETED_COST_FORMULAE + costHead.name).toString();
                    calculateBudgtedCost = budgetCostFormulae.replace(Constants.CARPET_AREA, totalCarpetAreaOfProject);
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
            logger.error('Promise failed for individual createPromiseForAddingNewRateItem! error :' + JSON.stringify(e));
            CCPromise.reject(e);
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
            logger.error('Promise failed for individual createPromiseForRateUpdate ! Error: ' + JSON.stringify(e));
            CCPromise.reject(e);
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
            logger.error('Promise failed for individual createPromiseForAddingNewRateItemInProjectRates ! error :' + JSON.stringify(e));
            CCPromise.reject(e);
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
            logger.error('Promise failed for individual createPromiseForRateUpdateOfProjectRates ! Error: ' + JSON.stringify(e));
            CCPromise.reject(e);
        });
    };
    ProjectService.prototype.calculateThumbRuleReportForCostHead = function (budgetedCostAmount, costHeadFromRateAnalysis, buildingData, costHeads) {
        if (budgetedCostAmount) {
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
        if (budgetedCostAmount) {
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
    return ProjectService;
}());
Object.seal(ProjectService);
module.exports = ProjectService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUHJvamVjdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDhFQUFpRjtBQUNqRixnRkFBbUY7QUFDbkYsb0VBQXVFO0FBQ3ZFLGtFQUFxRTtBQUlyRSw2RUFBZ0Y7QUFDaEYsOEVBQWlGO0FBQ2pGLDBFQUE2RTtBQUU3RSxnRUFBbUU7QUFDbkUsd0VBQTJFO0FBRTNFLDJEQUE4RDtBQUM5RCx3RUFBMkU7QUFFM0UsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixtQ0FBcUM7QUFDckMsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7QUFDdkMsK0JBQWtDO0FBQ2xDLHFGQUF3RjtBQUN4RixpRkFBb0Y7QUFDcEYscUVBQXdFO0FBSXhFLGlHQUFvRztBQUNwRyw2RUFBZ0Y7QUFDaEYsbUVBQXVFO0FBQ3ZFLCtFQUE4RTtBQUM5RSw2RkFBZ0c7QUFFaEcsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFDdEQsSUFBSSxNQUFNLEdBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRS9DO0lBWUU7UUFDRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ2pELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDbkQsSUFBSSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM3QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJ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RCxDQUFDLENBQUM7UUFDM0UsSUFBSSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM1QyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDbkQsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDO0lBQ3pCLENBQUM7SUFDSCxxQkFBQztBQUFELENBbnBEQSxBQW1wREMsSUFBQTtBQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDNUIsaUJBQVMsY0FBYyxDQUFDIiwiZmlsZSI6ImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUHJvamVjdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUHJvamVjdFJlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvUHJvamVjdFJlcG9zaXRvcnknKTtcclxuaW1wb3J0IEJ1aWxkaW5nUmVwb3NpdG9yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvcmVwb3NpdG9yeS9CdWlsZGluZ1JlcG9zaXRvcnknKTtcclxuaW1wb3J0IFVzZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi8uLi8uLi9mcmFtZXdvcmsvc2VydmljZXMvVXNlclNlcnZpY2UnKTtcclxuaW1wb3J0IFByb2plY3RBc3NldCA9IHJlcXVpcmUoJy4uLy4uL2ZyYW1ld29yay9zaGFyZWQvcHJvamVjdGFzc2V0Jyk7XHJcbmltcG9ydCBVc2VyID0gcmVxdWlyZSgnLi4vLi4vZnJhbWV3b3JrL2RhdGFhY2Nlc3MvbW9uZ29vc2UvdXNlcicpO1xyXG5pbXBvcnQgUHJvamVjdCA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9uZ29vc2UvUHJvamVjdCcpO1xyXG5pbXBvcnQgQnVpbGRpbmcgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vbmdvb3NlL0J1aWxkaW5nJyk7XHJcbmltcG9ydCBCdWlsZGluZ01vZGVsID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL0J1aWxkaW5nJyk7XHJcbmltcG9ydCBBdXRoSW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi8uLi9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvcicpO1xyXG5pbXBvcnQgQ29zdENvbnRyb2xsRXhjZXB0aW9uID0gcmVxdWlyZSgnLi4vZXhjZXB0aW9uL0Nvc3RDb250cm9sbEV4Y2VwdGlvbicpO1xyXG5pbXBvcnQgUXVhbnRpdHkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUXVhbnRpdHknKTtcclxuaW1wb3J0IFJhdGUgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUmF0ZScpO1xyXG5pbXBvcnQgQ29zdEhlYWQgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvQ29zdEhlYWQnKTtcclxuaW1wb3J0IFdvcmtJdGVtID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1dvcmtJdGVtJyk7XHJcbmltcG9ydCBSYXRlQW5hbHlzaXNTZXJ2aWNlID0gcmVxdWlyZSgnLi9SYXRlQW5hbHlzaXNTZXJ2aWNlJyk7XHJcbmltcG9ydCBDYXRlZ29yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9idWlsZGluZy9DYXRlZ29yeScpO1xyXG5pbXBvcnQgY29uc3RhbnQgPSByZXF1aXJlKCcuLi9zaGFyZWQvY29uc3RhbnRzJyk7XHJcbmxldCBjb25maWcgPSByZXF1aXJlKCdjb25maWcnKTtcclxubGV0IGxvZzRqcyA9IHJlcXVpcmUoJ2xvZzRqcycpO1xyXG5pbXBvcnQgKiBhcyBtb25nb29zZSBmcm9tICdtb25nb29zZSc7XHJcbmxldCBPYmplY3RJZCA9IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkO1xyXG5pbXBvcnQgYWxhc3FsID0gcmVxdWlyZSgnYWxhc3FsJyk7XHJcbmltcG9ydCBCdWRnZXRDb3N0UmF0ZXMgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9CdWRnZXRDb3N0UmF0ZXMnKTtcclxuaW1wb3J0IFRodW1iUnVsZVJhdGUgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9UaHVtYlJ1bGVSYXRlJyk7XHJcbmltcG9ydCBDb25zdGFudHMgPSByZXF1aXJlKCcuLi8uLi9hcHBsaWNhdGlvblByb2plY3Qvc2hhcmVkL2NvbnN0YW50cycpO1xyXG5pbXBvcnQgUXVhbnRpdHlJdGVtID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1F1YW50aXR5SXRlbScpO1xyXG5pbXBvcnQgUXVhbnRpdHlEZXRhaWxzID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1F1YW50aXR5RGV0YWlscycpO1xyXG5pbXBvcnQgUmF0ZUl0ZW0gPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUmF0ZUl0ZW0nKTtcclxuaW1wb3J0IENhdGVnb3JpZXNMaXN0V2l0aFJhdGVzRFRPID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9kdG8vcHJvamVjdC9DYXRlZ29yaWVzTGlzdFdpdGhSYXRlc0RUTycpO1xyXG5pbXBvcnQgQ2VudHJhbGl6ZWRSYXRlID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L0NlbnRyYWxpemVkUmF0ZScpO1xyXG5pbXBvcnQgbWVzc2FnZXMgID0gcmVxdWlyZSgnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L3NoYXJlZC9tZXNzYWdlcycpO1xyXG5pbXBvcnQgeyBDb21tb25TZXJ2aWNlIH0gZnJvbSAnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L3NoYXJlZC9Db21tb25TZXJ2aWNlJztcclxuaW1wb3J0IFdvcmtJdGVtTGlzdFdpdGhSYXRlc0RUTyA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvZHRvL3Byb2plY3QvV29ya0l0ZW1MaXN0V2l0aFJhdGVzRFRPJyk7XHJcblxyXG5sZXQgQ0NQcm9taXNlID0gcmVxdWlyZSgncHJvbWlzZS9saWIvZXM2LWV4dGVuc2lvbnMnKTtcclxubGV0IGxvZ2dlcj1sb2c0anMuZ2V0TG9nZ2VyKCdQcm9qZWN0IHNlcnZpY2UnKTtcclxuXHJcbmNsYXNzIFByb2plY3RTZXJ2aWNlIHtcclxuICBBUFBfTkFNRTogc3RyaW5nO1xyXG4gIGNvbXBhbnlfbmFtZTogc3RyaW5nO1xyXG4gIGNvc3RIZWFkSWQ6IG51bWJlcjtcclxuICBjYXRlZ29yeUlkOiBudW1iZXI7XHJcbiAgd29ya0l0ZW1JZDogbnVtYmVyO1xyXG4gIHByaXZhdGUgcHJvamVjdFJlcG9zaXRvcnk6IFByb2plY3RSZXBvc2l0b3J5O1xyXG4gIHByaXZhdGUgYnVpbGRpbmdSZXBvc2l0b3J5OiBCdWlsZGluZ1JlcG9zaXRvcnk7XHJcbiAgcHJpdmF0ZSBhdXRoSW50ZXJjZXB0b3I6IEF1dGhJbnRlcmNlcHRvcjtcclxuICBwcml2YXRlIHVzZXJTZXJ2aWNlIDogVXNlclNlcnZpY2U7XHJcbiAgcHJpdmF0ZSBjb21tb25TZXJ2aWNlIDogQ29tbW9uU2VydmljZTtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5ID0gbmV3IFByb2plY3RSZXBvc2l0b3J5KCk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeSA9IG5ldyBCdWlsZGluZ1JlcG9zaXRvcnkoKTtcclxuICAgIHRoaXMuQVBQX05BTUUgPSBQcm9qZWN0QXNzZXQuQVBQX05BTUU7XHJcbiAgICB0aGlzLmF1dGhJbnRlcmNlcHRvciA9IG5ldyBBdXRoSW50ZXJjZXB0b3IoKTtcclxuICAgIHRoaXMudXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcclxuICAgIHRoaXMuY29tbW9uU2VydmljZSA9IG5ldyBDb21tb25TZXJ2aWNlKCk7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVQcm9qZWN0KGRhdGE6IFByb2plY3QsIHVzZXIgOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBpZighdXNlci5faWQpIHtcclxuICAgICAgY2FsbGJhY2sobmV3IENvc3RDb250cm9sbEV4Y2VwdGlvbignVXNlcklkIE5vdCBGb3VuZCcsbnVsbCksIG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuY3JlYXRlKGRhdGEsIChlcnIsIHJlcykgPT4ge1xyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjcmVhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdQcm9qZWN0IElEIDogJytyZXMuX2lkKTtcclxuICAgICAgICBsb2dnZXIuZGVidWcoJ1Byb2plY3QgTmFtZSA6ICcrcmVzLm5hbWUpO1xyXG4gICAgICAgIGxldCBwcm9qZWN0SWQgPSByZXMuX2lkO1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0gIHskcHVzaDogeyBwcm9qZWN0OiBwcm9qZWN0SWQgfX07XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZCA6IHVzZXIuX2lkfTtcclxuICAgICAgICB0aGlzLnVzZXJTZXJ2aWNlLmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXcgOnRydWV9LChlcnIsIHJlc3ApID0+IHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICBpZihlcnIpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSByZXMuY2F0ZWdvcnk7XHJcbiAgICAgICAgICAgIGRlbGV0ZSByZXMucmF0ZTtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRQcm9qZWN0QnlJZCggcHJvamVjdElkIDogc3RyaW5nLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSB7IF9pZDogcHJvamVjdElkfTtcclxuICAgIGxldCBwb3B1bGF0ZSA9IHtwYXRoIDogJ2J1aWxkaW5nJywgc2VsZWN0OiBbJ25hbWUnICwgJ3RvdGFsU2xhYkFyZWEnLF19O1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQW5kUG9wdWxhdGUocXVlcnksIHBvcHVsYXRlLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQW5kUG9wdWxhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGxvZ2dlci5kZWJ1ZygnUHJvamVjdCBOYW1lIDogJytyZXN1bHRbMF0ubmFtZSk7XHJcbiAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwseyBkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzKCBwcm9qZWN0SWQgOiBzdHJpbmcsIGJ1aWxkaW5nSWQ6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyBmb3Igc3luYyB3aXRoIHJhdGVBbmFseXNpcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHBvcHVsYXRlID0ge3BhdGggOiAnYnVpbGRpbmdzJ307XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRBbmRQb3B1bGF0ZShxdWVyeSwgcG9wdWxhdGUsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRBbmRQb3B1bGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgbG9nZ2VyLmRlYnVnKCdQcm9qZWN0IE5hbWUgOiAnK3Jlc3VsdFswXS5uYW1lKTtcclxuICAgICAgaWYoZXJyb3IpIHtcclxuICAgICAgICBsb2dnZXIuZXJyb3IoJ1Byb2plY3Qgc2VydmljZSwgZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyBmaW5kQW5kUG9wdWxhdGUgZmFpbGVkICcrSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzIHN1Y2Nlc3MuJyk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCx7IGRhdGE6IHJlc3VsdCB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVQcm9qZWN0QnlJZCggcHJvamVjdERldGFpbHM6IFByb2plY3QsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6YW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGVQcm9qZWN0RGV0YWlscyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkIDogcHJvamVjdERldGFpbHMuX2lkIH07XHJcbiAgICBkZWxldGUgcHJvamVjdERldGFpbHMuX2lkO1xyXG5cclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgcHJvamVjdERldGFpbHMsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3VsdCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNyZWF0ZUJ1aWxkaW5nKHByb2plY3RJZCA6IHN0cmluZywgYnVpbGRpbmdEZXRhaWxzIDogQnVpbGRpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5jcmVhdGUoYnVpbGRpbmdEZXRhaWxzLCAoZXJyb3IsIHJlc3VsdCk9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNyZWF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZCA6IHByb2plY3RJZCB9O1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0geyAkcHVzaDoge2J1aWxkaW5ncyA6IHJlc3VsdC5faWR9fTtcclxuICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXcgOiB0cnVlfSwgKGVycm9yLCBzdGF0dXMpPT4ge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVCdWlsZGluZ0J5SWQoIGJ1aWxkaW5nSWQ6c3RyaW5nLCBidWlsZGluZ0RldGFpbHM6YW55LCB1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGVCdWlsZGluZyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkIDogYnVpbGRpbmdJZCB9O1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgYnVpbGRpbmdEZXRhaWxzLHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3VsdCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNsb25lQnVpbGRpbmdEZXRhaWxzKCBidWlsZGluZ0lkOnN0cmluZywgYnVpbGRpbmdEZXRhaWxzOmFueSwgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgY2xvbmVCdWlsZGluZ0RldGFpbHMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcXVlcnkgPSB7IF9pZCA6IGJ1aWxkaW5nSWQgfTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkKGJ1aWxkaW5nSWQsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRCeUlkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNsb25lZENvc3RIZWFkRGV0YWlscyA6QXJyYXk8Q29zdEhlYWQ+PVtdO1xyXG4gICAgICAgIGxldCBjb3N0SGVhZHMgPWJ1aWxkaW5nRGV0YWlscy5jb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IHJlc3VsdENvc3RIZWFkcyA9IHJlc3VsdC5jb3N0SGVhZHM7XHJcbiAgICAgICAgZm9yKGxldCBjb3N0SGVhZCBvZiBjb3N0SGVhZHMpIHtcclxuICAgICAgICAgIGZvcihsZXQgcmVzdWx0Q29zdEhlYWQgb2YgcmVzdWx0Q29zdEhlYWRzKSB7XHJcbiAgICAgICAgICAgIGlmKGNvc3RIZWFkLm5hbWUgPT09IHJlc3VsdENvc3RIZWFkLm5hbWUpIHtcclxuICAgICAgICAgICAgICBsZXQgY2xvbmVkQ29zdEhlYWQgPSBuZXcgQ29zdEhlYWQ7XHJcbiAgICAgICAgICAgICAgY2xvbmVkQ29zdEhlYWQubmFtZSA9IHJlc3VsdENvc3RIZWFkLm5hbWU7XHJcbiAgICAgICAgICAgICAgY2xvbmVkQ29zdEhlYWQucmF0ZUFuYWx5c2lzSWQgPSByZXN1bHRDb3N0SGVhZC5yYXRlQW5hbHlzaXNJZDtcclxuICAgICAgICAgICAgICBjbG9uZWRDb3N0SGVhZC5hY3RpdmUgPSBjb3N0SGVhZC5hY3RpdmU7XHJcbiAgICAgICAgICAgICAgY2xvbmVkQ29zdEhlYWQudGh1bWJSdWxlUmF0ZSA9IHJlc3VsdENvc3RIZWFkLnRodW1iUnVsZVJhdGU7XHJcblxyXG4gICAgICAgICAgICAgIGlmKGNvc3RIZWFkLmFjdGl2ZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBjYXRlZ29yeUxpc3QgPSBjb3N0SGVhZC5jYXRlZ29yeTtcclxuICAgICAgICAgICAgICAgIGxldCByZXN1bHRDYXRlZ29yeUxpc3QgPSByZXN1bHRDb3N0SGVhZC5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICAgICAgZm9yKGxldCByZXN1bHRDYXRlZ29yeUluZGV4PTA7IHJlc3VsdENhdGVnb3J5SW5kZXg8cmVzdWx0Q2F0ZWdvcnlMaXN0Lmxlbmd0aDsgcmVzdWx0Q2F0ZWdvcnlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGZvcihsZXQgY2F0ZWdvcnlJbmRleD0wIDsgY2F0ZWdvcnlJbmRleDxjYXRlZ29yeUxpc3QubGVuZ3RoOyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihjYXRlZ29yeUxpc3RbY2F0ZWdvcnlJbmRleF0ubmFtZSA9PT0gcmVzdWx0Q2F0ZWdvcnlMaXN0W3Jlc3VsdENhdGVnb3J5SW5kZXhdLm5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmKCFjYXRlZ29yeUxpc3RbY2F0ZWdvcnlJbmRleF0uYWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdENhdGVnb3J5TGlzdC5zcGxpY2UocmVzdWx0Q2F0ZWdvcnlJbmRleCwxKTtcclxuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXN1bHRXb3JraXRlbUxpc3QgPSByZXN1bHRDYXRlZ29yeUxpc3RbcmVzdWx0Q2F0ZWdvcnlJbmRleF0ud29ya0l0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgd29ya0l0ZW1MaXN0ID0gY2F0ZWdvcnlMaXN0W2NhdGVnb3J5SW5kZXhdLndvcmtJdGVtcztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcihsZXQgcmVzdWx0V29ya2l0ZW1JbmRleD0wOyAgcmVzdWx0V29ya2l0ZW1JbmRleCA8IHJlc3VsdFdvcmtpdGVtTGlzdC5sZW5ndGg7IHJlc3VsdFdvcmtpdGVtSW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZvcihsZXQgd29ya2l0ZW1JbmRleD0wOyAgd29ya2l0ZW1JbmRleCA8IHdvcmtJdGVtTGlzdC5sZW5ndGg7IHdvcmtpdGVtSW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIXdvcmtJdGVtTGlzdFt3b3JraXRlbUluZGV4XS5hY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0V29ya2l0ZW1MaXN0LnNwbGljZShyZXN1bHRXb3JraXRlbUluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNsb25lZENvc3RIZWFkLmNhdGVnb3JpZXMgPSByZXN1bHRDb3N0SGVhZC5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjbG9uZWRDb3N0SGVhZC5jYXRlZ29yaWVzID0gcmVzdWx0Q29zdEhlYWQuY2F0ZWdvcmllcztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjbG9uZWRDb3N0SGVhZERldGFpbHMucHVzaChjbG9uZWRDb3N0SGVhZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB1cGRhdGVCdWlsZGluZ0Nvc3RIZWFkcyA9IHsnY29zdEhlYWRzJyA6IGNsb25lZENvc3RIZWFkRGV0YWlsc307XHJcbiAgICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlQnVpbGRpbmdDb3N0SGVhZHMse25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRCdWlsZGluZ0J5SWQocHJvamVjdElkIDogc3RyaW5nLCBidWlsZGluZ0lkIDogc3RyaW5nLCB1c2VyOiBVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZ2V0QnVpbGRpbmcgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQnlJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRCdWlsZGluZ1JhdGVJdGVtc0J5T3JpZ2luYWxOYW1lKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIG9yaWdpbmFsUmF0ZUl0ZW1OYW1lOiBzdHJpbmcsIHVzZXI6IFVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcHJvamVjdGlvbiA9IHsncmF0ZXMnOjEsIF9pZDogMH07XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZFdpdGhQcm9qZWN0aW9uKGJ1aWxkaW5nSWQsIHByb2plY3Rpb24sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3QgU2VydmljZSwgZ2V0QnVpbGRpbmdSYXRlSXRlbXNCeU9yaWdpbmFsTmFtZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBidWlsZGluZ1JhdGVJdGVtc0FycmF5ID0gYnVpbGRpbmcucmF0ZXM7XHJcbiAgICAgICAgbGV0IGNlbnRyYWxpemVkUmF0ZUl0ZW1zQXJyYXkgPSB0aGlzLmdldFJhdGVJdGVtc0FycmF5KGJ1aWxkaW5nUmF0ZUl0ZW1zQXJyYXksIG9yaWdpbmFsUmF0ZUl0ZW1OYW1lKTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLHsgZGF0YTogY2VudHJhbGl6ZWRSYXRlSXRlbXNBcnJheSwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldFJhdGVJdGVtc0FycmF5KG9yaWdpbmFsUmF0ZUl0ZW1zQXJyYXk6IEFycmF5PENlbnRyYWxpemVkUmF0ZT4sIG9yaWdpbmFsUmF0ZUl0ZW1OYW1lOiBzdHJpbmcpIHtcclxuXHJcbiAgICBsZXQgY2VudHJhbGl6ZWRSYXRlSXRlbXNBcnJheTogQXJyYXk8Q2VudHJhbGl6ZWRSYXRlPjtcclxuICAgIGNlbnRyYWxpemVkUmF0ZUl0ZW1zQXJyYXkgPSBhbGFzcWwoJ1NFTEVDVCAqIEZST00gPyB3aGVyZSBUUklNKG9yaWdpbmFsSXRlbU5hbWUpID0gPycsIFtvcmlnaW5hbFJhdGVJdGVtc0FycmF5LCBvcmlnaW5hbFJhdGVJdGVtTmFtZV0pO1xyXG4gICAgcmV0dXJuIGNlbnRyYWxpemVkUmF0ZUl0ZW1zQXJyYXk7XHJcbiAgfVxyXG5cclxuICBnZXRQcm9qZWN0UmF0ZUl0ZW1zQnlPcmlnaW5hbE5hbWUocHJvamVjdElkOiBzdHJpbmcsIG9yaWdpbmFsUmF0ZUl0ZW1OYW1lOiBzdHJpbmcsIHVzZXI6IFVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgbGV0IHByb2plY3Rpb24gPSB7J3JhdGVzJzoxLCBfaWQ6IDB9O1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQnlJZFdpdGhQcm9qZWN0aW9uKHByb2plY3RJZCwgcHJvamVjdGlvbiwgKGVycm9yLCBwcm9qZWN0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IFNlcnZpY2UsIGdldFByb2plY3RSYXRlSXRlbXNCeU9yaWdpbmFsTmFtZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBwcm9qZWN0UmF0ZUl0ZW1zQXJyYXkgPSBwcm9qZWN0LnJhdGVzO1xyXG4gICAgICAgIGxldCBjZW50cmFsaXplZFJhdGVJdGVtc0FycmF5ID0gdGhpcy5nZXRSYXRlSXRlbXNBcnJheShwcm9qZWN0UmF0ZUl0ZW1zQXJyYXksIG9yaWdpbmFsUmF0ZUl0ZW1OYW1lKTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLHsgZGF0YTogY2VudHJhbGl6ZWRSYXRlSXRlbXNBcnJheSwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldEluQWN0aXZlQ29zdEhlYWQocHJvamVjdElkOiBzdHJpbmcsIGJ1aWxkaW5nSWQ6IHN0cmluZywgdXNlcjogVXNlciwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldEluQWN0aXZlQ29zdEhlYWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZEJ5SWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdnZXR0aW5nIEluQWN0aXZlIENvc3RIZWFkIGZvciBCdWlsZGluZyBOYW1lIDogJytyZXN1bHQubmFtZSk7XHJcbiAgICAgICAgbGV0IHJlc3BvbnNlID0gcmVzdWx0LmNvc3RIZWFkcztcclxuICAgICAgICBsZXQgaW5BY3RpdmVDb3N0SGVhZD1bXTtcclxuICAgICAgICBmb3IobGV0IGNvc3RIZWFkSXRlbSBvZiByZXNwb25zZSkge1xyXG4gICAgICAgICAgaWYoIWNvc3RIZWFkSXRlbS5hY3RpdmUpIHtcclxuICAgICAgICAgICAgaW5BY3RpdmVDb3N0SGVhZC5wdXNoKGNvc3RIZWFkSXRlbSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwse2RhdGE6aW5BY3RpdmVDb3N0SGVhZCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldEluQWN0aXZlV29ya0l0ZW1zT2ZCdWlsZGluZ0Nvc3RIZWFkcyhwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBhZGQgV29ya2l0ZW0gaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nOkJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBpbkFjdGl2ZVdvcmtJdGVtcyA6IEFycmF5PFdvcmtJdGVtPiA9IG5ldyBBcnJheTxXb3JrSXRlbT4oKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY29zdEhlYWREYXRhIG9mIGNvc3RIZWFkTGlzdCkge1xyXG4gICAgICAgICAgaWYgKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkRGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYXRlZ29yeURhdGEgb2YgY29zdEhlYWREYXRhLmNhdGVnb3JpZXMpIHtcclxuICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnlJZCA9PT0gY2F0ZWdvcnlEYXRhLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB3b3JrSXRlbURhdGEgb2YgY2F0ZWdvcnlEYXRhLndvcmtJdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICBpZighd29ya0l0ZW1EYXRhLmFjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGluQWN0aXZlV29ya0l0ZW1zLnB1c2god29ya0l0ZW1EYXRhKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgaW5BY3RpdmVXb3JrSXRlbXNMaXN0V2l0aEJ1aWxkaW5nUmF0ZXMgPSB0aGlzLmdldFdvcmtJdGVtTGlzdFdpdGhDZW50cmFsaXplZFJhdGVzKGluQWN0aXZlV29ya0l0ZW1zLCBidWlsZGluZy5yYXRlcywgZmFsc2UpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwse2RhdGE6aW5BY3RpdmVXb3JrSXRlbXNMaXN0V2l0aEJ1aWxkaW5nUmF0ZXMud29ya0l0ZW1zLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBHZXQgSW4gQWN0aXZlIFdvcmtJdGVtcyBPZiBQcm9qZWN0IENvc3QgSGVhZHNcclxuICBnZXRJbkFjdGl2ZVdvcmtJdGVtc09mUHJvamVjdENvc3RIZWFkcyhwcm9qZWN0SWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgY2F0ZWdvcnlJZDpudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgR2V0IEluLUFjdGl2ZSBXb3JrSXRlbXMgT2YgUHJvamVjdCBDb3N0IEhlYWRzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQnlJZChwcm9qZWN0SWQsIChlcnJvciwgcHJvamVjdDpQcm9qZWN0KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBpbkFjdGl2ZVdvcmtJdGVtcyA6IEFycmF5PFdvcmtJdGVtPiA9IG5ldyBBcnJheTxXb3JrSXRlbT4oKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgY29zdEhlYWREYXRhIG9mIGNvc3RIZWFkTGlzdCkge1xyXG4gICAgICAgICAgaWYgKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkRGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYXRlZ29yeURhdGEgb2YgY29zdEhlYWREYXRhLmNhdGVnb3JpZXMpIHtcclxuICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnlJZCA9PT0gY2F0ZWdvcnlEYXRhLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB3b3JrSXRlbURhdGEgb2YgY2F0ZWdvcnlEYXRhLndvcmtJdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICBpZighd29ya0l0ZW1EYXRhLmFjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGluQWN0aXZlV29ya0l0ZW1zLnB1c2god29ya0l0ZW1EYXRhKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgaW5BY3RpdmVXb3JrSXRlbXNMaXN0V2l0aFByb2plY3RSYXRlcyA9IHRoaXMuZ2V0V29ya0l0ZW1MaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMoaW5BY3RpdmVXb3JrSXRlbXMsIHByb2plY3QucmF0ZXMsIGZhbHNlKTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLHtkYXRhOmluQWN0aXZlV29ya0l0ZW1zTGlzdFdpdGhQcm9qZWN0UmF0ZXMud29ya0l0ZW1zLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0QnVpbGRpbmdCeUlkRm9yQ2xvbmUocHJvamVjdElkIDogc3RyaW5nLCBidWlsZGluZ0lkIDogc3RyaW5nLCB1c2VyOiBVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZ2V0Q2xvbmVkQnVpbGRpbmcgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQnlJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjbG9uZWRCdWlsZGluZyA9IHJlc3VsdC5jb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IGJ1aWxkaW5nID0gbmV3IEJ1aWxkaW5nTW9kZWwoKTtcclxuICAgICAgICBidWlsZGluZy5uYW1lID0gcmVzdWx0Lm5hbWU7XHJcbiAgICAgICAgYnVpbGRpbmcudG90YWxTbGFiQXJlYSA9IHJlc3VsdC50b3RhbFNsYWJBcmVhO1xyXG4gICAgICAgIGJ1aWxkaW5nLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCA9IHJlc3VsdC50b3RhbENhcnBldEFyZWFPZlVuaXQ7XHJcbiAgICAgICAgYnVpbGRpbmcudG90YWxTYWxlYWJsZUFyZWFPZlVuaXQgPSByZXN1bHQudG90YWxTYWxlYWJsZUFyZWFPZlVuaXQ7XHJcbiAgICAgICAgYnVpbGRpbmcucGxpbnRoQXJlYSA9IHJlc3VsdC5wbGludGhBcmVhO1xyXG4gICAgICAgIGJ1aWxkaW5nLnRvdGFsTnVtT2ZGbG9vcnMgPSByZXN1bHQudG90YWxOdW1PZkZsb29ycztcclxuICAgICAgICBidWlsZGluZy5udW1PZlBhcmtpbmdGbG9vcnMgPSByZXN1bHQubnVtT2ZQYXJraW5nRmxvb3JzO1xyXG4gICAgICAgIGJ1aWxkaW5nLmNhcnBldEFyZWFPZlBhcmtpbmcgPSByZXN1bHQuY2FycGV0QXJlYU9mUGFya2luZztcclxuICAgICAgICBidWlsZGluZy5udW1PZk9uZUJISyA9IHJlc3VsdC5udW1PZk9uZUJISztcclxuICAgICAgICBidWlsZGluZy5udW1PZlR3b0JISyA9IHJlc3VsdC5udW1PZlR3b0JISztcclxuICAgICAgICBidWlsZGluZy5udW1PZlRocmVlQkhLID0gcmVzdWx0Lm51bU9mVGhyZWVCSEs7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZGb3VyQkhLID0gcmVzdWx0Lm51bU9mRm91ckJISztcclxuICAgICAgICBidWlsZGluZy5udW1PZkZpdmVCSEsgPSByZXN1bHQubnVtT2ZGaXZlQkhLO1xyXG4gICAgICAgIGJ1aWxkaW5nLm51bU9mTGlmdHMgPSByZXN1bHQubnVtT2ZMaWZ0cztcclxuXHJcbiAgICAgICAgLypsZXQgY2xvbmVkQ29zdEhlYWRBcnJheSA6IEFycmF5PENsb25lZENvc3RIZWFkPiA9IFtdO1xyXG5cclxuICAgICAgICBmb3IobGV0IGNvc3RIZWFkSW5kZXggPSAwOyBjb3N0SGVhZEluZGV4IDwgY2xvbmVkQnVpbGRpbmcubGVuZ3RoOyBjb3N0SGVhZEluZGV4KyspIHtcclxuXHJcbiAgICAgICAgICBsZXQgY2xvbmVkQ29zdEhlYWQgPSBuZXcgQ2xvbmVkQ29zdEhlYWQ7XHJcbiAgICAgICAgICBjbG9uZWRDb3N0SGVhZC5uYW1lID0gY2xvbmVkQnVpbGRpbmdbY29zdEhlYWRJbmRleF0ubmFtZTtcclxuICAgICAgICAgIGNsb25lZENvc3RIZWFkLnJhdGVBbmFseXNpc0lkID0gY2xvbmVkQnVpbGRpbmdbY29zdEhlYWRJbmRleF0ucmF0ZUFuYWx5c2lzSWQ7XHJcbiAgICAgICAgICBjbG9uZWRDb3N0SGVhZC5hY3RpdmUgPSBjbG9uZWRCdWlsZGluZ1tjb3N0SGVhZEluZGV4XS5hY3RpdmU7XHJcbiAgICAgICAgICBjbG9uZWRDb3N0SGVhZC5idWRnZXRlZENvc3RBbW91bnQgPSBjbG9uZWRCdWlsZGluZ1tjb3N0SGVhZEluZGV4XS5idWRnZXRlZENvc3RBbW91bnQ7XHJcblxyXG4gICAgICAgICAgbGV0IGNsb25lZFdvcmtJdGVtQXJyYXkgOiBBcnJheTxDbG9uZWRXb3JrSXRlbT4gPSBbXTtcclxuICAgICAgICAgIGxldCBjbG9uZWRDYXRlZ29yeUFycmF5IDogQXJyYXk8Q2xvbmVkQ2F0ZWdvcnk+ID0gW107XHJcbiAgICAgICAgICBsZXQgY2F0ZWdvcnlBcnJheSA9IGNsb25lZEJ1aWxkaW5nW2Nvc3RIZWFkSW5kZXhdLmNhdGVnb3JpZXM7XHJcblxyXG4gICAgICAgICAgZm9yKGxldCBjYXRlZ29yeUluZGV4PTA7IGNhdGVnb3J5SW5kZXg8Y2F0ZWdvcnlBcnJheS5sZW5ndGg7IGNhdGVnb3J5SW5kZXgrKykge1xyXG4gICAgICAgICAgICBsZXQgY2xvbmVkQ2F0ZWdvcnkgPSBuZXcgQ2xvbmVkQ2F0ZWdvcnkoKTtcclxuICAgICAgICAgICAgY2xvbmVkQ2F0ZWdvcnkubmFtZSA9IGNhdGVnb3J5QXJyYXlbY2F0ZWdvcnlJbmRleF0ubmFtZTtcclxuICAgICAgICAgICAgY2xvbmVkQ2F0ZWdvcnkucmF0ZUFuYWx5c2lzSWQgPSBjYXRlZ29yeUFycmF5W2NhdGVnb3J5SW5kZXhdLnJhdGVBbmFseXNpc0lkO1xyXG4gICAgICAgICAgICBjbG9uZWRDYXRlZ29yeS5hbW91bnQgPSBjYXRlZ29yeUFycmF5W2NhdGVnb3J5SW5kZXhdLmFtb3VudDtcclxuICAgICAgICAgICAgY2xvbmVkQ2F0ZWdvcnkuYWN0aXZlID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCB3b3JraXRlbUFycmF5ID0gY2F0ZWdvcnlBcnJheVtjYXRlZ29yeUluZGV4XS53b3JrSXRlbXM7XHJcbiAgICAgICAgICAgIGZvcihsZXQgd29ya2l0ZW1JbmRleD0wOyB3b3JraXRlbUluZGV4PCB3b3JraXRlbUFycmF5Lmxlbmd0aDsgd29ya2l0ZW1JbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgbGV0IGNsb25lZFdvcmtJdGVtID0gbmV3IENsb25lZFdvcmtJdGVtKCk7XHJcbiAgICAgICAgICAgICAgY2xvbmVkV29ya0l0ZW0ubmFtZSA9IHdvcmtpdGVtQXJyYXlbd29ya2l0ZW1JbmRleF0ubmFtZTtcclxuICAgICAgICAgICAgICBjbG9uZWRXb3JrSXRlbS5yYXRlQW5hbHlzaXNJZCA9ICB3b3JraXRlbUFycmF5W3dvcmtpdGVtSW5kZXhdLnJhdGVBbmFseXNpc0lkO1xyXG4gICAgICAgICAgICAgIGNsb25lZFdvcmtJdGVtLnVuaXQgPSAgd29ya2l0ZW1BcnJheVt3b3JraXRlbUluZGV4XS51bml0O1xyXG4gICAgICAgICAgICAgIGNsb25lZFdvcmtJdGVtLmFtb3VudCA9IHdvcmtpdGVtQXJyYXlbd29ya2l0ZW1JbmRleF0uYW1vdW50O1xyXG4gICAgICAgICAgICAgIGNsb25lZFdvcmtJdGVtLnJhdGUgPSB3b3JraXRlbUFycmF5W3dvcmtpdGVtSW5kZXhdLnJhdGU7XHJcbiAgICAgICAgICAgICAgY2xvbmVkV29ya0l0ZW0ucXVhbnRpdHkgPSB3b3JraXRlbUFycmF5W3dvcmtpdGVtSW5kZXhdLnF1YW50aXR5O1xyXG4gICAgICAgICAgICAgIGNsb25lZFdvcmtJdGVtQXJyYXkucHVzaChjbG9uZWRXb3JrSXRlbSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2xvbmVkQ2F0ZWdvcnkud29ya0l0ZW1zID0gY2xvbmVkV29ya0l0ZW1BcnJheTtcclxuICAgICAgICAgICAgY2xvbmVkQ2F0ZWdvcnlBcnJheS5wdXNoKGNsb25lZENhdGVnb3J5KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNsb25lZENvc3RIZWFkLmNhdGVnb3JpZXMgPSBjbG9uZWRDYXRlZ29yeUFycmF5O1xyXG4gICAgICAgICAgY2xvbmVkQ29zdEhlYWRBcnJheS5wdXNoKGNsb25lZENvc3RIZWFkKTtcclxuICAgICAgICB9Ki9cclxuICAgICAgICBidWlsZGluZy5jb3N0SGVhZHMgPSByZXN1bHQuY29zdEhlYWRzO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiBidWlsZGluZywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGRlbGV0ZUJ1aWxkaW5nQnlJZChwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZGVsZXRlQnVpbGRpbmcgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcG9wQnVpbGRpbmdJZCA9IGJ1aWxkaW5nSWQ7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5kZWxldGUoYnVpbGRpbmdJZCwgKGVycm9yLCByZXN1bHQpPT4ge1xyXG4gICAgICBpZihlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0geyAkcHVsbDoge2J1aWxkaW5ncyA6IHBvcEJ1aWxkaW5nSWR9fTtcclxuICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHN0YXR1cyk9PiB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgaWYoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHN0YXR1cywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldFJhdGUocHJvamVjdElkOnN0cmluZywgYnVpbGRpbmdJZDpzdHJpbmcsIGNvc3RIZWFkSWQ6bnVtYmVyLGNhdGVnb3J5SWQ6bnVtYmVyLCB3b3JrSXRlbUlkOm51bWJlciwgdXNlciA6IFVzZXIsXHJcbiAgICAgICAgICBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZ2V0UmF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuXHJcbiAgICBsZXQgcmF0ZUFuYWx5c2lzU2VydmljZXM6IFJhdGVBbmFseXNpc1NlcnZpY2UgPSBuZXcgUmF0ZUFuYWx5c2lzU2VydmljZSgpO1xyXG4gICAgcmF0ZUFuYWx5c2lzU2VydmljZXMuZ2V0UmF0ZSh3b3JrSXRlbUlkLCAoZXJyb3IsIHJhdGVEYXRhKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcmF0ZSA6UmF0ZSA9IG5ldyBSYXRlKCk7XHJcbiAgICAgICAgcmF0ZS5yYXRlSXRlbXMgPSByYXRlRGF0YTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogcmF0ZURhdGEsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVSYXRlT2ZCdWlsZGluZ0Nvc3RIZWFkcyhwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6bnVtYmVyLCByYXRlIDpSYXRlLCB1c2VyIDogVXNlciwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZVJhdGVPZkJ1aWxkaW5nQ29zdEhlYWRzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCBidWlsZGluZzpCdWlsZGluZykgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQnlJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZHMgPSBidWlsZGluZy5jb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IGNlbnRyYWxpemVkUmF0ZXMgPSBidWlsZGluZy5yYXRlcztcclxuICAgICAgICBmb3IobGV0IGNvc3RIZWFkRGF0YSBvZiBjb3N0SGVhZHMpIHtcclxuICAgICAgICAgIGlmKGNvc3RIZWFkRGF0YS5yYXRlQW5hbHlzaXNJZCA9PT0gY29zdEhlYWRJZCkge1xyXG4gICAgICAgICAgICBmb3IobGV0IGNhdGVnb3J5RGF0YSBvZiBjb3N0SGVhZERhdGEuY2F0ZWdvcmllcykge1xyXG4gICAgICAgICAgICAgIGlmIChjYXRlZ29yeURhdGEucmF0ZUFuYWx5c2lzSWQgPT09IGNhdGVnb3J5SWQpIHtcclxuICAgICAgICAgICAgICAgIGZvcihsZXQgd29ya0l0ZW1EYXRhIG9mIGNhdGVnb3J5RGF0YS53b3JrSXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHdvcmtJdGVtRGF0YS5yYXRlQW5hbHlzaXNJZCA9PT0gd29ya0l0ZW1JZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtRGF0YS5yYXRlPXJhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1EYXRhLnJhdGUuaXNFc3RpbWF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJyA6IGJ1aWxkaW5nSWR9O1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0geyAkc2V0IDogeydjb3N0SGVhZHMnIDogY29zdEhlYWRzfX07XHJcblxyXG4gICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEse25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2J1aWxkaW5nIENvc3RIZWFkcyBVcGRhdGVkJyk7XHJcblxyXG4gICAgICAgICAgICAgIGxldCByYXRlSXRlbXMgPSByYXRlLnJhdGVJdGVtcztcclxuICAgICAgICAgICAgICBsZXQgcHJvbWlzZUFycmF5Rm9yVXBkYXRlQnVpbGRpbmdDZW50cmFsaXplZFJhdGVzID1bXTtcclxuXHJcbiAgICAgICAgICAgICAgZm9yKGxldCByYXRlIG9mIHJhdGVJdGVtcykge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCByYXRlT2JqZWN0RXhpc3RTUUwgPSBcIlNFTEVDVCAqIEZST00gPyBBUyByYXRlcyBXSEVSRSByYXRlcy5pdGVtTmFtZT0gJ1wiK3JhdGUuaXRlbU5hbWUrXCInXCI7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmF0ZUV4aXN0QXJyYXkgPSBhbGFzcWwocmF0ZU9iamVjdEV4aXN0U1FMLFtjZW50cmFsaXplZFJhdGVzXSk7XHJcbiAgICAgICAgICAgICAgICBpZihyYXRlRXhpc3RBcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmKHJhdGVFeGlzdEFycmF5WzBdLnJhdGUgIT09IHJhdGUucmF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vdXBkYXRlIHJhdGUgb2YgcmF0ZUl0ZW1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgdXBkYXRlUmF0ZVByb21pc2UgPSB0aGlzLnVwZGF0ZUNlbnRyYWxpemVkUmF0ZUZvckJ1aWxkaW5nKGJ1aWxkaW5nSWQsIHJhdGUuaXRlbU5hbWUsIHJhdGUucmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZUFycmF5Rm9yVXBkYXRlQnVpbGRpbmdDZW50cmFsaXplZFJhdGVzLnB1c2godXBkYXRlUmF0ZVByb21pc2UpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAvL2NyZWF0ZSBuZXcgcmF0ZUl0ZW1cclxuICAgICAgICAgICAgICAgICAgbGV0IHJhdGVJdGVtIDogQ2VudHJhbGl6ZWRSYXRlID0gbmV3IENlbnRyYWxpemVkUmF0ZShyYXRlLml0ZW1OYW1lLHJhdGUub3JpZ2luYWxJdGVtTmFtZSwgcmF0ZS5yYXRlKTtcclxuICAgICAgICAgICAgICAgICAgbGV0IGFkZE5ld1JhdGVJdGVtUHJvbWlzZSA9IHRoaXMuYWRkTmV3Q2VudHJhbGl6ZWRSYXRlRm9yQnVpbGRpbmcoYnVpbGRpbmdJZCwgcmF0ZUl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICBwcm9taXNlQXJyYXlGb3JVcGRhdGVCdWlsZGluZ0NlbnRyYWxpemVkUmF0ZXMucHVzaChhZGROZXdSYXRlSXRlbVByb21pc2UpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgaWYocHJvbWlzZUFycmF5Rm9yVXBkYXRlQnVpbGRpbmdDZW50cmFsaXplZFJhdGVzLmxlbmd0aCAhPT0gMCl7XHJcbiAgICAgICAgICAgICAgICBDQ1Byb21pc2UuYWxsKHByb21pc2VBcnJheUZvclVwZGF0ZUJ1aWxkaW5nQ2VudHJhbGl6ZWRSYXRlcykudGhlbihmdW5jdGlvbihkYXRhOiBBcnJheTxhbnk+KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnUmF0ZXMgQXJyYXkgdXBkYXRlZCA6ICcrSlNPTi5zdHJpbmdpZnkoY2VudHJhbGl6ZWRSYXRlcykpO1xyXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ICdkYXRhJyA6ICdzdWNjZXNzJyB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlOmFueSkge1xyXG4gICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJyBQcm9taXNlIGZhaWxlZCBmb3IgY29udmVydENvc3RIZWFkc0Zyb21SYXRlQW5hbHlzaXNUb0Nvc3RDb250cm9sICEgOicgK0pTT04uc3RyaW5naWZ5KGUpKTtcclxuICAgICAgICAgICAgICAgICAgQ0NQcm9taXNlLnJlamVjdChlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ICdkYXRhJyA6ICdzdWNjZXNzJyB9KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvL1VwZGF0ZSByYXRlIG9mIHByb2plY3QgY29zdCBoZWFkc1xyXG4gIHVwZGF0ZVJhdGVPZlByb2plY3RDb3N0SGVhZHMocHJvamVjdElkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsY2F0ZWdvcnlJZDpudW1iZXIsXHJcbiAgICAgICAgICAgICB3b3JrSXRlbUlkOm51bWJlciwgcmF0ZSA6UmF0ZSwgdXNlciA6IFVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBVcGRhdGUgcmF0ZSBvZiBwcm9qZWN0IGNvc3QgaGVhZHMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkKHByb2plY3RJZCwgKGVycm9yLCBwcm9qZWN0IDogUHJvamVjdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQnlJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBwcm9qZWN0Q29zdEhlYWRzID0gcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjZW50cmFsaXplZFJhdGVzT2ZQcm9qZWN0cyA9IHByb2plY3QucmF0ZXM7XHJcbiAgICAgICAgZm9yKGxldCBjb3N0SGVhZERhdGEgb2YgcHJvamVjdENvc3RIZWFkcykge1xyXG4gICAgICAgICAgaWYoY29zdEhlYWREYXRhLnJhdGVBbmFseXNpc0lkID09PSBjb3N0SGVhZElkKSB7XHJcbiAgICAgICAgICAgIGZvcihsZXQgY2F0ZWdvcnlEYXRhIG9mIGNvc3RIZWFkRGF0YS5jYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5RGF0YS5yYXRlQW5hbHlzaXNJZCA9PT0gY2F0ZWdvcnlJZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yKGxldCB3b3JrSXRlbURhdGEgb2YgY2F0ZWdvcnlEYXRhLndvcmtJdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICBpZiAod29ya0l0ZW1EYXRhLnJhdGVBbmFseXNpc0lkID09PSB3b3JrSXRlbUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1EYXRhLnJhdGU9cmF0ZTtcclxuICAgICAgICAgICAgICAgICAgICB3b3JrSXRlbURhdGEucmF0ZS5pc0VzdGltYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0geydfaWQnIDogcHJvamVjdElkfTtcclxuICAgICAgICBsZXQgbmV3RGF0YSA9IHsgJHNldCA6IHsncHJvamVjdENvc3RIZWFkcycgOiBwcm9qZWN0Q29zdEhlYWRzfX07XHJcbiAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgcmF0ZUl0ZW1zID0gcmF0ZS5yYXRlSXRlbXM7XHJcbiAgICAgICAgICAgIGxldCBwcm9taXNlQXJyYXlGb3JQcm9qZWN0Q2VudHJhbGl6ZWRSYXRlcyA9W107XHJcblxyXG4gICAgICAgICAgICBmb3IobGV0IHJhdGUgb2YgcmF0ZUl0ZW1zKSB7XHJcblxyXG4gICAgICAgICAgICAgIGxldCByYXRlT2JqZWN0RXhpc3RTUUwgPSBcIlNFTEVDVCAqIEZST00gPyBBUyByYXRlcyBXSEVSRSByYXRlcy5pdGVtTmFtZT0gJ1wiK3JhdGUuaXRlbU5hbWUrXCInXCI7XHJcbiAgICAgICAgICAgICAgbGV0IHJhdGVFeGlzdEFycmF5ID0gYWxhc3FsKHJhdGVPYmplY3RFeGlzdFNRTCxbY2VudHJhbGl6ZWRSYXRlc09mUHJvamVjdHNdKTtcclxuICAgICAgICAgICAgICBpZihyYXRlRXhpc3RBcnJheS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZihyYXRlRXhpc3RBcnJheVswXS5yYXRlICE9PSByYXRlLnJhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgLy91cGRhdGUgcmF0ZSBvZiByYXRlSXRlbVxyXG4gICAgICAgICAgICAgICAgICBsZXQgdXBkYXRlUmF0ZU9mUHJvamVjdFByb21pc2UgPSB0aGlzLnVwZGF0ZUNlbnRyYWxpemVkUmF0ZUZvclByb2plY3QocHJvamVjdElkLCByYXRlLml0ZW1OYW1lLCByYXRlLnJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICBwcm9taXNlQXJyYXlGb3JQcm9qZWN0Q2VudHJhbGl6ZWRSYXRlcy5wdXNoKHVwZGF0ZVJhdGVPZlByb2plY3RQcm9taXNlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgbmV3IHJhdGVJdGVtXHJcbiAgICAgICAgICAgICAgICBsZXQgcmF0ZUl0ZW0gOiBDZW50cmFsaXplZFJhdGUgPSBuZXcgQ2VudHJhbGl6ZWRSYXRlKHJhdGUuaXRlbU5hbWUscmF0ZS5vcmlnaW5hbEl0ZW1OYW1lLCByYXRlLnJhdGUpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGFkZE5ld1JhdGVPZlByb2plY3RQcm9taXNlID0gdGhpcy5hZGROZXdDZW50cmFsaXplZFJhdGVGb3JQcm9qZWN0KHByb2plY3RJZCwgcmF0ZUl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgcHJvbWlzZUFycmF5Rm9yUHJvamVjdENlbnRyYWxpemVkUmF0ZXMucHVzaChhZGROZXdSYXRlT2ZQcm9qZWN0UHJvbWlzZSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZihwcm9taXNlQXJyYXlGb3JQcm9qZWN0Q2VudHJhbGl6ZWRSYXRlcy5sZW5ndGggIT09IDApIHtcclxuXHJcbiAgICAgICAgICAgICAgQ0NQcm9taXNlLmFsbChwcm9taXNlQXJyYXlGb3JQcm9qZWN0Q2VudHJhbGl6ZWRSYXRlcykudGhlbihmdW5jdGlvbihkYXRhOiBBcnJheTxhbnk+KSB7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JhdGVzIEFycmF5IHVwZGF0ZWQgOiAnK0pTT04uc3RyaW5naWZ5KGNlbnRyYWxpemVkUmF0ZXNPZlByb2plY3RzKSk7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ICdkYXRhJyA6ICdzdWNjZXNzJyB9KTtcclxuXHJcbiAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZTphbnkpIHtcclxuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignIFByb21pc2UgZmFpbGVkIGZvciBjb252ZXJ0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpc1RvQ29zdENvbnRyb2wgISA6JyArSlNPTi5zdHJpbmdpZnkoZSkpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGVycm9yT2JqID0gbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICBlcnJvck9iai5tZXNzYWdlID0gZTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yT2JqLCBudWxsKTtcclxuICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgeyAnZGF0YScgOiAnc3VjY2VzcycgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBkZWxldGVRdWFudGl0eU9mQnVpbGRpbmdDb3N0SGVhZHNCeU5hbWUocHJvamVjdElkOnN0cmluZywgYnVpbGRpbmdJZDpzdHJpbmcsIGNvc3RIZWFkSWQ6bnVtYmVyLCBjYXRlZ29yeUlkOm51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1JZDpudW1iZXIsIGl0ZW1OYW1lOnN0cmluZywgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZGVsZXRlUXVhbnRpdHkgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nOkJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcXVhbnRpdHlJdGVtczogQXJyYXk8UXVhbnRpdHlEZXRhaWxzPjtcclxuICAgICAgICBmb3IobGV0IGNvc3RIZWFkIG9mIGJ1aWxkaW5nLmNvc3RIZWFkcykge1xyXG4gICAgICAgICAgaWYoY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQgPT09IGNvc3RIZWFkSWQpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnkgb2YgY29zdEhlYWQuY2F0ZWdvcmllcykge1xyXG4gICAgICAgICAgICAgIGlmKGNhdGVnb3J5LnJhdGVBbmFseXNpc0lkID09PSBjYXRlZ29yeUlkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB3b3JrSXRlbSBvZiBjYXRlZ29yeS53b3JrSXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgaWYod29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQgPT09IHdvcmtJdGVtSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eUl0ZW1zID0gd29ya0l0ZW0ucXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscztcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBxdWFudGl0eUluZGV4PTA7IHF1YW50aXR5SW5kZXggPCBxdWFudGl0eUl0ZW1zLmxlbmd0aDsgcXVhbnRpdHlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZihxdWFudGl0eUl0ZW1zW3F1YW50aXR5SW5kZXhdLm5hbWUgPT09IGl0ZW1OYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1YW50aXR5SXRlbXMuc3BsaWNlKHF1YW50aXR5SW5kZXgsMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtLnF1YW50aXR5LnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHRvdGFsKSwyKSBGUk9NID8nLFtxdWFudGl0eUl0ZW1zXSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBxdWVyeSA9IHsgX2lkIDogYnVpbGRpbmdJZCB9O1xyXG4gICAgICAgIGxldCBkYXRhID0geyAkc2V0IDogeydjb3N0SGVhZHMnIDogYnVpbGRpbmcuY29zdEhlYWRzIH19O1xyXG4gICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGRhdGEse25ldzogdHJ1ZX0sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGEgOidzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbiAgLy9EZWxldGUgUXVhbnRpdHkgT2YgUHJvamVjdCBDb3N0IEhlYWRzIEJ5IE5hbWVcclxuICBkZWxldGVRdWFudGl0eU9mUHJvamVjdENvc3RIZWFkc0J5TmFtZShwcm9qZWN0SWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgY2F0ZWdvcnlJZDpudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1JZDpudW1iZXIsIGl0ZW1OYW1lOnN0cmluZywgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZGVsZXRlUXVhbnRpdHkgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkKHByb2plY3RJZCwgKGVycm9yLCBwcm9qZWN0OlByb2plY3QpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBxdWFudGl0eUl0ZW1zOiBBcnJheTxRdWFudGl0eURldGFpbHM+O1xyXG4gICAgICAgIGZvcihsZXQgY29zdEhlYWQgb2YgcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzKSB7XHJcbiAgICAgICAgICBpZihjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCA9PT0gY29zdEhlYWRJZCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYXRlZ29yeSBvZiBjb3N0SGVhZC5jYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgICAgICAgaWYoY2F0ZWdvcnkucmF0ZUFuYWx5c2lzSWQgPT09IGNhdGVnb3J5SWQpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHdvcmtJdGVtIG9mIGNhdGVnb3J5LndvcmtJdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICBpZih3b3JrSXRlbS5yYXRlQW5hbHlzaXNJZCA9PT0gd29ya0l0ZW1JZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5SXRlbXMgPSB3b3JrSXRlbS5xdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IHF1YW50aXR5SW5kZXg9MDsgcXVhbnRpdHlJbmRleCA8IHF1YW50aXR5SXRlbXMubGVuZ3RoOyBxdWFudGl0eUluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmKHF1YW50aXR5SXRlbXNbcXVhbnRpdHlJbmRleF0ubmFtZSA9PT0gaXRlbU5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlJdGVtcy5zcGxpY2UocXVhbnRpdHlJbmRleCwxKTtcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW0ucXVhbnRpdHkudG90YWwgPSBhbGFzcWwoJ1ZBTFVFIE9GIFNFTEVDVCBST1VORChTVU0odG90YWwpLDIpIEZST00gPycsW3F1YW50aXR5SXRlbXNdKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0geyBfaWQgOiBwcm9qZWN0SWQgfTtcclxuICAgICAgICBsZXQgZGF0YSA9IHsgJHNldCA6IHsncHJvamVjdENvc3RIZWFkcycgOiBwcm9qZWN0LnByb2plY3RDb3N0SGVhZHMgfX07XHJcbiAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBkYXRhLHtuZXc6IHRydWV9LCAoZXJyb3IsIHByb2plY3QpID0+IHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGEgOidzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG5cclxuICBkZWxldGVXb3JraXRlbShwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyLCB3b3JrSXRlbUlkOm51bWJlciwgdXNlcjpVc2VyLFxyXG4gICAgICAgICAgICAgICAgIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBkZWxldGUgV29ya2l0ZW0gaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nOkJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjYXRlZ29yeUxpc3Q6IENhdGVnb3J5W107XHJcbiAgICAgICAgbGV0IFdvcmtJdGVtTGlzdDogV29ya0l0ZW1bXTtcclxuICAgICAgICB2YXIgZmxhZyA9IDA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3N0SGVhZExpc3QubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWRJZCA9PT0gY29zdEhlYWRMaXN0W2luZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBjYXRlZ29yeUxpc3QgPSBjb3N0SGVhZExpc3RbaW5kZXhdLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNhdGVnb3J5SW5kZXggPSAwOyBjYXRlZ29yeUluZGV4IDwgY2F0ZWdvcnlMaXN0Lmxlbmd0aDsgY2F0ZWdvcnlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5SWQgPT09IGNhdGVnb3J5TGlzdFtjYXRlZ29yeUluZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgV29ya0l0ZW1MaXN0ID0gY2F0ZWdvcnlMaXN0W2NhdGVnb3J5SW5kZXhdLndvcmtJdGVtcztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHdvcmtpdGVtSW5kZXggPSAwOyB3b3JraXRlbUluZGV4IDwgV29ya0l0ZW1MaXN0Lmxlbmd0aDsgd29ya2l0ZW1JbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbUlkID09PSBXb3JrSXRlbUxpc3Rbd29ya2l0ZW1JbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBmbGFnID0gMTtcclxuICAgICAgICAgICAgICAgICAgICBXb3JrSXRlbUxpc3Quc3BsaWNlKHdvcmtpdGVtSW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihmbGFnID09PSAxKSB7XHJcbiAgICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBidWlsZGluZ0lkfTtcclxuICAgICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGJ1aWxkaW5nLCB7bmV3OiB0cnVlfSwgKGVycm9yLCBXb3JrSXRlbUxpc3QpID0+IHtcclxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGxldCBtZXNzYWdlID0gJ1dvcmtJdGVtIGRlbGV0ZWQuJztcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogV29ya0l0ZW1MaXN0LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHNldENvc3RIZWFkU3RhdHVzKCBidWlsZGluZ0lkIDogc3RyaW5nLCBjb3N0SGVhZElkIDogbnVtYmVyLCBjb3N0SGVhZEFjdGl2ZVN0YXR1cyA6IHN0cmluZywgdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSB7J19pZCcgOiBidWlsZGluZ0lkLCAnY29zdEhlYWRzLnJhdGVBbmFseXNpc0lkJyA6IGNvc3RIZWFkSWR9O1xyXG4gICAgbGV0IGFjdGl2ZVN0YXR1cyA9IEpTT04ucGFyc2UoY29zdEhlYWRBY3RpdmVTdGF0dXMpO1xyXG4gICAgbGV0IG5ld0RhdGEgPSB7ICRzZXQgOiB7J2Nvc3RIZWFkcy4kLmFjdGl2ZScgOiBhY3RpdmVTdGF0dXN9fTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXc6IHRydWV9LChlcnIsIHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3BvbnNlLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlV29ya0l0ZW1TdGF0dXNPZkJ1aWxkaW5nQ29zdEhlYWRzKGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgY2F0ZWdvcnlJZDpudW1iZXIsIHdvcmtJdGVtSWQ6bnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrSXRlbUFjdGl2ZVN0YXR1cyA6IGJvb2xlYW4sIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZSBXb3JraXRlbSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkKGJ1aWxkaW5nSWQsIChlcnJvciwgYnVpbGRpbmc6QnVpbGRpbmcpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZExpc3QgPSBidWlsZGluZy5jb3N0SGVhZHM7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGNvc3RIZWFkRGF0YSBvZiBjb3N0SGVhZExpc3QpIHtcclxuICAgICAgICAgIGlmIChjb3N0SGVhZElkID09PSBjb3N0SGVhZERhdGEucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnlEYXRhIG9mIGNvc3RIZWFkRGF0YS5jYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5SWQgPT09IGNhdGVnb3J5RGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgd29ya0l0ZW1EYXRhIG9mIGNhdGVnb3J5RGF0YS53b3JrSXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHdvcmtJdGVtSWQgPT09IHdvcmtJdGVtRGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtRGF0YS5hY3RpdmUgPSB3b3JrSXRlbUFjdGl2ZVN0YXR1cztcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBidWlsZGluZ0lkfTtcclxuICAgICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGJ1aWxkaW5nLCB7bmV3OiB0cnVlfSwgKGVycm9yLCByZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgV29ya0l0ZW0gU3RhdHVzIE9mIFByb2plY3QgQ29zdEhlYWRzXHJcbiAgdXBkYXRlV29ya0l0ZW1TdGF0dXNPZlByb2plY3RDb3N0SGVhZHMocHJvamVjdElkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyLCB3b3JrSXRlbUlkOm51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrSXRlbUFjdGl2ZVN0YXR1cyA6IGJvb2xlYW4sIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIFVwZGF0ZSBXb3JrSXRlbSBTdGF0dXMgT2YgUHJvamVjdCBDb3N0IEhlYWRzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQnlJZChwcm9qZWN0SWQsIChlcnJvciwgcHJvamVjdDpQcm9qZWN0KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBjb3N0SGVhZERhdGEgb2YgY29zdEhlYWRMaXN0KSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWRJZCA9PT0gY29zdEhlYWREYXRhLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNhdGVnb3J5RGF0YSBvZiBjb3N0SGVhZERhdGEuY2F0ZWdvcmllcykge1xyXG4gICAgICAgICAgICAgIGlmIChjYXRlZ29yeUlkID09PSBjYXRlZ29yeURhdGEucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHdvcmtJdGVtRGF0YSBvZiBjYXRlZ29yeURhdGEud29ya0l0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbUlkID09PSB3b3JrSXRlbURhdGEucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB3b3JrSXRlbURhdGEuYWN0aXZlID0gd29ya0l0ZW1BY3RpdmVTdGF0dXM7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogcHJvamVjdElkfTtcclxuICAgICAgICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgcHJvamVjdCwge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgVXBkYXRlIFdvcmtJdGVtIFN0YXR1cyBPZiBQcm9qZWN0IENvc3QgSGVhZHMgLGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUJ1ZGdldGVkQ29zdEZvckNvc3RIZWFkKCBidWlsZGluZ0lkIDogc3RyaW5nLCBjb3N0SGVhZEJ1ZGdldGVkQW1vdW50IDogYW55LCB1c2VyOiBVc2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGVCdWRnZXRlZENvc3RGb3JDb3N0SGVhZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsnX2lkJyA6IGJ1aWxkaW5nSWQsICdjb3N0SGVhZHMubmFtZScgOiBjb3N0SGVhZEJ1ZGdldGVkQW1vdW50LmNvc3RIZWFkfTtcclxuXHJcbiAgICBsZXQgbmV3RGF0YSA9IHsgJHNldCA6IHtcclxuICAgICAgJ2Nvc3RIZWFkcy4kLmJ1ZGdldGVkQ29zdEFtb3VudCcgOiBjb3N0SGVhZEJ1ZGdldGVkQW1vdW50LmJ1ZGdldGVkQ29zdEFtb3VudCxcclxuICAgIH0gfTtcclxuXHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OnRydWV9LChlcnIsIHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3BvbnNlLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlQnVkZ2V0ZWRDb3N0Rm9yUHJvamVjdENvc3RIZWFkKCBwcm9qZWN0SWQgOiBzdHJpbmcsIGNvc3RIZWFkQnVkZ2V0ZWRBbW91bnQgOiBhbnksIHVzZXI6IFVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZUJ1ZGdldGVkQ29zdEZvckNvc3RIZWFkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHF1ZXJ5ID0geydfaWQnIDogcHJvamVjdElkLCAncHJvamVjdENvc3RIZWFkcy5uYW1lJyA6IGNvc3RIZWFkQnVkZ2V0ZWRBbW91bnQuY29zdEhlYWR9O1xyXG5cclxuICAgIGxldCBuZXdEYXRhID0geyAkc2V0IDoge1xyXG4gICAgICAncHJvamVjdENvc3RIZWFkcy4kLmJ1ZGdldGVkQ29zdEFtb3VudCcgOiBjb3N0SGVhZEJ1ZGdldGVkQW1vdW50LmJ1ZGdldGVkQ29zdEFtb3VudCxcclxuICAgIH0gfTtcclxuXHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXc6dHJ1ZX0sKGVyciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYoZXJyKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogcmVzcG9uc2UsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVRdWFudGl0eU9mQnVpbGRpbmdDb3N0SGVhZHMocHJvamVjdElkOnN0cmluZywgYnVpbGRpbmdJZDpzdHJpbmcsIGNvc3RIZWFkSWQ6bnVtYmVyLCBjYXRlZ29yeUlkOm51bWJlciwgd29ya0l0ZW1JZDpudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1YW50aXR5RGV0YWlsOlF1YW50aXR5RGV0YWlscywgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgdXBkYXRlUXVhbnRpdHlPZkJ1aWxkaW5nQ29zdEhlYWRzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkTGlzdCA9IGJ1aWxkaW5nLmNvc3RIZWFkcztcclxuICAgICAgICBsZXQgcXVhbnRpdHkgIDogUXVhbnRpdHk7XHJcbiAgICAgICAgZm9yIChsZXQgY29zdEhlYWQgb2YgY29zdEhlYWRMaXN0KSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWRJZCA9PT0gY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgbGV0IGNhdGVnb3JpZXNPZkNvc3RIZWFkID0gY29zdEhlYWQuY2F0ZWdvcmllcztcclxuICAgICAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnlEYXRhIG9mIGNhdGVnb3JpZXNPZkNvc3RIZWFkKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5SWQgPT09IGNhdGVnb3J5RGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgd29ya0l0ZW1EYXRhIG9mIGNhdGVnb3J5RGF0YS53b3JrSXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHdvcmtJdGVtSWQgPT09IHdvcmtJdGVtRGF0YS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5ICA9IHdvcmtJdGVtRGF0YS5xdWFudGl0eTtcclxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eS5pc0VzdGltYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVRdWFudGl0eUl0ZW1zT2ZXb3JrSXRlbSggcXVhbnRpdHksIHF1YW50aXR5RGV0YWlsKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBidWlsZGluZ0lkfTtcclxuICAgICAgICAgIGxldCBkYXRhID0geyRzZXQgOiB7J2Nvc3RIZWFkcycgOiBjb3N0SGVhZExpc3R9fTtcclxuICAgICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGRhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlUXVhbnRpdHlJdGVtc09mV29ya0l0ZW0ocXVhbnRpdHk6IFF1YW50aXR5LCBxdWFudGl0eURldGFpbDogUXVhbnRpdHlEZXRhaWxzKSB7XHJcblxyXG4gICAgcXVhbnRpdHkuaXNFc3RpbWF0ZWQgPSB0cnVlO1xyXG5cclxuICAgIGlmIChxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBxdWFudGl0eURldGFpbC50b3RhbCA9IGFsYXNxbCgnVkFMVUUgT0YgU0VMRUNUIFJPVU5EKFNVTShxdWFudGl0eSksMikgRlJPTSA/JywgW3F1YW50aXR5RGV0YWlsLnF1YW50aXR5SXRlbXNdKTtcclxuICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscy5wdXNoKHF1YW50aXR5RGV0YWlsKTtcclxuICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICBsZXQgaXNEZWZhdWx0RXhpc3RzU1FMID0gJ1NFTEVDVCBuYW1lIGZyb20gPyBBUyBxdWFudGl0eURldGFpbHMgd2hlcmUgcXVhbnRpdHlEZXRhaWxzLm5hbWU9XCJkZWZhdWx0XCInO1xyXG4gICAgICBsZXQgaXNEZWZhdWx0RXhpc3RzUXVhbnRpdHlEZXRhaWwgPSBhbGFzcWwoaXNEZWZhdWx0RXhpc3RzU1FMLCBbcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlsc10pO1xyXG5cclxuICAgICAgaWYgKGlzRGVmYXVsdEV4aXN0c1F1YW50aXR5RGV0YWlsLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzID0gW107XHJcbiAgICAgICAgcXVhbnRpdHlEZXRhaWwudG90YWwgPSBhbGFzcWwoJ1ZBTFVFIE9GIFNFTEVDVCBST1VORChTVU0ocXVhbnRpdHkpLDIpIEZST00gPycsIFtxdWFudGl0eURldGFpbC5xdWFudGl0eUl0ZW1zXSk7XHJcbiAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscy5wdXNoKHF1YW50aXR5RGV0YWlsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAocXVhbnRpdHlEZXRhaWwubmFtZSAhPT0gJ2RlZmF1bHQnKSB7XHJcbiAgICAgICAgICBsZXQgaXNJdGVtQWxyZWFkeUV4aXN0U1FMID0gJ1NFTEVDVCBuYW1lIGZyb20gPyBBUyBxdWFudGl0eURldGFpbHMgd2hlcmUgcXVhbnRpdHlEZXRhaWxzLm5hbWU9XCInICsgcXVhbnRpdHlEZXRhaWwubmFtZSArICdcIic7XHJcbiAgICAgICAgICBsZXQgaXNJdGVtQWxyZWFkeUV4aXN0cyA9IGFsYXNxbChpc0l0ZW1BbHJlYWR5RXhpc3RTUUwsIFtxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzXSk7XHJcblxyXG4gICAgICAgICAgaWYgKGlzSXRlbUFscmVhZHlFeGlzdHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBxdWFudGl0eWluZGV4ID0gMDsgcXVhbnRpdHlpbmRleCA8IHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHMubGVuZ3RoOyBxdWFudGl0eWluZGV4KyspIHtcclxuICAgICAgICAgICAgICBpZihxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzW3F1YW50aXR5aW5kZXhdLm5hbWUgPT09IHF1YW50aXR5RGV0YWlsLm5hbWUpIHtcclxuICAgICAgICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHNbcXVhbnRpdHlpbmRleF0ucXVhbnRpdHlJdGVtcyA9IHF1YW50aXR5RGV0YWlsLnF1YW50aXR5SXRlbXM7XHJcbiAgICAgICAgICAgICAgICBxdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzW3F1YW50aXR5aW5kZXhdLnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHF1YW50aXR5KSwyKSBGUk9NID8nLCBbcXVhbnRpdHlEZXRhaWwucXVhbnRpdHlJdGVtc10pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcXVhbnRpdHlEZXRhaWwudG90YWwgPSBhbGFzcWwoJ1ZBTFVFIE9GIFNFTEVDVCBST1VORChTVU0ocXVhbnRpdHkpLDIpIEZST00gPycsIFtxdWFudGl0eURldGFpbC5xdWFudGl0eUl0ZW1zXSk7XHJcbiAgICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHMucHVzaChxdWFudGl0eURldGFpbCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbURldGFpbHMgPSBbXTtcclxuICAgICAgICAgIHF1YW50aXR5RGV0YWlsLnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHF1YW50aXR5KSwyKSBGUk9NID8nLCBbcXVhbnRpdHlEZXRhaWwucXVhbnRpdHlJdGVtc10pO1xyXG4gICAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscy5wdXNoKHF1YW50aXR5RGV0YWlsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHF1YW50aXR5LnRvdGFsID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHRvdGFsKSwyKSBGUk9NID8nLCBbcXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlsc10pO1xyXG4gIH1cclxuXHJcbi8vVXBkYXRlIFF1YW50aXR5IE9mIFByb2plY3QgQ29zdCBIZWFkc1xyXG4gIHVwZGF0ZVF1YW50aXR5T2ZQcm9qZWN0Q29zdEhlYWRzKHByb2plY3RJZDpzdHJpbmcsIGNvc3RIZWFkSWQ6bnVtYmVyLCBjYXRlZ29yeUlkOm51bWJlciwgd29ya0l0ZW1JZDpudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlEZXRhaWxzOlF1YW50aXR5RGV0YWlscywgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgVXBkYXRlIFF1YW50aXR5IE9mIFByb2plY3QgQ29zdCBIZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZEJ5SWQocHJvamVjdElkLCAoZXJyb3IsIHByb2plY3QpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZExpc3QgPSBwcm9qZWN0LnByb2plY3RDb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IHF1YW50aXR5ICA6IFF1YW50aXR5O1xyXG4gICAgICAgIGZvciAobGV0IGNvc3RIZWFkIG9mIGNvc3RIZWFkTGlzdCkge1xyXG4gICAgICAgICAgaWYgKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgIGxldCBjYXRlZ29yaWVzT2ZDb3N0SGVhZCA9IGNvc3RIZWFkLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNhdGVnb3J5RGF0YSBvZiBjYXRlZ29yaWVzT2ZDb3N0SGVhZCkge1xyXG4gICAgICAgICAgICAgIGlmIChjYXRlZ29yeUlkID09PSBjYXRlZ29yeURhdGEucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCB3b3JrSXRlbXNPZkNhdGVnb3J5ID0gY2F0ZWdvcnlEYXRhLndvcmtJdGVtcztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHdvcmtJdGVtRGF0YSBvZiB3b3JrSXRlbXNPZkNhdGVnb3J5KSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbUlkID09PSB3b3JrSXRlbURhdGEucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eSA9IHdvcmtJdGVtRGF0YS5xdWFudGl0eTtcclxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eS5pc0VzdGltYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVRdWFudGl0eUl0ZW1zT2ZXb3JrSXRlbSggcXVhbnRpdHksIHF1YW50aXR5RGV0YWlscyk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBxdWVyeSA9IHtfaWQ6IHByb2plY3RJZH07XHJcbiAgICAgICAgbGV0IGRhdGEgPSB7JHNldCA6IHsncHJvamVjdENvc3RIZWFkcycgOiBjb3N0SGVhZExpc3R9fTtcclxuICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGRhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHByb2plY3QpID0+IHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vR2V0IEluLUFjdGl2ZSBDYXRlZ29yaWVzIEZyb20gRGF0YWJhc2VcclxuICBnZXRJbkFjdGl2ZUNhdGVnb3JpZXNCeUNvc3RIZWFkSWQocHJvamVjdElkOnN0cmluZywgYnVpbGRpbmdJZDpzdHJpbmcsIGNvc3RIZWFkSWQ6c3RyaW5nLCB1c2VyOlVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcblxyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBHZXQgSW4tQWN0aXZlIENhdGVnb3JpZXMgQnkgQ29zdCBIZWFkIElkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkcyA9IGJ1aWxkaW5nLmNvc3RIZWFkcztcclxuICAgICAgICBsZXQgY2F0ZWdvcmllcyA6IEFycmF5PENhdGVnb3J5Pj0gbmV3IEFycmF5PENhdGVnb3J5PigpO1xyXG4gICAgICAgIGZvcihsZXQgY29zdEhlYWRJbmRleCA9IDA7IGNvc3RIZWFkSW5kZXg8Y29zdEhlYWRzLmxlbmd0aDsgY29zdEhlYWRJbmRleCsrKSB7XHJcbiAgICAgICAgICBpZihwYXJzZUludChjb3N0SGVhZElkKSA9PT0gY29zdEhlYWRzW2Nvc3RIZWFkSW5kZXhdLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgIGxldCBjYXRlZ29yaWVzTGlzdCA9IGNvc3RIZWFkc1tjb3N0SGVhZEluZGV4XS5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICBmb3IobGV0IGNhdGVnb3J5SW5kZXggPSAwOyBjYXRlZ29yeUluZGV4IDwgY2F0ZWdvcmllc0xpc3QubGVuZ3RoOyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgICBpZihjYXRlZ29yaWVzTGlzdFtjYXRlZ29yeUluZGV4XS5hY3RpdmUgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yaWVzLnB1c2goY2F0ZWdvcmllc0xpc3RbY2F0ZWdvcnlJbmRleF0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogY2F0ZWdvcmllcywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldFdvcmtJdGVtTGlzdE9mQnVpbGRpbmdDYXRlZ29yeShwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyLCB1c2VyOlVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRXb3JrSXRlbUxpc3RPZkJ1aWxkaW5nQ2F0ZWdvcnkgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgbGV0IHF1ZXJ5ID0gW1xyXG4gICAgICB7ICRtYXRjaDogeydfaWQnOiBPYmplY3RJZChidWlsZGluZ0lkKSwgJ2Nvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCc6IGNvc3RIZWFkSWQgfX0sXHJcbiAgICAgIHsgJHVud2luZDogJyRjb3N0SGVhZHMnfSxcclxuICAgICAgeyAkcHJvamVjdCA6IHsnY29zdEhlYWRzJzoxLCdyYXRlcyc6MX19LFxyXG4gICAgICB7ICR1bndpbmQ6ICckY29zdEhlYWRzLmNhdGVnb3JpZXMnfSxcclxuICAgICAgeyAkbWF0Y2g6IHsnY29zdEhlYWRzLmNhdGVnb3JpZXMucmF0ZUFuYWx5c2lzSWQnOmNhdGVnb3J5SWR9fSxcclxuICAgICAgeyAkcHJvamVjdCA6IHsnY29zdEhlYWRzLmNhdGVnb3JpZXMud29ya0l0ZW1zJzoxLCAncmF0ZXMnOjF9fVxyXG4gICAgXTtcclxuXHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5hZ2dyZWdhdGUocXVlcnksIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIEdldCB3b3JraXRlbXMgZm9yIHNwZWNpZmljIGNhdGVnb3J5IGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYocmVzdWx0Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGxldCB3b3JrSXRlbXNPZkJ1aWxkaW5nQ2F0ZWdvcnkgPSByZXN1bHRbMF0uY29zdEhlYWRzLmNhdGVnb3JpZXMud29ya0l0ZW1zO1xyXG4gICAgICAgICAgbGV0IHdvcmtJdGVtc0xpc3RXaXRoQnVpbGRpbmdSYXRlcyA9IHRoaXMuZ2V0V29ya0l0ZW1MaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMod29ya0l0ZW1zT2ZCdWlsZGluZ0NhdGVnb3J5LCByZXN1bHRbMF0ucmF0ZXMsIHRydWUpO1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHdvcmtJdGVtc0xpc3RXaXRoQnVpbGRpbmdSYXRlcy53b3JrSXRlbXMsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbGV0IGVycm9yID0gbmV3IEVycm9yKCk7XHJcbiAgICAgICAgICBlcnJvci5tZXNzYWdlID0gbWVzc2FnZXMuTVNHX0VSUk9SX0VNUFRZX1JFU1BPTlNFO1xyXG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRXb3JrSXRlbUxpc3RPZlByb2plY3RDYXRlZ29yeShwcm9qZWN0SWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgY2F0ZWdvcnlJZDpudW1iZXIsIHVzZXI6VXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZ2V0V29ya0l0ZW1MaXN0T2ZQcm9qZWN0Q2F0ZWdvcnkgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgbGV0IHF1ZXJ5ID0gW1xyXG4gICAgICB7ICRtYXRjaDogeydfaWQnOiBPYmplY3RJZChwcm9qZWN0SWQpLCAncHJvamVjdENvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCc6IGNvc3RIZWFkSWQgfX0sXHJcbiAgICAgIHsgJHVud2luZDogJyRwcm9qZWN0Q29zdEhlYWRzJ30sXHJcbiAgICAgIHsgJHByb2plY3QgOiB7J3Byb2plY3RDb3N0SGVhZHMnOjEsJ3JhdGVzJzoxfX0sXHJcbiAgICAgIHsgJHVud2luZDogJyRwcm9qZWN0Q29zdEhlYWRzLmNhdGVnb3JpZXMnfSxcclxuICAgICAgeyAkbWF0Y2g6IHsncHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzLnJhdGVBbmFseXNpc0lkJzpjYXRlZ29yeUlkfX0sXHJcbiAgICAgIHsgJHByb2plY3QgOiB7J3Byb2plY3RDb3N0SGVhZHMuY2F0ZWdvcmllcy53b3JrSXRlbXMnOjEsJ3JhdGVzJzoxfX1cclxuICAgIF07XHJcblxyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5hZ2dyZWdhdGUocXVlcnksIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIEdldCB3b3JraXRlbXMgQnkgQ29zdCBIZWFkICYgY2F0ZWdvcnkgSWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZihyZXN1bHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgbGV0IHdvcmtJdGVtc09mQ2F0ZWdvcnkgPSByZXN1bHRbMF0ucHJvamVjdENvc3RIZWFkcy5jYXRlZ29yaWVzLndvcmtJdGVtcztcclxuICAgICAgICAgIGxldCB3b3JrSXRlbXNMaXN0V2l0aFJhdGVzID0gdGhpcy5nZXRXb3JrSXRlbUxpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyh3b3JrSXRlbXNPZkNhdGVnb3J5LCByZXN1bHRbMF0ucmF0ZXMsIHRydWUpO1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHdvcmtJdGVtc0xpc3RXaXRoUmF0ZXMud29ya0l0ZW1zLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2VzLk1TR19FUlJPUl9FTVBUWV9SRVNQT05TRTtcclxuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0V29ya0l0ZW1MaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMod29ya0l0ZW1zT2ZDYXRlZ29yeTogQXJyYXk8V29ya0l0ZW0+LCBjZW50cmFsaXplZFJhdGVzOiBBcnJheTxhbnk+LCBpc1dvcmtJdGVtQWN0aXZlOmJvb2xlYW4pIHtcclxuXHJcbiAgICBsZXQgd29ya0l0ZW1zTGlzdFdpdGhSYXRlczogV29ya0l0ZW1MaXN0V2l0aFJhdGVzRFRPID0gbmV3IFdvcmtJdGVtTGlzdFdpdGhSYXRlc0RUTygpO1xyXG4gICAgZm9yIChsZXQgd29ya0l0ZW1EYXRhIG9mIHdvcmtJdGVtc09mQ2F0ZWdvcnkpIHtcclxuICAgICAgaWYgKHdvcmtJdGVtRGF0YS5hY3RpdmUgPT09IGlzV29ya0l0ZW1BY3RpdmUpIHtcclxuICAgICAgICBsZXQgd29ya0l0ZW06IFdvcmtJdGVtID0gd29ya0l0ZW1EYXRhO1xyXG4gICAgICAgIGxldCByYXRlSXRlbXNPZldvcmtJdGVtID0gd29ya0l0ZW1EYXRhLnJhdGUucmF0ZUl0ZW1zO1xyXG4gICAgICAgIHdvcmtJdGVtLnJhdGUucmF0ZUl0ZW1zID0gdGhpcy5nZXRSYXRlc0Zyb21DZW50cmFsaXplZHJhdGVzKHJhdGVJdGVtc09mV29ya0l0ZW0sIGNlbnRyYWxpemVkUmF0ZXMpO1xyXG5cclxuICAgICAgICBsZXQgYXJyYXlPZlJhdGVJdGVtcyA9IHdvcmtJdGVtLnJhdGUucmF0ZUl0ZW1zO1xyXG4gICAgICAgIGxldCB0b3RhbE9mQWxsUmF0ZUl0ZW1zID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKHRvdGFsQW1vdW50KSwyKSBGUk9NID8nLFthcnJheU9mUmF0ZUl0ZW1zXSk7XHJcbiAgICAgICAgd29ya0l0ZW0ucmF0ZS50b3RhbCA9IHBhcnNlRmxvYXQoKHRvdGFsT2ZBbGxSYXRlSXRlbXMvd29ya0l0ZW0ucmF0ZS5xdWFudGl0eSkudG9GaXhlZChDb25zdGFudHMuTlVNQkVSX09GX0ZSQUNUSU9OX0RJR0lUKSk7XHJcblxyXG4gICAgICAgIGxldCBxdWFudGl0eUl0ZW1zID0gd29ya0l0ZW0ucXVhbnRpdHkucXVhbnRpdHlJdGVtRGV0YWlscztcclxuICAgICAgICB3b3JrSXRlbS5xdWFudGl0eS50b3RhbCA9IGFsYXNxbCgnVkFMVUUgT0YgU0VMRUNUIFJPVU5EKFNVTSh0b3RhbCksMikgRlJPTSA/JyxbcXVhbnRpdHlJdGVtc10pO1xyXG5cclxuICAgICAgICAgaWYod29ya0l0ZW0ucmF0ZS5pc0VzdGltYXRlZCAmJiB3b3JrSXRlbS5xdWFudGl0eS5pc0VzdGltYXRlZCkge1xyXG4gICAgICAgICAgIHdvcmtJdGVtLmFtb3VudCA9IHRoaXMuY29tbW9uU2VydmljZS5kZWNpbWFsQ29udmVyc2lvbih3b3JrSXRlbS5yYXRlLnRvdGFsICogd29ya0l0ZW0ucXVhbnRpdHkudG90YWwpO1xyXG4gICAgICAgICAgIHdvcmtJdGVtc0xpc3RXaXRoUmF0ZXMud29ya0l0ZW1zQW1vdW50ID0gd29ya0l0ZW1zTGlzdFdpdGhSYXRlcy53b3JrSXRlbXNBbW91bnQrIHdvcmtJdGVtLmFtb3VudDtcclxuICAgICAgICAgfVxyXG4gICAgICB3b3JrSXRlbXNMaXN0V2l0aFJhdGVzLndvcmtJdGVtcy5wdXNoKHdvcmtJdGVtKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHdvcmtJdGVtc0xpc3RXaXRoUmF0ZXM7XHJcbiAgfVxyXG5cclxuICBnZXRSYXRlc0Zyb21DZW50cmFsaXplZHJhdGVzKHJhdGVJdGVtc09mV29ya0l0ZW06IEFycmF5PFJhdGVJdGVtPiwgY2VudHJhbGl6ZWRSYXRlczpBcnJheTxhbnk+KSB7XHJcbiAgICBsZXQgcmF0ZUl0ZW1zU1FMID0gJ1NFTEVDVCByYXRlSXRlbS5pdGVtTmFtZSwgcmF0ZUl0ZW0ub3JpZ2luYWxJdGVtTmFtZSwgcmF0ZUl0ZW0ucmF0ZUFuYWx5c2lzSWQsIHJhdGVJdGVtLnR5cGUsJyArXHJcbiAgICAgICdyYXRlSXRlbS5xdWFudGl0eSwgY2VudHJhbGl6ZWRSYXRlcy5yYXRlLCByYXRlSXRlbS51bml0LCByYXRlSXRlbS50b3RhbEFtb3VudCwgcmF0ZUl0ZW0udG90YWxRdWFudGl0eSAnICtcclxuICAgICAgJ0ZST00gPyBBUyByYXRlSXRlbSBKT0lOID8gQVMgY2VudHJhbGl6ZWRSYXRlcyBPTiByYXRlSXRlbS5pdGVtTmFtZSA9IGNlbnRyYWxpemVkUmF0ZXMuaXRlbU5hbWUnO1xyXG4gICAgbGV0IHJhdGVJdGVtc0ZvcldvcmtJdGVtID0gYWxhc3FsKHJhdGVJdGVtc1NRTCwgW3JhdGVJdGVtc09mV29ya0l0ZW0sIGNlbnRyYWxpemVkUmF0ZXNdKTtcclxuICAgIHJldHVybiByYXRlSXRlbXNGb3JXb3JrSXRlbTtcclxuICB9XHJcblxyXG4gIGFkZFdvcmtpdGVtKHByb2plY3RJZDpzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgY2F0ZWdvcnlJZDpudW1iZXIsIHdvcmtJdGVtOiBXb3JrSXRlbSxcclxuICAgICAgICAgICAgICB1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBhZGRXb3JraXRlbSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkKGJ1aWxkaW5nSWQsIChlcnJvciwgYnVpbGRpbmc6QnVpbGRpbmcpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCByZXNwb25zZVdvcmtpdGVtIDogQXJyYXk8V29ya0l0ZW0+PSBudWxsO1xyXG4gICAgICAgIGZvcihsZXQgaW5kZXggPSAwOyBidWlsZGluZy5jb3N0SGVhZHMubGVuZ3RoID4gaW5kZXg7IGluZGV4KyspIHtcclxuICAgICAgICAgIGlmKGJ1aWxkaW5nLmNvc3RIZWFkc1tpbmRleF0ucmF0ZUFuYWx5c2lzSWQgPT09IGNvc3RIZWFkSWQpIHtcclxuICAgICAgICAgICAgbGV0IGNhdGVnb3J5ID0gYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICBmb3IobGV0IGNhdGVnb3J5SW5kZXggPSAwOyBjYXRlZ29yeS5sZW5ndGggPiBjYXRlZ29yeUluZGV4OyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgICBpZihjYXRlZ29yeVtjYXRlZ29yeUluZGV4XS5yYXRlQW5hbHlzaXNJZCA9PT0gY2F0ZWdvcnlJZCkge1xyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnlbY2F0ZWdvcnlJbmRleF0ud29ya0l0ZW1zLnB1c2god29ya0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2VXb3JraXRlbSA9IGNhdGVnb3J5W2NhdGVnb3J5SW5kZXhdLndvcmtJdGVtcztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHF1ZXJ5ID0geyBfaWQgOiBidWlsZGluZ0lkIH07XHJcbiAgICAgICAgICAgIGxldCBuZXdEYXRhID0geyAkc2V0IDogeydjb3N0SGVhZHMnIDogYnVpbGRpbmcuY29zdEhlYWRzfX07XHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEse25ldzogdHJ1ZX0sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogcmVzcG9uc2VXb3JraXRlbSwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFkZENhdGVnb3J5QnlDb3N0SGVhZElkKHByb2plY3RJZDpzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOnN0cmluZywgY2F0ZWdvcnlEZXRhaWxzIDogYW55LCB1c2VyOlVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuXHJcbiAgICBsZXQgY2F0ZWdvcnlPYmogOiBDYXRlZ29yeSA9IG5ldyBDYXRlZ29yeShjYXRlZ29yeURldGFpbHMuY2F0ZWdvcnksIGNhdGVnb3J5RGV0YWlscy5jYXRlZ29yeUlkKTtcclxuXHJcbiAgICBsZXQgcXVlcnkgPSB7J19pZCcgOiBidWlsZGluZ0lkLCAnY29zdEhlYWRzLnJhdGVBbmFseXNpc0lkJyA6IHBhcnNlSW50KGNvc3RIZWFkSWQpfTtcclxuICAgIGxldCBuZXdEYXRhID0geyAkcHVzaDogeyAnY29zdEhlYWRzLiQuY2F0ZWdvcmllcyc6IGNhdGVnb3J5T2JqIH19O1xyXG5cclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEse25ldzogdHJ1ZX0sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgYWRkQ2F0ZWdvcnlCeUNvc3RIZWFkSWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogYnVpbGRpbmcsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvL1VwZGF0ZSBzdGF0dXMgKCB0cnVlL2ZhbHNlICkgb2YgY2F0ZWdvcnlcclxuICB1cGRhdGVDYXRlZ29yeVN0YXR1cyhwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyICxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeUFjdGl2ZVN0YXR1czpib29sZWFuLCB1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcblxyXG4gICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nOkJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZSBDYXRlZ29yeSBTdGF0dXMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRzID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjYXRlZ29yaWVzIDogQXJyYXk8Q2F0ZWdvcnk+PSBuZXcgQXJyYXk8Q2F0ZWdvcnk+KCk7XHJcbiAgICAgICAgbGV0IHVwZGF0ZWRDYXRlZ29yaWVzIDogQXJyYXk8Q2F0ZWdvcnk+PSBuZXcgQXJyYXk8Q2F0ZWdvcnk+KCk7XHJcbiAgICAgICAgbGV0IGluZGV4IDogbnVtYmVyO1xyXG5cclxuICAgICAgICBmb3IobGV0IGNvc3RIZWFkSW5kZXg9MDsgY29zdEhlYWRJbmRleDxjb3N0SGVhZHMubGVuZ3RoOyBjb3N0SGVhZEluZGV4KyspIHtcclxuICAgICAgICAgIGlmKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkc1tjb3N0SGVhZEluZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBjYXRlZ29yaWVzID0gY29zdEhlYWRzW2Nvc3RIZWFkSW5kZXhdLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgICAgIGZvcihsZXQgY2F0ZWdvcnlJbmRleCA9IDA7IGNhdGVnb3J5SW5kZXg8Y2F0ZWdvcmllcy5sZW5ndGg7IGNhdGVnb3J5SW5kZXgrKykge1xyXG4gICAgICAgICAgICAgIGlmKGNhdGVnb3JpZXNbY2F0ZWdvcnlJbmRleF0ucmF0ZUFuYWx5c2lzSWQgPT09IGNhdGVnb3J5SWQpIHtcclxuICAgICAgICAgICAgICAgIGNhdGVnb3JpZXNbY2F0ZWdvcnlJbmRleF0uYWN0aXZlID0gY2F0ZWdvcnlBY3RpdmVTdGF0dXM7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkQ2F0ZWdvcmllcy5wdXNoKGNhdGVnb3JpZXNbY2F0ZWdvcnlJbmRleF0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0geydfaWQnIDogYnVpbGRpbmdJZCwgJ2Nvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCcgOiBjb3N0SGVhZElkfTtcclxuICAgICAgICBsZXQgbmV3RGF0YSA9IHsnJHNldCcgOiB7J2Nvc3RIZWFkcy4kLmNhdGVnb3JpZXMnIDogY2F0ZWdvcmllcyB9fTtcclxuXHJcbiAgICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSx7bmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiB1cGRhdGVkQ2F0ZWdvcmllcywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vR2V0IGFjdGl2ZSBjYXRlZ29yaWVzIGZyb20gZGF0YWJhc2VcclxuICBnZXRDYXRlZ29yaWVzT2ZCdWlsZGluZ0Nvc3RIZWFkKHByb2plY3RJZDpzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgdXNlcjpVc2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIEdldCBBY3RpdmUgQ2F0ZWdvcmllcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkKGJ1aWxkaW5nSWQsIChlcnJvciwgYnVpbGRpbmc6QnVpbGRpbmcpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBidWlsZGluZ0Nvc3RIZWFkcyA9IGJ1aWxkaW5nLmNvc3RIZWFkcztcclxuICAgICAgICBsZXQgY2F0ZWdvcmllc0xpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyA6IENhdGVnb3JpZXNMaXN0V2l0aFJhdGVzRFRPO1xyXG5cclxuICAgICAgICBmb3IobGV0IGNvc3RIZWFkRGF0YSBvZiBidWlsZGluZ0Nvc3RIZWFkcykge1xyXG4gICAgICAgICAgaWYoY29zdEhlYWREYXRhLnJhdGVBbmFseXNpc0lkID09PSBjb3N0SGVhZElkKSB7XHJcbiAgICAgICAgICAgIGNhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMgPSB0aGlzLmdldENhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMoY29zdEhlYWREYXRhLmNhdGVnb3JpZXMsIGJ1aWxkaW5nLnJhdGVzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiBjYXRlZ29yaWVzTGlzdFdpdGhDZW50cmFsaXplZFJhdGVzLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy9HZXQgY2F0ZWdvcmllcyBvZiBwcm9qZWN0Q29zdEhlYWRzIGZyb20gZGF0YWJhc2VcclxuICBnZXRDYXRlZ29yaWVzT2ZQcm9qZWN0Q29zdEhlYWQocHJvamVjdElkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIHVzZXI6VXNlciwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBHZXQgUHJvamVjdCBDb3N0SGVhZCBDYXRlZ29yaWVzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQnlJZChwcm9qZWN0SWQsIChlcnJvciwgcHJvamVjdDpQcm9qZWN0KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcHJvamVjdENvc3RIZWFkcyA9IHByb2plY3QucHJvamVjdENvc3RIZWFkcztcclxuICAgICAgICBsZXQgY2F0ZWdvcmllc0xpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyA6IENhdGVnb3JpZXNMaXN0V2l0aFJhdGVzRFRPO1xyXG5cclxuICAgICAgICBmb3IobGV0IGNvc3RIZWFkRGF0YSBvZiBwcm9qZWN0Q29zdEhlYWRzKSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWREYXRhLnJhdGVBbmFseXNpc0lkID09PSBjb3N0SGVhZElkKSB7XHJcbiAgICAgICAgICAgIGNhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMgPSB0aGlzLmdldENhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMoY29zdEhlYWREYXRhLmNhdGVnb3JpZXMsIHByb2plY3QucmF0ZXMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IGNhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvL0dldCBjYXRlZ29yeSBsaXN0IHdpdGggY2VudHJhbGl6ZWQgcmF0ZVxyXG4gIGdldENhdGVnb3JpZXNMaXN0V2l0aENlbnRyYWxpemVkUmF0ZXMoY2F0ZWdvcmllc09mQ29zdEhlYWQ6IEFycmF5PENhdGVnb3J5PiwgY2VudHJhbGl6ZWRSYXRlczogQXJyYXk8Q2VudHJhbGl6ZWRSYXRlPikge1xyXG4gICAgbGV0IGNhdGVnb3JpZXNUb3RhbEFtb3VudCA9IDAgO1xyXG5cclxuICAgIGxldCBjYXRlZ29yaWVzTGlzdFdpdGhSYXRlcyA6IENhdGVnb3JpZXNMaXN0V2l0aFJhdGVzRFRPID0gbmV3IENhdGVnb3JpZXNMaXN0V2l0aFJhdGVzRFRPO1xyXG5cclxuICAgIGZvciAobGV0IGNhdGVnb3J5RGF0YSBvZiBjYXRlZ29yaWVzT2ZDb3N0SGVhZCkge1xyXG4gICAgICBsZXQgd29ya0l0ZW1zID0gdGhpcy5nZXRXb3JrSXRlbUxpc3RXaXRoQ2VudHJhbGl6ZWRSYXRlcyhjYXRlZ29yeURhdGEud29ya0l0ZW1zLCBjZW50cmFsaXplZFJhdGVzLCB0cnVlKTtcclxuICAgICAgY2F0ZWdvcnlEYXRhLmFtb3VudCA9IHdvcmtJdGVtcy53b3JrSXRlbXNBbW91bnQ7XHJcbiAgICAgIGNhdGVnb3JpZXNUb3RhbEFtb3VudCA9IGNhdGVnb3JpZXNUb3RhbEFtb3VudCArIHdvcmtJdGVtcy53b3JrSXRlbXNBbW91bnQ7XHJcbiAgICAgIGRlbGV0ZSBjYXRlZ29yeURhdGEud29ya0l0ZW1zO1xyXG4gICAgICBjYXRlZ29yaWVzTGlzdFdpdGhSYXRlcy5jYXRlZ29yaWVzLnB1c2goY2F0ZWdvcnlEYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBpZihjYXRlZ29yaWVzVG90YWxBbW91bnQgIT09IDApIHtcclxuICAgICAgY2F0ZWdvcmllc0xpc3RXaXRoUmF0ZXMuY2F0ZWdvcmllc0Ftb3VudCA9IHRoaXMuY29tbW9uU2VydmljZS5kZWNpbWFsQ29udmVyc2lvbihjYXRlZ29yaWVzVG90YWxBbW91bnQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBjYXRlZ29yaWVzTGlzdFdpdGhSYXRlcztcclxuICB9XHJcblxyXG4gIHN5bmNQcm9qZWN0V2l0aFJhdGVBbmFseXNpc0RhdGEocHJvamVjdElkOnN0cmluZywgYnVpbGRpbmdJZDpzdHJpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6YW55LCByZXN1bHQ6YW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHN5bmNQcm9qZWN0V2l0aFJhdGVBbmFseXNpc0RhdGEgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmdldFByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMocHJvamVjdElkLCBidWlsZGluZ0lkLChlcnJvciwgcHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBsb2dnZXIuZXJyb3IoJ1Byb2plY3Qgc2VydmljZSwgZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyBmYWlsZWQnKTtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgc3luY1Byb2plY3RXaXRoUmF0ZUFuYWx5c2lzRGF0YS4nKTtcclxuICAgICAgICBsZXQgcHJvamVjdERhdGEgPSBwcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzLmRhdGFbMF07XHJcbiAgICAgICAgbGV0IGJ1aWxkaW5ncyA9IHByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMuZGF0YVswXS5idWlsZGluZ3M7XHJcbiAgICAgICAgbGV0IGJ1aWxkaW5nRGF0YTogYW55O1xyXG5cclxuICAgICAgICBmb3IobGV0IGJ1aWxkaW5nIG9mIGJ1aWxkaW5ncykge1xyXG4gICAgICAgICAgaWYoYnVpbGRpbmcuX2lkID09IGJ1aWxkaW5nSWQpIHtcclxuICAgICAgICAgICAgYnVpbGRpbmdEYXRhID0gYnVpbGRpbmc7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYocHJvamVjdERhdGEucHJvamVjdENvc3RIZWFkcy5sZW5ndGggPiAwICkge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgc3luY1dpdGhSYXRlQW5hbHlzaXNEYXRhIGJ1aWxkaW5nIE9ubHkuJyk7XHJcbiAgICAgICAgICB0aGlzLnVwZGF0ZUNvc3RIZWFkc0ZvckJ1aWxkaW5nQW5kUHJvamVjdChjYWxsYmFjaywgcHJvamVjdERhdGEsIGJ1aWxkaW5nRGF0YSwgYnVpbGRpbmdJZCwgcHJvamVjdElkKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNhbGxpbmcgcHJvbWlzZSBmb3Igc3luY1Byb2plY3RXaXRoUmF0ZUFuYWx5c2lzRGF0YSBmb3IgUHJvamVjdCBhbmQgQnVpbGRpbmcuJyk7XHJcbiAgICAgICAgICBsZXQgc3luY0J1aWxkaW5nQ29zdEhlYWRzUHJvbWlzZSA9IHRoaXMudXBkYXRlQnVkZ2V0UmF0ZXNGb3JCdWlsZGluZ0Nvc3RIZWFkcyhDb25zdGFudHMuQlVJTERJTkcsXHJcbiAgICAgICAgICAgIGJ1aWxkaW5nSWQsIHByb2plY3REYXRhLCBidWlsZGluZ0RhdGEpO1xyXG4gICAgICAgICAgbGV0IHN5bmNQcm9qZWN0Q29zdEhlYWRzUHJvbWlzZSA9IHRoaXMudXBkYXRlQnVkZ2V0UmF0ZXNGb3JQcm9qZWN0Q29zdEhlYWRzKENvbnN0YW50cy5BTUVOSVRJRVMsXHJcbiAgICAgICAgICAgIHByb2plY3RJZCwgcHJvamVjdERhdGEsIGJ1aWxkaW5nRGF0YSk7XHJcblxyXG4gICAgICAgICAgQ0NQcm9taXNlLmFsbChbXHJcbiAgICAgICAgICAgIHN5bmNCdWlsZGluZ0Nvc3RIZWFkc1Byb21pc2UsXHJcbiAgICAgICAgICAgIHN5bmNQcm9qZWN0Q29zdEhlYWRzUHJvbWlzZVxyXG4gICAgICAgICAgXSkudGhlbihmdW5jdGlvbihkYXRhOiBBcnJheTxhbnk+KSB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9taXNlIGZvciBzeW5jUHJvamVjdFdpdGhSYXRlQW5hbHlzaXNEYXRhIGZvciBQcm9qZWN0IGFuZCBCdWlsZGluZyBzdWNjZXNzJyk7XHJcbiAgICAgICAgICAgIGxldCBidWlsZGluZ0Nvc3RIZWFkc0RhdGEgPSBkYXRhWzBdO1xyXG4gICAgICAgICAgICBsZXQgcHJvamVjdENvc3RIZWFkc0RhdGEgPSBkYXRhWzFdO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7c3RhdHVzOjIwMH0pO1xyXG4gICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZTphbnkpIHtcclxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCcgUHJvbWlzZSBmYWlsZWQgZm9yIHN5bmNQcm9qZWN0V2l0aFJhdGVBbmFseXNpc0RhdGEgISA6JyArSlNPTi5zdHJpbmdpZnkoZSkpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlQ29zdEhlYWRzRm9yQnVpbGRpbmdBbmRQcm9qZWN0KGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3REYXRhOiBhbnksIGJ1aWxkaW5nRGF0YTogYW55LCBidWlsZGluZ0lkOiBzdHJpbmcsIHByb2plY3RJZDogc3RyaW5nKSB7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ3VwZGF0ZUNvc3RIZWFkc0ZvckJ1aWxkaW5nQW5kUHJvamVjdCBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCByYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICAgIGxldCBidWlsZGluZ1JlcG9zaXRvcnkgPSBuZXcgQnVpbGRpbmdSZXBvc2l0b3J5KCk7XHJcbiAgICBsZXQgcHJvamVjdFJlcG9zaXRvcnkgPSBuZXcgUHJvamVjdFJlcG9zaXRvcnkoKTtcclxuXHJcbiAgICByYXRlQW5hbHlzaXNTZXJ2aWNlLmNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbChDb25zdGFudHMuQlVJTERJTkcsXHJcbiAgICAgIChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBpbiB1cGRhdGVDb3N0SGVhZHNGb3JCdWlsZGluZ0FuZFByb2plY3QgOiBjb252ZXJ0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpc1RvQ29zdENvbnRyb2wgOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcclxuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ0dldEFsbERhdGFGcm9tUmF0ZUFuYWx5c2lzIHN1Y2Nlc3MnKTtcclxuICAgICAgICAgIGxldCBwcm9qZWN0U2VydmljZSA9IG5ldyBQcm9qZWN0U2VydmljZSgpO1xyXG4gICAgICAgICAgbGV0IGRhdGEgPSBwcm9qZWN0U2VydmljZS5jYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQnVpbGRpbmcocmVzdWx0LmJ1aWxkaW5nQ29zdEhlYWRzLCBwcm9qZWN0RGF0YSwgYnVpbGRpbmdEYXRhKTtcclxuICAgICAgICAgIGxldCByYXRlcyAgPSAgdGhpcy5nZXRSYXRlcyhyZXN1bHQsIGRhdGEpO1xyXG4gICAgICAgICAgbGV0IHF1ZXJ5Rm9yQnVpbGRpbmcgPSB7J19pZCc6IGJ1aWxkaW5nSWR9O1xyXG4gICAgICAgICAgbGV0IHVwZGF0ZUNvc3RIZWFkID0geyRzZXQ6IHsnY29zdEhlYWRzJzogZGF0YSwgJ3JhdGVzJzogcmF0ZXMgfX07XHJcbiAgICAgICAgICBidWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeUZvckJ1aWxkaW5nLCB1cGRhdGVDb3N0SGVhZCwge25ldzogdHJ1ZX0sIChlcnJvcjogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gVXBkYXRlIGNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbCBidWlsZGluZ0Nvc3RIZWFkc0RhdGEgIDogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdVcGRhdGVCdWlsZGluZ0Nvc3RIZWFkIHN1Y2Nlc3MnKTtcclxuICAgICAgICAgICAgICBsZXQgcHJvamVjdENvc3RIZWFkcyA9IHByb2plY3RTZXJ2aWNlLmNhbGN1bGF0ZUJ1ZGdldENvc3RGb3JDb21tb25BbW1lbml0aWVzKFxyXG4gICAgICAgICAgICAgICAgcHJvamVjdERhdGEucHJvamVjdENvc3RIZWFkcyxwcm9qZWN0RGF0YSwgYnVpbGRpbmdEYXRhKTtcclxuICAgICAgICAgICAgICBsZXQgcXVlcnlGb3JQcm9qZWN0ID0geydfaWQnOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgICAgICAgIGxldCB1cGRhdGVQcm9qZWN0Q29zdEhlYWQgPSB7JHNldDogeydwcm9qZWN0Q29zdEhlYWRzJzogcHJvamVjdENvc3RIZWFkc319O1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdDYWxsaW5nIHVwZGF0ZSBwcm9qZWN0IENvc3RoZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgICBwcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5Rm9yUHJvamVjdCwgdXBkYXRlUHJvamVjdENvc3RIZWFkLCB7bmV3OiB0cnVlfSxcclxuICAgICAgICAgICAgICAgIChlcnJvcjogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnIoJ0Vycm9yIHVwZGF0ZSBwcm9qZWN0IENvc3RoZWFkcyA6ICcgKyBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ1VwZGF0ZSBwcm9qZWN0IENvc3RoZWFkcyBzdWNjZXNzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUJ1ZGdldFJhdGVzRm9yQnVpbGRpbmdDb3N0SGVhZHMoZW50aXR5OiBzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBwcm9qZWN0RGV0YWlscyA6IFByb2plY3QsIGJ1aWxkaW5nRGV0YWlscyA6IEJ1aWxkaW5nKSB7XHJcbiAgICByZXR1cm4gbmV3IENDUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlOmFueSwgcmVqZWN0OmFueSkge1xyXG4gICAgICBsZXQgcmF0ZUFuYWx5c2lzU2VydmljZSA9IG5ldyBSYXRlQW5hbHlzaXNTZXJ2aWNlKCk7XHJcbiAgICAgIGxldCBwcm9qZWN0U2VydmljZSA9IG5ldyBQcm9qZWN0U2VydmljZSgpO1xyXG4gICAgICBsZXQgYnVpbGRpbmdSZXBvc2l0b3J5ID0gbmV3IEJ1aWxkaW5nUmVwb3NpdG9yeSgpO1xyXG4gICAgICBsb2dnZXIuaW5mbygnSW5zaWRlIHVwZGF0ZUJ1ZGdldFJhdGVzRm9yQnVpbGRpbmdDb3N0SGVhZHMgcHJvbWlzZS4nKTtcclxuICAgICAgcmF0ZUFuYWx5c2lzU2VydmljZS5jb252ZXJ0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpc1RvQ29zdENvbnRyb2woZW50aXR5LCAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgIGxvZ2dlci5lcnIoJ0Vycm9yIGluIHByb21pc2UgdXBkYXRlQnVkZ2V0UmF0ZXNGb3JCdWlsZGluZ0Nvc3RIZWFkcyA6ICcgKyBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ0luc2lkZSB1cGRhdGVCdWRnZXRSYXRlc0ZvckJ1aWxkaW5nQ29zdEhlYWRzIHN1Y2Nlc3MnKTtcclxuICAgICAgICAgIGxldCBwcm9qZWN0U2VydmljZSA9IG5ldyBQcm9qZWN0U2VydmljZSgpO1xyXG4gICAgICAgICAgbGV0IGJ1aWxkaW5nQ29zdEhlYWRzID0gcHJvamVjdFNlcnZpY2UuY2FsY3VsYXRlQnVkZ2V0Q29zdEZvckJ1aWxkaW5nKHJlc3VsdC5idWlsZGluZ0Nvc3RIZWFkcywgcHJvamVjdERldGFpbHMsIGJ1aWxkaW5nRGV0YWlscyk7XHJcbiAgICAgICAgICBsZXQgcmF0ZXMgID0gcHJvamVjdFNlcnZpY2UuZ2V0UmF0ZXMocmVzdWx0LCBidWlsZGluZ0Nvc3RIZWFkcyk7XHJcbiAgICAgICAgICBsZXQgcXVlcnkgPSB7J19pZCc6IGJ1aWxkaW5nSWR9O1xyXG4gICAgICAgICAgbGV0IG5ld0RhdGEgPSB7JHNldDogeydjb3N0SGVhZHMnOiBidWlsZGluZ0Nvc3RIZWFkcywgJ3JhdGVzJzogcmF0ZXN9fTtcclxuICAgICAgICAgIGJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yOmFueSwgcmVzcG9uc2U6YW55KSA9PiB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldEFsbERhdGFGcm9tUmF0ZUFuYWx5c2lzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGluIFVwZGF0ZSBidWlsZGluZ0Nvc3RIZWFkc0RhdGEgIDogJytKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdVcGRhdGVkIGJ1aWxkaW5nQ29zdEhlYWRzRGF0YScpO1xyXG4gICAgICAgICAgICAgIHJlc29sdmUoJ0RvbmUnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGU6YW55KXtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBpbiB1cGRhdGVCdWRnZXRSYXRlc0ZvckJ1aWxkaW5nQ29zdEhlYWRzIDonK2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRSYXRlcyhyZXN1bHQ6IGFueSwgY29zdEhlYWRzOiBBcnJheTxDb3N0SGVhZD4pIHtcclxuICAgIGxldCBnZXRSYXRlc0xpc3RTUUwgPSAnU0VMRUNUICogRlJPTSA/IEFTIHEgV0hFUkUgcS5DNCBJTiAoU0VMRUNUIHQucmF0ZUFuYWx5c2lzSWQgJyArXHJcbiAgICAgICdGUk9NID8gQVMgdCknO1xyXG4gICAgbGV0IHJhdGVJdGVtcyA9IGFsYXNxbChnZXRSYXRlc0xpc3RTUUwsIFtyZXN1bHQucmF0ZXMsIGNvc3RIZWFkc10pO1xyXG5cclxuICAgIGxldCByYXRlSXRlbXNSYXRlQW5hbHlzaXNTUUwgPSAnU0VMRUNUIHJhdGVJdGVtLkMyIEFTIGl0ZW1OYW1lLCByYXRlSXRlbS5DMiBBUyBvcmlnaW5hbEl0ZW1OYW1lLCcgK1xyXG4gICAgICAncmF0ZUl0ZW0uQzEyIEFTIHJhdGVBbmFseXNpc0lkLCByYXRlSXRlbS5DNiBBUyB0eXBlLCcgK1xyXG4gICAgICAnUk9VTkQocmF0ZUl0ZW0uQzcsMikgQVMgcXVhbnRpdHksIFJPVU5EKHJhdGVJdGVtLkMzLDIpIEFTIHJhdGUsIHVuaXQuQzIgQVMgdW5pdCwnICtcclxuICAgICAgJ1JPVU5EKHJhdGVJdGVtLkMzICogcmF0ZUl0ZW0uQzcsMikgQVMgdG90YWxBbW91bnQsIHJhdGVJdGVtLkM1IEFTIHRvdGFsUXVhbnRpdHkgJyArXHJcbiAgICAgICdGUk9NID8gQVMgcmF0ZUl0ZW0gSk9JTiA/IEFTIHVuaXQgT04gdW5pdC5DMSA9IHJhdGVJdGVtLkM5JztcclxuXHJcbiAgICBsZXQgcmF0ZUl0ZW1zTGlzdCA9IGFsYXNxbChyYXRlSXRlbXNSYXRlQW5hbHlzaXNTUUwsIFtyYXRlSXRlbXMsIHJlc3VsdC51bml0c10pO1xyXG5cclxuICAgIGxldCBkaXN0aW5jdEl0ZW1zU1FMID0gJ3NlbGVjdCBESVNUSU5DVCBpdGVtTmFtZSxvcmlnaW5hbEl0ZW1OYW1lLHJhdGUgRlJPTSA/JztcclxuICAgIHZhciBkaXN0aW5jdFJhdGVzID0gYWxhc3FsIChkaXN0aW5jdEl0ZW1zU1FMLCBbcmF0ZUl0ZW1zTGlzdF0pO1xyXG5cclxuICAgIHJldHVybiBkaXN0aW5jdFJhdGVzO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlQnVkZ2V0UmF0ZXNGb3JQcm9qZWN0Q29zdEhlYWRzKGVudGl0eTogc3RyaW5nLCBwcm9qZWN0SWQ6c3RyaW5nLCBwcm9qZWN0RGV0YWlscyA6IFByb2plY3QsIGJ1aWxkaW5nRGV0YWlscyA6IEJ1aWxkaW5nKSB7XHJcbiAgICByZXR1cm4gbmV3IENDUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlOmFueSwgcmVqZWN0OmFueSl7XHJcbiAgICAgIGxldCByYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICAgICAgbGV0IHByb2plY3RSZXBvc2l0b3J5ID0gbmV3IFByb2plY3RSZXBvc2l0b3J5KCk7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdJbnNpZGUgdXBkYXRlQnVkZ2V0UmF0ZXNGb3JQcm9qZWN0Q29zdEhlYWRzIHByb21pc2UuJyk7XHJcbiAgICAgIHJhdGVBbmFseXNpc1NlcnZpY2UuY29udmVydENvc3RIZWFkc0Zyb21SYXRlQW5hbHlzaXNUb0Nvc3RDb250cm9sKGVudGl0eSwgKGVycm9yIDogYW55LCByZXN1bHQ6IGFueSkgPT4ge1xyXG4gICAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgICBsb2dnZXIuZXJyKCdFcnJvciBpbiB1cGRhdGVCdWRnZXRSYXRlc0ZvclByb2plY3RDb3N0SGVhZHMgcHJvbWlzZSA6ICcgKyBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgcHJvamVjdFNlcnZpY2UgPSBuZXcgUHJvamVjdFNlcnZpY2UoKTtcclxuICAgICAgICAgICAgbGV0IHByb2plY3RDb3N0SGVhZHMgPSBwcm9qZWN0U2VydmljZS5jYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQ29tbW9uQW1tZW5pdGllcyhcclxuICAgICAgICAgICAgICByZXN1bHQuYnVpbGRpbmdDb3N0SGVhZHMsIHByb2plY3REZXRhaWxzLCBidWlsZGluZ0RldGFpbHMpO1xyXG4gICAgICAgICAgICBsZXQgcmF0ZXMgID0gcHJvamVjdFNlcnZpY2UuZ2V0UmF0ZXMocmVzdWx0LCBwcm9qZWN0Q29zdEhlYWRzKTtcclxuICAgICAgICAgICAgbGV0IHF1ZXJ5ID0geydfaWQnOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgICAgICBsZXQgbmV3RGF0YSA9IHskc2V0OiB7J3Byb2plY3RDb3N0SGVhZHMnOiBwcm9qZWN0Q29zdEhlYWRzLCAncmF0ZXMnOiByYXRlc319O1xyXG4gICAgICAgICAgICBwcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yOiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRBbGxEYXRhRnJvbVJhdGVBbmFseXNpcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gVXBkYXRlIGJ1aWxkaW5nQ29zdEhlYWRzRGF0YSAgOiAnK0pTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ1VwZGF0ZWQgcHJvamVjdENvc3RIZWFkcycpO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgnRG9uZScpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSkuY2F0Y2goZnVuY3Rpb24oZTphbnkpe1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGluIHVwZGF0ZUJ1ZGdldFJhdGVzRm9yUHJvamVjdENvc3RIZWFkcyA6JytlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgY2FsY3VsYXRlQnVkZ2V0Q29zdEZvckJ1aWxkaW5nKGNvc3RIZWFkc1JhdGVBbmFseXNpczogYW55LCBwcm9qZWN0RGV0YWlscyA6IFByb2plY3QsIGJ1aWxkaW5nRGV0YWlscyA6IGFueSkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgY2FsY3VsYXRlQnVkZ2V0Q29zdEZvckJ1aWxkaW5nIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IGNvc3RIZWFkczpBcnJheTxDb3N0SGVhZD4gPSBuZXcgQXJyYXk8Q29zdEhlYWQ+KCk7XHJcbiAgICBsZXQgYnVkZ2V0ZWRDb3N0QW1vdW50OiBudW1iZXI7XHJcbiAgICBsZXQgY2FsY3VsYXRlQnVkZ3RlZENvc3QgOiBzdHJpbmc7XHJcblxyXG4gICAgZm9yKGxldCBjb3N0SGVhZCBvZiBjb3N0SGVhZHNSYXRlQW5hbHlzaXMpIHtcclxuXHJcbiAgICAgIGxldCBidWRnZXRDb3N0Rm9ybXVsYWU6c3RyaW5nO1xyXG5cclxuICAgICAgc3dpdGNoKGNvc3RIZWFkLm5hbWUpIHtcclxuXHJcbiAgICAgICAgICBjYXNlIENvbnN0YW50cy5SQ0NfQkFORF9PUl9QQVRMSSA6IHtcclxuICAgICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlNMQUJfQVJFQSwgcHJvamVjdERldGFpbHMuc2xhYkFyZWEpO1xyXG4gICAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY2FzZSBDb25zdGFudHMuRVhURVJOQUxfUExBU1RFUiA6IHtcclxuICAgICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLkNBUlBFVF9BUkVBLCBidWlsZGluZ0RldGFpbHMudG90YWxDYXJwZXRBcmVhT2ZVbml0KTtcclxuICAgICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNhc2UgQ29uc3RhbnRzLkZBQlJJQ0FUSU9OIDoge1xyXG4gICAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG4gICAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY2FzZSBDb25zdGFudHMuUE9JTlRJTkcgOiB7XHJcbiAgICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjYXNlIENvbnN0YW50cy5LSVRDSEVOX09UVEEgOiB7XHJcbiAgICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfT05FX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mT25lQkhLKVxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVFdPX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mVHdvQkhLKVxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfVEhSRUVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUaHJlZUJISylcclxuICAgICAgICAgICAgICAucmVwbGFjZShDb25zdGFudHMuTlVNX09GX0ZPVVJfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZGb3VyQkhLKVxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRklWRV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZpdmVCSEspO1xyXG4gICAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNhc2UgQ29uc3RhbnRzLlNPTElORyA6IHtcclxuICAgICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLlBMSU5USF9BUkVBLCBidWlsZGluZ0RldGFpbHMucGxpbnRoQXJlYSk7XHJcbiAgICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjYXNlIENvbnN0YW50cy5NQVNPTlJZIDoge1xyXG4gICAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG4gICAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY2FzZSBDb25zdGFudHMuSU5URVJOQUxfUExBU1RFUiA6IHtcclxuICAgICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLkNBUlBFVF9BUkVBLCBidWlsZGluZ0RldGFpbHMudG90YWxDYXJwZXRBcmVhT2ZVbml0KTtcclxuICAgICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNhc2UgQ29uc3RhbnRzLkdZUFNVTV9PUl9QT1BfUExBU1RFUiA6IHtcclxuICAgICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLkNBUlBFVF9BUkVBLCBidWlsZGluZ0RldGFpbHMudG90YWxDYXJwZXRBcmVhT2ZVbml0KTtcclxuICAgICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGRlZmF1bHQgOiB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY29zdEhlYWRzO1xyXG4gIH1cclxuXHJcbiAgY2FsY3VsYXRlQnVkZ2V0Q29zdEZvckNvbW1vbkFtbWVuaXRpZXMoY29zdEhlYWRzUmF0ZUFuYWx5c2lzOiBhbnksIHByb2plY3REZXRhaWxzIDogUHJvamVjdCwgYnVpbGRpbmdEZXRhaWxzIDogYW55KSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQ29tbW9uQW1tZW5pdGllcyBoYXMgYmVlbiBoaXQnKTtcclxuXHJcbiAgICBsZXQgY29zdEhlYWRzOkFycmF5PENvc3RIZWFkPiA9IG5ldyBBcnJheTxDb3N0SGVhZD4oKTtcclxuICAgIGxldCBidWRnZXRlZENvc3RBbW91bnQ6IG51bWJlcjtcclxuICAgIGxldCBidWRnZXRDb3N0Rm9ybXVsYWU6c3RyaW5nO1xyXG4gICAgbGV0IGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0IDpzdHJpbmc7XHJcblxyXG4gICAgbGV0IGNhbGN1bGF0ZVByb2plY3REYXRhID0gJ1NFTEVDVCBST1VORChTVU0oYnVpbGRpbmcudG90YWxDYXJwZXRBcmVhT2ZVbml0KSwyKSBBUyB0b3RhbENhcnBldEFyZWEsICcgK1xyXG4gICAgICAnUk9VTkQoU1VNKGJ1aWxkaW5nLnRvdGFsU2xhYkFyZWEpLDIpIEFTIHRvdGFsU2xhYkFyZWFQcm9qZWN0LCcgK1xyXG4gICAgICAnUk9VTkQoU1VNKGJ1aWxkaW5nLnRvdGFsU2FsZWFibGVBcmVhT2ZVbml0KSwyKSBBUyB0b3RhbFNhbGVhYmxlQXJlYSAgRlJPTSA/IEFTIGJ1aWxkaW5nJztcclxuICAgIGxldCBwcm9qZWN0RGF0YSA9IGFsYXNxbChjYWxjdWxhdGVQcm9qZWN0RGF0YSwgW3Byb2plY3REZXRhaWxzLmJ1aWxkaW5nc10pO1xyXG4gICAgbGV0IHRvdGFsU2xhYkFyZWFPZlByb2plY3QgOiBudW1iZXIgPSBwcm9qZWN0RGF0YVswXS50b3RhbFNsYWJBcmVhUHJvamVjdDtcclxuICAgIGxldCB0b3RhbFNhbGVhYmxlQXJlYU9mUHJvamVjdCA6IG51bWJlciA9IHByb2plY3REYXRhWzBdLnRvdGFsU2FsZWFibGVBcmVhO1xyXG4gICAgbGV0IHRvdGFsQ2FycGV0QXJlYU9mUHJvamVjdCA6IG51bWJlciA9IHByb2plY3REYXRhWzBdLnRvdGFsQ2FycGV0QXJlYTtcclxuXHJcbiAgICBmb3IobGV0IGNvc3RIZWFkIG9mIGNvc3RIZWFkc1JhdGVBbmFseXNpcykge1xyXG5cclxuICAgICAgc3dpdGNoKGNvc3RIZWFkLm5hbWUpIHtcclxuXHJcbiAgICAgICAgICBjYXNlIENvbnN0YW50cy5TQUZFVFlfTUVBU1VSRVMgOiB7XHJcbiAgICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0KTtcclxuICAgICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIHByb2plY3REZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGRlZmF1bHQgOiB7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNvc3RIZWFkcztcclxuICB9XHJcblxyXG4gIGFkZE5ld0NlbnRyYWxpemVkUmF0ZUZvckJ1aWxkaW5nKGJ1aWxkaW5nSWQ6IHN0cmluZywgcmF0ZUl0ZW06YW55KSB7XHJcbiAgICByZXR1cm4gbmV3IENDUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlIDogYW55LCByZWplY3QgOiBhbnkpe1xyXG4gICAgICBsb2dnZXIuaW5mbygnY3JlYXRlUHJvbWlzZUZvckFkZGluZ05ld1JhdGVJdGVtIGhhcyBiZWVuIGhpdCBmb3IgYnVpbGRpbmdJZDogJytidWlsZGluZ0lkKycsIHJhdGVJdGVtIDogJytyYXRlSXRlbSk7XHJcblxyXG4gICAgICBsZXQgYnVpbGRpbmdSZXBvc2l0b3J5ID0gbmV3IEJ1aWxkaW5nUmVwb3NpdG9yeSgpO1xyXG4gICAgICBsZXQgcXVlcnlBZGROZXdSYXRlSXRlbSA9IHsnX2lkJyA6IGJ1aWxkaW5nSWR9O1xyXG4gICAgICBsZXQgYWRkTmV3UmF0ZVJhdGVEYXRhID0geyAkcHVzaCA6IHsncmF0ZXMnIDogcmF0ZUl0ZW0gfSB9O1xyXG4gICAgICBidWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeUFkZE5ld1JhdGVJdGVtLCBhZGROZXdSYXRlUmF0ZURhdGEse25ldzogdHJ1ZX0sIChlcnJvcjpFcnJvciwgcmVzdWx0OkJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGU6YW55KSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignUHJvbWlzZSBmYWlsZWQgZm9yIGluZGl2aWR1YWwgY3JlYXRlUHJvbWlzZUZvckFkZGluZ05ld1JhdGVJdGVtISBlcnJvciA6JyArSlNPTi5zdHJpbmdpZnkoZSkpO1xyXG4gICAgICBDQ1Byb21pc2UucmVqZWN0KGUpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVDZW50cmFsaXplZFJhdGVGb3JCdWlsZGluZyhidWlsZGluZ0lkOiBzdHJpbmcsIHJhdGVJdGVtIDpzdHJpbmcsIHJhdGVJdGVtUmF0ZSA6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIG5ldyBDQ1Byb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSA6IGFueSwgcmVqZWN0IDogYW55KXtcclxuICAgICAgbG9nZ2VyLmluZm8oJ2NyZWF0ZVByb21pc2VGb3JSYXRlVXBkYXRlIGhhcyBiZWVuIGhpdCBmb3IgYnVpbGRpbmdJZCA6ICcrYnVpbGRpbmdJZCsnLCByYXRlSXRlbSA6ICcrcmF0ZUl0ZW0pO1xyXG4gICAgICAvL3VwZGF0ZSByYXRlXHJcbiAgICAgIGxldCBidWlsZGluZ1JlcG9zaXRvcnkgPSBuZXcgQnVpbGRpbmdSZXBvc2l0b3J5KCk7XHJcbiAgICAgIGxldCBxdWVyeVVwZGF0ZVJhdGUgPSB7J19pZCcgOiBidWlsZGluZ0lkLCAncmF0ZXMuaXRlbU5hbWUnOnJhdGVJdGVtfTtcclxuICAgICAgbGV0IHVwZGF0ZVJhdGUgPSB7ICRzZXQgOiB7J3JhdGVzLiQucmF0ZScgOiByYXRlSXRlbVJhdGV9IH07XHJcbiAgICAgIGJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5VXBkYXRlUmF0ZSwgdXBkYXRlUmF0ZSx7bmV3OiB0cnVlfSwgKGVycm9yOkVycm9yLCByZXN1bHQ6QnVpbGRpbmcpID0+IHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdSYXRlIFVwZGF0ZWQnKTtcclxuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSkuY2F0Y2goZnVuY3Rpb24oZTphbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdQcm9taXNlIGZhaWxlZCBmb3IgaW5kaXZpZHVhbCBjcmVhdGVQcm9taXNlRm9yUmF0ZVVwZGF0ZSAhIEVycm9yOiAnICtKU09OLnN0cmluZ2lmeShlKSk7XHJcbiAgICAgIENDUHJvbWlzZS5yZWplY3QoZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFkZE5ld0NlbnRyYWxpemVkUmF0ZUZvclByb2plY3QocHJvamVjdElkOiBzdHJpbmcsIHJhdGVJdGVtOmFueSkge1xyXG4gICAgcmV0dXJuIG5ldyBDQ1Byb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSA6IGFueSwgcmVqZWN0IDogYW55KXtcclxuICAgICAgbG9nZ2VyLmluZm8oJ2NyZWF0ZVByb21pc2VGb3JBZGRpbmdOZXdSYXRlSXRlbUluUHJvamVjdFJhdGVzIGhhcyBiZWVuIGhpdCBmb3IgcHJvamVjdElkIDogJytwcm9qZWN0SWQrJywgcmF0ZUl0ZW0gOiAnK3JhdGVJdGVtKTtcclxuXHJcbiAgICAgIGxldCBwcm9qZWN0UmVwb3NpdG9yeSA9IG5ldyBQcm9qZWN0UmVwb3NpdG9yeSgpO1xyXG4gICAgICBsZXQgYWRkTmV3UmF0ZUl0ZW1RdWVyeVByb2plY3QgPSB7J19pZCcgOiBwcm9qZWN0SWR9O1xyXG4gICAgICBsZXQgYWRkTmV3UmF0ZVJhdGVEYXRhUHJvamVjdCA9IHsgJHB1c2ggOiB7J3JhdGVzJyA6IHJhdGVJdGVtIH0gfTtcclxuICAgICAgcHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShhZGROZXdSYXRlSXRlbVF1ZXJ5UHJvamVjdCwgYWRkTmV3UmF0ZVJhdGVEYXRhUHJvamVjdCxcclxuICAgICAgICB7bmV3OiB0cnVlfSwgKGVycm9yOkVycm9yLCByZXN1bHQ6QnVpbGRpbmcpID0+IHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSkuY2F0Y2goZnVuY3Rpb24oZTphbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdQcm9taXNlIGZhaWxlZCBmb3IgaW5kaXZpZHVhbCBjcmVhdGVQcm9taXNlRm9yQWRkaW5nTmV3UmF0ZUl0ZW1JblByb2plY3RSYXRlcyAhIGVycm9yIDonICtKU09OLnN0cmluZ2lmeShlKSk7XHJcbiAgICAgIENDUHJvbWlzZS5yZWplY3QoZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUNlbnRyYWxpemVkUmF0ZUZvclByb2plY3QocHJvamVjdElkOiBzdHJpbmcsIHJhdGVJdGVtIDpzdHJpbmcsIHJhdGVJdGVtUmF0ZSA6IG51bWJlcikge1xyXG4gICAgcmV0dXJuIG5ldyBDQ1Byb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSA6IGFueSwgcmVqZWN0IDogYW55KXtcclxuICAgICAgbG9nZ2VyLmluZm8oJ2NyZWF0ZVByb21pc2VGb3JSYXRlVXBkYXRlT2ZQcm9qZWN0UmF0ZXMgaGFzIGJlZW4gaGl0IGZvciBwcm9qZWN0SWQgOiAnK3Byb2plY3RJZCsnLCByYXRlSXRlbSA6ICcrcmF0ZUl0ZW0pO1xyXG4gICAgICAvL3VwZGF0ZSByYXRlXHJcbiAgICAgIGxldCBwcm9qZWN0UmVwb3NpdG9yeSA9IG5ldyBQcm9qZWN0UmVwb3NpdG9yeSgpO1xyXG4gICAgICBsZXQgcXVlcnlVcGRhdGVSYXRlRm9yUHJvamVjdCA9IHsnX2lkJyA6IHByb2plY3RJZCwgJ3JhdGVzLml0ZW1OYW1lJzpyYXRlSXRlbX07XHJcbiAgICAgIGxldCB1cGRhdGVSYXRlRm9yUHJvamVjdCA9IHsgJHNldCA6IHsncmF0ZXMuJC5yYXRlJyA6IHJhdGVJdGVtUmF0ZX0gfTtcclxuICAgICAgcHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeVVwZGF0ZVJhdGVGb3JQcm9qZWN0LCB1cGRhdGVSYXRlRm9yUHJvamVjdCx7bmV3OiB0cnVlfSwgKGVycm9yOkVycm9yLCByZXN1bHQ6UHJvamVjdCkgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ1JhdGUgVXBkYXRlZCBmb3IgUHJvamVjdCByYXRlcycpO1xyXG4gICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlOmFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ1Byb21pc2UgZmFpbGVkIGZvciBpbmRpdmlkdWFsIGNyZWF0ZVByb21pc2VGb3JSYXRlVXBkYXRlT2ZQcm9qZWN0UmF0ZXMgISBFcnJvcjogJyArSlNPTi5zdHJpbmdpZnkoZSkpO1xyXG4gICAgICBDQ1Byb21pc2UucmVqZWN0KGUpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudDogbnVtYmVyLCBjb3N0SGVhZEZyb21SYXRlQW5hbHlzaXM6IGFueSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkaW5nRGF0YTogYW55LCBjb3N0SGVhZHM6IEFycmF5PENvc3RIZWFkPikge1xyXG4gICAgaWYgKGJ1ZGdldGVkQ29zdEFtb3VudCkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZCBoYXMgYmVlbiBoaXQnKTtcclxuXHJcbiAgICAgIGxldCBjb3N0SGVhZDogQ29zdEhlYWQgPSBjb3N0SGVhZEZyb21SYXRlQW5hbHlzaXM7XHJcbiAgICAgIGNvc3RIZWFkLmJ1ZGdldGVkQ29zdEFtb3VudCA9IGJ1ZGdldGVkQ29zdEFtb3VudDtcclxuICAgICAgbGV0IHRodW1iUnVsZVJhdGUgPSBuZXcgVGh1bWJSdWxlUmF0ZSgpO1xyXG5cclxuICAgICAgdGh1bWJSdWxlUmF0ZS5zYWxlYWJsZUFyZWEgPSB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJhdGVGb3JBcmVhKGJ1ZGdldGVkQ29zdEFtb3VudCwgYnVpbGRpbmdEYXRhLnRvdGFsU2FsZWFibGVBcmVhT2ZVbml0KTtcclxuICAgICAgdGh1bWJSdWxlUmF0ZS5zbGFiQXJlYSA9IHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmF0ZUZvckFyZWEoYnVkZ2V0ZWRDb3N0QW1vdW50LCBidWlsZGluZ0RhdGEudG90YWxTbGFiQXJlYSk7XHJcbiAgICAgIHRodW1iUnVsZVJhdGUuY2FycGV0QXJlYSA9IHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmF0ZUZvckFyZWEoYnVkZ2V0ZWRDb3N0QW1vdW50LCBidWlsZGluZ0RhdGEudG90YWxDYXJwZXRBcmVhT2ZVbml0KTtcclxuXHJcbiAgICAgIGNvc3RIZWFkLnRodW1iUnVsZVJhdGUgPSB0aHVtYlJ1bGVSYXRlO1xyXG4gICAgICBjb3N0SGVhZHMucHVzaChjb3N0SGVhZCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQ6IG51bWJlciwgY29zdEhlYWRGcm9tUmF0ZUFuYWx5c2lzOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0RGV0YWlsczogYW55LCBjb3N0SGVhZHM6IEFycmF5PENvc3RIZWFkPikge1xyXG4gICAgaWYgKGJ1ZGdldGVkQ29zdEFtb3VudCkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgICBsZXQgY2FsY3VsYXRlUHJvamVjdERhdGEgPSAnU0VMRUNUIFJPVU5EKFNVTShidWlsZGluZy50b3RhbENhcnBldEFyZWFPZlVuaXQpLDIpIEFTIHRvdGFsQ2FycGV0QXJlYSwgJyArXHJcbiAgICAgICAgJ1JPVU5EKFNVTShidWlsZGluZy50b3RhbFNsYWJBcmVhKSwyKSBBUyB0b3RhbFNsYWJBcmVhUHJvamVjdCwnICtcclxuICAgICAgICAnUk9VTkQoU1VNKGJ1aWxkaW5nLnRvdGFsU2FsZWFibGVBcmVhT2ZVbml0KSwyKSBBUyB0b3RhbFNhbGVhYmxlQXJlYSAgRlJPTSA/IEFTIGJ1aWxkaW5nJztcclxuICAgICAgbGV0IHByb2plY3REYXRhID0gYWxhc3FsKGNhbGN1bGF0ZVByb2plY3REYXRhLCBbcHJvamVjdERldGFpbHMuYnVpbGRpbmdzXSk7XHJcbiAgICAgIGxldCB0b3RhbFNsYWJBcmVhT2ZQcm9qZWN0IDogbnVtYmVyID0gcHJvamVjdERhdGFbMF0udG90YWxTbGFiQXJlYVByb2plY3Q7XHJcbiAgICAgIGxldCB0b3RhbFNhbGVhYmxlQXJlYU9mUHJvamVjdCA6IG51bWJlciA9IHByb2plY3REYXRhWzBdLnRvdGFsU2FsZWFibGVBcmVhO1xyXG4gICAgICBsZXQgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0IDogbnVtYmVyID0gcHJvamVjdERhdGFbMF0udG90YWxDYXJwZXRBcmVhO1xyXG5cclxuICAgICAgbGV0IGNvc3RIZWFkOiBDb3N0SGVhZCA9IGNvc3RIZWFkRnJvbVJhdGVBbmFseXNpcztcclxuICAgICAgY29zdEhlYWQuYnVkZ2V0ZWRDb3N0QW1vdW50ID0gYnVkZ2V0ZWRDb3N0QW1vdW50O1xyXG4gICAgICBsZXQgdGh1bWJSdWxlUmF0ZSA9IG5ldyBUaHVtYlJ1bGVSYXRlKCk7XHJcblxyXG4gICAgICB0aHVtYlJ1bGVSYXRlLnNhbGVhYmxlQXJlYSA9IHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmF0ZUZvckFyZWEoYnVkZ2V0ZWRDb3N0QW1vdW50LCB0b3RhbFNhbGVhYmxlQXJlYU9mUHJvamVjdCk7XHJcbiAgICAgIHRodW1iUnVsZVJhdGUuc2xhYkFyZWEgPSB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJhdGVGb3JBcmVhKGJ1ZGdldGVkQ29zdEFtb3VudCwgdG90YWxTbGFiQXJlYU9mUHJvamVjdCk7XHJcbiAgICAgIHRodW1iUnVsZVJhdGUuY2FycGV0QXJlYSA9IHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmF0ZUZvckFyZWEoYnVkZ2V0ZWRDb3N0QW1vdW50LCB0b3RhbENhcnBldEFyZWFPZlByb2plY3QpO1xyXG5cclxuICAgICAgY29zdEhlYWQudGh1bWJSdWxlUmF0ZSA9IHRodW1iUnVsZVJhdGU7XHJcbiAgICAgIGNvc3RIZWFkcy5wdXNoKGNvc3RIZWFkKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2FsY3VsYXRlVGh1bWJSdWxlUmF0ZUZvckFyZWEoYnVkZ2V0ZWRDb3N0QW1vdW50OiBudW1iZXIsIGFyZWE6IG51bWJlcikge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgY2FsY3VsYXRlVGh1bWJSdWxlUmF0ZUZvckFyZWEgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgYnVkZ2V0Q29zdFJhdGVzID0gbmV3IEJ1ZGdldENvc3RSYXRlcygpO1xyXG4gICAgYnVkZ2V0Q29zdFJhdGVzLnNxZnQgPSAoYnVkZ2V0ZWRDb3N0QW1vdW50IC8gYXJlYSk7XHJcbiAgICBidWRnZXRDb3N0UmF0ZXMuc3FtdCA9IChidWRnZXRDb3N0UmF0ZXMuc3FmdCAqIGNvbmZpZy5nZXQoQ29uc3RhbnRzLlNRVUFSRV9NRVRFUikpO1xyXG4gICAgcmV0dXJuIGJ1ZGdldENvc3RSYXRlcztcclxuICB9XHJcbn1cclxuXHJcbk9iamVjdC5zZWFsKFByb2plY3RTZXJ2aWNlKTtcclxuZXhwb3J0ID0gUHJvamVjdFNlcnZpY2U7XHJcbiJdfQ==
