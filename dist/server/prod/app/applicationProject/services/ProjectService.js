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
var alasql = require("alasql");
var BudgetCostRates = require("../dataaccess/model/project/reports/BudgetCostRates");
var ThumbRuleRate = require("../dataaccess/model/project/reports/ThumbRuleRate");
var Constants = require("../../applicationProject/shared/constants");
var logger = log4js.getLogger('Project service');
var ProjectService = (function () {
    function ProjectService() {
        this.projectRepository = new ProjectRepository();
        this.buildingRepository = new BuildingRepository();
        this.APP_NAME = ProjectAsset.APP_NAME;
        this.authInterceptor = new AuthInterceptor();
        this.userService = new UserService();
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
    ProjectService.prototype.getInActiveWorkItems = function (projectId, buildingId, costHeadId, categoryId, user, callback) {
        var _this = this;
        logger.info('Project service, add Workitem has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = building.costHeads;
                var categoryList = void 0;
                var workItemList = void 0;
                var inActiveWorkItems = [];
                for (var index = 0; index < costHeadList.length; index++) {
                    if (costHeadId === costHeadList[index].rateAnalysisId) {
                        categoryList = costHeadList[index].categories;
                        for (var subCategoryIndex = 0; subCategoryIndex < categoryList.length; subCategoryIndex++) {
                            if (categoryId === categoryList[subCategoryIndex].rateAnalysisId) {
                                workItemList = categoryList[subCategoryIndex].workItems;
                                for (var _i = 0, workItemList_1 = workItemList; _i < workItemList_1.length; _i++) {
                                    var checkWorkItem = workItemList_1[_i];
                                    if (!checkWorkItem.active) {
                                        inActiveWorkItems.push(checkWorkItem);
                                    }
                                }
                            }
                        }
                    }
                }
                callback(null, { data: inActiveWorkItems, access_token: _this.authInterceptor.issueTokenWithUid(user) });
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
                var categoryList = void 0;
                var workItemList = void 0;
                var inActiveWorkItems = [];
                for (var _i = 0, costHeadList_1 = costHeadList; _i < costHeadList_1.length; _i++) {
                    var costHead = costHeadList_1[_i];
                    if (costHeadId === costHead.rateAnalysisId) {
                        categoryList = costHead.categories;
                        for (var _a = 0, categoryList_1 = categoryList; _a < categoryList_1.length; _a++) {
                            var category = categoryList_1[_a];
                            if (categoryId === category.rateAnalysisId) {
                                workItemList = category.workItems;
                                for (var _b = 0, workItemList_2 = workItemList; _b < workItemList_2.length; _b++) {
                                    var checkWorkItem = workItemList_2[_b];
                                    if (!checkWorkItem.active) {
                                        inActiveWorkItems.push(checkWorkItem);
                                    }
                                }
                            }
                        }
                    }
                }
                callback(null, { data: inActiveWorkItems, access_token: _this.authInterceptor.issueTokenWithUid(user) });
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
    ProjectService.prototype.updateRate = function (projectId, buildingId, costHeadId, categoryId, workItemId, rate, user, callback) {
        var _this = this;
        logger.info('Project service, updateRate has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            logger.info('Project service, findById has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var rateAnalysisId = void 0;
                for (var index = 0; building.costHeads.length > index; index++) {
                    if (building.costHeads[index].rateAnalysisId === costHeadId) {
                        for (var indexCategory = 0; building.costHeads[index].categories.length > indexCategory; indexCategory++) {
                            if (building.costHeads[index].categories[indexCategory].rateAnalysisId === categoryId) {
                                for (var indexWorkitem = 0; building.costHeads[index].categories[indexCategory].workItems.length >
                                    indexWorkitem; indexWorkitem++) {
                                    if (building.costHeads[index].categories[indexCategory].workItems[indexWorkitem].rateAnalysisId === workItemId) {
                                        building.costHeads[index].categories[indexCategory].workItems[indexWorkitem].rate = rate;
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { '_id': buildingId };
                var newData = { $set: { 'costHeads': building.costHeads } };
                _this.buildingRepository.findOneAndUpdate(query, newData, { new: true }, function (error, result) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, { data: rate, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.updateRateOfProjectCostHeads = function (projectId, costHeadId, categoryId, workItemId, rate, user, callback) {
        var _this = this;
        logger.info('Project service, updateRate has been hit');
        this.projectRepository.findById(projectId, function (error, project) {
            logger.info('Project service, findById has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var projectCostHeads = project.projectCostHeads;
                for (var index = 0; projectCostHeads.length > index; index++) {
                    if (projectCostHeads[index].rateAnalysisId === costHeadId) {
                        for (var indexCategory = 0; projectCostHeads[index].categories.length > indexCategory; indexCategory++) {
                            if (projectCostHeads[index].categories[indexCategory].rateAnalysisId === categoryId) {
                                for (var indexWorkitem = 0; projectCostHeads[index].categories[indexCategory].workItems.length >
                                    indexWorkitem; indexWorkitem++) {
                                    if (projectCostHeads[index].categories[indexCategory].workItems[indexWorkitem].rateAnalysisId === workItemId) {
                                        projectCostHeads[index].categories[indexCategory].workItems[indexWorkitem].rate = rate;
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { '_id': projectId };
                var newData = { $set: { 'projectCostHeads': projectCostHeads } };
                _this.projectRepository.findOneAndUpdate(query, newData, { new: true }, function (error, result) {
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
    ProjectService.prototype.deleteQuantityByName = function (projectId, buildingId, costHeadId, categoryId, workItemId, item, user, callback) {
        var _this = this;
        logger.info('Project service, deleteQuantity has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var quantity = void 0;
                _this.costHeadId = parseInt(costHeadId);
                _this.categoryId = parseInt(categoryId);
                _this.workItemId = parseInt(workItemId);
                for (var index = 0; building.costHeads.length > index; index++) {
                    if (building.costHeads[index].rateAnalysisId === _this.costHeadId) {
                        for (var index1 = 0; building.costHeads[index].categories.length > index1; index1++) {
                            if (building.costHeads[index].categories[index1].rateAnalysisId === _this.categoryId) {
                                for (var index2 = 0; building.costHeads[index].categories[index1].workItems.length > index2; index2++) {
                                    if (building.costHeads[index].categories[index1].workItems[index2].rateAnalysisId === _this.workItemId) {
                                        quantity = building.costHeads[index].categories[index1].workItems[index2].quantity;
                                    }
                                }
                            }
                        }
                    }
                }
                for (var index = 0; quantity.quantityItems.length > index; index++) {
                    if (quantity.quantityItems[index].item === item) {
                        quantity.quantityItems.splice(index, 1);
                    }
                }
                var query = { _id: buildingId };
                _this.buildingRepository.findOneAndUpdate(query, building, { new: true }, function (error, building) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var quantity_1;
                        for (var index = 0; building.costHeads.length > index; index++) {
                            if (building.costHeads[index].rateAnalysisId === _this.costHeadId) {
                                for (var index1 = 0; building.costHeads[index].categories.length > index1; index1++) {
                                    if (building.costHeads[index].categories[index1].rateAnalysisId === _this.categoryId) {
                                        for (var index2 = 0; building.costHeads[index].categories[index1].workItems.length > index2; index2++) {
                                            if (building.costHeads[index].categories[index1].workItems[index2].rateAnalysisId === _this.workItemId) {
                                                quantity_1 = building.costHeads[index].categories[index1].workItems[index2].quantity;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (quantity_1.total) {
                            if (quantity_1.quantityItems.length !== 0) {
                                for (var index = 0; quantity_1.quantityItems.length > index; index++) {
                                    quantity_1.total = quantity_1.quantityItems[index].quantity + quantity_1.total;
                                }
                            }
                            else {
                                quantity_1.total = 0;
                            }
                        }
                        callback(null, { data: quantity_1, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.deleteQuantityOfProjectCostHeadsByName = function (projectId, costHeadId, categoryId, workItemId, item, user, callback) {
        var _this = this;
        logger.info('Project service, deleteQuantity has been hit');
        this.projectRepository.findById(projectId, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var quantity = void 0;
                _this.costHeadId = parseInt(costHeadId);
                _this.categoryId = parseInt(categoryId);
                _this.workItemId = parseInt(workItemId);
                for (var index = 0; project.projectCostHeads.length > index; index++) {
                    if (project.projectCostHeads[index].rateAnalysisId === _this.costHeadId) {
                        for (var index1 = 0; project.projectCostHeads[index].categories.length > index1; index1++) {
                            if (project.projectCostHeads[index].categories[index1].rateAnalysisId === _this.categoryId) {
                                for (var index2 = 0; project.projectCostHeads[index].categories[index1].workItems.length > index2; index2++) {
                                    if (project.projectCostHeads[index].categories[index1].workItems[index2].rateAnalysisId === _this.workItemId) {
                                        quantity = project.projectCostHeads[index].categories[index1].workItems[index2].quantity;
                                    }
                                }
                            }
                        }
                    }
                }
                for (var index = 0; quantity.quantityItems.length > index; index++) {
                    if (quantity.quantityItems[index].item === item) {
                        quantity.quantityItems.splice(index, 1);
                    }
                }
                var query = { _id: projectId };
                _this.projectRepository.findOneAndUpdate(query, project, { new: true }, function (error, project) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var quantity_2;
                        for (var index = 0; project.projectCostHeads.length > index; index++) {
                            if (project.projectCostHeads[index].rateAnalysisId === _this.costHeadId) {
                                for (var index1 = 0; project.projectCostHeads[index].categories.length > index1; index1++) {
                                    if (project.projectCostHeads[index].categories[index1].rateAnalysisId === _this.categoryId) {
                                        for (var index2 = 0; project.projectCostHeads[index].categories[index1].workItems.length > index2; index2++) {
                                            if (project.projectCostHeads[index].categories[index1].workItems[index2].rateAnalysisId === _this.workItemId) {
                                                quantity_2 = project.projectCostHeads[index].categories[index1].workItems[index2].quantity;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (quantity_2.total) {
                            if (quantity_2.quantityItems.length !== 0) {
                                for (var index = 0; quantity_2.quantityItems.length > index; index++) {
                                    quantity_2.total = quantity_2.quantityItems[index].quantity + quantity_2.total;
                                }
                            }
                            else {
                                quantity_2.total = 0;
                            }
                        }
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
    ProjectService.prototype.setWorkItemStatus = function (buildingId, costHeadId, categoryId, workItemId, workItemActiveStatus, user, callback) {
        var _this = this;
        logger.info('Project service, update Workitem has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = building.costHeads;
                var categoryList = void 0;
                var workItemList_3;
                var isWorkItemUpdated = false;
                for (var index = 0; index < costHeadList.length; index++) {
                    if (costHeadId === costHeadList[index].rateAnalysisId) {
                        categoryList = costHeadList[index].categories;
                        for (var subCategoryIndex = 0; subCategoryIndex < categoryList.length; subCategoryIndex++) {
                            if (categoryId === categoryList[subCategoryIndex].rateAnalysisId) {
                                workItemList_3 = categoryList[subCategoryIndex].workItems;
                                for (var workItemIndex = 0; workItemIndex < workItemList_3.length; workItemIndex++) {
                                    if (workItemId === workItemList_3[workItemIndex].rateAnalysisId) {
                                        isWorkItemUpdated = true;
                                        workItemList_3[workItemIndex].active = workItemActiveStatus;
                                    }
                                }
                            }
                        }
                    }
                }
                if (isWorkItemUpdated) {
                    var query = { _id: buildingId };
                    _this.buildingRepository.findOneAndUpdate(query, building, { new: true }, function (error, response) {
                        logger.info('Project service, findOneAndUpdate has been hit');
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            callback(null, { data: workItemList_3, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                        }
                    });
                }
                else {
                    callback(error, null);
                }
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
                var categoryList = void 0;
                var workItemList = new Array();
                var updatedWorkItemList_1 = new Array();
                for (var _i = 0, costHeadList_2 = costHeadList; _i < costHeadList_2.length; _i++) {
                    var costHead = costHeadList_2[_i];
                    if (costHeadId === costHead.rateAnalysisId) {
                        categoryList = costHead.categories;
                        for (var _a = 0, categoryList_2 = categoryList; _a < categoryList_2.length; _a++) {
                            var category = categoryList_2[_a];
                            if (categoryId === category.rateAnalysisId) {
                                workItemList = category.workItems;
                                for (var _b = 0, workItemList_4 = workItemList; _b < workItemList_4.length; _b++) {
                                    var workItem = workItemList_4[_b];
                                    if (workItemId === workItem.rateAnalysisId) {
                                        workItem.active = workItemActiveStatus;
                                        updatedWorkItemList_1.push(workItem);
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
                        callback(null, { data: updatedWorkItemList_1, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.updateBudgetedCostForCostHead = function (buildingId, costHeadBudgetedAmount, user, callback) {
        var _this = this;
        logger.info('Project service, updateBudgetedCostForCostHead has been hit');
        var query = { '_id': buildingId, 'costHeads.name': costHeadBudgetedAmount.costHead };
        var costInUnit = costHeadBudgetedAmount.costIn;
        var costPerUnit = costHeadBudgetedAmount.costPer;
        var rate = 0;
        var newData;
        rate = costHeadBudgetedAmount.budgetedCostAmount / costHeadBudgetedAmount.buildingArea;
        if (costPerUnit === 'saleableArea' && costInUnit === 'sqft') {
            newData = { $set: {
                    'costHeads.$.thumbRuleRate.saleableArea.sqft': rate,
                    'costHeads.$.thumbRuleRate.saleableArea.sqmt': rate / config.get(Constants.SQUARE_METER)
                } };
        }
        else if (costPerUnit === 'saleableArea' && costInUnit === 'sqmt') {
            newData = { $set: {
                    'costHeads.$.thumbRuleRate.saleableArea.sqmt': rate,
                    'costHeads.$.thumbRuleRate.saleableArea.sqft': rate * config.get(Constants.SQUARE_METER)
                } };
        }
        else if (costPerUnit === 'slabArea' && costInUnit === 'sqft') {
            newData = { $set: {
                    'costHeads.$.thumbRuleRate.slabArea.sqft': rate,
                    'costHeads.$.thumbRuleRate.slabArea.sqmt': rate / config.get(Constants.SQUARE_METER)
                } };
        }
        else if (costPerUnit === 'slabArea' && costInUnit === 'sqmt') {
            newData = { $set: {
                    'costHeads.$.thumbRuleRate.slabArea.sqmt': rate,
                    'costHeads.$.thumbRuleRate.slabArea.sqft': rate * config.get(Constants.SQUARE_METER)
                } };
        }
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
    ProjectService.prototype.updateQuantity = function (projectId, buildingId, costHeadId, categoryId, workItemId, quantity, user, callback) {
        var _this = this;
        logger.info('Project service, updateQuantity has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = building.costHeads;
                var quantityArray = void 0;
                for (var index = 0; index < costHeadList.length; index++) {
                    if (parseInt(costHeadId) === costHeadList[index].rateAnalysisId) {
                        for (var index1 = 0; index1 < costHeadList[index].categories.length; index1++) {
                            if (parseInt(categoryId) === costHeadList[index].categories[index1].rateAnalysisId) {
                                for (var index2 = 0; index2 < costHeadList[index].categories[index1].workItems.length; index2++) {
                                    if (parseInt(workItemId) === costHeadList[index].categories[index1].workItems[index2].rateAnalysisId) {
                                        quantityArray = costHeadList[index].categories[index1].workItems[index2].quantity;
                                        quantityArray.quantityItems = quantity;
                                        quantityArray.total = 0;
                                        for (var itemIndex = 0; quantityArray.quantityItems.length > itemIndex; itemIndex++) {
                                            quantityArray.total = quantityArray.quantityItems[itemIndex].quantity + quantityArray.total;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { _id: buildingId };
                _this.buildingRepository.findOneAndUpdate(query, building, { new: true }, function (error, building) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var costHeadList_3 = building.costHeads;
                        var quantity_3;
                        for (var index = 0; index < costHeadList_3.length; index++) {
                            if (parseInt(costHeadId) === costHeadList_3[index].rateAnalysisId) {
                                for (var index1 = 0; index1 < costHeadList_3[index].categories.length; index1++) {
                                    if (parseInt(categoryId) === costHeadList_3[index].categories[index1].rateAnalysisId) {
                                        for (var index2 = 0; index2 < costHeadList_3[index].categories[index1].workItems.length; index2++) {
                                            if (parseInt(workItemId) === costHeadList_3[index].categories[index1].workItems[index2].rateAnalysisId) {
                                                quantity_3 = costHeadList_3[index].categories[index1].workItems[index2].quantity;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (quantity_3.total === null) {
                            for (var index = 0; index < quantity_3.quantityItems.length; index++) {
                                quantity_3.total = quantity_3.quantityItems[index].quantity + quantity_3.total;
                            }
                        }
                        callback(null, { data: quantity_3, access_token: _this.authInterceptor.issueTokenWithUid(user) });
                    }
                });
            }
        });
    };
    ProjectService.prototype.updateQuantityOfProjectCostHeads = function (projectId, costHeadId, categoryId, workItemId, quantity, user, callback) {
        var _this = this;
        logger.info('Project service, updateQuantity has been hit');
        this.projectRepository.findById(projectId, function (error, project) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadList = project.projectCostHeads;
                var quantityArray = void 0;
                for (var index = 0; index < costHeadList.length; index++) {
                    if (costHeadId === costHeadList[index].rateAnalysisId) {
                        for (var index1 = 0; index1 < costHeadList[index].categories.length; index1++) {
                            if (categoryId === costHeadList[index].categories[index1].rateAnalysisId) {
                                for (var index2 = 0; index2 < costHeadList[index].categories[index1].workItems.length; index2++) {
                                    if (workItemId === costHeadList[index].categories[index1].workItems[index2].rateAnalysisId) {
                                        quantityArray = costHeadList[index].categories[index1].workItems[index2].quantity;
                                        quantityArray.quantityItems = quantityArray.quantityItems.concat(quantity);
                                        quantityArray.total = 0;
                                        for (var itemIndex = 0; quantityArray.quantityItems.length > itemIndex; itemIndex++) {
                                            quantityArray.total = quantityArray.quantityItems[itemIndex].quantity + quantityArray.total;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                var query = { _id: projectId };
                _this.projectRepository.findOneAndUpdate(query, project, { new: true }, function (error, project) {
                    logger.info('Project service, findOneAndUpdate has been hit');
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var costHeadList_4 = project.projectCostHeads;
                        var quantity_4;
                        for (var index = 0; index < costHeadList_4.length; index++) {
                            if (costHeadId === costHeadList_4[index].rateAnalysisId) {
                                for (var index1 = 0; index1 < costHeadList_4[index].categories.length; index1++) {
                                    if (categoryId === costHeadList_4[index].categories[index1].rateAnalysisId) {
                                        for (var index2 = 0; index2 < costHeadList_4[index].categories[index1].workItems.length; index2++) {
                                            if (workItemId === costHeadList_4[index].categories[index1].workItems[index2].rateAnalysisId) {
                                                quantity_4 = costHeadList_4[index].categories[index1].workItems[index2].quantity;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (quantity_4.total === null) {
                            for (var index = 0; index < quantity_4.quantityItems.length; index++) {
                                quantity_4.total = quantity_4.quantityItems[index].quantity + quantity_4.total;
                            }
                        }
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
    ProjectService.prototype.getWorkitemList = function (projectId, buildingId, costHeadId, categoryId, user, callback) {
        var _this = this;
        logger.info('Project service, getWorkitemList has been hit');
        var rateAnalysisServices = new RateAnalysisService();
        rateAnalysisServices.getWorkitemList(costHeadId, categoryId, function (error, workitemList) {
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: workitemList, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
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
    ProjectService.prototype.getActiveCategories = function (projectId, buildingId, costHeadId, user, callback) {
        var _this = this;
        logger.info('Project service, Get Active Categories has been hit');
        this.buildingRepository.findById(buildingId, function (error, building) {
            if (error) {
                callback(error, null);
            }
            else {
                var categories = new Array();
                for (var costHeadIndex = 0; building.costHeads.length > costHeadIndex; costHeadIndex++) {
                    if (building.costHeads[costHeadIndex].rateAnalysisId === costHeadId) {
                        for (var categoryIndex = 0; categoryIndex < building.costHeads[costHeadIndex].categories.length; categoryIndex++) {
                            if (building.costHeads[costHeadIndex].categories[categoryIndex].active === true) {
                                var workItems = new Array();
                                var category = building.costHeads[costHeadIndex].categories[categoryIndex];
                                for (var workitemIndex = 0; workitemIndex < category.workItems.length; workitemIndex++) {
                                    if (category.workItems[workitemIndex].active) {
                                        workItems.push(category.workItems[workitemIndex]);
                                        for (var workItemsIndex1 = 0; workItemsIndex1 < workItems.length; workItemsIndex1++) {
                                            var currentWorkItem = workItems[workItemsIndex1];
                                            if (currentWorkItem.quantity.total !== null && currentWorkItem.rate.total !== null
                                                && currentWorkItem.quantity.total !== 0 && currentWorkItem.rate.total !== 0) {
                                                building.costHeads[costHeadIndex].categories[categoryIndex].amount = parseFloat((currentWorkItem.quantity.total *
                                                    currentWorkItem.rate.total + building.costHeads[costHeadIndex].categories[categoryIndex].amount).toFixed(2));
                                            }
                                            else {
                                                building.costHeads[costHeadIndex].categories[categoryIndex].amount = 0;
                                                building.costHeads[costHeadIndex].categories[categoryIndex].amount = 0;
                                                break;
                                            }
                                        }
                                    }
                                }
                                category.workItems = workItems;
                                categories.push(category);
                            }
                        }
                    }
                }
                callback(null, { data: categories, access_token: _this.authInterceptor.issueTokenWithUid(user) });
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
                var categories = new Array();
                var projectCostHeads = project.projectCostHeads;
                for (var _i = 0, projectCostHeads_1 = projectCostHeads; _i < projectCostHeads_1.length; _i++) {
                    var costHead = projectCostHeads_1[_i];
                    if (costHead.rateAnalysisId === costHeadId) {
                        for (var _a = 0, _b = costHead.categories; _a < _b.length; _a++) {
                            var singleCategory = _b[_a];
                            var categoryData = singleCategory;
                            if (categoryData.active === true) {
                                var workItems = new Array();
                                var category = categoryData;
                                for (var _c = 0, _d = category.workItems; _c < _d.length; _c++) {
                                    var workItem = _d[_c];
                                    var workItemData = workItem;
                                    if (workItemData.active) {
                                        workItems.push(workItemData);
                                        for (var _e = 0, workItems_1 = workItems; _e < workItems_1.length; _e++) {
                                            var singleWorkItem = workItems_1[_e];
                                            if (singleWorkItem.quantity.total !== null && singleWorkItem.rate.total !== null
                                                && singleWorkItem.quantity.total !== 0 && singleWorkItem.rate.total !== 0) {
                                                categoryData.amount =
                                                    parseFloat((singleWorkItem.quantity.total *
                                                        singleWorkItem.rate.total +
                                                        categoryData.amount).toFixed(2));
                                            }
                                            else {
                                                categoryData.amount = 0;
                                                categoryData.amount = 0;
                                                break;
                                            }
                                        }
                                    }
                                }
                                category.workItems = workItems;
                                categories.push(category);
                            }
                        }
                    }
                }
                callback(null, { data: categories, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
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
                    Promise.all([
                        syncBuildingCostHeadsPromise,
                        syncProjectCostHeadsPromise
                    ]).then(function (data) {
                        logger.info('Promise for syncProjectWithRateAnalysisData for Project and Building success');
                        var buildingCostHeadsData = data[0];
                        var projectCostHeadsData = data[1];
                        callback(null, { status: 200 });
                    })
                        .catch(function (e) { logger.error(' Promise failed! :' + JSON.stringify(e)); });
                }
            }
        });
    };
    ProjectService.prototype.updateCostHeadsForBuildingAndProject = function (callback, projectData, buildingData, buildingId, projectId) {
        logger.info('updateCostHeadsForBuildingAndProject has been hit');
        var rateAnalysisService = new RateAnalysisService();
        var buildingRepository = new BuildingRepository();
        var projectRepository = new ProjectRepository();
        rateAnalysisService.convertCostHeadsFromRateAnalysisToCostControl(Constants.BUILDING, function (error, buildingCostHeadsData) {
            if (error) {
                logger.error('Error in updateCostHeadsForBuildingAndProject : convertCostHeadsFromRateAnalysisToCostControl : ' + JSON.stringify(error));
                callback(error, null);
            }
            else {
                logger.info('GetAllDataFromRateAnalysis success');
                var projectService_1 = new ProjectService();
                var data = projectService_1.calculateBudgetCostForBuilding(buildingCostHeadsData, projectData, buildingData);
                var queryForBuilding = { '_id': buildingId };
                var updateCostHead = { $set: { 'costHeads': data } };
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
        return new Promise(function (resolve, reject) {
            var rateAnalysisService = new RateAnalysisService();
            var buildingRepository = new BuildingRepository();
            logger.info('Project service, updateBudgetRatesForBuildingCostHeads promise.');
            rateAnalysisService.convertCostHeadsFromRateAnalysisToCostControl(entity, function (error, buildingCostHeadsData) {
                if (error) {
                    logger.err('Error in promise updateBudgetRatesForBuildingCostHeads : ' + JSON.stringify(error));
                    reject(error);
                }
                else {
                    var projectService = new ProjectService();
                    var buildingCostHeads = projectService.calculateBudgetCostForBuilding(buildingCostHeadsData, projectDetails, buildingDetails);
                    var query = { '_id': buildingId };
                    var newData = { $set: { 'costHeads': buildingCostHeads } };
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
        });
    };
    ProjectService.prototype.updateBudgetRatesForProjectCostHeads = function (entity, projectId, projectDetails, buildingDetails) {
        return new Promise(function (resolve, reject) {
            var rateAnalysisService = new RateAnalysisService();
            var projectRepository = new ProjectRepository();
            logger.info('Project service, updateBudgetRatesForProjectCostHeads promise.');
            rateAnalysisService.convertCostHeadsFromRateAnalysisToCostControl(entity, function (error, projectCostHeadsData) {
                if (error) {
                    logger.err('Error in updateBudgetRatesForProjectCostHeads promise : ' + JSON.stringify(error));
                    reject(error);
                }
                else {
                    var projectService = new ProjectService();
                    var projectCostHeads = projectService.calculateBudgetCostForCommonAmmenities(projectCostHeadsData, projectDetails, buildingDetails);
                    var query = { '_id': projectId };
                    var newData = { $set: { 'projectCostHeads': projectCostHeads } };
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
        var calculateProjectData = 'SELECT SUM(building.totalCarpetAreaOfUnit) AS totalCarpetArea, ' +
            'SUM(building.totalSlabArea) AS totalSlabAreaProject,' +
            'SUM(building.totalSaleableAreaOfUnit) AS totalSaleableArea  FROM ? AS building';
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
            var calculateProjectData = 'SELECT SUM(building.totalCarpetAreaOfUnit) AS totalCarpetArea, ' +
                'SUM(building.totalSlabArea) AS totalSlabAreaProject,' +
                'SUM(building.totalSaleableAreaOfUnit) AS totalSaleableArea  FROM ? AS building';
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUHJvamVjdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDhFQUFpRjtBQUNqRixnRkFBbUY7QUFDbkYsb0VBQXVFO0FBQ3ZFLGtFQUFxRTtBQUlyRSw2RUFBZ0Y7QUFDaEYsOEVBQWlGO0FBQ2pGLDBFQUE2RTtBQUU3RSxnRUFBbUU7QUFDbkUsd0VBQTJFO0FBRTNFLDJEQUE4RDtBQUM5RCx3RUFBMkU7QUFDM0UsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQiwrQkFBa0M7QUFDbEMscUZBQXdGO0FBQ3hGLGlGQUFvRjtBQUNwRixxRUFBd0U7QUFDeEUsSUFBSSxNQUFNLEdBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRS9DO0lBV0U7UUFDRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ2pELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDbkQsSUFBSSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM3QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVELHNDQUFhLEdBQWIsVUFBYyxJQUFhLEVBQUUsSUFBVyxFQUFFLFFBQTJDO1FBQXJGLGlCQTJCQztRQTFCQyxFQUFFLENBQUEsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2IsUUFBUSxDQUFDLElBQUkscUJBQXFCLENBQUMsa0JBQWtCLEVBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckUs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REFBNkIsR0FBckMsVUFBc0Msa0JBQTBCLEVBQUUsSUFBWTtRQUM1RSxNQUFNLENBQUMsSUFBSSxDQUFDLDZEQUE2RCxDQUFDLENBQUM7UUFDM0UsSUFBSSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM1QyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDbkQsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDO0lBQ3pCLENBQUM7SUFBQSxxQkFBQztBQUFELENBaDhDSCxBQWc4Q0ksSUFBQTtBQUVKLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDNUIsaUJBQVMsY0FBYyxDQUFDIiwiZmlsZSI6ImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUHJvamVjdFNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUHJvamVjdFJlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvUHJvamVjdFJlcG9zaXRvcnknKTtcclxuaW1wb3J0IEJ1aWxkaW5nUmVwb3NpdG9yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvcmVwb3NpdG9yeS9CdWlsZGluZ1JlcG9zaXRvcnknKTtcclxuaW1wb3J0IFVzZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi8uLi8uLi9mcmFtZXdvcmsvc2VydmljZXMvVXNlclNlcnZpY2UnKTtcclxuaW1wb3J0IFByb2plY3RBc3NldCA9IHJlcXVpcmUoJy4uLy4uL2ZyYW1ld29yay9zaGFyZWQvcHJvamVjdGFzc2V0Jyk7XHJcbmltcG9ydCBVc2VyID0gcmVxdWlyZSgnLi4vLi4vZnJhbWV3b3JrL2RhdGFhY2Nlc3MvbW9uZ29vc2UvdXNlcicpO1xyXG5pbXBvcnQgUHJvamVjdCA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9uZ29vc2UvUHJvamVjdCcpO1xyXG5pbXBvcnQgQnVpbGRpbmcgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vbmdvb3NlL0J1aWxkaW5nJyk7XHJcbmltcG9ydCBCdWlsZGluZ01vZGVsID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL0J1aWxkaW5nJyk7XHJcbmltcG9ydCBBdXRoSW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi8uLi9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvcicpO1xyXG5pbXBvcnQgQ29zdENvbnRyb2xsRXhjZXB0aW9uID0gcmVxdWlyZSgnLi4vZXhjZXB0aW9uL0Nvc3RDb250cm9sbEV4Y2VwdGlvbicpO1xyXG5pbXBvcnQgUXVhbnRpdHkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUXVhbnRpdHknKTtcclxuaW1wb3J0IFJhdGUgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUmF0ZScpO1xyXG5pbXBvcnQgQ29zdEhlYWQgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvQ29zdEhlYWQnKTtcclxuaW1wb3J0IFdvcmtJdGVtID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1dvcmtJdGVtJyk7XHJcbmltcG9ydCBSYXRlQW5hbHlzaXNTZXJ2aWNlID0gcmVxdWlyZSgnLi9SYXRlQW5hbHlzaXNTZXJ2aWNlJyk7XHJcbmltcG9ydCBDYXRlZ29yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9idWlsZGluZy9DYXRlZ29yeScpO1xyXG5sZXQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XHJcbmxldCBsb2c0anMgPSByZXF1aXJlKCdsb2c0anMnKTtcclxuaW1wb3J0IGFsYXNxbCA9IHJlcXVpcmUoJ2FsYXNxbCcpO1xyXG5pbXBvcnQgQnVkZ2V0Q29zdFJhdGVzID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L3JlcG9ydHMvQnVkZ2V0Q29zdFJhdGVzJyk7XHJcbmltcG9ydCBUaHVtYlJ1bGVSYXRlID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L3JlcG9ydHMvVGh1bWJSdWxlUmF0ZScpO1xyXG5pbXBvcnQgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L3NoYXJlZC9jb25zdGFudHMnKTtcclxubGV0IGxvZ2dlcj1sb2c0anMuZ2V0TG9nZ2VyKCdQcm9qZWN0IHNlcnZpY2UnKTtcclxuXHJcbmNsYXNzIFByb2plY3RTZXJ2aWNlIHtcclxuICBBUFBfTkFNRTogc3RyaW5nO1xyXG4gIGNvbXBhbnlfbmFtZTogc3RyaW5nO1xyXG4gIGNvc3RIZWFkSWQ6IG51bWJlcjtcclxuICBjYXRlZ29yeUlkOiBudW1iZXI7XHJcbiAgd29ya0l0ZW1JZDogbnVtYmVyO1xyXG4gIHByaXZhdGUgcHJvamVjdFJlcG9zaXRvcnk6IFByb2plY3RSZXBvc2l0b3J5O1xyXG4gIHByaXZhdGUgYnVpbGRpbmdSZXBvc2l0b3J5OiBCdWlsZGluZ1JlcG9zaXRvcnk7XHJcbiAgcHJpdmF0ZSBhdXRoSW50ZXJjZXB0b3I6IEF1dGhJbnRlcmNlcHRvcjtcclxuICBwcml2YXRlIHVzZXJTZXJ2aWNlIDogVXNlclNlcnZpY2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeSA9IG5ldyBQcm9qZWN0UmVwb3NpdG9yeSgpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkgPSBuZXcgQnVpbGRpbmdSZXBvc2l0b3J5KCk7XHJcbiAgICB0aGlzLkFQUF9OQU1FID0gUHJvamVjdEFzc2V0LkFQUF9OQU1FO1xyXG4gICAgdGhpcy5hdXRoSW50ZXJjZXB0b3IgPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XHJcbiAgICB0aGlzLnVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVQcm9qZWN0KGRhdGE6IFByb2plY3QsIHVzZXIgOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBpZighdXNlci5faWQpIHtcclxuICAgICAgY2FsbGJhY2sobmV3IENvc3RDb250cm9sbEV4Y2VwdGlvbignVXNlcklkIE5vdCBGb3VuZCcsbnVsbCksIG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuY3JlYXRlKGRhdGEsIChlcnIsIHJlcykgPT4ge1xyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjcmVhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdQcm9qZWN0IElEIDogJytyZXMuX2lkKTtcclxuICAgICAgICBsb2dnZXIuZGVidWcoJ1Byb2plY3QgTmFtZSA6ICcrcmVzLm5hbWUpO1xyXG4gICAgICAgIGxldCBwcm9qZWN0SWQgPSByZXMuX2lkO1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0gIHskcHVzaDogeyBwcm9qZWN0OiBwcm9qZWN0SWQgfX07XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZCA6IHVzZXIuX2lkfTtcclxuICAgICAgICB0aGlzLnVzZXJTZXJ2aWNlLmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXcgOnRydWV9LChlcnIsIHJlc3ApID0+IHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICBpZihlcnIpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSByZXMuY2F0ZWdvcnk7XHJcbiAgICAgICAgICAgIGRlbGV0ZSByZXMucmF0ZTtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRQcm9qZWN0QnlJZCggcHJvamVjdElkIDogc3RyaW5nLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSB7IF9pZDogcHJvamVjdElkfTtcclxuICAgIGxldCBwb3B1bGF0ZSA9IHtwYXRoIDogJ2J1aWxkaW5nJywgc2VsZWN0OiBbJ25hbWUnICwgJ3RvdGFsU2xhYkFyZWEnLF19O1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQW5kUG9wdWxhdGUocXVlcnksIHBvcHVsYXRlLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQW5kUG9wdWxhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGxvZ2dlci5kZWJ1ZygnUHJvamVjdCBOYW1lIDogJytyZXN1bHRbMF0ubmFtZSk7XHJcbiAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwseyBkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzKCBwcm9qZWN0SWQgOiBzdHJpbmcsIGJ1aWxkaW5nSWQ6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyBmb3Igc3luYyB3aXRoIHJhdGVBbmFseXNpcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHBvcHVsYXRlID0ge3BhdGggOiAnYnVpbGRpbmdzJ307XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRBbmRQb3B1bGF0ZShxdWVyeSwgcG9wdWxhdGUsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRBbmRQb3B1bGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgbG9nZ2VyLmRlYnVnKCdQcm9qZWN0IE5hbWUgOiAnK3Jlc3VsdFswXS5uYW1lKTtcclxuICAgICAgaWYoZXJyb3IpIHtcclxuICAgICAgICBsb2dnZXIuZXJyb3IoJ1Byb2plY3Qgc2VydmljZSwgZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyBmaW5kQW5kUG9wdWxhdGUgZmFpbGVkICcrSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzIHN1Y2Nlc3MuJyk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCx7IGRhdGE6IHJlc3VsdCB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVQcm9qZWN0QnlJZCggcHJvamVjdERldGFpbHM6IFByb2plY3QsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6YW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGVQcm9qZWN0RGV0YWlscyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkIDogcHJvamVjdERldGFpbHMuX2lkIH07XHJcbiAgICBkZWxldGUgcHJvamVjdERldGFpbHMuX2lkO1xyXG5cclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgcHJvamVjdERldGFpbHMsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3VsdCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNyZWF0ZUJ1aWxkaW5nKHByb2plY3RJZCA6IHN0cmluZywgYnVpbGRpbmdEZXRhaWxzIDogQnVpbGRpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5jcmVhdGUoYnVpbGRpbmdEZXRhaWxzLCAoZXJyb3IsIHJlc3VsdCk9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNyZWF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZCA6IHByb2plY3RJZCB9O1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0geyAkcHVzaDoge2J1aWxkaW5ncyA6IHJlc3VsdC5faWR9fTtcclxuICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXcgOiB0cnVlfSwgKGVycm9yLCBzdGF0dXMpPT4ge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVCdWlsZGluZ0J5SWQoIGJ1aWxkaW5nSWQ6c3RyaW5nLCBidWlsZGluZ0RldGFpbHM6YW55LCB1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGVCdWlsZGluZyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkIDogYnVpbGRpbmdJZCB9O1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgYnVpbGRpbmdEZXRhaWxzLHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3VsdCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNsb25lQnVpbGRpbmdEZXRhaWxzKCBidWlsZGluZ0lkOnN0cmluZywgYnVpbGRpbmdEZXRhaWxzOmFueSwgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgY2xvbmVCdWlsZGluZ0RldGFpbHMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcXVlcnkgPSB7IF9pZCA6IGJ1aWxkaW5nSWQgfTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkKGJ1aWxkaW5nSWQsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRCeUlkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNsb25lZENvc3RIZWFkRGV0YWlscyA6QXJyYXk8Q29zdEhlYWQ+PVtdO1xyXG4gICAgICAgIGxldCBjb3N0SGVhZHMgPWJ1aWxkaW5nRGV0YWlscy5jb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IHJlc3VsdENvc3RIZWFkcyA9IHJlc3VsdC5jb3N0SGVhZHM7XHJcbiAgICAgICAgZm9yKGxldCBjb3N0SGVhZCBvZiBjb3N0SGVhZHMpIHtcclxuICAgICAgICAgIGZvcihsZXQgcmVzdWx0Q29zdEhlYWQgb2YgcmVzdWx0Q29zdEhlYWRzKSB7XHJcbiAgICAgICAgICAgIGlmKGNvc3RIZWFkLm5hbWUgPT09IHJlc3VsdENvc3RIZWFkLm5hbWUpIHtcclxuICAgICAgICAgICAgICBsZXQgY2xvbmVkQ29zdEhlYWQgPSBuZXcgQ29zdEhlYWQ7XHJcbiAgICAgICAgICAgICAgY2xvbmVkQ29zdEhlYWQubmFtZSA9IHJlc3VsdENvc3RIZWFkLm5hbWU7XHJcbiAgICAgICAgICAgICAgY2xvbmVkQ29zdEhlYWQucmF0ZUFuYWx5c2lzSWQgPSByZXN1bHRDb3N0SGVhZC5yYXRlQW5hbHlzaXNJZDtcclxuICAgICAgICAgICAgICBjbG9uZWRDb3N0SGVhZC5hY3RpdmUgPSBjb3N0SGVhZC5hY3RpdmU7XHJcbiAgICAgICAgICAgICAgY2xvbmVkQ29zdEhlYWQudGh1bWJSdWxlUmF0ZSA9IHJlc3VsdENvc3RIZWFkLnRodW1iUnVsZVJhdGU7XHJcblxyXG4gICAgICAgICAgICAgIGlmKGNvc3RIZWFkLmFjdGl2ZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBjYXRlZ29yeUxpc3QgPSBjb3N0SGVhZC5jYXRlZ29yeTtcclxuICAgICAgICAgICAgICAgIGxldCByZXN1bHRDYXRlZ29yeUxpc3QgPSByZXN1bHRDb3N0SGVhZC5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICAgICAgZm9yKGxldCByZXN1bHRDYXRlZ29yeUluZGV4PTA7IHJlc3VsdENhdGVnb3J5SW5kZXg8cmVzdWx0Q2F0ZWdvcnlMaXN0Lmxlbmd0aDsgcmVzdWx0Q2F0ZWdvcnlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGZvcihsZXQgY2F0ZWdvcnlJbmRleD0wIDsgY2F0ZWdvcnlJbmRleDxjYXRlZ29yeUxpc3QubGVuZ3RoOyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihjYXRlZ29yeUxpc3RbY2F0ZWdvcnlJbmRleF0ubmFtZSA9PT0gcmVzdWx0Q2F0ZWdvcnlMaXN0W3Jlc3VsdENhdGVnb3J5SW5kZXhdLm5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmKCFjYXRlZ29yeUxpc3RbY2F0ZWdvcnlJbmRleF0uYWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdENhdGVnb3J5TGlzdC5zcGxpY2UocmVzdWx0Q2F0ZWdvcnlJbmRleCwxKTtcclxuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXN1bHRXb3JraXRlbUxpc3QgPSByZXN1bHRDYXRlZ29yeUxpc3RbcmVzdWx0Q2F0ZWdvcnlJbmRleF0ud29ya0l0ZW1zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgd29ya0l0ZW1MaXN0ID0gY2F0ZWdvcnlMaXN0W2NhdGVnb3J5SW5kZXhdLndvcmtJdGVtcztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcihsZXQgcmVzdWx0V29ya2l0ZW1JbmRleD0wOyAgcmVzdWx0V29ya2l0ZW1JbmRleCA8IHJlc3VsdFdvcmtpdGVtTGlzdC5sZW5ndGg7IHJlc3VsdFdvcmtpdGVtSW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZvcihsZXQgd29ya2l0ZW1JbmRleD0wOyAgd29ya2l0ZW1JbmRleCA8IHdvcmtJdGVtTGlzdC5sZW5ndGg7IHdvcmtpdGVtSW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIXdvcmtJdGVtTGlzdFt3b3JraXRlbUluZGV4XS5hY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0V29ya2l0ZW1MaXN0LnNwbGljZShyZXN1bHRXb3JraXRlbUluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNsb25lZENvc3RIZWFkLmNhdGVnb3JpZXMgPSByZXN1bHRDb3N0SGVhZC5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjbG9uZWRDb3N0SGVhZC5jYXRlZ29yaWVzID0gcmVzdWx0Q29zdEhlYWQuY2F0ZWdvcmllcztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjbG9uZWRDb3N0SGVhZERldGFpbHMucHVzaChjbG9uZWRDb3N0SGVhZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB1cGRhdGVCdWlsZGluZ0Nvc3RIZWFkcyA9IHsnY29zdEhlYWRzJyA6IGNsb25lZENvc3RIZWFkRGV0YWlsc307XHJcbiAgICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlQnVpbGRpbmdDb3N0SGVhZHMse25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRCdWlsZGluZ0J5SWQocHJvamVjdElkIDogc3RyaW5nLCBidWlsZGluZ0lkIDogc3RyaW5nLCB1c2VyOiBVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZ2V0QnVpbGRpbmcgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQnlJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXN1bHQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRJbkFjdGl2ZUNvc3RIZWFkKHByb2plY3RJZDogc3RyaW5nLCBidWlsZGluZ0lkOiBzdHJpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRJbkFjdGl2ZUNvc3RIZWFkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRCeUlkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnZ2V0dGluZyBJbkFjdGl2ZSBDb3N0SGVhZCBmb3IgQnVpbGRpbmcgTmFtZSA6ICcrcmVzdWx0Lm5hbWUpO1xyXG4gICAgICAgIGxldCByZXNwb25zZSA9IHJlc3VsdC5jb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IGluQWN0aXZlQ29zdEhlYWQ9W107XHJcbiAgICAgICAgZm9yKGxldCBjb3N0SGVhZEl0ZW0gb2YgcmVzcG9uc2UpIHtcclxuICAgICAgICAgIGlmKCFjb3N0SGVhZEl0ZW0uYWN0aXZlKSB7XHJcbiAgICAgICAgICAgIGluQWN0aXZlQ29zdEhlYWQucHVzaChjb3N0SGVhZEl0ZW0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLHtkYXRhOmluQWN0aXZlQ29zdEhlYWQsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRJbkFjdGl2ZVdvcmtJdGVtcyhwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgIHVzZXI6VXNlciwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGFkZCBXb3JraXRlbSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkKGJ1aWxkaW5nSWQsIChlcnJvciwgYnVpbGRpbmc6QnVpbGRpbmcpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZExpc3QgPSBidWlsZGluZy5jb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IGNhdGVnb3J5TGlzdDogQ2F0ZWdvcnlbXTtcclxuICAgICAgICBsZXQgd29ya0l0ZW1MaXN0OiBXb3JrSXRlbVtdO1xyXG4gICAgICAgIGxldCBpbkFjdGl2ZVdvcmtJdGVtcyA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgY29zdEhlYWRMaXN0Lmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgaWYgKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkTGlzdFtpbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgY2F0ZWdvcnlMaXN0ID0gY29zdEhlYWRMaXN0W2luZGV4XS5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBzdWJDYXRlZ29yeUluZGV4ID0gMDsgc3ViQ2F0ZWdvcnlJbmRleCA8IGNhdGVnb3J5TGlzdC5sZW5ndGg7IHN1YkNhdGVnb3J5SW5kZXgrKykge1xyXG4gICAgICAgICAgICAgIGlmIChjYXRlZ29yeUlkID09PSBjYXRlZ29yeUxpc3Rbc3ViQ2F0ZWdvcnlJbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgIHdvcmtJdGVtTGlzdCA9IGNhdGVnb3J5TGlzdFtzdWJDYXRlZ29yeUluZGV4XS53b3JrSXRlbXM7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGVja1dvcmtJdGVtIG9mIHdvcmtJdGVtTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgICBpZighY2hlY2tXb3JrSXRlbS5hY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbkFjdGl2ZVdvcmtJdGVtcy5wdXNoKGNoZWNrV29ya0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwse2RhdGE6aW5BY3RpdmVXb3JrSXRlbXMsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIEdldCBJbiBBY3RpdmUgV29ya0l0ZW1zIE9mIFByb2plY3QgQ29zdCBIZWFkc1xyXG4gIGdldEluQWN0aXZlV29ya0l0ZW1zT2ZQcm9qZWN0Q29zdEhlYWRzKHByb2plY3RJZDpzdHJpbmcsIGNvc3RIZWFkSWQ6bnVtYmVyLCBjYXRlZ29yeUlkOm51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBHZXQgSW4tQWN0aXZlIFdvcmtJdGVtcyBPZiBQcm9qZWN0IENvc3QgSGVhZHMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkKHByb2plY3RJZCwgKGVycm9yLCBwcm9qZWN0OlByb2plY3QpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZExpc3QgPSBwcm9qZWN0LnByb2plY3RDb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IGNhdGVnb3J5TGlzdDogQ2F0ZWdvcnlbXTtcclxuICAgICAgICBsZXQgd29ya0l0ZW1MaXN0OiBXb3JrSXRlbVtdO1xyXG4gICAgICAgIGxldCBpbkFjdGl2ZVdvcmtJdGVtcyA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBjb3N0SGVhZCBvZiBjb3N0SGVhZExpc3QpIHtcclxuICAgICAgICAgIGlmIChjb3N0SGVhZElkID09PSBjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBjYXRlZ29yeUxpc3QgPSBjb3N0SGVhZC5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYXRlZ29yeSBvZiBjYXRlZ29yeUxpc3QpIHtcclxuICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnlJZCA9PT0gY2F0ZWdvcnkucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgIHdvcmtJdGVtTGlzdCA9IGNhdGVnb3J5LndvcmtJdGVtcztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGNoZWNrV29ya0l0ZW0gb2Ygd29ya0l0ZW1MaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmKCFjaGVja1dvcmtJdGVtLmFjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGluQWN0aXZlV29ya0l0ZW1zLnB1c2goY2hlY2tXb3JrSXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCx7ZGF0YTppbkFjdGl2ZVdvcmtJdGVtcywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldEJ1aWxkaW5nQnlJZEZvckNsb25lKHByb2plY3RJZCA6IHN0cmluZywgYnVpbGRpbmdJZCA6IHN0cmluZywgdXNlcjogVXNlciwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldENsb25lZEJ1aWxkaW5nIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZEJ5SWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY2xvbmVkQnVpbGRpbmcgPSByZXN1bHQuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBidWlsZGluZyA9IG5ldyBCdWlsZGluZ01vZGVsKCk7XHJcbiAgICAgICAgYnVpbGRpbmcubmFtZSA9IHJlc3VsdC5uYW1lO1xyXG4gICAgICAgIGJ1aWxkaW5nLnRvdGFsU2xhYkFyZWEgPSByZXN1bHQudG90YWxTbGFiQXJlYTtcclxuICAgICAgICBidWlsZGluZy50b3RhbENhcnBldEFyZWFPZlVuaXQgPSByZXN1bHQudG90YWxDYXJwZXRBcmVhT2ZVbml0O1xyXG4gICAgICAgIGJ1aWxkaW5nLnRvdGFsU2FsZWFibGVBcmVhT2ZVbml0ID0gcmVzdWx0LnRvdGFsU2FsZWFibGVBcmVhT2ZVbml0O1xyXG4gICAgICAgIGJ1aWxkaW5nLnBsaW50aEFyZWEgPSByZXN1bHQucGxpbnRoQXJlYTtcclxuICAgICAgICBidWlsZGluZy50b3RhbE51bU9mRmxvb3JzID0gcmVzdWx0LnRvdGFsTnVtT2ZGbG9vcnM7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZQYXJraW5nRmxvb3JzID0gcmVzdWx0Lm51bU9mUGFya2luZ0Zsb29ycztcclxuICAgICAgICBidWlsZGluZy5jYXJwZXRBcmVhT2ZQYXJraW5nID0gcmVzdWx0LmNhcnBldEFyZWFPZlBhcmtpbmc7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZPbmVCSEsgPSByZXN1bHQubnVtT2ZPbmVCSEs7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZUd29CSEsgPSByZXN1bHQubnVtT2ZUd29CSEs7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZUaHJlZUJISyA9IHJlc3VsdC5udW1PZlRocmVlQkhLO1xyXG4gICAgICAgIGJ1aWxkaW5nLm51bU9mRm91ckJISyA9IHJlc3VsdC5udW1PZkZvdXJCSEs7XHJcbiAgICAgICAgYnVpbGRpbmcubnVtT2ZGaXZlQkhLID0gcmVzdWx0Lm51bU9mRml2ZUJISztcclxuICAgICAgICBidWlsZGluZy5udW1PZkxpZnRzID0gcmVzdWx0Lm51bU9mTGlmdHM7XHJcblxyXG4gICAgICAgIC8qbGV0IGNsb25lZENvc3RIZWFkQXJyYXkgOiBBcnJheTxDbG9uZWRDb3N0SGVhZD4gPSBbXTtcclxuXHJcbiAgICAgICAgZm9yKGxldCBjb3N0SGVhZEluZGV4ID0gMDsgY29zdEhlYWRJbmRleCA8IGNsb25lZEJ1aWxkaW5nLmxlbmd0aDsgY29zdEhlYWRJbmRleCsrKSB7XHJcblxyXG4gICAgICAgICAgbGV0IGNsb25lZENvc3RIZWFkID0gbmV3IENsb25lZENvc3RIZWFkO1xyXG4gICAgICAgICAgY2xvbmVkQ29zdEhlYWQubmFtZSA9IGNsb25lZEJ1aWxkaW5nW2Nvc3RIZWFkSW5kZXhdLm5hbWU7XHJcbiAgICAgICAgICBjbG9uZWRDb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCA9IGNsb25lZEJ1aWxkaW5nW2Nvc3RIZWFkSW5kZXhdLnJhdGVBbmFseXNpc0lkO1xyXG4gICAgICAgICAgY2xvbmVkQ29zdEhlYWQuYWN0aXZlID0gY2xvbmVkQnVpbGRpbmdbY29zdEhlYWRJbmRleF0uYWN0aXZlO1xyXG4gICAgICAgICAgY2xvbmVkQ29zdEhlYWQuYnVkZ2V0ZWRDb3N0QW1vdW50ID0gY2xvbmVkQnVpbGRpbmdbY29zdEhlYWRJbmRleF0uYnVkZ2V0ZWRDb3N0QW1vdW50O1xyXG5cclxuICAgICAgICAgIGxldCBjbG9uZWRXb3JrSXRlbUFycmF5IDogQXJyYXk8Q2xvbmVkV29ya0l0ZW0+ID0gW107XHJcbiAgICAgICAgICBsZXQgY2xvbmVkQ2F0ZWdvcnlBcnJheSA6IEFycmF5PENsb25lZENhdGVnb3J5PiA9IFtdO1xyXG4gICAgICAgICAgbGV0IGNhdGVnb3J5QXJyYXkgPSBjbG9uZWRCdWlsZGluZ1tjb3N0SGVhZEluZGV4XS5jYXRlZ29yaWVzO1xyXG5cclxuICAgICAgICAgIGZvcihsZXQgY2F0ZWdvcnlJbmRleD0wOyBjYXRlZ29yeUluZGV4PGNhdGVnb3J5QXJyYXkubGVuZ3RoOyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgbGV0IGNsb25lZENhdGVnb3J5ID0gbmV3IENsb25lZENhdGVnb3J5KCk7XHJcbiAgICAgICAgICAgIGNsb25lZENhdGVnb3J5Lm5hbWUgPSBjYXRlZ29yeUFycmF5W2NhdGVnb3J5SW5kZXhdLm5hbWU7XHJcbiAgICAgICAgICAgIGNsb25lZENhdGVnb3J5LnJhdGVBbmFseXNpc0lkID0gY2F0ZWdvcnlBcnJheVtjYXRlZ29yeUluZGV4XS5yYXRlQW5hbHlzaXNJZDtcclxuICAgICAgICAgICAgY2xvbmVkQ2F0ZWdvcnkuYW1vdW50ID0gY2F0ZWdvcnlBcnJheVtjYXRlZ29yeUluZGV4XS5hbW91bnQ7XHJcbiAgICAgICAgICAgIGNsb25lZENhdGVnb3J5LmFjdGl2ZSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICBsZXQgd29ya2l0ZW1BcnJheSA9IGNhdGVnb3J5QXJyYXlbY2F0ZWdvcnlJbmRleF0ud29ya0l0ZW1zO1xyXG4gICAgICAgICAgICBmb3IobGV0IHdvcmtpdGVtSW5kZXg9MDsgd29ya2l0ZW1JbmRleDwgd29ya2l0ZW1BcnJheS5sZW5ndGg7IHdvcmtpdGVtSW5kZXgrKykge1xyXG4gICAgICAgICAgICAgIGxldCBjbG9uZWRXb3JrSXRlbSA9IG5ldyBDbG9uZWRXb3JrSXRlbSgpO1xyXG4gICAgICAgICAgICAgIGNsb25lZFdvcmtJdGVtLm5hbWUgPSB3b3JraXRlbUFycmF5W3dvcmtpdGVtSW5kZXhdLm5hbWU7XHJcbiAgICAgICAgICAgICAgY2xvbmVkV29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQgPSAgd29ya2l0ZW1BcnJheVt3b3JraXRlbUluZGV4XS5yYXRlQW5hbHlzaXNJZDtcclxuICAgICAgICAgICAgICBjbG9uZWRXb3JrSXRlbS51bml0ID0gIHdvcmtpdGVtQXJyYXlbd29ya2l0ZW1JbmRleF0udW5pdDtcclxuICAgICAgICAgICAgICBjbG9uZWRXb3JrSXRlbS5hbW91bnQgPSB3b3JraXRlbUFycmF5W3dvcmtpdGVtSW5kZXhdLmFtb3VudDtcclxuICAgICAgICAgICAgICBjbG9uZWRXb3JrSXRlbS5yYXRlID0gd29ya2l0ZW1BcnJheVt3b3JraXRlbUluZGV4XS5yYXRlO1xyXG4gICAgICAgICAgICAgIGNsb25lZFdvcmtJdGVtLnF1YW50aXR5ID0gd29ya2l0ZW1BcnJheVt3b3JraXRlbUluZGV4XS5xdWFudGl0eTtcclxuICAgICAgICAgICAgICBjbG9uZWRXb3JrSXRlbUFycmF5LnB1c2goY2xvbmVkV29ya0l0ZW0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNsb25lZENhdGVnb3J5LndvcmtJdGVtcyA9IGNsb25lZFdvcmtJdGVtQXJyYXk7XHJcbiAgICAgICAgICAgIGNsb25lZENhdGVnb3J5QXJyYXkucHVzaChjbG9uZWRDYXRlZ29yeSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjbG9uZWRDb3N0SGVhZC5jYXRlZ29yaWVzID0gY2xvbmVkQ2F0ZWdvcnlBcnJheTtcclxuICAgICAgICAgIGNsb25lZENvc3RIZWFkQXJyYXkucHVzaChjbG9uZWRDb3N0SGVhZCk7XHJcbiAgICAgICAgfSovXHJcbiAgICAgICAgYnVpbGRpbmcuY29zdEhlYWRzID0gcmVzdWx0LmNvc3RIZWFkcztcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogYnVpbGRpbmcsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBkZWxldGVCdWlsZGluZ0J5SWQocHJvamVjdElkOnN0cmluZywgYnVpbGRpbmdJZDpzdHJpbmcsIHVzZXI6VXNlciwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGRlbGV0ZUJ1aWxkaW5nIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHBvcEJ1aWxkaW5nSWQgPSBidWlsZGluZ0lkO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZGVsZXRlKGJ1aWxkaW5nSWQsIChlcnJvciwgcmVzdWx0KT0+IHtcclxuICAgICAgaWYoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogcHJvamVjdElkfTtcclxuICAgICAgICBsZXQgbmV3RGF0YSA9IHsgJHB1bGw6IHtidWlsZGluZ3MgOiBwb3BCdWlsZGluZ0lkfX07XHJcbiAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCBzdGF0dXMpPT4ge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiBzdGF0dXMsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRSYXRlKHByb2plY3RJZDpzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlcixjYXRlZ29yeUlkOm51bWJlciwgd29ya0l0ZW1JZDpudW1iZXIsIHVzZXIgOiBVc2VyLFxyXG4gICAgICAgICAgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGdldFJhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgbGV0IHJhdGVBbmFseXNpc1NlcnZpY2VzOiBSYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICAgIHJhdGVBbmFseXNpc1NlcnZpY2VzLmdldFJhdGUod29ya0l0ZW1JZCwgKGVycm9yLCByYXRlRGF0YSkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHJhdGUgOlJhdGUgPSBuZXcgUmF0ZSgpO1xyXG4gICAgICAgIHJhdGUucmF0ZUl0ZW1zID0gcmF0ZURhdGE7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJhdGVEYXRhLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlUmF0ZShwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsY2F0ZWdvcnlJZDpudW1iZXIsXHJcbiAgICAgICAgICAgICB3b3JrSXRlbUlkOm51bWJlciwgcmF0ZSA6UmF0ZSwgdXNlciA6IFVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGVSYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCBidWlsZGluZzpCdWlsZGluZykgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQnlJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCByYXRlQW5hbHlzaXNJZDogbnVtYmVyO1xyXG4gICAgICAgIGZvcihsZXQgaW5kZXggPSAwOyBidWlsZGluZy5jb3N0SGVhZHMubGVuZ3RoID4gaW5kZXg7IGluZGV4KyspIHtcclxuICAgICAgICAgIGlmKGJ1aWxkaW5nLmNvc3RIZWFkc1tpbmRleF0ucmF0ZUFuYWx5c2lzSWQgPT09IGNvc3RIZWFkSWQpIHtcclxuICAgICAgICAgICAgZm9yKGxldCBpbmRleENhdGVnb3J5ID0gMDsgYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzLmxlbmd0aCA+IGluZGV4Q2F0ZWdvcnk7IGluZGV4Q2F0ZWdvcnkrKykge1xyXG4gICAgICAgICAgICAgIGlmIChidWlsZGluZy5jb3N0SGVhZHNbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXhDYXRlZ29yeV0ucmF0ZUFuYWx5c2lzSWQgPT09IGNhdGVnb3J5SWQpIHtcclxuICAgICAgICAgICAgICAgIGZvcihsZXQgaW5kZXhXb3JraXRlbSA9IDA7IGJ1aWxkaW5nLmNvc3RIZWFkc1tpbmRleF0uY2F0ZWdvcmllc1tpbmRleENhdGVnb3J5XS53b3JrSXRlbXMubGVuZ3RoID5cclxuICAgICAgICAgICAgICAgIGluZGV4V29ya2l0ZW07IGluZGV4V29ya2l0ZW0rKykge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4Q2F0ZWdvcnldLndvcmtJdGVtc1tpbmRleFdvcmtpdGVtXS5yYXRlQW5hbHlzaXNJZCA9PT0gd29ya0l0ZW1JZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJ1aWxkaW5nLmNvc3RIZWFkc1tpbmRleF0uY2F0ZWdvcmllc1tpbmRleENhdGVnb3J5XS53b3JrSXRlbXNbaW5kZXhXb3JraXRlbV0ucmF0ZT1yYXRlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJyA6IGJ1aWxkaW5nSWR9O1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0geyAkc2V0IDogeydjb3N0SGVhZHMnIDogYnVpbGRpbmcuY29zdEhlYWRzfX07XHJcbiAgICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSx7bmV3OiB0cnVlfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogcmF0ZSwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vVXBkYXRlIHJhdGUgb2YgcHJvamVjdCBjb3N0IGhlYWRzXHJcbiAgdXBkYXRlUmF0ZU9mUHJvamVjdENvc3RIZWFkcyhwcm9qZWN0SWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlcixjYXRlZ29yeUlkOm51bWJlcixcclxuICAgICAgICAgICAgIHdvcmtJdGVtSWQ6bnVtYmVyLCByYXRlIDpSYXRlLCB1c2VyIDogVXNlciwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZVJhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkKHByb2plY3RJZCwgKGVycm9yLCBwcm9qZWN0IDogUHJvamVjdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kQnlJZCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBwcm9qZWN0Q29zdEhlYWRzID0gcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzO1xyXG4gICAgICAgIGZvcihsZXQgaW5kZXggPSAwOyBwcm9qZWN0Q29zdEhlYWRzLmxlbmd0aCA+IGluZGV4OyBpbmRleCsrKSB7XHJcbiAgICAgICAgICBpZihwcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5yYXRlQW5hbHlzaXNJZCA9PT0gY29zdEhlYWRJZCkge1xyXG4gICAgICAgICAgICBmb3IobGV0IGluZGV4Q2F0ZWdvcnkgPSAwOyBwcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzLmxlbmd0aCA+IGluZGV4Q2F0ZWdvcnk7IGluZGV4Q2F0ZWdvcnkrKykge1xyXG4gICAgICAgICAgICAgIGlmIChwcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4Q2F0ZWdvcnldLnJhdGVBbmFseXNpc0lkID09PSBjYXRlZ29yeUlkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IobGV0IGluZGV4V29ya2l0ZW0gPSAwOyBwcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4Q2F0ZWdvcnldLndvcmtJdGVtcy5sZW5ndGggPlxyXG4gICAgICAgICAgICAgICAgaW5kZXhXb3JraXRlbTsgaW5kZXhXb3JraXRlbSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChwcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4Q2F0ZWdvcnldLndvcmtJdGVtc1tpbmRleFdvcmtpdGVtXS5yYXRlQW5hbHlzaXNJZCA9PT0gd29ya0l0ZW1JZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3RDb3N0SGVhZHNbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXhDYXRlZ29yeV0ud29ya0l0ZW1zW2luZGV4V29ya2l0ZW1dLnJhdGU9cmF0ZTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgcXVlcnkgPSB7J19pZCcgOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgIGxldCBuZXdEYXRhID0geyAkc2V0IDogeydwcm9qZWN0Q29zdEhlYWRzJyA6IHByb2plY3RDb3N0SGVhZHN9fTtcclxuICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEse25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6ICdzdWNjZXNzJywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGRlbGV0ZVF1YW50aXR5QnlOYW1lKHByb2plY3RJZDpzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOnN0cmluZywgY2F0ZWdvcnlJZDpzdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgd29ya0l0ZW1JZDpzdHJpbmcsIGl0ZW06c3RyaW5nLCB1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBkZWxldGVRdWFudGl0eSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkKGJ1aWxkaW5nSWQsIChlcnJvciwgYnVpbGRpbmc6QnVpbGRpbmcpID0+IHtcclxuICAgICAgaWYgKGVycm9yXHJcbiAgICAgICkge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcXVhbnRpdHk6IFF1YW50aXR5O1xyXG4gICAgICAgICB0aGlzLmNvc3RIZWFkSWQgPSBwYXJzZUludChjb3N0SGVhZElkKTtcclxuICAgICAgICAgIHRoaXMuY2F0ZWdvcnlJZCA9IHBhcnNlSW50KGNhdGVnb3J5SWQpO1xyXG4gICAgICAgICAgdGhpcy53b3JrSXRlbUlkID0gcGFyc2VJbnQod29ya0l0ZW1JZCk7XHJcblxyXG4gICAgICAgICAgZm9yKGxldCBpbmRleCA9IDA7IGJ1aWxkaW5nLmNvc3RIZWFkcy5sZW5ndGggPiBpbmRleDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICBpZiAoYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5yYXRlQW5hbHlzaXNJZCA9PT0gdGhpcy5jb3N0SGVhZElkKSB7XHJcbiAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXgxID0gMDsgYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzLmxlbmd0aCA+IGluZGV4MTsgaW5kZXgxKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChidWlsZGluZy5jb3N0SGVhZHNbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXgxXS5yYXRlQW5hbHlzaXNJZCA9PT0gdGhpcy5jYXRlZ29yeUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4MiA9IDA7IGJ1aWxkaW5nLmNvc3RIZWFkc1tpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtcy5sZW5ndGggPiBpbmRleDI7IGluZGV4MisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1aWxkaW5nLmNvc3RIZWFkc1tpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtc1tpbmRleDJdLnJhdGVBbmFseXNpc0lkID09PSB0aGlzLndvcmtJdGVtSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHF1YW50aXR5ID0gYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ud29ya0l0ZW1zW2luZGV4Ml0ucXVhbnRpdHk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvcihsZXQgaW5kZXggPSAwOyBxdWFudGl0eS5xdWFudGl0eUl0ZW1zLmxlbmd0aCA+IGluZGV4OyBpbmRleCArKykge1xyXG4gICAgICAgICAgaWYocXVhbnRpdHkucXVhbnRpdHlJdGVtc1tpbmRleF0uaXRlbSAgPT09IGl0ZW0pIHtcclxuICAgICAgICAgICAgcXVhbnRpdHkucXVhbnRpdHlJdGVtcy5zcGxpY2UoaW5kZXgsMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcXVlcnkgPSB7IF9pZCA6IGJ1aWxkaW5nSWQgfTtcclxuICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBidWlsZGluZyx7bmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgcXVhbnRpdHk6IFF1YW50aXR5O1xyXG5cclxuICAgICAgICAgICAgZm9yKGxldCBpbmRleCA9IDA7IGJ1aWxkaW5nLmNvc3RIZWFkcy5sZW5ndGggPiBpbmRleDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgIGlmIChidWlsZGluZy5jb3N0SGVhZHNbaW5kZXhdLnJhdGVBbmFseXNpc0lkID09PSB0aGlzLmNvc3RIZWFkSWQpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4MSA9IDA7IGJ1aWxkaW5nLmNvc3RIZWFkc1tpbmRleF0uY2F0ZWdvcmllcy5sZW5ndGggPiBpbmRleDE7IGluZGV4MSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChidWlsZGluZy5jb3N0SGVhZHNbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXgxXS5yYXRlQW5hbHlzaXNJZCA9PT0gdGhpcy5jYXRlZ29yeUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXgyID0gMDsgYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ud29ya0l0ZW1zLmxlbmd0aCA+IGluZGV4MjsgaW5kZXgyKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChidWlsZGluZy5jb3N0SGVhZHNbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXgxXS53b3JrSXRlbXNbaW5kZXgyXS5yYXRlQW5hbHlzaXNJZCA9PT0gdGhpcy53b3JrSXRlbUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1YW50aXR5ID0gYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ud29ya0l0ZW1zW2luZGV4Ml0ucXVhbnRpdHk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZihxdWFudGl0eS50b3RhbCkge1xyXG4gICAgICAgICAgICAgIGlmKHF1YW50aXR5LnF1YW50aXR5SXRlbXMubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IobGV0IGluZGV4ID0gMDsgcXVhbnRpdHkucXVhbnRpdHlJdGVtcy5sZW5ndGggPiBpbmRleDsgaW5kZXggKyspIHtcclxuICAgICAgICAgICAgICAgICAgcXVhbnRpdHkudG90YWwgPSBxdWFudGl0eS5xdWFudGl0eUl0ZW1zW2luZGV4XS5xdWFudGl0eSArIHF1YW50aXR5LnRvdGFsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgICAgIHF1YW50aXR5LnRvdGFsID0gMDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHF1YW50aXR5LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZGVsZXRlUXVhbnRpdHlPZlByb2plY3RDb3N0SGVhZHNCeU5hbWUocHJvamVjdElkOnN0cmluZywgY29zdEhlYWRJZDpzdHJpbmcsIGNhdGVnb3J5SWQ6c3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtSWQ6c3RyaW5nLCBpdGVtOnN0cmluZywgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZGVsZXRlUXVhbnRpdHkgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRCeUlkKHByb2plY3RJZCwgKGVycm9yLCBwcm9qZWN0IDogUHJvamVjdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3JcclxuICAgICAgKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBxdWFudGl0eTogUXVhbnRpdHk7XHJcbiAgICAgICAgdGhpcy5jb3N0SGVhZElkID0gcGFyc2VJbnQoY29zdEhlYWRJZCk7XHJcbiAgICAgICAgdGhpcy5jYXRlZ29yeUlkID0gcGFyc2VJbnQoY2F0ZWdvcnlJZCk7XHJcbiAgICAgICAgdGhpcy53b3JrSXRlbUlkID0gcGFyc2VJbnQod29ya0l0ZW1JZCk7XHJcblxyXG4gICAgICAgIGZvcihsZXQgaW5kZXggPSAwOyBwcm9qZWN0LnByb2plY3RDb3N0SGVhZHMubGVuZ3RoID4gaW5kZXg7IGluZGV4KyspIHtcclxuICAgICAgICAgIGlmIChwcm9qZWN0LnByb2plY3RDb3N0SGVhZHNbaW5kZXhdLnJhdGVBbmFseXNpc0lkID09PSB0aGlzLmNvc3RIZWFkSWQpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXgxID0gMDsgcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzLmxlbmd0aCA+IGluZGV4MTsgaW5kZXgxKyspIHtcclxuICAgICAgICAgICAgICBpZiAocHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ucmF0ZUFuYWx5c2lzSWQgPT09IHRoaXMuY2F0ZWdvcnlJZCkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXgyID0gMDsgcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ud29ya0l0ZW1zLmxlbmd0aCA+IGluZGV4MjsgaW5kZXgyKyspIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHByb2plY3QucHJvamVjdENvc3RIZWFkc1tpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtc1tpbmRleDJdLnJhdGVBbmFseXNpc0lkID09PSB0aGlzLndvcmtJdGVtSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eSA9IHByb2plY3QucHJvamVjdENvc3RIZWFkc1tpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtc1tpbmRleDJdLnF1YW50aXR5O1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IobGV0IGluZGV4ID0gMDsgcXVhbnRpdHkucXVhbnRpdHlJdGVtcy5sZW5ndGggPiBpbmRleDsgaW5kZXggKyspIHtcclxuICAgICAgICAgIGlmKHF1YW50aXR5LnF1YW50aXR5SXRlbXNbaW5kZXhdLml0ZW0gID09PSBpdGVtKSB7XHJcbiAgICAgICAgICAgIHF1YW50aXR5LnF1YW50aXR5SXRlbXMuc3BsaWNlKGluZGV4LDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0geyBfaWQgOiBwcm9qZWN0SWQgfTtcclxuICAgICAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHByb2plY3Qse25ldzogdHJ1ZX0sIChlcnJvciwgcHJvamVjdCA6IFByb2plY3QpID0+IHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IHF1YW50aXR5OiBRdWFudGl0eTtcclxuXHJcbiAgICAgICAgICAgIGZvcihsZXQgaW5kZXggPSAwOyBwcm9qZWN0LnByb2plY3RDb3N0SGVhZHMubGVuZ3RoID4gaW5kZXg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICBpZiAocHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5yYXRlQW5hbHlzaXNJZCA9PT0gdGhpcy5jb3N0SGVhZElkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleDEgPSAwOyBwcm9qZWN0LnByb2plY3RDb3N0SGVhZHNbaW5kZXhdLmNhdGVnb3JpZXMubGVuZ3RoID4gaW5kZXgxOyBpbmRleDErKykge1xyXG4gICAgICAgICAgICAgICAgICBpZiAocHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ucmF0ZUFuYWx5c2lzSWQgPT09IHRoaXMuY2F0ZWdvcnlJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4MiA9IDA7IHByb2plY3QucHJvamVjdENvc3RIZWFkc1tpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtcy5sZW5ndGggPiBpbmRleDI7IGluZGV4MisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ud29ya0l0ZW1zW2luZGV4Ml0ucmF0ZUFuYWx5c2lzSWQgPT09IHRoaXMud29ya0l0ZW1JZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxdWFudGl0eSA9IHByb2plY3QucHJvamVjdENvc3RIZWFkc1tpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtc1tpbmRleDJdLnF1YW50aXR5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYocXVhbnRpdHkudG90YWwpIHtcclxuICAgICAgICAgICAgICBpZihxdWFudGl0eS5xdWFudGl0eUl0ZW1zLmxlbmd0aCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgZm9yKGxldCBpbmRleCA9IDA7IHF1YW50aXR5LnF1YW50aXR5SXRlbXMubGVuZ3RoID4gaW5kZXg7IGluZGV4ICsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIHF1YW50aXR5LnRvdGFsID0gcXVhbnRpdHkucXVhbnRpdHlJdGVtc1tpbmRleF0ucXVhbnRpdHkgKyBxdWFudGl0eS50b3RhbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBxdWFudGl0eS50b3RhbCA9IDA7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiAnc3VjY2VzcycsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBkZWxldGVXb3JraXRlbShwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyLCB3b3JrSXRlbUlkOm51bWJlciwgdXNlcjpVc2VyLFxyXG4gICAgICAgICAgICAgICAgIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBkZWxldGUgV29ya2l0ZW0gaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nOkJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjYXRlZ29yeUxpc3Q6IENhdGVnb3J5W107XHJcbiAgICAgICAgbGV0IFdvcmtJdGVtTGlzdDogV29ya0l0ZW1bXTtcclxuICAgICAgICB2YXIgZmxhZyA9IDA7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3N0SGVhZExpc3QubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWRJZCA9PT0gY29zdEhlYWRMaXN0W2luZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBjYXRlZ29yeUxpc3QgPSBjb3N0SGVhZExpc3RbaW5kZXhdLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNhdGVnb3J5SW5kZXggPSAwOyBjYXRlZ29yeUluZGV4IDwgY2F0ZWdvcnlMaXN0Lmxlbmd0aDsgY2F0ZWdvcnlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5SWQgPT09IGNhdGVnb3J5TGlzdFtjYXRlZ29yeUluZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgV29ya0l0ZW1MaXN0ID0gY2F0ZWdvcnlMaXN0W2NhdGVnb3J5SW5kZXhdLndvcmtJdGVtcztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHdvcmtpdGVtSW5kZXggPSAwOyB3b3JraXRlbUluZGV4IDwgV29ya0l0ZW1MaXN0Lmxlbmd0aDsgd29ya2l0ZW1JbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbUlkID09PSBXb3JrSXRlbUxpc3Rbd29ya2l0ZW1JbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBmbGFnID0gMTtcclxuICAgICAgICAgICAgICAgICAgICBXb3JrSXRlbUxpc3Quc3BsaWNlKHdvcmtpdGVtSW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihmbGFnID09PSAxKSB7XHJcbiAgICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBidWlsZGluZ0lkfTtcclxuICAgICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGJ1aWxkaW5nLCB7bmV3OiB0cnVlfSwgKGVycm9yLCBXb3JrSXRlbUxpc3QpID0+IHtcclxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGxldCBtZXNzYWdlID0gJ1dvcmtJdGVtIGRlbGV0ZWQuJztcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogV29ya0l0ZW1MaXN0LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHNldENvc3RIZWFkU3RhdHVzKCBidWlsZGluZ0lkIDogc3RyaW5nLCBjb3N0SGVhZElkIDogbnVtYmVyLCBjb3N0SGVhZEFjdGl2ZVN0YXR1cyA6IHN0cmluZywgdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSB7J19pZCcgOiBidWlsZGluZ0lkLCAnY29zdEhlYWRzLnJhdGVBbmFseXNpc0lkJyA6IGNvc3RIZWFkSWR9O1xyXG4gICAgbGV0IGFjdGl2ZVN0YXR1cyA9IEpTT04ucGFyc2UoY29zdEhlYWRBY3RpdmVTdGF0dXMpO1xyXG4gICAgbGV0IG5ld0RhdGEgPSB7ICRzZXQgOiB7J2Nvc3RIZWFkcy4kLmFjdGl2ZScgOiBhY3RpdmVTdGF0dXN9fTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIHtuZXc6IHRydWV9LChlcnIsIHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHJlc3BvbnNlLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgc2V0V29ya0l0ZW1TdGF0dXMoIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgY2F0ZWdvcnlJZDpudW1iZXIsIHdvcmtJdGVtSWQ6bnVtYmVyLCB3b3JrSXRlbUFjdGl2ZVN0YXR1cyA6IGJvb2xlYW4sXHJcbiAgICAgICAgICAgICAgICAgICB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCB1cGRhdGUgV29ya2l0ZW0gaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nOkJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjYXRlZ29yeUxpc3Q6IENhdGVnb3J5W107XHJcbiAgICAgICAgbGV0IHdvcmtJdGVtTGlzdDogV29ya0l0ZW1bXTtcclxuICAgICAgICBsZXQgaXNXb3JrSXRlbVVwZGF0ZWQgOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3N0SGVhZExpc3QubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWRJZCA9PT0gY29zdEhlYWRMaXN0W2luZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBjYXRlZ29yeUxpc3QgPSBjb3N0SGVhZExpc3RbaW5kZXhdLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHN1YkNhdGVnb3J5SW5kZXggPSAwOyBzdWJDYXRlZ29yeUluZGV4IDwgY2F0ZWdvcnlMaXN0Lmxlbmd0aDsgc3ViQ2F0ZWdvcnlJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5SWQgPT09IGNhdGVnb3J5TGlzdFtzdWJDYXRlZ29yeUluZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgd29ya0l0ZW1MaXN0ID0gY2F0ZWdvcnlMaXN0W3N1YkNhdGVnb3J5SW5kZXhdLndvcmtJdGVtcztcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHdvcmtJdGVtSW5kZXggPSAwOyB3b3JrSXRlbUluZGV4IDwgd29ya0l0ZW1MaXN0Lmxlbmd0aDsgd29ya0l0ZW1JbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbUlkID09PSB3b3JrSXRlbUxpc3Rbd29ya0l0ZW1JbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpc1dvcmtJdGVtVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1MaXN0W3dvcmtJdGVtSW5kZXhdLmFjdGl2ZSA9IHdvcmtJdGVtQWN0aXZlU3RhdHVzO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihpc1dvcmtJdGVtVXBkYXRlZCkge1xyXG4gICAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBidWlsZGluZywge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiB3b3JrSXRlbUxpc3QsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gVXBkYXRlIFdvcmtJdGVtIFN0YXR1cyBPZiBQcm9qZWN0IENvc3RIZWFkc1xyXG4gIHVwZGF0ZVdvcmtJdGVtU3RhdHVzT2ZQcm9qZWN0Q29zdEhlYWRzKHByb2plY3RJZDpzdHJpbmcsIGNvc3RIZWFkSWQ6bnVtYmVyLCBjYXRlZ29yeUlkOm51bWJlciwgd29ya0l0ZW1JZDpudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1BY3RpdmVTdGF0dXMgOiBib29sZWFuLCB1c2VyOiBVc2VyLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBVcGRhdGUgV29ya0l0ZW0gU3RhdHVzIE9mIFByb2plY3QgQ29zdCBIZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZEJ5SWQocHJvamVjdElkLCAoZXJyb3IsIHByb2plY3Q6UHJvamVjdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkTGlzdCA9IHByb2plY3QucHJvamVjdENvc3RIZWFkcztcclxuICAgICAgICBsZXQgY2F0ZWdvcnlMaXN0OiBDYXRlZ29yeVtdO1xyXG4gICAgICAgIGxldCB3b3JrSXRlbUxpc3Q6ICBBcnJheTxXb3JrSXRlbT49IG5ldyBBcnJheTxXb3JrSXRlbT4oKTtcclxuICAgICAgICBsZXQgdXBkYXRlZFdvcmtJdGVtTGlzdDogQXJyYXk8V29ya0l0ZW0+PSBuZXcgQXJyYXk8V29ya0l0ZW0+KCk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGNvc3RIZWFkIG9mIGNvc3RIZWFkTGlzdCkge1xyXG4gICAgICAgICAgaWYgKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5TGlzdCA9IGNvc3RIZWFkLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNhdGVnb3J5IG9mIGNhdGVnb3J5TGlzdCkge1xyXG4gICAgICAgICAgICAgIGlmIChjYXRlZ29yeUlkID09PSBjYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgd29ya0l0ZW1MaXN0ID0gY2F0ZWdvcnkud29ya0l0ZW1zO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgd29ya0l0ZW0gb2Ygd29ya0l0ZW1MaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbUlkID09PSB3b3JrSXRlbS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtLmFjdGl2ZSA9IHdvcmtJdGVtQWN0aXZlU3RhdHVzO1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRXb3JrSXRlbUxpc3QucHVzaCh3b3JrSXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogcHJvamVjdElkfTtcclxuICAgICAgICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgcHJvamVjdCwge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgVXBkYXRlIFdvcmtJdGVtIFN0YXR1cyBPZiBQcm9qZWN0IENvc3QgSGVhZHMgLGZpbmRPbmVBbmRVcGRhdGUgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogdXBkYXRlZFdvcmtJdGVtTGlzdCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVCdWRnZXRlZENvc3RGb3JDb3N0SGVhZCggYnVpbGRpbmdJZCA6IHN0cmluZywgY29zdEhlYWRCdWRnZXRlZEFtb3VudCA6IGFueSwgdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgdXBkYXRlQnVkZ2V0ZWRDb3N0Rm9yQ29zdEhlYWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcXVlcnkgPSB7J19pZCcgOiBidWlsZGluZ0lkLCAnY29zdEhlYWRzLm5hbWUnIDogY29zdEhlYWRCdWRnZXRlZEFtb3VudC5jb3N0SGVhZH07XHJcbiAgICBsZXQgY29zdEluVW5pdCA9IGNvc3RIZWFkQnVkZ2V0ZWRBbW91bnQuY29zdEluO1xyXG4gICAgbGV0IGNvc3RQZXJVbml0ID0gY29zdEhlYWRCdWRnZXRlZEFtb3VudC5jb3N0UGVyO1xyXG4gICAgbGV0IHJhdGUgPSAwO1xyXG4gICAgbGV0IG5ld0RhdGE7XHJcbiAgICByYXRlID0gY29zdEhlYWRCdWRnZXRlZEFtb3VudC5idWRnZXRlZENvc3RBbW91bnQgLyBjb3N0SGVhZEJ1ZGdldGVkQW1vdW50LmJ1aWxkaW5nQXJlYTtcclxuXHJcbiAgICBpZihjb3N0UGVyVW5pdCA9PT0gJ3NhbGVhYmxlQXJlYScgJiYgY29zdEluVW5pdCA9PT0gJ3NxZnQnKSB7XHJcbiAgICAgIG5ld0RhdGEgPSB7ICRzZXQgOiB7XHJcbiAgICAgICAgJ2Nvc3RIZWFkcy4kLnRodW1iUnVsZVJhdGUuc2FsZWFibGVBcmVhLnNxZnQnIDogcmF0ZSxcclxuICAgICAgICAnY29zdEhlYWRzLiQudGh1bWJSdWxlUmF0ZS5zYWxlYWJsZUFyZWEuc3FtdCcgOiByYXRlIC8gY29uZmlnLmdldChDb25zdGFudHMuU1FVQVJFX01FVEVSKVxyXG4gICAgICB9IH07XHJcbiAgICB9IGVsc2UgaWYoY29zdFBlclVuaXQgPT09ICdzYWxlYWJsZUFyZWEnICYmIGNvc3RJblVuaXQgPT09ICdzcW10Jykge1xyXG4gICAgICBuZXdEYXRhID0geyAkc2V0IDoge1xyXG4gICAgICAgICdjb3N0SGVhZHMuJC50aHVtYlJ1bGVSYXRlLnNhbGVhYmxlQXJlYS5zcW10JyA6IHJhdGUsXHJcbiAgICAgICAgJ2Nvc3RIZWFkcy4kLnRodW1iUnVsZVJhdGUuc2FsZWFibGVBcmVhLnNxZnQnIDogcmF0ZSAqIGNvbmZpZy5nZXQoQ29uc3RhbnRzLlNRVUFSRV9NRVRFUilcclxuICAgICAgfSB9O1xyXG4gICAgfSBlbHNlIGlmKGNvc3RQZXJVbml0ID09PSAnc2xhYkFyZWEnICYmIGNvc3RJblVuaXQgPT09ICdzcWZ0Jykge1xyXG4gICAgICBuZXdEYXRhID0geyAkc2V0IDoge1xyXG4gICAgICAgICdjb3N0SGVhZHMuJC50aHVtYlJ1bGVSYXRlLnNsYWJBcmVhLnNxZnQnIDogcmF0ZSxcclxuICAgICAgICAnY29zdEhlYWRzLiQudGh1bWJSdWxlUmF0ZS5zbGFiQXJlYS5zcW10JyA6IHJhdGUgLyBjb25maWcuZ2V0KENvbnN0YW50cy5TUVVBUkVfTUVURVIpXHJcbiAgICAgIH0gfTtcclxuICAgIH0gZWxzZSBpZihjb3N0UGVyVW5pdCA9PT0gJ3NsYWJBcmVhJyAmJiBjb3N0SW5Vbml0ID09PSAnc3FtdCcpIHtcclxuICAgICAgbmV3RGF0YSA9IHsgJHNldCA6IHtcclxuICAgICAgICAnY29zdEhlYWRzLiQudGh1bWJSdWxlUmF0ZS5zbGFiQXJlYS5zcW10JyA6IHJhdGUsXHJcbiAgICAgICAgJ2Nvc3RIZWFkcy4kLnRodW1iUnVsZVJhdGUuc2xhYkFyZWEuc3FmdCcgOiByYXRlICogY29uZmlnLmdldChDb25zdGFudHMuU1FVQVJFX01FVEVSKVxyXG4gICAgICB9IH07XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSwge25ldzp0cnVlfSwoZXJyLCByZXNwb25zZSkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZihlcnIpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXNwb25zZSwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVF1YW50aXR5KHByb2plY3RJZDpzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOnN0cmluZywgY2F0ZWdvcnlJZDpzdHJpbmcsIHdvcmtJdGVtSWQ6c3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgIHF1YW50aXR5OmFueSwgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgdXBkYXRlUXVhbnRpdHkgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBxdWFudGl0eUFycmF5ICA6IFF1YW50aXR5O1xyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3N0SGVhZExpc3QubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICBpZiAocGFyc2VJbnQoY29zdEhlYWRJZCkgPT09IGNvc3RIZWFkTGlzdFtpbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXgxID0gMDsgaW5kZXgxIDwgY29zdEhlYWRMaXN0W2luZGV4XS5jYXRlZ29yaWVzLmxlbmd0aDsgaW5kZXgxKyspIHtcclxuICAgICAgICAgICAgICBpZiAocGFyc2VJbnQoY2F0ZWdvcnlJZCkgPT09IGNvc3RIZWFkTGlzdFtpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleDIgPSAwOyBpbmRleDIgPCBjb3N0SGVhZExpc3RbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXgxXS53b3JrSXRlbXMubGVuZ3RoOyBpbmRleDIrKykge1xyXG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQod29ya0l0ZW1JZCkgPT09IGNvc3RIZWFkTGlzdFtpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtc1tpbmRleDJdLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlBcnJheSAgPSBjb3N0SGVhZExpc3RbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXgxXS53b3JrSXRlbXNbaW5kZXgyXS5xdWFudGl0eTtcclxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eUFycmF5LnF1YW50aXR5SXRlbXMgPSBxdWFudGl0eTtcclxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eUFycmF5LnRvdGFsID0gMDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpdGVtSW5kZXggPSAwOyBxdWFudGl0eUFycmF5LnF1YW50aXR5SXRlbXMubGVuZ3RoID4gaXRlbUluZGV4OyBpdGVtSW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlBcnJheS50b3RhbCA9IHF1YW50aXR5QXJyYXkucXVhbnRpdHlJdGVtc1tpdGVtSW5kZXhdLnF1YW50aXR5ICsgcXVhbnRpdHlBcnJheS50b3RhbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBidWlsZGluZywge25ldzogdHJ1ZX0sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGxldCBjb3N0SGVhZExpc3QgPSBidWlsZGluZy5jb3N0SGVhZHM7XHJcbiAgICAgICAgICAgICAgbGV0IHF1YW50aXR5ICA6IFF1YW50aXR5O1xyXG4gICAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3N0SGVhZExpc3QubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQoY29zdEhlYWRJZCkgPT09IGNvc3RIZWFkTGlzdFtpbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXgxID0gMDsgaW5kZXgxIDwgY29zdEhlYWRMaXN0W2luZGV4XS5jYXRlZ29yaWVzLmxlbmd0aDsgaW5kZXgxKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQoY2F0ZWdvcnlJZCkgPT09IGNvc3RIZWFkTGlzdFtpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleDIgPSAwOyBpbmRleDIgPCBjb3N0SGVhZExpc3RbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXgxXS53b3JrSXRlbXMubGVuZ3RoOyBpbmRleDIrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQod29ya0l0ZW1JZCkgPT09IGNvc3RIZWFkTGlzdFtpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtc1tpbmRleDJdLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHkgID0gY29zdEhlYWRMaXN0W2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ud29ya0l0ZW1zW2luZGV4Ml0ucXVhbnRpdHk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYgKHF1YW50aXR5LnRvdGFsID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcXVhbnRpdHkucXVhbnRpdHlJdGVtcy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgcXVhbnRpdHkudG90YWwgPSBxdWFudGl0eS5xdWFudGl0eUl0ZW1zW2luZGV4XS5xdWFudGl0eSArIHF1YW50aXR5LnRvdGFsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogcXVhbnRpdHksIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVRdWFudGl0eU9mUHJvamVjdENvc3RIZWFkcyhwcm9qZWN0SWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgY2F0ZWdvcnlJZDpudW1iZXIsIHdvcmtJdGVtSWQ6bnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgIHF1YW50aXR5OiBhbnksIHVzZXI6VXNlciwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZVF1YW50aXR5IGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQnlJZChwcm9qZWN0SWQsIChlcnJvciwgcHJvamVjdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkTGlzdCA9IHByb2plY3QucHJvamVjdENvc3RIZWFkcztcclxuICAgICAgICBsZXQgcXVhbnRpdHlBcnJheSAgOiBRdWFudGl0eTtcclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgY29zdEhlYWRMaXN0Lmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgaWYgKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkTGlzdFtpbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXgxID0gMDsgaW5kZXgxIDwgY29zdEhlYWRMaXN0W2luZGV4XS5jYXRlZ29yaWVzLmxlbmd0aDsgaW5kZXgxKyspIHtcclxuICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnlJZCA9PT0gY29zdEhlYWRMaXN0W2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4MiA9IDA7IGluZGV4MiA8IGNvc3RIZWFkTGlzdFtpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtcy5sZW5ndGg7IGluZGV4MisrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbUlkID09PSBjb3N0SGVhZExpc3RbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXgxXS53b3JrSXRlbXNbaW5kZXgyXS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5QXJyYXkgID0gY29zdEhlYWRMaXN0W2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ud29ya0l0ZW1zW2luZGV4Ml0ucXVhbnRpdHk7XHJcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlBcnJheS5xdWFudGl0eUl0ZW1zID0gcXVhbnRpdHlBcnJheS5xdWFudGl0eUl0ZW1zLmNvbmNhdChxdWFudGl0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHlBcnJheS50b3RhbCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaXRlbUluZGV4ID0gMDsgcXVhbnRpdHlBcnJheS5xdWFudGl0eUl0ZW1zLmxlbmd0aCA+IGl0ZW1JbmRleDsgaXRlbUluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHF1YW50aXR5QXJyYXkudG90YWwgPSBxdWFudGl0eUFycmF5LnF1YW50aXR5SXRlbXNbaXRlbUluZGV4XS5xdWFudGl0eSArIHF1YW50aXR5QXJyYXkudG90YWw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcXVlcnkgPSB7X2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgcHJvamVjdCwge25ldzogdHJ1ZX0sIChlcnJvciwgcHJvamVjdCkgPT4ge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgZmluZE9uZUFuZFVwZGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgY29zdEhlYWRMaXN0ID0gcHJvamVjdC5wcm9qZWN0Q29zdEhlYWRzO1xyXG4gICAgICAgICAgICBsZXQgcXVhbnRpdHkgIDogUXVhbnRpdHk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3N0SGVhZExpc3QubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgaWYgKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkTGlzdFtpbmRleF0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4MSA9IDA7IGluZGV4MSA8IGNvc3RIZWFkTGlzdFtpbmRleF0uY2F0ZWdvcmllcy5sZW5ndGg7IGluZGV4MSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeUlkID09PSBjb3N0SGVhZExpc3RbaW5kZXhdLmNhdGVnb3JpZXNbaW5kZXgxXS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4MiA9IDA7IGluZGV4MiA8IGNvc3RIZWFkTGlzdFtpbmRleF0uY2F0ZWdvcmllc1tpbmRleDFdLndvcmtJdGVtcy5sZW5ndGg7IGluZGV4MisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAod29ya0l0ZW1JZCA9PT0gY29zdEhlYWRMaXN0W2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ud29ya0l0ZW1zW2luZGV4Ml0ucmF0ZUFuYWx5c2lzSWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHkgID0gY29zdEhlYWRMaXN0W2luZGV4XS5jYXRlZ29yaWVzW2luZGV4MV0ud29ya0l0ZW1zW2luZGV4Ml0ucXVhbnRpdHk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChxdWFudGl0eS50b3RhbCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBxdWFudGl0eS5xdWFudGl0eUl0ZW1zLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgcXVhbnRpdHkudG90YWwgPSBxdWFudGl0eS5xdWFudGl0eUl0ZW1zW2luZGV4XS5xdWFudGl0eSArIHF1YW50aXR5LnRvdGFsO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy9HZXQgSW4tQWN0aXZlIENhdGVnb3JpZXMgRnJvbSBEYXRhYmFzZVxyXG4gIGdldEluQWN0aXZlQ2F0ZWdvcmllc0J5Q29zdEhlYWRJZChwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpzdHJpbmcsIHVzZXI6VXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuXHJcbiAgICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIEdldCBJbi1BY3RpdmUgQ2F0ZWdvcmllcyBCeSBDb3N0IEhlYWQgSWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRzID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjYXRlZ29yaWVzIDogQXJyYXk8Q2F0ZWdvcnk+PSBuZXcgQXJyYXk8Q2F0ZWdvcnk+KCk7XHJcblxyXG4gICAgICAgIGZvcihsZXQgY29zdEhlYWRJbmRleCA9IDA7IGNvc3RIZWFkSW5kZXg8Y29zdEhlYWRzLmxlbmd0aDsgY29zdEhlYWRJbmRleCsrKSB7XHJcbiAgICAgICAgICBpZihwYXJzZUludChjb3N0SGVhZElkKSA9PT0gY29zdEhlYWRzW2Nvc3RIZWFkSW5kZXhdLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgICAgIGxldCBjYXRlZ29yaWVzTGlzdCA9IGNvc3RIZWFkc1tjb3N0SGVhZEluZGV4XS5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICBmb3IobGV0IGNhdGVnb3J5SW5kZXggPSAwOyBjYXRlZ29yeUluZGV4IDwgY2F0ZWdvcmllc0xpc3QubGVuZ3RoOyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgICBpZihjYXRlZ29yaWVzTGlzdFtjYXRlZ29yeUluZGV4XS5hY3RpdmUgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yaWVzLnB1c2goY2F0ZWdvcmllc0xpc3RbY2F0ZWdvcnlJbmRleF0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogY2F0ZWdvcmllcywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldFdvcmtpdGVtTGlzdChwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyLCB1c2VyOlVzZXIsXHJcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRXb3JraXRlbUxpc3QgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcmF0ZUFuYWx5c2lzU2VydmljZXMgOiBSYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICAgIHJhdGVBbmFseXNpc1NlcnZpY2VzLmdldFdvcmtpdGVtTGlzdChjb3N0SGVhZElkLCBjYXRlZ29yeUlkLCAoZXJyb3IsIHdvcmtpdGVtTGlzdCk9PiB7XHJcbiAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9ZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IHdvcmtpdGVtTGlzdCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFkZFdvcmtpdGVtKHByb2plY3RJZDpzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgY2F0ZWdvcnlJZDpudW1iZXIsIHdvcmtJdGVtOiBXb3JrSXRlbSxcclxuICAgICAgICAgICAgICB1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBhZGRXb3JraXRlbSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRCeUlkKGJ1aWxkaW5nSWQsIChlcnJvciwgYnVpbGRpbmc6QnVpbGRpbmcpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCByZXNwb25zZVdvcmtpdGVtIDogQXJyYXk8V29ya0l0ZW0+PSBudWxsO1xyXG4gICAgICAgIGZvcihsZXQgaW5kZXggPSAwOyBidWlsZGluZy5jb3N0SGVhZHMubGVuZ3RoID4gaW5kZXg7IGluZGV4KyspIHtcclxuICAgICAgICAgIGlmKGJ1aWxkaW5nLmNvc3RIZWFkc1tpbmRleF0ucmF0ZUFuYWx5c2lzSWQgPT09IGNvc3RIZWFkSWQpIHtcclxuICAgICAgICAgICAgbGV0IGNhdGVnb3J5ID0gYnVpbGRpbmcuY29zdEhlYWRzW2luZGV4XS5jYXRlZ29yaWVzO1xyXG4gICAgICAgICAgICBmb3IobGV0IGNhdGVnb3J5SW5kZXggPSAwOyBjYXRlZ29yeS5sZW5ndGggPiBjYXRlZ29yeUluZGV4OyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgICBpZihjYXRlZ29yeVtjYXRlZ29yeUluZGV4XS5yYXRlQW5hbHlzaXNJZCA9PT0gY2F0ZWdvcnlJZCkge1xyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnlbY2F0ZWdvcnlJbmRleF0ud29ya0l0ZW1zLnB1c2god29ya0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2VXb3JraXRlbSA9IGNhdGVnb3J5W2NhdGVnb3J5SW5kZXhdLndvcmtJdGVtcztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHF1ZXJ5ID0geyBfaWQgOiBidWlsZGluZ0lkIH07XHJcbiAgICAgICAgICAgIGxldCBuZXdEYXRhID0geyAkc2V0IDogeydjb3N0SGVhZHMnIDogYnVpbGRpbmcuY29zdEhlYWRzfX07XHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEse25ldzogdHJ1ZX0sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBmaW5kT25lQW5kVXBkYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogcmVzcG9uc2VXb3JraXRlbSwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFkZENhdGVnb3J5QnlDb3N0SGVhZElkKHByb2plY3RJZDpzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOnN0cmluZywgY2F0ZWdvcnlEZXRhaWxzIDogYW55LCB1c2VyOlVzZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuXHJcbiAgICBsZXQgY2F0ZWdvcnlPYmogOiBDYXRlZ29yeSA9IG5ldyBDYXRlZ29yeShjYXRlZ29yeURldGFpbHMuY2F0ZWdvcnksIGNhdGVnb3J5RGV0YWlscy5jYXRlZ29yeUlkKTtcclxuXHJcbiAgICBsZXQgcXVlcnkgPSB7J19pZCcgOiBidWlsZGluZ0lkLCAnY29zdEhlYWRzLnJhdGVBbmFseXNpc0lkJyA6IHBhcnNlSW50KGNvc3RIZWFkSWQpfTtcclxuICAgIGxldCBuZXdEYXRhID0geyAkcHVzaDogeyAnY29zdEhlYWRzLiQuY2F0ZWdvcmllcyc6IGNhdGVnb3J5T2JqIH19O1xyXG5cclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEse25ldzogdHJ1ZX0sIChlcnJvciwgYnVpbGRpbmcpID0+IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgYWRkQ2F0ZWdvcnlCeUNvc3RIZWFkSWQgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogYnVpbGRpbmcsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvL1VwZGF0ZSBzdGF0dXMgKCB0cnVlL2ZhbHNlICkgb2YgY2F0ZWdvcnlcclxuICB1cGRhdGVDYXRlZ29yeVN0YXR1cyhwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgY29zdEhlYWRJZDpudW1iZXIsIGNhdGVnb3J5SWQ6bnVtYmVyICxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeUFjdGl2ZVN0YXR1czpib29sZWFuLCB1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcblxyXG4gICB0aGlzLmJ1aWxkaW5nUmVwb3NpdG9yeS5maW5kQnlJZChidWlsZGluZ0lkLCAoZXJyb3IsIGJ1aWxkaW5nOkJ1aWxkaW5nKSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZSBDYXRlZ29yeSBTdGF0dXMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgY29zdEhlYWRzID0gYnVpbGRpbmcuY29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBjYXRlZ29yaWVzIDogQXJyYXk8Q2F0ZWdvcnk+PSBuZXcgQXJyYXk8Q2F0ZWdvcnk+KCk7XHJcbiAgICAgICAgbGV0IHVwZGF0ZWRDYXRlZ29yaWVzIDogQXJyYXk8Q2F0ZWdvcnk+PSBuZXcgQXJyYXk8Q2F0ZWdvcnk+KCk7XHJcbiAgICAgICAgbGV0IGluZGV4IDogbnVtYmVyO1xyXG5cclxuICAgICAgICBmb3IobGV0IGNvc3RIZWFkSW5kZXg9MDsgY29zdEhlYWRJbmRleDxjb3N0SGVhZHMubGVuZ3RoOyBjb3N0SGVhZEluZGV4KyspIHtcclxuICAgICAgICAgIGlmKGNvc3RIZWFkSWQgPT09IGNvc3RIZWFkc1tjb3N0SGVhZEluZGV4XS5yYXRlQW5hbHlzaXNJZCkge1xyXG4gICAgICAgICAgICBjYXRlZ29yaWVzID0gY29zdEhlYWRzW2Nvc3RIZWFkSW5kZXhdLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgICAgIGZvcihsZXQgY2F0ZWdvcnlJbmRleCA9IDA7IGNhdGVnb3J5SW5kZXg8Y2F0ZWdvcmllcy5sZW5ndGg7IGNhdGVnb3J5SW5kZXgrKykge1xyXG4gICAgICAgICAgICAgIGlmKGNhdGVnb3JpZXNbY2F0ZWdvcnlJbmRleF0ucmF0ZUFuYWx5c2lzSWQgPT09IGNhdGVnb3J5SWQpIHtcclxuICAgICAgICAgICAgICAgIGNhdGVnb3JpZXNbY2F0ZWdvcnlJbmRleF0uYWN0aXZlID0gY2F0ZWdvcnlBY3RpdmVTdGF0dXM7XHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkQ2F0ZWdvcmllcy5wdXNoKGNhdGVnb3JpZXNbY2F0ZWdvcnlJbmRleF0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0geydfaWQnIDogYnVpbGRpbmdJZCwgJ2Nvc3RIZWFkcy5yYXRlQW5hbHlzaXNJZCcgOiBjb3N0SGVhZElkfTtcclxuICAgICAgICBsZXQgbmV3RGF0YSA9IHsnJHNldCcgOiB7J2Nvc3RIZWFkcy4kLmNhdGVnb3JpZXMnIDogY2F0ZWdvcmllcyB9fTtcclxuXHJcbiAgICAgICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSx7bmV3OiB0cnVlfSwgKGVycm9yLCBidWlsZGluZykgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiB1cGRhdGVkQ2F0ZWdvcmllcywgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vR2V0IGFjdGl2ZSBjYXRlZ29yaWVzIGZyb20gZGF0YWJhc2VcclxuICBnZXRBY3RpdmVDYXRlZ29yaWVzKHByb2plY3RJZDpzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgR2V0IEFjdGl2ZSBDYXRlZ29yaWVzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5idWlsZGluZ1JlcG9zaXRvcnkuZmluZEJ5SWQoYnVpbGRpbmdJZCwgKGVycm9yLCBidWlsZGluZzpCdWlsZGluZykgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNhdGVnb3JpZXMgOkFycmF5PENhdGVnb3J5PiA9IG5ldyBBcnJheTxDYXRlZ29yeT4oKTtcclxuXHJcbiAgICAgICAgZm9yKGxldCBjb3N0SGVhZEluZGV4ID0gMDsgYnVpbGRpbmcuY29zdEhlYWRzLmxlbmd0aCA+IGNvc3RIZWFkSW5kZXg7IGNvc3RIZWFkSW5kZXgrKykge1xyXG4gICAgICAgICAgaWYoYnVpbGRpbmcuY29zdEhlYWRzW2Nvc3RIZWFkSW5kZXhdLnJhdGVBbmFseXNpc0lkID09PSBjb3N0SGVhZElkKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNhdGVnb3J5SW5kZXggPSAwOyBjYXRlZ29yeUluZGV4IDwgYnVpbGRpbmcuY29zdEhlYWRzW2Nvc3RIZWFkSW5kZXhdLmNhdGVnb3JpZXMubGVuZ3RoOyBjYXRlZ29yeUluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChidWlsZGluZy5jb3N0SGVhZHNbY29zdEhlYWRJbmRleF0uY2F0ZWdvcmllc1tjYXRlZ29yeUluZGV4XS5hY3RpdmUgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgbGV0IHdvcmtJdGVtcyA6IEFycmF5PFdvcmtJdGVtPiA9IG5ldyBBcnJheTxXb3JrSXRlbT4oKTtcclxuICAgICAgICAgICAgICAgICAgbGV0IGNhdGVnb3J5ID0gYnVpbGRpbmcuY29zdEhlYWRzW2Nvc3RIZWFkSW5kZXhdLmNhdGVnb3JpZXNbY2F0ZWdvcnlJbmRleF07XHJcbiAgICAgICAgICAgICAgICAgIGZvcihsZXQgd29ya2l0ZW1JbmRleCA9IDA7IHdvcmtpdGVtSW5kZXggPCBjYXRlZ29yeS53b3JrSXRlbXMubGVuZ3RoOyB3b3JraXRlbUluZGV4ICsrICkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGNhdGVnb3J5LndvcmtJdGVtc1t3b3JraXRlbUluZGV4XS5hY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHdvcmtJdGVtcy5wdXNoKGNhdGVnb3J5LndvcmtJdGVtc1t3b3JraXRlbUluZGV4XSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmb3IobGV0IHdvcmtJdGVtc0luZGV4MT0wOyB3b3JrSXRlbXNJbmRleDEgPCB3b3JrSXRlbXMubGVuZ3RoOyB3b3JrSXRlbXNJbmRleDErKyApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRXb3JrSXRlbSA9IHdvcmtJdGVtc1t3b3JrSXRlbXNJbmRleDFdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRXb3JrSXRlbS5xdWFudGl0eS50b3RhbCAhPT0gbnVsbCAmJiBjdXJyZW50V29ya0l0ZW0ucmF0ZS50b3RhbCAhPT0gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICYmIGN1cnJlbnRXb3JrSXRlbS5xdWFudGl0eS50b3RhbCAhPT0gMCAmJiBjdXJyZW50V29ya0l0ZW0ucmF0ZS50b3RhbCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkaW5nLmNvc3RIZWFkc1tjb3N0SGVhZEluZGV4XS5jYXRlZ29yaWVzW2NhdGVnb3J5SW5kZXhdLmFtb3VudCA9IHBhcnNlRmxvYXQoKGN1cnJlbnRXb3JrSXRlbS5xdWFudGl0eS50b3RhbCAqXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50V29ya0l0ZW0ucmF0ZS50b3RhbCArIGJ1aWxkaW5nLmNvc3RIZWFkc1tjb3N0SGVhZEluZGV4XS5jYXRlZ29yaWVzW2NhdGVnb3J5SW5kZXhdLmFtb3VudCkudG9GaXhlZCgyKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYnVpbGRpbmcuY29zdEhlYWRzW2Nvc3RIZWFkSW5kZXhdLmNhdGVnb3JpZXNbY2F0ZWdvcnlJbmRleF0uYW1vdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBidWlsZGluZy5jb3N0SGVhZHNbY29zdEhlYWRJbmRleF0uY2F0ZWdvcmllc1tjYXRlZ29yeUluZGV4XS5hbW91bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LndvcmtJdGVtcyA9IHdvcmtJdGVtcztcclxuICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllcy5wdXNoKGNhdGVnb3J5KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge2RhdGE6IGNhdGVnb3JpZXMsIGFjY2Vzc190b2tlbjogdGhpcy5hdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvL0dldCBjYXRlZ29yaWVzIG9mIHByb2plY3RDb3N0SGVhZHMgZnJvbSBkYXRhYmFzZVxyXG4gIGdldENhdGVnb3JpZXNPZlByb2plY3RDb3N0SGVhZChwcm9qZWN0SWQ6c3RyaW5nLCBjb3N0SGVhZElkOm51bWJlciwgdXNlcjpVc2VyLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgR2V0IFByb2plY3QgQ29zdEhlYWQgQ2F0ZWdvcmllcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkuZmluZEJ5SWQocHJvamVjdElkLCAoZXJyb3IsIHByb2plY3Q6UHJvamVjdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IGNhdGVnb3JpZXMgOkFycmF5PENhdGVnb3J5PiA9IG5ldyBBcnJheTxDYXRlZ29yeT4oKTtcclxuICAgICAgICBsZXQgcHJvamVjdENvc3RIZWFkcyA9IHByb2plY3QucHJvamVjdENvc3RIZWFkcztcclxuXHJcbiAgICAgICAgZm9yKGxldCBjb3N0SGVhZCBvZiBwcm9qZWN0Q29zdEhlYWRzKSB7XHJcbiAgICAgICAgICBpZihjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZCA9PT0gY29zdEhlYWRJZCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBzaW5nbGVDYXRlZ29yeSBvZiBjb3N0SGVhZC5jYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgICAgICAgbGV0IGNhdGVnb3J5RGF0YSA9IHNpbmdsZUNhdGVnb3J5O1xyXG4gICAgICAgICAgICAgIGlmIChjYXRlZ29yeURhdGEuYWN0aXZlID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgd29ya0l0ZW1zIDogQXJyYXk8V29ya0l0ZW0+ID0gbmV3IEFycmF5PFdvcmtJdGVtPigpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNhdGVnb3J5ID0gY2F0ZWdvcnlEYXRhO1xyXG4gICAgICAgICAgICAgICAgZm9yKGxldCB3b3JrSXRlbSBvZiBjYXRlZ29yeS53b3JrSXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgbGV0IHdvcmtJdGVtRGF0YSA9IHdvcmtJdGVtO1xyXG4gICAgICAgICAgICAgICAgICBpZih3b3JrSXRlbURhdGEuYWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1zLnB1c2god29ya0l0ZW1EYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IobGV0IHNpbmdsZVdvcmtJdGVtIG9mIHdvcmtJdGVtcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHNpbmdsZVdvcmtJdGVtLnF1YW50aXR5LnRvdGFsICE9PSBudWxsICYmIHNpbmdsZVdvcmtJdGVtLnJhdGUudG90YWwgIT09IG51bGxcclxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgc2luZ2xlV29ya0l0ZW0ucXVhbnRpdHkudG90YWwgIT09IDAgJiYgc2luZ2xlV29ya0l0ZW0ucmF0ZS50b3RhbCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeURhdGEuYW1vdW50ID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KChzaW5nbGVXb3JrSXRlbS5xdWFudGl0eS50b3RhbCAqXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaW5nbGVXb3JrSXRlbS5yYXRlLnRvdGFsICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5RGF0YS5hbW91bnQpLnRvRml4ZWQoMikpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnlEYXRhLmFtb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5RGF0YS5hbW91bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5LndvcmtJdGVtcyA9IHdvcmtJdGVtcztcclxuICAgICAgICAgICAgICAgIGNhdGVnb3JpZXMucHVzaChjYXRlZ29yeSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiBjYXRlZ29yaWVzLCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgc3luY1Byb2plY3RXaXRoUmF0ZUFuYWx5c2lzRGF0YShwcm9qZWN0SWQ6c3RyaW5nLCBidWlsZGluZ0lkOnN0cmluZywgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjphbnksIHJlc3VsdDphbnkpPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgc3luY1Byb2plY3RXaXRoUmF0ZUFuYWx5c2lzRGF0YSBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHRoaXMuZ2V0UHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscyhwcm9qZWN0SWQsIGJ1aWxkaW5nSWQsKGVycm9yLCBwcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGxvZ2dlci5lcnJvcignUHJvamVjdCBzZXJ2aWNlLCBnZXRQcm9qZWN0QW5kQnVpbGRpbmdEZXRhaWxzIGZhaWxlZCcpO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBzeW5jUHJvamVjdFdpdGhSYXRlQW5hbHlzaXNEYXRhLicpO1xyXG4gICAgICAgIGxldCBwcm9qZWN0RGF0YSA9IHByb2plY3RBbmRCdWlsZGluZ0RldGFpbHMuZGF0YVswXTtcclxuICAgICAgICBsZXQgYnVpbGRpbmdzID0gcHJvamVjdEFuZEJ1aWxkaW5nRGV0YWlscy5kYXRhWzBdLmJ1aWxkaW5ncztcclxuICAgICAgICBsZXQgYnVpbGRpbmdEYXRhOiBhbnk7XHJcblxyXG4gICAgICAgIGZvcihsZXQgYnVpbGRpbmcgb2YgYnVpbGRpbmdzKSB7XHJcbiAgICAgICAgICBpZihidWlsZGluZy5faWQgPT0gYnVpbGRpbmdJZCkge1xyXG4gICAgICAgICAgICBidWlsZGluZ0RhdGEgPSBidWlsZGluZztcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihwcm9qZWN0RGF0YS5wcm9qZWN0Q29zdEhlYWRzLmxlbmd0aCA+IDAgKSB7XHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBzeW5jV2l0aFJhdGVBbmFseXNpc0RhdGEgYnVpbGRpbmcgT25seS4nKTtcclxuICAgICAgICAgIHRoaXMudXBkYXRlQ29zdEhlYWRzRm9yQnVpbGRpbmdBbmRQcm9qZWN0KGNhbGxiYWNrLCBwcm9qZWN0RGF0YSwgYnVpbGRpbmdEYXRhLCBidWlsZGluZ0lkLCBwcm9qZWN0SWQpO1xyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgY2FsbGluZyBwcm9taXNlIGZvciBzeW5jUHJvamVjdFdpdGhSYXRlQW5hbHlzaXNEYXRhIGZvciBQcm9qZWN0IGFuZCBCdWlsZGluZy4nKTtcclxuICAgICAgICAgIGxldCBzeW5jQnVpbGRpbmdDb3N0SGVhZHNQcm9taXNlID0gdGhpcy51cGRhdGVCdWRnZXRSYXRlc0ZvckJ1aWxkaW5nQ29zdEhlYWRzKENvbnN0YW50cy5CVUlMRElORyxcclxuICAgICAgICAgICAgYnVpbGRpbmdJZCwgcHJvamVjdERhdGEsIGJ1aWxkaW5nRGF0YSk7XHJcbiAgICAgICAgICBsZXQgc3luY1Byb2plY3RDb3N0SGVhZHNQcm9taXNlID0gdGhpcy51cGRhdGVCdWRnZXRSYXRlc0ZvclByb2plY3RDb3N0SGVhZHMoQ29uc3RhbnRzLkFNRU5JVElFUyxcclxuICAgICAgICAgICAgcHJvamVjdElkLCBwcm9qZWN0RGF0YSwgYnVpbGRpbmdEYXRhKTtcclxuXHJcbiAgICAgICAgICBQcm9taXNlLmFsbChbXHJcbiAgICAgICAgICAgIHN5bmNCdWlsZGluZ0Nvc3RIZWFkc1Byb21pc2UsXHJcbiAgICAgICAgICAgIHN5bmNQcm9qZWN0Q29zdEhlYWRzUHJvbWlzZVxyXG4gICAgICAgICAgXSkudGhlbihmdW5jdGlvbihkYXRhOiBBcnJheTxhbnk+KSB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9taXNlIGZvciBzeW5jUHJvamVjdFdpdGhSYXRlQW5hbHlzaXNEYXRhIGZvciBQcm9qZWN0IGFuZCBCdWlsZGluZyBzdWNjZXNzJyk7XHJcbiAgICAgICAgICAgIGxldCBidWlsZGluZ0Nvc3RIZWFkc0RhdGEgPSBkYXRhWzBdO1xyXG4gICAgICAgICAgICBsZXQgcHJvamVjdENvc3RIZWFkc0RhdGEgPSBkYXRhWzFdO1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7c3RhdHVzOjIwMH0pO1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmNhdGNoKChlKSA9PiB7IGxvZ2dlci5lcnJvcignIFByb21pc2UgZmFpbGVkISA6JyArSlNPTi5zdHJpbmdpZnkoZSkpO30pO1xyXG4gICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUNvc3RIZWFkc0ZvckJ1aWxkaW5nQW5kUHJvamVjdChjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0RGF0YTogYW55LCBidWlsZGluZ0RhdGE6IGFueSwgYnVpbGRpbmdJZDogc3RyaW5nLCBwcm9qZWN0SWQ6IHN0cmluZykge1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCd1cGRhdGVDb3N0SGVhZHNGb3JCdWlsZGluZ0FuZFByb2plY3QgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcmF0ZUFuYWx5c2lzU2VydmljZSA9IG5ldyBSYXRlQW5hbHlzaXNTZXJ2aWNlKCk7XHJcbiAgICBsZXQgYnVpbGRpbmdSZXBvc2l0b3J5ID0gbmV3IEJ1aWxkaW5nUmVwb3NpdG9yeSgpO1xyXG4gICAgbGV0IHByb2plY3RSZXBvc2l0b3J5ID0gbmV3IFByb2plY3RSZXBvc2l0b3J5KCk7XHJcblxyXG4gICAgcmF0ZUFuYWx5c2lzU2VydmljZS5jb252ZXJ0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpc1RvQ29zdENvbnRyb2woQ29uc3RhbnRzLkJVSUxESU5HLFxyXG4gICAgICAoZXJyb3I6IGFueSwgYnVpbGRpbmdDb3N0SGVhZHNEYXRhOiBhbnkpID0+IHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gdXBkYXRlQ29zdEhlYWRzRm9yQnVpbGRpbmdBbmRQcm9qZWN0IDogY29udmVydENvc3RIZWFkc0Zyb21SYXRlQW5hbHlzaXNUb0Nvc3RDb250cm9sIDogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdHZXRBbGxEYXRhRnJvbVJhdGVBbmFseXNpcyBzdWNjZXNzJyk7XHJcbiAgICAgICAgICBsZXQgcHJvamVjdFNlcnZpY2UgPSBuZXcgUHJvamVjdFNlcnZpY2UoKTtcclxuICAgICAgICAgIGxldCBkYXRhID0gcHJvamVjdFNlcnZpY2UuY2FsY3VsYXRlQnVkZ2V0Q29zdEZvckJ1aWxkaW5nKGJ1aWxkaW5nQ29zdEhlYWRzRGF0YSwgcHJvamVjdERhdGEsIGJ1aWxkaW5nRGF0YSk7XHJcbiAgICAgICAgICBsZXQgcXVlcnlGb3JCdWlsZGluZyA9IHsnX2lkJzogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgICBsZXQgdXBkYXRlQ29zdEhlYWQgPSB7JHNldDogeydjb3N0SGVhZHMnOiBkYXRhfX07XHJcbiAgICAgICAgICBidWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeUZvckJ1aWxkaW5nLCB1cGRhdGVDb3N0SGVhZCwge25ldzogdHJ1ZX0sIChlcnJvcjogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gVXBkYXRlIGNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbCBidWlsZGluZ0Nvc3RIZWFkc0RhdGEgIDogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdVcGRhdGVCdWlsZGluZ0Nvc3RIZWFkIHN1Y2Nlc3MnKTtcclxuICAgICAgICAgICAgICBsZXQgcHJvamVjdENvc3RIZWFkcyA9IHByb2plY3RTZXJ2aWNlLmNhbGN1bGF0ZUJ1ZGdldENvc3RGb3JDb21tb25BbW1lbml0aWVzKFxyXG4gICAgICAgICAgICAgICAgcHJvamVjdERhdGEucHJvamVjdENvc3RIZWFkcyxwcm9qZWN0RGF0YSwgYnVpbGRpbmdEYXRhKTtcclxuICAgICAgICAgICAgICBsZXQgcXVlcnlGb3JQcm9qZWN0ID0geydfaWQnOiBwcm9qZWN0SWR9O1xyXG4gICAgICAgICAgICAgIGxldCB1cGRhdGVQcm9qZWN0Q29zdEhlYWQgPSB7JHNldDogeydwcm9qZWN0Q29zdEhlYWRzJzogcHJvamVjdENvc3RIZWFkc319O1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdDYWxsaW5nIHVwZGF0ZSBwcm9qZWN0IENvc3RoZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgICBwcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5Rm9yUHJvamVjdCwgdXBkYXRlUHJvamVjdENvc3RIZWFkLCB7bmV3OiB0cnVlfSxcclxuICAgICAgICAgICAgICAgIChlcnJvcjogYW55LCByZXNwb25zZTogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnIoJ0Vycm9yIHVwZGF0ZSBwcm9qZWN0IENvc3RoZWFkcyA6ICcgKyBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ1VwZGF0ZSBwcm9qZWN0IENvc3RoZWFkcyBzdWNjZXNzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUJ1ZGdldFJhdGVzRm9yQnVpbGRpbmdDb3N0SGVhZHMoZW50aXR5OiBzdHJpbmcsIGJ1aWxkaW5nSWQ6c3RyaW5nLCBwcm9qZWN0RGV0YWlscyA6IFByb2plY3QsIGJ1aWxkaW5nRGV0YWlscyA6IEJ1aWxkaW5nKSB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgIGxldCByYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICAgICAgbGV0IGJ1aWxkaW5nUmVwb3NpdG9yeSA9IG5ldyBCdWlsZGluZ1JlcG9zaXRvcnkoKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgdXBkYXRlQnVkZ2V0UmF0ZXNGb3JCdWlsZGluZ0Nvc3RIZWFkcyBwcm9taXNlLicpO1xyXG4gICAgICByYXRlQW5hbHlzaXNTZXJ2aWNlLmNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbChlbnRpdHksIChlcnJvcjogYW55LCBidWlsZGluZ0Nvc3RIZWFkc0RhdGE6IGFueSkgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgbG9nZ2VyLmVycignRXJyb3IgaW4gcHJvbWlzZSB1cGRhdGVCdWRnZXRSYXRlc0ZvckJ1aWxkaW5nQ29zdEhlYWRzIDogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgbGV0IHByb2plY3RTZXJ2aWNlID0gbmV3IFByb2plY3RTZXJ2aWNlKCk7XHJcbiAgICAgICAgICBsZXQgYnVpbGRpbmdDb3N0SGVhZHMgPSBwcm9qZWN0U2VydmljZS5jYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQnVpbGRpbmcoYnVpbGRpbmdDb3N0SGVhZHNEYXRhLCBwcm9qZWN0RGV0YWlscywgYnVpbGRpbmdEZXRhaWxzKTtcclxuICAgICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJzogYnVpbGRpbmdJZH07XHJcbiAgICAgICAgICBsZXQgbmV3RGF0YSA9IHskc2V0OiB7J2Nvc3RIZWFkcyc6IGJ1aWxkaW5nQ29zdEhlYWRzfX07XHJcbiAgICAgICAgICBidWlsZGluZ1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSwge25ldzogdHJ1ZX0sIChlcnJvcjphbnksIHJlc3BvbnNlOmFueSkgPT4ge1xyXG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRBbGxEYXRhRnJvbVJhdGVBbmFseXNpcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBpbiBVcGRhdGUgYnVpbGRpbmdDb3N0SGVhZHNEYXRhICA6ICcrSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcclxuICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnVXBkYXRlZCBidWlsZGluZ0Nvc3RIZWFkc0RhdGEnKTtcclxuICAgICAgICAgICAgICByZXNvbHZlKCdEb25lJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZUJ1ZGdldFJhdGVzRm9yUHJvamVjdENvc3RIZWFkcyhlbnRpdHk6IHN0cmluZywgcHJvamVjdElkOnN0cmluZywgcHJvamVjdERldGFpbHMgOiBQcm9qZWN0LCBidWlsZGluZ0RldGFpbHMgOiBCdWlsZGluZykge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XHJcbiAgICAgIGxldCByYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICAgICAgbGV0IHByb2plY3RSZXBvc2l0b3J5ID0gbmV3IFByb2plY3RSZXBvc2l0b3J5KCk7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIHVwZGF0ZUJ1ZGdldFJhdGVzRm9yUHJvamVjdENvc3RIZWFkcyBwcm9taXNlLicpO1xyXG4gICAgICByYXRlQW5hbHlzaXNTZXJ2aWNlLmNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbChlbnRpdHksIChlcnJvciA6IGFueSwgcHJvamVjdENvc3RIZWFkc0RhdGE6IGFueSkgPT4ge1xyXG4gICAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgICBsb2dnZXIuZXJyKCdFcnJvciBpbiB1cGRhdGVCdWRnZXRSYXRlc0ZvclByb2plY3RDb3N0SGVhZHMgcHJvbWlzZSA6ICcgKyBKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgcHJvamVjdFNlcnZpY2UgPSBuZXcgUHJvamVjdFNlcnZpY2UoKTtcclxuICAgICAgICAgICAgbGV0IHByb2plY3RDb3N0SGVhZHMgPSBwcm9qZWN0U2VydmljZS5jYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQ29tbW9uQW1tZW5pdGllcyhwcm9qZWN0Q29zdEhlYWRzRGF0YSwgcHJvamVjdERldGFpbHMsIGJ1aWxkaW5nRGV0YWlscyk7XHJcbiAgICAgICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJzogcHJvamVjdElkfTtcclxuICAgICAgICAgICAgbGV0IG5ld0RhdGEgPSB7JHNldDogeydwcm9qZWN0Q29zdEhlYWRzJzogcHJvamVjdENvc3RIZWFkc319O1xyXG4gICAgICAgICAgICBwcm9qZWN0UmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yOiBhbnksIHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBnZXRBbGxEYXRhRnJvbVJhdGVBbmFseXNpcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gVXBkYXRlIGJ1aWxkaW5nQ29zdEhlYWRzRGF0YSAgOiAnK0pTT04uc3RyaW5naWZ5KGVycm9yKSk7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ1VwZGF0ZWQgcHJvamVjdENvc3RIZWFkcycpO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgnRG9uZScpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQnVpbGRpbmcoY29zdEhlYWRzUmF0ZUFuYWx5c2lzOiBhbnksIHByb2plY3REZXRhaWxzIDogUHJvamVjdCwgYnVpbGRpbmdEZXRhaWxzIDogYW55KSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUHJvamVjdCBzZXJ2aWNlLCBjYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQnVpbGRpbmcgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgY29zdEhlYWRzOkFycmF5PENvc3RIZWFkPiA9IG5ldyBBcnJheTxDb3N0SGVhZD4oKTtcclxuICAgIGxldCBidWRnZXRlZENvc3RBbW91bnQ6IG51bWJlcjtcclxuICAgIGxldCBjYWxjdWxhdGVCdWRndGVkQ29zdCA6IHN0cmluZztcclxuXHJcbiAgICBmb3IobGV0IGNvc3RIZWFkIG9mIGNvc3RIZWFkc1JhdGVBbmFseXNpcykge1xyXG5cclxuICAgICAgbGV0IGJ1ZGdldENvc3RGb3JtdWxhZTpzdHJpbmc7XHJcblxyXG4gICAgICBzd2l0Y2goY29zdEhlYWQubmFtZSkge1xyXG5cclxuICAgICAgICAgIGNhc2UgQ29uc3RhbnRzLlJDQ19CQU5EX09SX1BBVExJIDoge1xyXG4gICAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuU0xBQl9BUkVBLCBwcm9qZWN0RGV0YWlscy5zbGFiQXJlYSk7XHJcbiAgICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjYXNlIENvbnN0YW50cy5FWFRFUk5BTF9QTEFTVEVSIDoge1xyXG4gICAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG4gICAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY2FzZSBDb25zdGFudHMuRkFCUklDQVRJT04gOiB7XHJcbiAgICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjYXNlIENvbnN0YW50cy5QT0lOVElORyA6IHtcclxuICAgICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLkNBUlBFVF9BUkVBLCBidWlsZGluZ0RldGFpbHMudG90YWxDYXJwZXRBcmVhT2ZVbml0KTtcclxuICAgICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNhc2UgQ29uc3RhbnRzLktJVENIRU5fT1RUQSA6IHtcclxuICAgICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9PTkVfQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZPbmVCSEspXHJcbiAgICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9UV09fQkhLLCBidWlsZGluZ0RldGFpbHMubnVtT2ZUd29CSEspXHJcbiAgICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9USFJFRV9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZlRocmVlQkhLKVxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKENvbnN0YW50cy5OVU1fT0ZfRk9VUl9CSEssIGJ1aWxkaW5nRGV0YWlscy5udW1PZkZvdXJCSEspXHJcbiAgICAgICAgICAgICAgLnJlcGxhY2UoQ29uc3RhbnRzLk5VTV9PRl9GSVZFX0JISywgYnVpbGRpbmdEZXRhaWxzLm51bU9mRml2ZUJISyk7XHJcbiAgICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY2FzZSBDb25zdGFudHMuU09MSU5HIDoge1xyXG4gICAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuUExJTlRIX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy5wbGludGhBcmVhKTtcclxuICAgICAgICAgICAgYnVkZ2V0ZWRDb3N0QW1vdW50ID0gZXZhbChjYWxjdWxhdGVCdWRndGVkQ29zdCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgYnVpbGRpbmdEZXRhaWxzLCBjb3N0SGVhZHMpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNhc2UgQ29uc3RhbnRzLk1BU09OUlkgOiB7XHJcbiAgICAgICAgICAgIGJ1ZGdldENvc3RGb3JtdWxhZSA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLkJVREdFVEVEX0NPU1RfRk9STVVMQUUgKyBjb3N0SGVhZC5uYW1lKS50b1N0cmluZygpO1xyXG4gICAgICAgICAgICBjYWxjdWxhdGVCdWRndGVkQ29zdCA9IGJ1ZGdldENvc3RGb3JtdWxhZS5yZXBsYWNlKENvbnN0YW50cy5DQVJQRVRfQVJFQSwgYnVpbGRpbmdEZXRhaWxzLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcbiAgICAgICAgICAgIGJ1ZGdldGVkQ29zdEFtb3VudCA9IGV2YWwoY2FsY3VsYXRlQnVkZ3RlZENvc3QpO1xyXG4gICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJlcG9ydEZvckNvc3RIZWFkKGJ1ZGdldGVkQ29zdEFtb3VudCwgY29zdEhlYWQsIGJ1aWxkaW5nRGV0YWlscywgY29zdEhlYWRzKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjYXNlIENvbnN0YW50cy5JTlRFUk5BTF9QTEFTVEVSIDoge1xyXG4gICAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG4gICAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY2FzZSBDb25zdGFudHMuR1lQU1VNX09SX1BPUF9QTEFTVEVSIDoge1xyXG4gICAgICAgICAgICBidWRnZXRDb3N0Rm9ybXVsYWUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5CVURHRVRFRF9DT1NUX0ZPUk1VTEFFICsgY29zdEhlYWQubmFtZSkudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgY2FsY3VsYXRlQnVkZ3RlZENvc3QgPSBidWRnZXRDb3N0Rm9ybXVsYWUucmVwbGFjZShDb25zdGFudHMuQ0FSUEVUX0FSRUEsIGJ1aWxkaW5nRGV0YWlscy50b3RhbENhcnBldEFyZWFPZlVuaXQpO1xyXG4gICAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQsIGNvc3RIZWFkLCBidWlsZGluZ0RldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZGVmYXVsdCA6IHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIHJldHVybiBjb3N0SGVhZHM7XHJcbiAgfVxyXG5cclxuICBjYWxjdWxhdGVCdWRnZXRDb3N0Rm9yQ29tbW9uQW1tZW5pdGllcyhjb3N0SGVhZHNSYXRlQW5hbHlzaXM6IGFueSwgcHJvamVjdERldGFpbHMgOiBQcm9qZWN0LCBidWlsZGluZ0RldGFpbHMgOiBhbnkpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNhbGN1bGF0ZUJ1ZGdldENvc3RGb3JDb21tb25BbW1lbml0aWVzIGhhcyBiZWVuIGhpdCcpO1xyXG5cclxuICAgIGxldCBjb3N0SGVhZHM6QXJyYXk8Q29zdEhlYWQ+ID0gbmV3IEFycmF5PENvc3RIZWFkPigpO1xyXG4gICAgbGV0IGJ1ZGdldGVkQ29zdEFtb3VudDogbnVtYmVyO1xyXG4gICAgbGV0IGJ1ZGdldENvc3RGb3JtdWxhZTpzdHJpbmc7XHJcbiAgICBsZXQgY2FsY3VsYXRlQnVkZ3RlZENvc3QgOnN0cmluZztcclxuXHJcbiAgICBsZXQgY2FsY3VsYXRlUHJvamVjdERhdGEgPSAnU0VMRUNUIFNVTShidWlsZGluZy50b3RhbENhcnBldEFyZWFPZlVuaXQpIEFTIHRvdGFsQ2FycGV0QXJlYSwgJyArXHJcbiAgICAgICdTVU0oYnVpbGRpbmcudG90YWxTbGFiQXJlYSkgQVMgdG90YWxTbGFiQXJlYVByb2plY3QsJyArXHJcbiAgICAgICdTVU0oYnVpbGRpbmcudG90YWxTYWxlYWJsZUFyZWFPZlVuaXQpIEFTIHRvdGFsU2FsZWFibGVBcmVhICBGUk9NID8gQVMgYnVpbGRpbmcnO1xyXG4gICAgbGV0IHByb2plY3REYXRhID0gYWxhc3FsKGNhbGN1bGF0ZVByb2plY3REYXRhLCBbcHJvamVjdERldGFpbHMuYnVpbGRpbmdzXSk7XHJcbiAgICBsZXQgdG90YWxTbGFiQXJlYU9mUHJvamVjdCA6IG51bWJlciA9IHByb2plY3REYXRhWzBdLnRvdGFsU2xhYkFyZWFQcm9qZWN0O1xyXG4gICAgbGV0IHRvdGFsU2FsZWFibGVBcmVhT2ZQcm9qZWN0IDogbnVtYmVyID0gcHJvamVjdERhdGFbMF0udG90YWxTYWxlYWJsZUFyZWE7XHJcbiAgICBsZXQgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0IDogbnVtYmVyID0gcHJvamVjdERhdGFbMF0udG90YWxDYXJwZXRBcmVhO1xyXG5cclxuICAgIGZvcihsZXQgY29zdEhlYWQgb2YgY29zdEhlYWRzUmF0ZUFuYWx5c2lzKSB7XHJcblxyXG4gICAgICBzd2l0Y2goY29zdEhlYWQubmFtZSkge1xyXG5cclxuICAgICAgICAgIGNhc2UgQ29uc3RhbnRzLlNBRkVUWV9NRUFTVVJFUyA6IHtcclxuICAgICAgICAgICAgYnVkZ2V0Q29zdEZvcm11bGFlID0gY29uZmlnLmdldChDb25zdGFudHMuQlVER0VURURfQ09TVF9GT1JNVUxBRSArIGNvc3RIZWFkLm5hbWUpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0ID0gYnVkZ2V0Q29zdEZvcm11bGFlLnJlcGxhY2UoQ29uc3RhbnRzLkNBUlBFVF9BUkVBLCB0b3RhbENhcnBldEFyZWFPZlByb2plY3QpO1xyXG4gICAgICAgICAgICBidWRnZXRlZENvc3RBbW91bnQgPSBldmFsKGNhbGN1bGF0ZUJ1ZGd0ZWRDb3N0KTtcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50LCBjb3N0SGVhZCwgcHJvamVjdERldGFpbHMsIGNvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZGVmYXVsdCA6IHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY29zdEhlYWRzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JDb3N0SGVhZChidWRnZXRlZENvc3RBbW91bnQ6IG51bWJlciwgY29zdEhlYWRGcm9tUmF0ZUFuYWx5c2lzOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWlsZGluZ0RhdGE6IGFueSwgY29zdEhlYWRzOiBBcnJheTxDb3N0SGVhZD4pIHtcclxuICAgIGlmIChidWRnZXRlZENvc3RBbW91bnQpIHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yQ29zdEhlYWQgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgICBsZXQgY29zdEhlYWQ6IENvc3RIZWFkID0gY29zdEhlYWRGcm9tUmF0ZUFuYWx5c2lzO1xyXG4gICAgICBjb3N0SGVhZC5idWRnZXRlZENvc3RBbW91bnQgPSBidWRnZXRlZENvc3RBbW91bnQ7XHJcbiAgICAgIGxldCB0aHVtYlJ1bGVSYXRlID0gbmV3IFRodW1iUnVsZVJhdGUoKTtcclxuXHJcbiAgICAgIHRodW1iUnVsZVJhdGUuc2FsZWFibGVBcmVhID0gdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSYXRlRm9yQXJlYShidWRnZXRlZENvc3RBbW91bnQsIGJ1aWxkaW5nRGF0YS50b3RhbFNhbGVhYmxlQXJlYU9mVW5pdCk7XHJcbiAgICAgIHRodW1iUnVsZVJhdGUuc2xhYkFyZWEgPSB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJhdGVGb3JBcmVhKGJ1ZGdldGVkQ29zdEFtb3VudCwgYnVpbGRpbmdEYXRhLnRvdGFsU2xhYkFyZWEpO1xyXG4gICAgICB0aHVtYlJ1bGVSYXRlLmNhcnBldEFyZWEgPSB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJhdGVGb3JBcmVhKGJ1ZGdldGVkQ29zdEFtb3VudCwgYnVpbGRpbmdEYXRhLnRvdGFsQ2FycGV0QXJlYU9mVW5pdCk7XHJcblxyXG4gICAgICBjb3N0SGVhZC50aHVtYlJ1bGVSYXRlID0gdGh1bWJSdWxlUmF0ZTtcclxuICAgICAgY29zdEhlYWRzLnB1c2goY29zdEhlYWQpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjYWxjdWxhdGVUaHVtYlJ1bGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWQoYnVkZ2V0ZWRDb3N0QW1vdW50OiBudW1iZXIsIGNvc3RIZWFkRnJvbVJhdGVBbmFseXNpczogYW55LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdERldGFpbHM6IGFueSwgY29zdEhlYWRzOiBBcnJheTxDb3N0SGVhZD4pIHtcclxuICAgIGlmIChidWRnZXRlZENvc3RBbW91bnQpIHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2plY3Qgc2VydmljZSwgY2FsY3VsYXRlVGh1bWJSdWxlUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkIGhhcyBiZWVuIGhpdCcpO1xyXG5cclxuICAgICAgbGV0IGNhbGN1bGF0ZVByb2plY3REYXRhID0gJ1NFTEVDVCBTVU0oYnVpbGRpbmcudG90YWxDYXJwZXRBcmVhT2ZVbml0KSBBUyB0b3RhbENhcnBldEFyZWEsICcgK1xyXG4gICAgICAgICdTVU0oYnVpbGRpbmcudG90YWxTbGFiQXJlYSkgQVMgdG90YWxTbGFiQXJlYVByb2plY3QsJyArXHJcbiAgICAgICAgJ1NVTShidWlsZGluZy50b3RhbFNhbGVhYmxlQXJlYU9mVW5pdCkgQVMgdG90YWxTYWxlYWJsZUFyZWEgIEZST00gPyBBUyBidWlsZGluZyc7XHJcbiAgICAgIGxldCBwcm9qZWN0RGF0YSA9IGFsYXNxbChjYWxjdWxhdGVQcm9qZWN0RGF0YSwgW3Byb2plY3REZXRhaWxzLmJ1aWxkaW5nc10pO1xyXG4gICAgICBsZXQgdG90YWxTbGFiQXJlYU9mUHJvamVjdCA6IG51bWJlciA9IHByb2plY3REYXRhWzBdLnRvdGFsU2xhYkFyZWFQcm9qZWN0O1xyXG4gICAgICBsZXQgdG90YWxTYWxlYWJsZUFyZWFPZlByb2plY3QgOiBudW1iZXIgPSBwcm9qZWN0RGF0YVswXS50b3RhbFNhbGVhYmxlQXJlYTtcclxuICAgICAgbGV0IHRvdGFsQ2FycGV0QXJlYU9mUHJvamVjdCA6IG51bWJlciA9IHByb2plY3REYXRhWzBdLnRvdGFsQ2FycGV0QXJlYTtcclxuXHJcbiAgICAgIGxldCBjb3N0SGVhZDogQ29zdEhlYWQgPSBjb3N0SGVhZEZyb21SYXRlQW5hbHlzaXM7XHJcbiAgICAgIGNvc3RIZWFkLmJ1ZGdldGVkQ29zdEFtb3VudCA9IGJ1ZGdldGVkQ29zdEFtb3VudDtcclxuICAgICAgbGV0IHRodW1iUnVsZVJhdGUgPSBuZXcgVGh1bWJSdWxlUmF0ZSgpO1xyXG5cclxuICAgICAgdGh1bWJSdWxlUmF0ZS5zYWxlYWJsZUFyZWEgPSB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJhdGVGb3JBcmVhKGJ1ZGdldGVkQ29zdEFtb3VudCwgdG90YWxTYWxlYWJsZUFyZWFPZlByb2plY3QpO1xyXG4gICAgICB0aHVtYlJ1bGVSYXRlLnNsYWJBcmVhID0gdGhpcy5jYWxjdWxhdGVUaHVtYlJ1bGVSYXRlRm9yQXJlYShidWRnZXRlZENvc3RBbW91bnQsIHRvdGFsU2xhYkFyZWFPZlByb2plY3QpO1xyXG4gICAgICB0aHVtYlJ1bGVSYXRlLmNhcnBldEFyZWEgPSB0aGlzLmNhbGN1bGF0ZVRodW1iUnVsZVJhdGVGb3JBcmVhKGJ1ZGdldGVkQ29zdEFtb3VudCwgdG90YWxDYXJwZXRBcmVhT2ZQcm9qZWN0KTtcclxuXHJcbiAgICAgIGNvc3RIZWFkLnRodW1iUnVsZVJhdGUgPSB0aHVtYlJ1bGVSYXRlO1xyXG4gICAgICBjb3N0SGVhZHMucHVzaChjb3N0SGVhZCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNhbGN1bGF0ZVRodW1iUnVsZVJhdGVGb3JBcmVhKGJ1ZGdldGVkQ29zdEFtb3VudDogbnVtYmVyLCBhcmVhOiBudW1iZXIpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9qZWN0IHNlcnZpY2UsIGNhbGN1bGF0ZVRodW1iUnVsZVJhdGVGb3JBcmVhIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IGJ1ZGdldENvc3RSYXRlcyA9IG5ldyBCdWRnZXRDb3N0UmF0ZXMoKTtcclxuICAgIGJ1ZGdldENvc3RSYXRlcy5zcWZ0ID0gKGJ1ZGdldGVkQ29zdEFtb3VudCAvIGFyZWEpO1xyXG4gICAgYnVkZ2V0Q29zdFJhdGVzLnNxbXQgPSAoYnVkZ2V0Q29zdFJhdGVzLnNxZnQgKiBjb25maWcuZ2V0KENvbnN0YW50cy5TUVVBUkVfTUVURVIpKTtcclxuICAgIHJldHVybiBidWRnZXRDb3N0UmF0ZXM7XHJcbiAgfX1cclxuXHJcbk9iamVjdC5zZWFsKFByb2plY3RTZXJ2aWNlKTtcclxuZXhwb3J0ID0gUHJvamVjdFNlcnZpY2U7XHJcbiJdfQ==
