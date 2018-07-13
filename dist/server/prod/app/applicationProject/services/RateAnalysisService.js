"use strict";
var UserService = require("./../../framework/services/UserService");
var ProjectAsset = require("../../framework/shared/projectasset");
var AuthInterceptor = require("../../framework/interceptor/auth.interceptor");
var CostControllException = require("../exception/CostControllException");
var WorkItem = require("../dataaccess/model/project/building/WorkItem");
var alasql = require("alasql");
var Rate = require("../dataaccess/model/project/building/Rate");
var CostHead = require("../dataaccess/model/project/building/CostHead");
var Category = require("../dataaccess/model/project/building/Category");
var Constants = require("../shared/constants");
var RateAnalysisRepository = require("../dataaccess/repository/RateAnalysisRepository");
var RateAnalysis = require("../dataaccess/model/RateAnalysis/RateAnalysis");
var messages = require("../../applicationProject/shared/messages");
var RACategory = require("../dataaccess/model/RateAnalysis/RACategory");
var RAWorkItem = require("../dataaccess/model/RateAnalysis/RAWorkItem");
var RACostHead = require("../dataaccess/model/RateAnalysis/RACostHead");
var request = require('request');
var config = require('config');
var log4js = require('log4js');
var logger = log4js.getLogger('Rate Analysis Service');
var CCPromise = require('promise/lib/es6-extensions');
var RateAnalysisService = (function () {
    function RateAnalysisService() {
        this.APP_NAME = ProjectAsset.APP_NAME;
        this.authInterceptor = new AuthInterceptor();
        this.userService = new UserService();
        this.rateAnalysisRepository = new RateAnalysisRepository();
    }
    RateAnalysisService.prototype.getCostHeads = function (url, user, callback) {
        logger.info('Rate Analysis Service, getCostHeads has been hit');
        request.get({ url: url }, function (error, response, body) {
            if (error) {
                callback(error, null);
            }
            else if (!error && response) {
                console.log('RESPONSE JSON : ' + JSON.stringify(JSON.parse(body)));
                var res = JSON.parse(body);
                callback(null, res);
            }
        });
    };
    RateAnalysisService.prototype.getWorkItems = function (url, user, callback) {
        logger.info('Rate Analysis Service, getWorkItems has been hit');
        request.get({ url: url }, function (error, response, body) {
            if (error) {
                callback(error, null);
            }
            else if (!error && response) {
                var res = JSON.parse(body);
                callback(null, res);
            }
        });
    };
    RateAnalysisService.prototype.getWorkItemsByCostHeadId = function (url, costHeadId, user, callback) {
        logger.info('Rate Analysis Service, getWorkItemsByCostHeadId has been hit');
        var workItems = [];
        request.get({ url: url }, function (error, response, body) {
            if (error) {
                callback(error, null);
            }
            else if (!error && response) {
                var res = JSON.parse(body);
                if (res) {
                    for (var _i = 0, _a = res.SubItemType; _i < _a.length; _i++) {
                        var workitem = _a[_i];
                        if (parseInt(costHeadId) === workitem.C3) {
                            var workitemDetails = new WorkItem(workitem.C2, workitem.C1);
                            workItems.push(workitemDetails);
                        }
                    }
                }
                callback(null, workItems);
            }
        });
    };
    RateAnalysisService.prototype.getApiCall = function (url, callback) {
        logger.info('getApiCall for rateAnalysis has bee hit for url : ' + url);
        request.get({ url: url }, function (error, response, body) {
            if (error) {
                callback(new CostControllException(error.message, error.stack), null);
            }
            else if (!error && response) {
                try {
                    var res = JSON.parse(body);
                    callback(null, res);
                }
                catch (err) {
                    logger.error('Promise failed for individual ! url:' + url + ':\n error :' + JSON.stringify(err.message));
                }
            }
        });
    };
    RateAnalysisService.prototype.getRate = function (workItemId, callback) {
        var _this = this;
        var url = config.get('rateAnalysisAPI.unit');
        this.getApiCall(url, function (error, unitData) {
            if (error) {
                callback(error, null);
            }
            else {
                unitData = unitData['UOM'];
                url = config.get('rateAnalysisAPI.rate');
                _this.getApiCall(url, function (error, data) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var rate = data['RateAnalysisData'];
                        var sql = 'SELECT rate.C5 AS quantity, unit.C2 As unit FROM ? AS rate JOIN ? AS unit on unit.C1 =  rate.C8 and' +
                            ' rate.C1 = ' + workItemId;
                        var sql2 = 'SELECT rate.C1 AS rateAnalysisId, rate.C2 AS itemName,ROUND(rate.C7,2) AS quantity,ROUND(rate.C3,2) AS rate,' +
                            ' ROUND(rate.C3*rate.C7,2) AS totalAmount, rate.C6 type, unit.C2 As unit FROM ? AS rate JOIN ? AS unit ON unit.C1 = rate.C9' +
                            '  WHERE rate.C1 = ' + workItemId;
                        var sql3 = 'SELECT ROUND(SUM(rate.C3*rate.C7) / SUM(rate.C7),2) AS total  FROM ? AS rate JOIN ? AS unit ON unit.C1 = rate.C9' +
                            '  WHERE rate.C1 = ' + workItemId;
                        var quantityAndUnit = alasql(sql, [rate, unitData]);
                        var rateResult = new Rate();
                        var totalrateFromRateAnalysis = alasql(sql3, [rate, unitData]);
                        rateResult.quantity = quantityAndUnit[0].quantity;
                        rateResult.unit = quantityAndUnit[0].unit;
                        rateResult.rateFromRateAnalysis = parseFloat((totalrateFromRateAnalysis[0].total).toFixed(2));
                        rate = alasql(sql2, [rate, unitData]);
                        rateResult.rateItems = rate;
                        callback(null, rateResult);
                    }
                });
            }
        });
    };
    RateAnalysisService.prototype.getWorkitemList = function (costHeadId, categoryId, callback) {
        var url = config.get('rateAnalysisAPI.workitem');
        this.getApiCall(url, function (error, workitem) {
            if (error) {
                callback(error, null);
            }
            else {
                var sql = 'SELECT C2 AS rateAnalysisId, C3 AS name FROM ? WHERE C1 = ' + costHeadId + ' and C4 = ' + categoryId;
                if (categoryId === 0) {
                    sql = 'SELECT C2 AS rateAnalysisId, C3 AS name FROM ? WHERE C1 = ' + costHeadId;
                }
                workitem = workitem['Items'];
                var workitemList = alasql(sql, [workitem]);
                callback(null, workitemList);
            }
        });
    };
    RateAnalysisService.prototype.convertCostHeadsFromRateAnalysisToCostControl = function (entity, region, callback) {
        logger.info('convertCostHeadsFromRateAnalysisToCostControl has been hit');
        var costHeadURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_COSTHEADS)
            + region.RegionId + config.get(Constants.RATE_ANALYSIS_API + Constants.RATE_ANALYSIS_API_ENDPOINT);
        var costHeadRateAnalysisPromise = this.createPromise(costHeadURL);
        logger.info('costHeadRateAnalysisPromise for has been hit');
        var categoryURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_CATEGORIES)
            + region.RegionId + config.get(Constants.RATE_ANALYSIS_API + Constants.RATE_ANALYSIS_API_ENDPOINT);
        var categoryRateAnalysisPromise = this.createPromise(categoryURL);
        logger.info('categoryRateAnalysisPromise for has been hit');
        var workItemURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_WORKITEMS)
            + region.RegionId + config.get(Constants.RATE_ANALYSIS_API + Constants.RATE_ANALYSIS_API_ENDPOINT);
        var workItemRateAnalysisPromise = this.createPromise(workItemURL);
        logger.info('workItemRateAnalysisPromise for has been hit');
        var rateItemURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_RATE)
            + region.RegionId + config.get(Constants.RATE_ANALYSIS_API + Constants.RATE_ANALYSIS_API_ENDPOINT);
        var rateItemRateAnalysisPromise = this.createPromise(rateItemURL);
        logger.info('rateItemRateAnalysisPromise for has been hit');
        var rateAnalysisNotesURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_NOTES)
            + region.RegionId + config.get(Constants.RATE_ANALYSIS_API + Constants.RATE_ANALYSIS_API_ENDPOINT);
        var notesRateAnalysisPromise = this.createPromise(rateAnalysisNotesURL);
        logger.info('notesRateAnalysisPromise for has been hit');
        var allUnitsFromRateAnalysisURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_UNIT)
            + region.RegionId + config.get(Constants.RATE_ANALYSIS_API + Constants.RATE_ANALYSIS_API_ENDPOINT);
        var unitsRateAnalysisPromise = this.createPromise(allUnitsFromRateAnalysisURL);
        logger.info('unitsRateAnalysisPromise for has been hit');
        logger.info('calling Promise.all');
        CCPromise.all([
            costHeadRateAnalysisPromise,
            categoryRateAnalysisPromise,
            workItemRateAnalysisPromise,
            rateItemRateAnalysisPromise,
            notesRateAnalysisPromise,
            unitsRateAnalysisPromise
        ]).then(function (data) {
            logger.info('convertCostHeadsFromRateAnalysisToCostControl Promise.all API is success.');
            var costHeadsRateAnalysis = data[0][Constants.RATE_ANALYSIS_ITEM_TYPE];
            var categoriesRateAnalysis = data[1][Constants.RATE_ANALYSIS_SUBITEM_TYPE];
            var workItemsRateAnalysis = data[2][Constants.RATE_ANALYSIS_ITEMS];
            var rateItemsRateAnalysis = data[3][Constants.RATE_ANALYSIS_DATA];
            var notesRateAnalysis = data[4][Constants.RATE_ANALYSIS_DATA];
            var unitsRateAnalysis = data[5][Constants.RATE_ANALYSIS_UOM];
            var buildingCostHeads = [];
            var rateAnalysisService = new RateAnalysisService();
            rateAnalysisService.getCostHeadsFromRateAnalysis(costHeadsRateAnalysis, categoriesRateAnalysis, workItemsRateAnalysis, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis, buildingCostHeads);
            logger.info('success in  convertCostHeadsFromRateAnalysisToCostControl.');
            callback(null, {
                'buildingCostHeads': buildingCostHeads,
                'rates': rateItemsRateAnalysis,
                'units': unitsRateAnalysis
            });
        }).catch(function (e) {
            logger.error(' Promise failed for convertCostHeadsFromRateAnalysisToCostControl ! :' + JSON.stringify(e.message));
            CCPromise.reject(e.message);
        });
    };
    RateAnalysisService.prototype.createPromise = function (url) {
        return new CCPromise(function (resolve, reject) {
            logger.info('createPromise has been hit for : ' + url);
            var rateAnalysisService = new RateAnalysisService();
            rateAnalysisService.getApiCall(url, function (error, data) {
                if (error) {
                    console.log('Error in createPromise get data from rate analysis: ' + JSON.stringify(error));
                    reject(error);
                }
                else {
                    console.log('createPromise data from rate analysis success.');
                    resolve(data);
                }
            });
        }).catch(function (e) {
            logger.error('Promise failed for individual ! url:' + url + ':\n error :' + JSON.stringify(e.message));
            CCPromise.reject(e.message);
        });
    };
    RateAnalysisService.prototype.getCostHeadsFromRateAnalysis = function (costHeadsRateAnalysis, categoriesRateAnalysis, workItemsRateAnalysis, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis, buildingCostHeads) {
        logger.info('getCostHeadsFromRateAnalysis has been hit.');
        for (var costHeadIndex = 0; costHeadIndex < costHeadsRateAnalysis.length; costHeadIndex++) {
            if (config.has('budgetedCostFormulae.' + costHeadsRateAnalysis[costHeadIndex].C2)) {
                var costHead = new CostHead();
                costHead.name = costHeadsRateAnalysis[costHeadIndex].C2;
                var configCostHeads = config.get('configCostHeads');
                var categories = new Array();
                if (configCostHeads.length > 0) {
                    var isCostHeadExistSQL = 'SELECT * FROM ? AS workitems WHERE TRIM(workitems.name)= ?';
                    var costHeadExistArray = alasql(isCostHeadExistSQL, [configCostHeads, costHead.name]);
                    if (costHeadExistArray.length !== 0) {
                        costHead.priorityId = costHeadExistArray[0].priorityId;
                        categories = costHeadExistArray[0].categories;
                    }
                }
                costHead.rateAnalysisId = costHeadsRateAnalysis[costHeadIndex].C1;
                var categoriesRateAnalysisSQL = 'SELECT Category.C1 AS rateAnalysisId, Category.C2 AS name' +
                    ' FROM ? AS Category where Category.C3 = ' + costHead.rateAnalysisId;
                var categoriesByCostHead = alasql(categoriesRateAnalysisSQL, [categoriesRateAnalysis]);
                var buildingCategories = new Array();
                if (categoriesByCostHead.length === 0) {
                    this.getWorkItemsWithoutCategoryFromRateAnalysis(costHead.rateAnalysisId, workItemsRateAnalysis, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis, buildingCategories, categories);
                }
                else {
                    this.getCategoriesFromRateAnalysis(categoriesByCostHead, workItemsRateAnalysis, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis, buildingCategories, categories);
                }
                costHead.categories = buildingCategories;
                costHead.thumbRuleRate = config.get(Constants.THUMBRULE_RATE);
                buildingCostHeads.push(costHead);
            }
            else {
                console.log('CostHead Unavaialabel : ' + costHeadsRateAnalysis[costHeadIndex].C2);
            }
        }
    };
    RateAnalysisService.prototype.getCategoriesFromRateAnalysis = function (categoriesByCostHead, workItemsRateAnalysis, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis, buildingCategories, configCategories) {
        logger.info('getCategoriesFromRateAnalysis has been hit.');
        for (var categoryIndex = 0; categoryIndex < categoriesByCostHead.length; categoryIndex++) {
            var category = new Category(categoriesByCostHead[categoryIndex].name, categoriesByCostHead[categoryIndex].rateAnalysisId);
            var configWorkItems = new Array();
            if (configCategories.length > 0) {
                for (var _i = 0, configCategories_1 = configCategories; _i < configCategories_1.length; _i++) {
                    var configCategory = configCategories_1[_i];
                    if (configCategory.name === categoriesByCostHead[categoryIndex].name) {
                        configWorkItems = configCategory.workItems;
                    }
                }
            }
            var workItemsRateAnalysisSQL = 'SELECT workItem.C2 AS rateAnalysisId, TRIM(workItem.C3) AS name' +
                ' FROM ? AS workItem where workItem.C4 = ' + categoriesByCostHead[categoryIndex].rateAnalysisId;
            var workItemsByCategory = alasql(workItemsRateAnalysisSQL, [workItemsRateAnalysis]);
            var buildingWorkItems = new Array();
            this.getWorkItemsFromRateAnalysis(workItemsByCategory, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis, buildingWorkItems, configWorkItems);
            category.workItems = buildingWorkItems;
            if (category.workItems.length !== 0) {
                buildingCategories.push(category);
            }
        }
        if (configCategories.length > 0) {
            for (var configCategoryIndex = 0; configCategoryIndex < configCategories.length; configCategoryIndex++) {
                var isCategoryExistsSQL = 'SELECT * FROM ? AS workitems WHERE TRIM(workitems.name)= ?';
                var categoryExistsArray = alasql(isCategoryExistsSQL, [categoriesByCostHead, configCategories[configCategoryIndex].name]);
                if (categoryExistsArray.length === 0) {
                    var configCat = new Category(configCategories[configCategoryIndex].name, configCategories[configCategoryIndex].rateAnalysisId);
                    configCat.workItems = this.getWorkitemsForConfigCategory(configCategories[configCategoryIndex].workItems);
                    if (configCat.workItems.length !== 0) {
                        buildingCategories.push(configCat);
                    }
                }
            }
        }
    };
    RateAnalysisService.prototype.getWorkitemsForConfigCategory = function (configWorkitems) {
        var workItemsList = new Array();
        for (var workitemIndex = 0; workitemIndex < configWorkitems.length; workitemIndex++) {
            var configWorkitem = this.convertConfigorkitem(configWorkitems[workitemIndex]);
            workItemsList.push(configWorkitem);
        }
        return workItemsList;
    };
    RateAnalysisService.prototype.getWorkItemsWithoutCategoryFromRateAnalysis = function (costHeadRateAnalysisId, workItemsRateAnalysis, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis, buildingCategories, configCategories) {
        logger.info('getWorkItemsWithoutCategoryFromRateAnalysis has been hit.');
        var workItemsWithoutCategoriesRateAnalysisSQL = 'SELECT workItem.C2 AS rateAnalysisId, workItem.C3 AS name' +
            ' FROM ? AS workItem where NOT workItem.C4 AND workItem.C1 = ' + costHeadRateAnalysisId;
        var workItemsWithoutCategories = alasql(workItemsWithoutCategoriesRateAnalysisSQL, [workItemsRateAnalysis]);
        var buildingWorkItems = new Array();
        var category = new Category('Work Items', 0);
        var configWorkItems = new Array();
        if (configCategories.length > 0) {
            for (var _i = 0, configCategories_2 = configCategories; _i < configCategories_2.length; _i++) {
                var configCategory = configCategories_2[_i];
                if (configCategory.name === 'Work Items') {
                    configWorkItems = configCategory.workItems;
                }
            }
        }
        this.getWorkItemsFromRateAnalysis(workItemsWithoutCategories, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis, buildingWorkItems, configWorkItems);
        category.workItems = buildingWorkItems;
        buildingCategories.push(category);
    };
    RateAnalysisService.prototype.syncRateitemFromRateAnalysis = function (entity, buildingDetails, callback) {
        var rateItemURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_RATE);
        var rateItemRateAnalysisPromise = this.createPromise(rateItemURL);
        logger.info('rateItemRateAnalysisPromise for has been hit');
        var rateAnalysisNotesURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_NOTES);
        var notesRateAnalysisPromise = this.createPromise(rateAnalysisNotesURL);
        logger.info('notesRateAnalysisPromise for has been hit');
        var allUnitsFromRateAnalysisURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_UNIT);
        var unitsRateAnalysisPromise = this.createPromise(allUnitsFromRateAnalysisURL);
        logger.info('unitsRateAnalysisPromise for has been hit');
        var costHeadURL = config.get(Constants.RATE_ANALYSIS_API + entity + Constants.RATE_ANALYSIS_COSTHEADS);
        var costHeadRateAnalysisPromise = this.createPromise(costHeadURL);
        logger.info('costHeadRateAnalysisPromise for has been hit');
        CCPromise.all([
            rateItemRateAnalysisPromise,
            notesRateAnalysisPromise,
            unitsRateAnalysisPromise,
            costHeadRateAnalysisPromise
        ]).then(function (data) {
            logger.info('convertCostHeadsFromRateAnalysisToCostControl Promise.all API is success.');
            logger.info('success in  convertCostHeadsFromRateAnalysisToCostControl.');
            callback(null, data);
        }).catch(function (e) {
            logger.error(' Promise failed for convertCostHeadsFromRateAnalysisToCostControl ! :' + e.message);
            CCPromise.reject(e.message);
        });
    };
    RateAnalysisService.prototype.getWorkItemsFromRateAnalysis = function (workItemsByCategory, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis, buildingWorkItems, configWorkItems) {
        logger.info('getWorkItemsFromRateAnalysis has been hit.');
        for (var _i = 0, workItemsByCategory_1 = workItemsByCategory; _i < workItemsByCategory_1.length; _i++) {
            var categoryWorkitem = workItemsByCategory_1[_i];
            var workItem = this.getRateAnalysis(categoryWorkitem, configWorkItems, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis);
            if (workItem) {
                buildingWorkItems.push(workItem);
            }
        }
        for (var _a = 0, configWorkItems_1 = configWorkItems; _a < configWorkItems_1.length; _a++) {
            var configWorkItem = configWorkItems_1[_a];
            var isWorkItemExistSQL = 'SELECT * FROM ? AS workitems WHERE TRIM(workitems.name)= ?';
            var workItemExistArray = alasql(isWorkItemExistSQL, [workItemsByCategory, configWorkItem.name]);
            if (workItemExistArray.length === 0 && configWorkItem.rateAnalysisId) {
                var workitem = this.convertConfigorkitem(configWorkItem);
                buildingWorkItems.push(workitem);
            }
        }
    };
    RateAnalysisService.prototype.convertConfigorkitem = function (configWorkItem) {
        var workItem = new WorkItem(configWorkItem.name, configWorkItem.rateAnalysisId);
        workItem.isDirectRate = !configWorkItem.isRateAnalysis;
        workItem.isRateAnalysis = configWorkItem.isRateAnalysis;
        workItem.isMeasurementSheet = configWorkItem.isMeasurementSheet;
        workItem.isSteelWorkItem = configWorkItem.isSteelWorkItem;
        workItem.rateAnalysisPerUnit = configWorkItem.rateAnalysisPerUnit;
        workItem.rateAnalysisUnit = configWorkItem.rateAnalysisUnit;
        workItem.isItemBreakdownRequired = configWorkItem.isItemBreakdownRequired;
        workItem.length = configWorkItem.length;
        workItem.breadthOrWidth = configWorkItem.breadthOrWidth;
        workItem.height = configWorkItem.height;
        workItem.unit = configWorkItem.measurementUnit;
        if (!configWorkItem.isRateAnalysis) {
            workItem.rate.total = configWorkItem.directRate;
            workItem.rate.unit = configWorkItem.directRatePerUnit;
            workItem.rate.isEstimated = true;
        }
        else {
            logger.error('WorkItem error for rateAnalysis : ' + configWorkItem.name);
        }
        return workItem;
    };
    RateAnalysisService.prototype.getRateAnalysis = function (categoryWorkitem, configWorkItems, rateItemsRateAnalysis, unitsRateAnalysis, notesRateAnalysis) {
        var isWorkItemExistSQL = 'SELECT * FROM ? AS workitems WHERE TRIM(workitems.name)= ?';
        var workItemExistArray = alasql(isWorkItemExistSQL, [configWorkItems, categoryWorkitem.name]);
        if (workItemExistArray.length !== 0) {
            var workItem = new WorkItem(categoryWorkitem.name, categoryWorkitem.rateAnalysisId);
            if (categoryWorkitem.active !== undefined && categoryWorkitem.active !== null) {
                workItem = categoryWorkitem;
            }
            workItem.unit = workItemExistArray[0].measurementUnit;
            workItem.isMeasurementSheet = workItemExistArray[0].isMeasurementSheet;
            workItem.isRateAnalysis = workItemExistArray[0].isRateAnalysis;
            workItem.isSteelWorkItem = workItemExistArray[0].isSteelWorkItem;
            workItem.rateAnalysisPerUnit = workItemExistArray[0].rateAnalysisPerUnit;
            workItem.isItemBreakdownRequired = workItemExistArray[0].isItemBreakdownRequired;
            workItem.length = workItemExistArray[0].length;
            workItem.breadthOrWidth = workItemExistArray[0].breadthOrWidth;
            workItem.height = workItemExistArray[0].height;
            var rateItemsRateAnalysisSQL = 'SELECT rateItem.C2 AS itemName, rateItem.C2 AS originalItemName,' +
                'rateItem.C12 AS rateAnalysisId, rateItem.C6 AS type,' +
                'ROUND(rateItem.C7,2) AS quantity, ROUND(rateItem.C3,2) AS rate, unit.C2 AS unit,' +
                'ROUND(rateItem.C3 * rateItem.C7,2) AS totalAmount, rateItem.C5 AS totalQuantity, rateItem.C13 AS notesRateAnalysisId  ' +
                'FROM ? AS rateItem JOIN ? AS unit ON unit.C1 = rateItem.C9 where rateItem.C1 = '
                + categoryWorkitem.rateAnalysisId;
            var rateItemsByWorkItem = alasql(rateItemsRateAnalysisSQL, [rateItemsRateAnalysis, unitsRateAnalysis]);
            var notes = '';
            var imageURL = '';
            workItem.rate.rateItems = rateItemsByWorkItem;
            workItem.rate.unit = workItemExistArray[0].rateAnalysisUnit;
            if (rateItemsByWorkItem && rateItemsByWorkItem.length > 0) {
                var notesRateAnalysisSQL = 'SELECT notes.C2 AS notes, notes.C3 AS imageURL FROM ? AS notes where notes.C1 = ' +
                    rateItemsByWorkItem[0].notesRateAnalysisId;
                var notesList = alasql(notesRateAnalysisSQL, [notesRateAnalysis]);
                notes = notesList[0].notes;
                imageURL = notesList[0].imageURL;
                workItem.rate.quantity = rateItemsByWorkItem[0].totalQuantity;
                workItem.systemRate.quantity = rateItemsByWorkItem[0].totalQuantity;
            }
            else {
                workItem.rate.quantity = 1;
                workItem.systemRate.quantity = 1;
            }
            workItem.rate.isEstimated = true;
            workItem.rate.notes = notes;
            workItem.rate.imageURL = imageURL;
            workItem.systemRate.rateItems = rateItemsByWorkItem;
            workItem.systemRate.notes = notes;
            workItem.systemRate.imageURL = imageURL;
            return workItem;
        }
        return null;
    };
    RateAnalysisService.prototype.syncAllRegions = function () {
        var _this = this;
        this.getAllregionsFromRateAnalysis(function (error, response) {
            if (error) {
                console.log('error : ' + JSON.stringify(error));
            }
            else {
                console.log('response : ' + JSON.stringify(response));
                for (var _i = 0, response_1 = response; _i < response_1.length; _i++) {
                    var region = response_1[_i];
                    _this.SyncRateAnalysis(region);
                }
            }
        });
    };
    RateAnalysisService.prototype.SyncRateAnalysis = function (region) {
        var _this = this;
        var rateAnalysisService = new RateAnalysisService();
        this.convertCostHeadsFromRateAnalysisToCostControl(Constants.BUILDING, region, function (error, buildingData) {
            if (error) {
                logger.error('RateAnalysis Sync Failed.');
            }
            else {
                _this.convertCostHeadsFromRateAnalysisToCostControl(Constants.BUILDING, region, function (error, projectData) {
                    if (error) {
                        logger.error('RateAnalysis Sync Failed.');
                    }
                    else {
                        var buildingCostHeads = JSON.parse(JSON.stringify(buildingData.buildingCostHeads));
                        var projectCostHeads = JSON.parse(JSON.stringify(projectData.buildingCostHeads));
                        var configCostHeads = config.get('configCostHeads');
                        var configProjectCostHeads = config.get('configProjectCostHeads');
                        var fixedCostConfigProjectCostHeads = config.get('fixedCostConfigProjectCostHeads');
                        _this.convertConfigCostHeads(configCostHeads, buildingCostHeads);
                        _this.convertConfigCostHeads(configProjectCostHeads, projectCostHeads);
                        _this.convertConfigCostHeads(fixedCostConfigProjectCostHeads, projectCostHeads);
                        buildingCostHeads = alasql('SELECT * FROM ? ORDER BY priorityId', [buildingCostHeads]);
                        projectCostHeads = alasql('SELECT * FROM ? ORDER BY priorityId', [projectCostHeads]);
                        var buildingRates = _this.getRates(buildingData, buildingCostHeads);
                        var projectRates = _this.getRates(projectData, projectCostHeads);
                        var rateAnalysis = new RateAnalysis(buildingCostHeads, buildingRates, projectCostHeads, projectRates);
                        _this.saveRateAnalysis(rateAnalysis, region);
                    }
                });
            }
        });
    };
    RateAnalysisService.prototype.convertConfigCostHeads = function (configCostHeads, costHeadsData) {
        for (var _i = 0, configCostHeads_1 = configCostHeads; _i < configCostHeads_1.length; _i++) {
            var configCostHead = configCostHeads_1[_i];
            var costHeadExistSQL = 'SELECT * FROM ? AS costHeads WHERE costHeads.name= ?';
            var costHeadExistArray = alasql(costHeadExistSQL, [costHeadsData, configCostHead.name]);
            if (costHeadExistArray.length === 0 && configCostHead.rateAnalysisId) {
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
                        workItem.isSteelWorkItem = configWorkItem.isSteelWorkItem;
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
        }
        return costHeadsData;
    };
    RateAnalysisService.prototype.getRates = function (result, costHeads) {
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
    RateAnalysisService.prototype.saveRateAnalysis = function (rateAnalysis, region) {
        var _this = this;
        logger.info('saveRateAnalysis is been hit');
        var query = { 'region': region.Region };
        rateAnalysis.region = region.Region;
        logger.info('Updating RateAnalysis for ' + region.Region);
        this.rateAnalysisRepository.retrieve({ 'region': region.Region }, function (error, rateAnalysisArray) {
            if (error) {
                logger.error('Unable to retrive synced RateAnalysis');
            }
            else {
                if (rateAnalysisArray.length > 0) {
                    query = { 'region': region.Region };
                    var update = {
                        $set: {
                            'projectCostHeads': rateAnalysis.projectCostHeads,
                            'projectRates': rateAnalysis.projectRates,
                            'buildingCostHeads': rateAnalysis.buildingCostHeads,
                            'buildingRates': rateAnalysis.buildingRates
                        }
                    };
                    _this.rateAnalysisRepository.findOneAndUpdate(query, update, { new: true }, function (error, rateAnalysisArray) {
                        if (error) {
                            logger.error('saveRateAnalysis failed => ' + error.message);
                        }
                        else {
                            logger.info('Updated RateAnalysis.');
                        }
                    });
                }
                else {
                    _this.rateAnalysisRepository.create(rateAnalysis, function (error, result) {
                        if (error) {
                            logger.error('saveRateAnalysis failed => ' + error.message);
                        }
                        else {
                            logger.info('Saved RateAnalysis.');
                        }
                    });
                }
            }
        });
    };
    RateAnalysisService.prototype.getCostControlRateAnalysis = function (query, projection, callback) {
        this.rateAnalysisRepository.retrieveWithProjection(query, projection, function (error, rateAnalysisArray) {
            if (error) {
                callback(error, null);
            }
            else {
                if (rateAnalysisArray.length === 0) {
                    logger.error('ContControl RateAnalysis not found.');
                    callback('ContControl RateAnalysis not found.', null);
                }
                else {
                    callback(null, rateAnalysisArray[0]);
                }
            }
        });
    };
    RateAnalysisService.prototype.getAggregateData = function (query, callback) {
        this.rateAnalysisRepository.aggregate(query, callback);
    };
    RateAnalysisService.prototype.getAllregionsFromRateAnalysis = function (callback) {
        logger.info('Rate Analysis Service, getCostHeads has been hit');
        var regionListFromRateAnalysis;
        var url = config.get('rateAnalysisAPI.getAllregions');
        request.get({ url: url }, function (error, response, body) {
            if (error) {
                logger.error('Error for getting all regions.');
                logger.error(JSON.stringify(error));
                callback(error, null);
            }
            else if (!error && response) {
                var resp = JSON.parse(body);
                regionListFromRateAnalysis = resp['Regions'];
                console.log('regionListFromRateAnalysis : ' + JSON.stringify(regionListFromRateAnalysis));
                callback(null, regionListFromRateAnalysis);
            }
        });
    };
    RateAnalysisService.prototype.getAllRegionNames = function (callback) {
        var query = [
            { $unwind: '$region' },
            { $project: { 'region': 1, _id: 0 } }
        ];
        this.rateAnalysisRepository.aggregate(query, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                if (result.length > 0) {
                    callback(error, result);
                }
                else {
                    var error_1 = new Error();
                    error_1.message = messages.MSG_ERROR_REGIONS_ARE_NOT_PRESENT;
                    callback(error_1, null);
                }
            }
        });
    };
    RateAnalysisService.prototype.getAllDataForDropdown = function (regionName, callback) {
        var _this = this;
        var query = { region: regionName };
        var projection = { 'buildingCostHeads': 1 };
        this.rateAnalysisRepository.retrieveWithProjection(query, projection, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                var costHeadData = result[0].buildingCostHeads;
                var buildingCostHeads = [];
                if (costHeadData.length > 0) {
                    for (var costHeadIndex = 0; costHeadIndex < costHeadData.length; costHeadIndex++) {
                        var costHead = new RACostHead();
                        costHead.name = costHeadData[costHeadIndex].name;
                        costHead.rateAnalysisId = costHeadData[costHeadIndex].rateAnalysisId;
                        var buildingCategories = new Array();
                        _this.getCategories(costHeadData[costHeadIndex].categories, buildingCategories);
                        costHead.categories = buildingCategories;
                        if (costHead.categories.length > 0) {
                            buildingCostHeads.push(costHead);
                        }
                    }
                    callback(null, buildingCostHeads);
                }
                else {
                    var error_2 = new Error();
                    error_2.message = messages.MSG_ERROR_REGIONS_ARE_NOT_PRESENT;
                    callback(error_2, null);
                }
            }
        });
    };
    RateAnalysisService.prototype.getCategories = function (categoriesData, buildingCategories) {
        if (categoriesData.length > 0) {
            for (var categoryIndex = 0; categoryIndex < categoriesData.length; categoryIndex++) {
                var category = new RACategory();
                category.name = categoriesData[categoryIndex].name;
                category.rateAnalysisId = categoriesData[categoryIndex].rateAnalysisId;
                var buildingWorkItems = new Array();
                this.getWorkItemsForRA(categoriesData[categoryIndex].workItems, buildingWorkItems);
                category.workItems = buildingWorkItems;
                if (category.workItems.length > 0) {
                    buildingCategories.push(category);
                }
            }
        }
    };
    RateAnalysisService.prototype.getWorkItemsForRA = function (workItemsData, buildingWorkItems) {
        if (workItemsData.length > 0) {
            for (var workItemIndex = 0; workItemIndex < workItemsData.length; workItemIndex++) {
                var workItem = new RAWorkItem();
                workItem.name = workItemsData[workItemIndex].name;
                workItem.rateAnalysisId = workItemsData[workItemIndex].rateAnalysisId;
                workItem.rate = workItemsData[workItemIndex].rate;
                workItem.unit = workItemsData[workItemIndex].unit;
                if (workItem.rate.rateItems.length > 0) {
                    buildingWorkItems.push(workItem);
                }
            }
        }
    };
    return RateAnalysisService;
}());
Object.seal(RateAnalysisService);
module.exports = RateAnalysisService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUmF0ZUFuYWx5c2lzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0VBQXVFO0FBQ3ZFLGtFQUFxRTtBQUVyRSw4RUFBaUY7QUFDakYsMEVBQTZFO0FBQzdFLHdFQUEyRTtBQUMzRSwrQkFBa0M7QUFDbEMsZ0VBQW1FO0FBQ25FLHdFQUEyRTtBQUMzRSx3RUFBMkU7QUFHM0UsK0NBQWtEO0FBQ2xELHdGQUEyRjtBQUMzRiw0RUFBK0U7QUFFL0UsbUVBQXVFO0FBQ3ZFLHdFQUEyRTtBQUMzRSx3RUFBMkU7QUFDM0Usd0VBQTJFO0FBRTNFLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNqQyxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUV2RCxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUV0RDtJQU9FO1FBQ0UsSUFBSSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM3QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksc0JBQXNCLEVBQUUsQ0FBQztJQUM3RCxDQUFDO0lBRUQsMENBQVksR0FBWixVQUFhLEdBQVcsRUFBRSxJQUFVLEVBQUUsUUFBMkM7UUFDL0UsTUFBTSxDQUFDLElBQUksQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1FBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FB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QkFDbkMsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUNILDBCQUFDO0FBQUQsQ0Fud0JBLEFBbXdCQyxJQUFBO0FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ2pDLGlCQUFTLG1CQUFtQixDQUFDIiwiZmlsZSI6ImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUmF0ZUFuYWx5c2lzU2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBVc2VyU2VydmljZSA9IHJlcXVpcmUoJy4vLi4vLi4vZnJhbWV3b3JrL3NlcnZpY2VzL1VzZXJTZXJ2aWNlJyk7XHJcbmltcG9ydCBQcm9qZWN0QXNzZXQgPSByZXF1aXJlKCcuLi8uLi9mcmFtZXdvcmsvc2hhcmVkL3Byb2plY3Rhc3NldCcpO1xyXG5pbXBvcnQgVXNlciA9IHJlcXVpcmUoJy4uLy4uL2ZyYW1ld29yay9kYXRhYWNjZXNzL21vbmdvb3NlL3VzZXInKTtcclxuaW1wb3J0IEF1dGhJbnRlcmNlcHRvciA9IHJlcXVpcmUoJy4uLy4uL2ZyYW1ld29yay9pbnRlcmNlcHRvci9hdXRoLmludGVyY2VwdG9yJyk7XHJcbmltcG9ydCBDb3N0Q29udHJvbGxFeGNlcHRpb24gPSByZXF1aXJlKCcuLi9leGNlcHRpb24vQ29zdENvbnRyb2xsRXhjZXB0aW9uJyk7XHJcbmltcG9ydCBXb3JrSXRlbSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9idWlsZGluZy9Xb3JrSXRlbScpO1xyXG5pbXBvcnQgYWxhc3FsID0gcmVxdWlyZSgnYWxhc3FsJyk7XHJcbmltcG9ydCBSYXRlID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1JhdGUnKTtcclxuaW1wb3J0IENvc3RIZWFkID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL0Nvc3RIZWFkJyk7XHJcbmltcG9ydCBDYXRlZ29yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9idWlsZGluZy9DYXRlZ29yeScpO1xyXG5pbXBvcnQgUXVhbnRpdHkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvUXVhbnRpdHknKTtcclxuXHJcbmltcG9ydCBDb25zdGFudHMgPSByZXF1aXJlKCcuLi9zaGFyZWQvY29uc3RhbnRzJyk7XHJcbmltcG9ydCBSYXRlQW5hbHlzaXNSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L1JhdGVBbmFseXNpc1JlcG9zaXRvcnknKTtcclxuaW1wb3J0IFJhdGVBbmFseXNpcyA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvUmF0ZUFuYWx5c2lzL1JhdGVBbmFseXNpcycpO1xyXG5pbXBvcnQgeyBBdHRhY2htZW50RGV0YWlsc01vZGVsIH0gZnJvbSAnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL0F0dGFjaG1lbnREZXRhaWxzJztcclxuaW1wb3J0IG1lc3NhZ2VzICA9IHJlcXVpcmUoJy4uLy4uL2FwcGxpY2F0aW9uUHJvamVjdC9zaGFyZWQvbWVzc2FnZXMnKTtcclxuaW1wb3J0IFJBQ2F0ZWdvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL1JhdGVBbmFseXNpcy9SQUNhdGVnb3J5Jyk7XHJcbmltcG9ydCBSQVdvcmtJdGVtID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9SYXRlQW5hbHlzaXMvUkFXb3JrSXRlbScpO1xyXG5pbXBvcnQgUkFDb3N0SGVhZCA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvUmF0ZUFuYWx5c2lzL1JBQ29zdEhlYWQnKTtcclxuXHJcbmxldCByZXF1ZXN0ID0gcmVxdWlyZSgncmVxdWVzdCcpO1xyXG5sZXQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XHJcbnZhciBsb2c0anMgPSByZXF1aXJlKCdsb2c0anMnKTtcclxudmFyIGxvZ2dlciA9IGxvZzRqcy5nZXRMb2dnZXIoJ1JhdGUgQW5hbHlzaXMgU2VydmljZScpO1xyXG5cclxubGV0IENDUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UvbGliL2VzNi1leHRlbnNpb25zJyk7XHJcblxyXG5jbGFzcyBSYXRlQW5hbHlzaXNTZXJ2aWNlIHtcclxuICBBUFBfTkFNRTogc3RyaW5nO1xyXG4gIGNvbXBhbnlfbmFtZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgYXV0aEludGVyY2VwdG9yOiBBdXRoSW50ZXJjZXB0b3I7XHJcbiAgcHJpdmF0ZSB1c2VyU2VydmljZTogVXNlclNlcnZpY2U7XHJcbiAgcHJpdmF0ZSByYXRlQW5hbHlzaXNSZXBvc2l0b3J5OiBSYXRlQW5hbHlzaXNSZXBvc2l0b3J5O1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuQVBQX05BTUUgPSBQcm9qZWN0QXNzZXQuQVBQX05BTUU7XHJcbiAgICB0aGlzLmF1dGhJbnRlcmNlcHRvciA9IG5ldyBBdXRoSW50ZXJjZXB0b3IoKTtcclxuICAgIHRoaXMudXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcclxuICAgIHRoaXMucmF0ZUFuYWx5c2lzUmVwb3NpdG9yeSA9IG5ldyBSYXRlQW5hbHlzaXNSZXBvc2l0b3J5KCk7XHJcbiAgfVxyXG5cclxuICBnZXRDb3N0SGVhZHModXJsOiBzdHJpbmcsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdSYXRlIEFuYWx5c2lzIFNlcnZpY2UsIGdldENvc3RIZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIHJlcXVlc3QuZ2V0KHt1cmw6IHVybH0sIGZ1bmN0aW9uIChlcnJvcjogYW55LCByZXNwb25zZTogYW55LCBib2R5OiBhbnkpIHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2UgaWYgKCFlcnJvciAmJiByZXNwb25zZSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdSRVNQT05TRSBKU09OIDogJyArIEpTT04uc3RyaW5naWZ5KEpTT04ucGFyc2UoYm9keSkpKTtcclxuICAgICAgICBsZXQgcmVzID0gSlNPTi5wYXJzZShib2R5KTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldFdvcmtJdGVtcyh1cmw6IHN0cmluZywgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1JhdGUgQW5hbHlzaXMgU2VydmljZSwgZ2V0V29ya0l0ZW1zIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgcmVxdWVzdC5nZXQoe3VybDogdXJsfSwgZnVuY3Rpb24gKGVycm9yOiBhbnksIHJlc3BvbnNlOiBhbnksIGJvZHk6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSBpZiAoIWVycm9yICYmIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgbGV0IHJlcyA9IEpTT04ucGFyc2UoYm9keSk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRXb3JrSXRlbXNCeUNvc3RIZWFkSWQodXJsOiBzdHJpbmcsIGNvc3RIZWFkSWQ6IHN0cmluZywgdXNlcjogVXNlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ1JhdGUgQW5hbHlzaXMgU2VydmljZSwgZ2V0V29ya0l0ZW1zQnlDb3N0SGVhZElkIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHdvcmtJdGVtczogQXJyYXk8V29ya0l0ZW0+ID0gW107XHJcbiAgICByZXF1ZXN0LmdldCh7dXJsOiB1cmx9LCBmdW5jdGlvbiAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IGFueSwgYm9keTogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIGlmICghZXJyb3IgJiYgcmVzcG9uc2UpIHtcclxuICAgICAgICBsZXQgcmVzID0gSlNPTi5wYXJzZShib2R5KTtcclxuICAgICAgICBpZiAocmVzKSB7XHJcblxyXG4gICAgICAgICAgZm9yIChsZXQgd29ya2l0ZW0gb2YgcmVzLlN1Ykl0ZW1UeXBlKSB7XHJcbiAgICAgICAgICAgIGlmIChwYXJzZUludChjb3N0SGVhZElkKSA9PT0gd29ya2l0ZW0uQzMpIHtcclxuICAgICAgICAgICAgICBsZXQgd29ya2l0ZW1EZXRhaWxzID0gbmV3IFdvcmtJdGVtKHdvcmtpdGVtLkMyLCB3b3JraXRlbS5DMSk7XHJcbiAgICAgICAgICAgICAgd29ya0l0ZW1zLnB1c2god29ya2l0ZW1EZXRhaWxzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLCB3b3JrSXRlbXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldEFwaUNhbGwodXJsOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ2dldEFwaUNhbGwgZm9yIHJhdGVBbmFseXNpcyBoYXMgYmVlIGhpdCBmb3IgdXJsIDogJyArIHVybCk7XHJcbiAgICByZXF1ZXN0LmdldCh7dXJsOiB1cmx9LCBmdW5jdGlvbiAoZXJyb3I6IGFueSwgcmVzcG9uc2U6IGFueSwgYm9keTogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKG5ldyBDb3N0Q29udHJvbGxFeGNlcHRpb24oZXJyb3IubWVzc2FnZSwgZXJyb3Iuc3RhY2spLCBudWxsKTtcclxuICAgICAgfSBlbHNlIGlmICghZXJyb3IgJiYgcmVzcG9uc2UpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgbGV0IHJlcyA9IEpTT04ucGFyc2UoYm9keSk7XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXMpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgbG9nZ2VyLmVycm9yKCdQcm9taXNlIGZhaWxlZCBmb3IgaW5kaXZpZHVhbCAhIHVybDonICsgdXJsICsgJzpcXG4gZXJyb3IgOicgKyBKU09OLnN0cmluZ2lmeShlcnIubWVzc2FnZSkpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0UmF0ZSh3b3JrSXRlbUlkOiBudW1iZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgZGF0YTogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgdXJsID0gY29uZmlnLmdldCgncmF0ZUFuYWx5c2lzQVBJLnVuaXQnKTtcclxuICAgIHRoaXMuZ2V0QXBpQ2FsbCh1cmwsIChlcnJvciwgdW5pdERhdGEpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHVuaXREYXRhID0gdW5pdERhdGFbJ1VPTSddO1xyXG4gICAgICAgIHVybCA9IGNvbmZpZy5nZXQoJ3JhdGVBbmFseXNpc0FQSS5yYXRlJyk7XHJcbiAgICAgICAgdGhpcy5nZXRBcGlDYWxsKHVybCwgKGVycm9yLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IHJhdGUgPSBkYXRhWydSYXRlQW5hbHlzaXNEYXRhJ107XHJcbiAgICAgICAgICAgIGxldCBzcWwgPSAnU0VMRUNUIHJhdGUuQzUgQVMgcXVhbnRpdHksIHVuaXQuQzIgQXMgdW5pdCBGUk9NID8gQVMgcmF0ZSBKT0lOID8gQVMgdW5pdCBvbiB1bml0LkMxID0gIHJhdGUuQzggYW5kJyArXHJcbiAgICAgICAgICAgICAgJyByYXRlLkMxID0gJyArIHdvcmtJdGVtSWQ7XHJcbiAgICAgICAgICAgIGxldCBzcWwyID0gJ1NFTEVDVCByYXRlLkMxIEFTIHJhdGVBbmFseXNpc0lkLCByYXRlLkMyIEFTIGl0ZW1OYW1lLFJPVU5EKHJhdGUuQzcsMikgQVMgcXVhbnRpdHksUk9VTkQocmF0ZS5DMywyKSBBUyByYXRlLCcgK1xyXG4gICAgICAgICAgICAgICcgUk9VTkQocmF0ZS5DMypyYXRlLkM3LDIpIEFTIHRvdGFsQW1vdW50LCByYXRlLkM2IHR5cGUsIHVuaXQuQzIgQXMgdW5pdCBGUk9NID8gQVMgcmF0ZSBKT0lOID8gQVMgdW5pdCBPTiB1bml0LkMxID0gcmF0ZS5DOScgK1xyXG4gICAgICAgICAgICAgICcgIFdIRVJFIHJhdGUuQzEgPSAnICsgd29ya0l0ZW1JZDtcclxuICAgICAgICAgICAgbGV0IHNxbDMgPSAnU0VMRUNUIFJPVU5EKFNVTShyYXRlLkMzKnJhdGUuQzcpIC8gU1VNKHJhdGUuQzcpLDIpIEFTIHRvdGFsICBGUk9NID8gQVMgcmF0ZSBKT0lOID8gQVMgdW5pdCBPTiB1bml0LkMxID0gcmF0ZS5DOScgK1xyXG4gICAgICAgICAgICAgICcgIFdIRVJFIHJhdGUuQzEgPSAnICsgd29ya0l0ZW1JZDtcclxuICAgICAgICAgICAgbGV0IHF1YW50aXR5QW5kVW5pdCA9IGFsYXNxbChzcWwsIFtyYXRlLCB1bml0RGF0YV0pO1xyXG4gICAgICAgICAgICBsZXQgcmF0ZVJlc3VsdDogUmF0ZSA9IG5ldyBSYXRlKCk7XHJcbiAgICAgICAgICAgIGxldCB0b3RhbHJhdGVGcm9tUmF0ZUFuYWx5c2lzID0gYWxhc3FsKHNxbDMsIFtyYXRlLCB1bml0RGF0YV0pO1xyXG4gICAgICAgICAgICByYXRlUmVzdWx0LnF1YW50aXR5ID0gcXVhbnRpdHlBbmRVbml0WzBdLnF1YW50aXR5O1xyXG4gICAgICAgICAgICByYXRlUmVzdWx0LnVuaXQgPSBxdWFudGl0eUFuZFVuaXRbMF0udW5pdDtcclxuICAgICAgICAgICAgcmF0ZVJlc3VsdC5yYXRlRnJvbVJhdGVBbmFseXNpcyA9IHBhcnNlRmxvYXQoKHRvdGFscmF0ZUZyb21SYXRlQW5hbHlzaXNbMF0udG90YWwpLnRvRml4ZWQoMikpO1xyXG4gICAgICAgICAgICByYXRlID0gYWxhc3FsKHNxbDIsIFtyYXRlLCB1bml0RGF0YV0pO1xyXG4gICAgICAgICAgICByYXRlUmVzdWx0LnJhdGVJdGVtcyA9IHJhdGU7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJhdGVSZXN1bHQpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvL1RPRE8gOiBEZWxldGUgQVBJJ3MgcmVsYXRlZCB0byB3b3JraXRlbXMgYWRkLCBkZWxlZXQsIGdldCBsaXN0LlxyXG4gIGdldFdvcmtpdGVtTGlzdChjb3N0SGVhZElkOiBudW1iZXIsIGNhdGVnb3J5SWQ6IG51bWJlciwgY2FsbGJhY2s6IChlcnJvcjogYW55LCBkYXRhOiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxldCB1cmwgPSBjb25maWcuZ2V0KCdyYXRlQW5hbHlzaXNBUEkud29ya2l0ZW0nKTtcclxuICAgIHRoaXMuZ2V0QXBpQ2FsbCh1cmwsIChlcnJvciwgd29ya2l0ZW0pID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBzcWw6IHN0cmluZyA9ICdTRUxFQ1QgQzIgQVMgcmF0ZUFuYWx5c2lzSWQsIEMzIEFTIG5hbWUgRlJPTSA/IFdIRVJFIEMxID0gJyArIGNvc3RIZWFkSWQgKyAnIGFuZCBDNCA9ICcgKyBjYXRlZ29yeUlkO1xyXG4gICAgICAgIGlmIChjYXRlZ29yeUlkID09PSAwKSB7XHJcbiAgICAgICAgICBzcWwgPSAnU0VMRUNUIEMyIEFTIHJhdGVBbmFseXNpc0lkLCBDMyBBUyBuYW1lIEZST00gPyBXSEVSRSBDMSA9ICcgKyBjb3N0SGVhZElkO1xyXG4gICAgICAgIH1cclxuICAgICAgICB3b3JraXRlbSA9IHdvcmtpdGVtWydJdGVtcyddO1xyXG4gICAgICAgIGxldCB3b3JraXRlbUxpc3QgPSBhbGFzcWwoc3FsLCBbd29ya2l0ZW1dKTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB3b3JraXRlbUxpc3QpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbChlbnRpdHk6IHN0cmluZywgcmVnaW9uOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgZGF0YTogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnY29udmVydENvc3RIZWFkc0Zyb21SYXRlQW5hbHlzaXNUb0Nvc3RDb250cm9sIGhhcyBiZWVuIGhpdCcpO1xyXG5cclxuICAgIGxldCBjb3N0SGVhZFVSTCA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQVBJICsgZW50aXR5ICsgQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQ09TVEhFQURTKVxyXG4gICAgICArIHJlZ2lvbi5SZWdpb25JZCArIGNvbmZpZy5nZXQoQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQVBJICsgQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQVBJX0VORFBPSU5UKTtcclxuICAgIGxldCBjb3N0SGVhZFJhdGVBbmFseXNpc1Byb21pc2UgPSB0aGlzLmNyZWF0ZVByb21pc2UoY29zdEhlYWRVUkwpO1xyXG4gICAgbG9nZ2VyLmluZm8oJ2Nvc3RIZWFkUmF0ZUFuYWx5c2lzUHJvbWlzZSBmb3IgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgbGV0IGNhdGVnb3J5VVJMID0gY29uZmlnLmdldChDb25zdGFudHMuUkFURV9BTkFMWVNJU19BUEkgKyBlbnRpdHkgKyBDb25zdGFudHMuUkFURV9BTkFMWVNJU19DQVRFR09SSUVTKVxyXG4gICAgICArIHJlZ2lvbi5SZWdpb25JZCArIGNvbmZpZy5nZXQoQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQVBJICsgQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQVBJX0VORFBPSU5UKTtcclxuICAgIGxldCBjYXRlZ29yeVJhdGVBbmFseXNpc1Byb21pc2UgPSB0aGlzLmNyZWF0ZVByb21pc2UoY2F0ZWdvcnlVUkwpO1xyXG4gICAgbG9nZ2VyLmluZm8oJ2NhdGVnb3J5UmF0ZUFuYWx5c2lzUHJvbWlzZSBmb3IgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgbGV0IHdvcmtJdGVtVVJMID0gY29uZmlnLmdldChDb25zdGFudHMuUkFURV9BTkFMWVNJU19BUEkgKyBlbnRpdHkgKyBDb25zdGFudHMuUkFURV9BTkFMWVNJU19XT1JLSVRFTVMpXHJcbiAgICAgICsgcmVnaW9uLlJlZ2lvbklkICsgY29uZmlnLmdldChDb25zdGFudHMuUkFURV9BTkFMWVNJU19BUEkgKyBDb25zdGFudHMuUkFURV9BTkFMWVNJU19BUElfRU5EUE9JTlQpO1xyXG4gICAgbGV0IHdvcmtJdGVtUmF0ZUFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY3JlYXRlUHJvbWlzZSh3b3JrSXRlbVVSTCk7XHJcbiAgICBsb2dnZXIuaW5mbygnd29ya0l0ZW1SYXRlQW5hbHlzaXNQcm9taXNlIGZvciBoYXMgYmVlbiBoaXQnKTtcclxuXHJcbiAgICBsZXQgcmF0ZUl0ZW1VUkwgPSBjb25maWcuZ2V0KENvbnN0YW50cy5SQVRFX0FOQUxZU0lTX0FQSSArIGVudGl0eSArIENvbnN0YW50cy5SQVRFX0FOQUxZU0lTX1JBVEUpXHJcbiAgICAgICsgcmVnaW9uLlJlZ2lvbklkICsgY29uZmlnLmdldChDb25zdGFudHMuUkFURV9BTkFMWVNJU19BUEkgKyBDb25zdGFudHMuUkFURV9BTkFMWVNJU19BUElfRU5EUE9JTlQpO1xyXG4gICAgbGV0IHJhdGVJdGVtUmF0ZUFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY3JlYXRlUHJvbWlzZShyYXRlSXRlbVVSTCk7XHJcbiAgICBsb2dnZXIuaW5mbygncmF0ZUl0ZW1SYXRlQW5hbHlzaXNQcm9taXNlIGZvciBoYXMgYmVlbiBoaXQnKTtcclxuXHJcbiAgICBsZXQgcmF0ZUFuYWx5c2lzTm90ZXNVUkwgPSBjb25maWcuZ2V0KENvbnN0YW50cy5SQVRFX0FOQUxZU0lTX0FQSSArIGVudGl0eSArIENvbnN0YW50cy5SQVRFX0FOQUxZU0lTX05PVEVTKVxyXG4gICAgICArIHJlZ2lvbi5SZWdpb25JZCArIGNvbmZpZy5nZXQoQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQVBJICsgQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQVBJX0VORFBPSU5UKTtcclxuICAgIGxldCBub3Rlc1JhdGVBbmFseXNpc1Byb21pc2UgPSB0aGlzLmNyZWF0ZVByb21pc2UocmF0ZUFuYWx5c2lzTm90ZXNVUkwpO1xyXG4gICAgbG9nZ2VyLmluZm8oJ25vdGVzUmF0ZUFuYWx5c2lzUHJvbWlzZSBmb3IgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgbGV0IGFsbFVuaXRzRnJvbVJhdGVBbmFseXNpc1VSTCA9IGNvbmZpZy5nZXQoQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfQVBJICsgZW50aXR5ICsgQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfVU5JVClcclxuICAgICAgKyByZWdpb24uUmVnaW9uSWQgKyBjb25maWcuZ2V0KENvbnN0YW50cy5SQVRFX0FOQUxZU0lTX0FQSSArIENvbnN0YW50cy5SQVRFX0FOQUxZU0lTX0FQSV9FTkRQT0lOVCk7XHJcbiAgICBsZXQgdW5pdHNSYXRlQW5hbHlzaXNQcm9taXNlID0gdGhpcy5jcmVhdGVQcm9taXNlKGFsbFVuaXRzRnJvbVJhdGVBbmFseXNpc1VSTCk7XHJcbiAgICBsb2dnZXIuaW5mbygndW5pdHNSYXRlQW5hbHlzaXNQcm9taXNlIGZvciBoYXMgYmVlbiBoaXQnKTtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnY2FsbGluZyBQcm9taXNlLmFsbCcpO1xyXG4gICAgQ0NQcm9taXNlLmFsbChbXHJcbiAgICAgIGNvc3RIZWFkUmF0ZUFuYWx5c2lzUHJvbWlzZSxcclxuICAgICAgY2F0ZWdvcnlSYXRlQW5hbHlzaXNQcm9taXNlLFxyXG4gICAgICB3b3JrSXRlbVJhdGVBbmFseXNpc1Byb21pc2UsXHJcbiAgICAgIHJhdGVJdGVtUmF0ZUFuYWx5c2lzUHJvbWlzZSxcclxuICAgICAgbm90ZXNSYXRlQW5hbHlzaXNQcm9taXNlLFxyXG4gICAgICB1bml0c1JhdGVBbmFseXNpc1Byb21pc2VcclxuICAgIF0pLnRoZW4oZnVuY3Rpb24gKGRhdGE6IEFycmF5PGFueT4pIHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ2NvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbCBQcm9taXNlLmFsbCBBUEkgaXMgc3VjY2Vzcy4nKTtcclxuICAgICAgbGV0IGNvc3RIZWFkc1JhdGVBbmFseXNpcyA9IGRhdGFbMF1bQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfSVRFTV9UWVBFXTtcclxuICAgICAgbGV0IGNhdGVnb3JpZXNSYXRlQW5hbHlzaXMgPSBkYXRhWzFdW0NvbnN0YW50cy5SQVRFX0FOQUxZU0lTX1NVQklURU1fVFlQRV07XHJcbiAgICAgIGxldCB3b3JrSXRlbXNSYXRlQW5hbHlzaXMgPSBkYXRhWzJdW0NvbnN0YW50cy5SQVRFX0FOQUxZU0lTX0lURU1TXTtcclxuICAgICAgbGV0IHJhdGVJdGVtc1JhdGVBbmFseXNpcyA9IGRhdGFbM11bQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfREFUQV07XHJcbiAgICAgIGxldCBub3Rlc1JhdGVBbmFseXNpcyA9IGRhdGFbNF1bQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfREFUQV07XHJcbiAgICAgIGxldCB1bml0c1JhdGVBbmFseXNpcyA9IGRhdGFbNV1bQ29uc3RhbnRzLlJBVEVfQU5BTFlTSVNfVU9NXTtcclxuXHJcbiAgICAgIGxldCBidWlsZGluZ0Nvc3RIZWFkczogQXJyYXk8Q29zdEhlYWQ+ID0gW107XHJcbiAgICAgIGxldCByYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuXHJcbiAgICAgIHJhdGVBbmFseXNpc1NlcnZpY2UuZ2V0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpcyhjb3N0SGVhZHNSYXRlQW5hbHlzaXMsIGNhdGVnb3JpZXNSYXRlQW5hbHlzaXMsIHdvcmtJdGVtc1JhdGVBbmFseXNpcyxcclxuICAgICAgICByYXRlSXRlbXNSYXRlQW5hbHlzaXMsIHVuaXRzUmF0ZUFuYWx5c2lzLCBub3Rlc1JhdGVBbmFseXNpcywgYnVpbGRpbmdDb3N0SGVhZHMpO1xyXG4gICAgICBsb2dnZXIuaW5mbygnc3VjY2VzcyBpbiAgY29udmVydENvc3RIZWFkc0Zyb21SYXRlQW5hbHlzaXNUb0Nvc3RDb250cm9sLicpO1xyXG4gICAgICBjYWxsYmFjayhudWxsLCB7XHJcbiAgICAgICAgJ2J1aWxkaW5nQ29zdEhlYWRzJzogYnVpbGRpbmdDb3N0SGVhZHMsXHJcbiAgICAgICAgJ3JhdGVzJzogcmF0ZUl0ZW1zUmF0ZUFuYWx5c2lzLFxyXG4gICAgICAgICd1bml0cyc6IHVuaXRzUmF0ZUFuYWx5c2lzXHJcbiAgICAgIH0pO1xyXG4gICAgfSkuY2F0Y2goZnVuY3Rpb24gKGU6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJyBQcm9taXNlIGZhaWxlZCBmb3IgY29udmVydENvc3RIZWFkc0Zyb21SYXRlQW5hbHlzaXNUb0Nvc3RDb250cm9sICEgOicgKyBKU09OLnN0cmluZ2lmeShlLm1lc3NhZ2UpKTtcclxuICAgICAgQ0NQcm9taXNlLnJlamVjdChlLm1lc3NhZ2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVQcm9taXNlKHVybDogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gbmV3IENDUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZTogYW55LCByZWplY3Q6IGFueSkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnY3JlYXRlUHJvbWlzZSBoYXMgYmVlbiBoaXQgZm9yIDogJyArIHVybCk7XHJcbiAgICAgIGxldCByYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICAgICAgcmF0ZUFuYWx5c2lzU2VydmljZS5nZXRBcGlDYWxsKHVybCwgKGVycm9yOiBhbnksIGRhdGE6IGFueSkgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yIGluIGNyZWF0ZVByb21pc2UgZ2V0IGRhdGEgZnJvbSByYXRlIGFuYWx5c2lzOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcclxuICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdjcmVhdGVQcm9taXNlIGRhdGEgZnJvbSByYXRlIGFuYWx5c2lzIHN1Y2Nlc3MuJyk7XHJcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KS5jYXRjaChmdW5jdGlvbiAoZTogYW55KSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignUHJvbWlzZSBmYWlsZWQgZm9yIGluZGl2aWR1YWwgISB1cmw6JyArIHVybCArICc6XFxuIGVycm9yIDonICsgSlNPTi5zdHJpbmdpZnkoZS5tZXNzYWdlKSk7XHJcbiAgICAgIENDUHJvbWlzZS5yZWplY3QoZS5tZXNzYWdlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpcyhjb3N0SGVhZHNSYXRlQW5hbHlzaXM6IGFueSwgY2F0ZWdvcmllc1JhdGVBbmFseXNpczogYW55LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya0l0ZW1zUmF0ZUFuYWx5c2lzOiBhbnksIHJhdGVJdGVtc1JhdGVBbmFseXNpczogYW55LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5pdHNSYXRlQW5hbHlzaXM6IGFueSwgbm90ZXNSYXRlQW5hbHlzaXM6IGFueSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkaW5nQ29zdEhlYWRzOiBBcnJheTxDb3N0SGVhZD4pIHtcclxuICAgIGxvZ2dlci5pbmZvKCdnZXRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzIGhhcyBiZWVuIGhpdC4nKTtcclxuICAgIC8vbGV0IGJ1ZGdldENvc3RIZWFkcyA9IGNvbmZpZy5nZXQoJ2J1ZGdldGVkQ29zdEZvcm11bGFlJyk7XHJcbiAgICBmb3IgKGxldCBjb3N0SGVhZEluZGV4ID0gMDsgY29zdEhlYWRJbmRleCA8IGNvc3RIZWFkc1JhdGVBbmFseXNpcy5sZW5ndGg7IGNvc3RIZWFkSW5kZXgrKykge1xyXG5cclxuICAgICAgaWYgKGNvbmZpZy5oYXMoJ2J1ZGdldGVkQ29zdEZvcm11bGFlLicgKyBjb3N0SGVhZHNSYXRlQW5hbHlzaXNbY29zdEhlYWRJbmRleF0uQzIpKSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkID0gbmV3IENvc3RIZWFkKCk7XHJcbiAgICAgICAgY29zdEhlYWQubmFtZSA9IGNvc3RIZWFkc1JhdGVBbmFseXNpc1tjb3N0SGVhZEluZGV4XS5DMjtcclxuICAgICAgICBsZXQgY29uZmlnQ29zdEhlYWRzID0gY29uZmlnLmdldCgnY29uZmlnQ29zdEhlYWRzJyk7XHJcbiAgICAgICAgbGV0IGNhdGVnb3JpZXMgPSBuZXcgQXJyYXk8Q2F0ZWdvcnk+KCk7XHJcblxyXG4gICAgICAgIGlmIChjb25maWdDb3N0SGVhZHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgbGV0IGlzQ29zdEhlYWRFeGlzdFNRTCA9ICdTRUxFQ1QgKiBGUk9NID8gQVMgd29ya2l0ZW1zIFdIRVJFIFRSSU0od29ya2l0ZW1zLm5hbWUpPSA/JztcclxuICAgICAgICAgIGxldCBjb3N0SGVhZEV4aXN0QXJyYXkgPSBhbGFzcWwoaXNDb3N0SGVhZEV4aXN0U1FMLCBbY29uZmlnQ29zdEhlYWRzLCBjb3N0SGVhZC5uYW1lXSk7XHJcbiAgICAgICAgICBpZiAoY29zdEhlYWRFeGlzdEFycmF5Lmxlbmd0aCAhPT0gMCkge1xyXG4gICAgICAgICAgICBjb3N0SGVhZC5wcmlvcml0eUlkID0gY29zdEhlYWRFeGlzdEFycmF5WzBdLnByaW9yaXR5SWQ7XHJcbiAgICAgICAgICAgIGNhdGVnb3JpZXMgPSBjb3N0SGVhZEV4aXN0QXJyYXlbMF0uY2F0ZWdvcmllcztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQgPSBjb3N0SGVhZHNSYXRlQW5hbHlzaXNbY29zdEhlYWRJbmRleF0uQzE7XHJcblxyXG4gICAgICAgIGxldCBjYXRlZ29yaWVzUmF0ZUFuYWx5c2lzU1FMID0gJ1NFTEVDVCBDYXRlZ29yeS5DMSBBUyByYXRlQW5hbHlzaXNJZCwgQ2F0ZWdvcnkuQzIgQVMgbmFtZScgK1xyXG4gICAgICAgICAgJyBGUk9NID8gQVMgQ2F0ZWdvcnkgd2hlcmUgQ2F0ZWdvcnkuQzMgPSAnICsgY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQ7XHJcblxyXG4gICAgICAgIGxldCBjYXRlZ29yaWVzQnlDb3N0SGVhZCA9IGFsYXNxbChjYXRlZ29yaWVzUmF0ZUFuYWx5c2lzU1FMLCBbY2F0ZWdvcmllc1JhdGVBbmFseXNpc10pO1xyXG4gICAgICAgIGxldCBidWlsZGluZ0NhdGVnb3JpZXM6IEFycmF5PENhdGVnb3J5PiA9IG5ldyBBcnJheTxDYXRlZ29yeT4oKTtcclxuXHJcbiAgICAgICAgaWYgKGNhdGVnb3JpZXNCeUNvc3RIZWFkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgdGhpcy5nZXRXb3JrSXRlbXNXaXRob3V0Q2F0ZWdvcnlGcm9tUmF0ZUFuYWx5c2lzKGNvc3RIZWFkLnJhdGVBbmFseXNpc0lkLCB3b3JrSXRlbXNSYXRlQW5hbHlzaXMsXHJcbiAgICAgICAgICAgIHJhdGVJdGVtc1JhdGVBbmFseXNpcywgdW5pdHNSYXRlQW5hbHlzaXMsIG5vdGVzUmF0ZUFuYWx5c2lzLCBidWlsZGluZ0NhdGVnb3JpZXMsIGNhdGVnb3JpZXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLmdldENhdGVnb3JpZXNGcm9tUmF0ZUFuYWx5c2lzKGNhdGVnb3JpZXNCeUNvc3RIZWFkLCB3b3JrSXRlbXNSYXRlQW5hbHlzaXMsXHJcbiAgICAgICAgICAgIHJhdGVJdGVtc1JhdGVBbmFseXNpcywgdW5pdHNSYXRlQW5hbHlzaXMsIG5vdGVzUmF0ZUFuYWx5c2lzLCBidWlsZGluZ0NhdGVnb3JpZXMsIGNhdGVnb3JpZXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29zdEhlYWQuY2F0ZWdvcmllcyA9IGJ1aWxkaW5nQ2F0ZWdvcmllcztcclxuICAgICAgICBjb3N0SGVhZC50aHVtYlJ1bGVSYXRlID0gY29uZmlnLmdldChDb25zdGFudHMuVEhVTUJSVUxFX1JBVEUpO1xyXG4gICAgICAgIGJ1aWxkaW5nQ29zdEhlYWRzLnB1c2goY29zdEhlYWQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdDb3N0SGVhZCBVbmF2YWlhbGFiZWwgOiAnICsgY29zdEhlYWRzUmF0ZUFuYWx5c2lzW2Nvc3RIZWFkSW5kZXhdLkMyKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0Q2F0ZWdvcmllc0Zyb21SYXRlQW5hbHlzaXMoY2F0ZWdvcmllc0J5Q29zdEhlYWQ6IGFueSwgd29ya0l0ZW1zUmF0ZUFuYWx5c2lzOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmF0ZUl0ZW1zUmF0ZUFuYWx5c2lzOiBhbnksIHVuaXRzUmF0ZUFuYWx5c2lzOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm90ZXNSYXRlQW5hbHlzaXM6IGFueSwgYnVpbGRpbmdDYXRlZ29yaWVzOiBBcnJheTxDYXRlZ29yeT4sIGNvbmZpZ0NhdGVnb3JpZXM6IEFycmF5PENhdGVnb3J5Pikge1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdnZXRDYXRlZ29yaWVzRnJvbVJhdGVBbmFseXNpcyBoYXMgYmVlbiBoaXQuJyk7XHJcblxyXG4gICAgZm9yIChsZXQgY2F0ZWdvcnlJbmRleCA9IDA7IGNhdGVnb3J5SW5kZXggPCBjYXRlZ29yaWVzQnlDb3N0SGVhZC5sZW5ndGg7IGNhdGVnb3J5SW5kZXgrKykge1xyXG5cclxuICAgICAgbGV0IGNhdGVnb3J5ID0gbmV3IENhdGVnb3J5KGNhdGVnb3JpZXNCeUNvc3RIZWFkW2NhdGVnb3J5SW5kZXhdLm5hbWUsIGNhdGVnb3JpZXNCeUNvc3RIZWFkW2NhdGVnb3J5SW5kZXhdLnJhdGVBbmFseXNpc0lkKTtcclxuICAgICAgbGV0IGNvbmZpZ1dvcmtJdGVtcyA9IG5ldyBBcnJheTxXb3JrSXRlbT4oKTtcclxuXHJcbiAgICAgIGlmIChjb25maWdDYXRlZ29yaWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBmb3IgKGxldCBjb25maWdDYXRlZ29yeSBvZiBjb25maWdDYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgICBpZiAoY29uZmlnQ2F0ZWdvcnkubmFtZSA9PT0gY2F0ZWdvcmllc0J5Q29zdEhlYWRbY2F0ZWdvcnlJbmRleF0ubmFtZSkge1xyXG4gICAgICAgICAgICBjb25maWdXb3JrSXRlbXMgPSBjb25maWdDYXRlZ29yeS53b3JrSXRlbXM7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBsZXQgd29ya0l0ZW1zUmF0ZUFuYWx5c2lzU1FMID0gJ1NFTEVDVCB3b3JrSXRlbS5DMiBBUyByYXRlQW5hbHlzaXNJZCwgVFJJTSh3b3JrSXRlbS5DMykgQVMgbmFtZScgK1xyXG4gICAgICAgICcgRlJPTSA/IEFTIHdvcmtJdGVtIHdoZXJlIHdvcmtJdGVtLkM0ID0gJyArIGNhdGVnb3JpZXNCeUNvc3RIZWFkW2NhdGVnb3J5SW5kZXhdLnJhdGVBbmFseXNpc0lkO1xyXG5cclxuICAgICAgbGV0IHdvcmtJdGVtc0J5Q2F0ZWdvcnkgPSBhbGFzcWwod29ya0l0ZW1zUmF0ZUFuYWx5c2lzU1FMLCBbd29ya0l0ZW1zUmF0ZUFuYWx5c2lzXSk7XHJcbiAgICAgIGxldCBidWlsZGluZ1dvcmtJdGVtczogQXJyYXk8V29ya0l0ZW0+ID0gbmV3IEFycmF5PFdvcmtJdGVtPigpO1xyXG5cclxuICAgICAgdGhpcy5nZXRXb3JrSXRlbXNGcm9tUmF0ZUFuYWx5c2lzKHdvcmtJdGVtc0J5Q2F0ZWdvcnksIHJhdGVJdGVtc1JhdGVBbmFseXNpcyxcclxuICAgICAgICB1bml0c1JhdGVBbmFseXNpcywgbm90ZXNSYXRlQW5hbHlzaXMsIGJ1aWxkaW5nV29ya0l0ZW1zLCBjb25maWdXb3JrSXRlbXMpO1xyXG5cclxuICAgICAgY2F0ZWdvcnkud29ya0l0ZW1zID0gYnVpbGRpbmdXb3JrSXRlbXM7XHJcbiAgICAgIGlmIChjYXRlZ29yeS53b3JrSXRlbXMubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgYnVpbGRpbmdDYXRlZ29yaWVzLnB1c2goY2F0ZWdvcnkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNvbmZpZ0NhdGVnb3JpZXMubGVuZ3RoID4gMCkge1xyXG5cclxuICAgICAgZm9yIChsZXQgY29uZmlnQ2F0ZWdvcnlJbmRleCA9IDA7IGNvbmZpZ0NhdGVnb3J5SW5kZXggPCBjb25maWdDYXRlZ29yaWVzLmxlbmd0aDsgY29uZmlnQ2F0ZWdvcnlJbmRleCsrKSB7XHJcbiAgICAgICAgbGV0IGlzQ2F0ZWdvcnlFeGlzdHNTUUwgPSAnU0VMRUNUICogRlJPTSA/IEFTIHdvcmtpdGVtcyBXSEVSRSBUUklNKHdvcmtpdGVtcy5uYW1lKT0gPyc7XHJcbiAgICAgICAgbGV0IGNhdGVnb3J5RXhpc3RzQXJyYXkgPSBhbGFzcWwoaXNDYXRlZ29yeUV4aXN0c1NRTCwgW2NhdGVnb3JpZXNCeUNvc3RIZWFkLCBjb25maWdDYXRlZ29yaWVzW2NvbmZpZ0NhdGVnb3J5SW5kZXhdLm5hbWVdKTtcclxuICAgICAgICBpZiAoY2F0ZWdvcnlFeGlzdHNBcnJheS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIGxldCBjb25maWdDYXQgPSBuZXcgQ2F0ZWdvcnkoY29uZmlnQ2F0ZWdvcmllc1tjb25maWdDYXRlZ29yeUluZGV4XS5uYW1lLCBjb25maWdDYXRlZ29yaWVzW2NvbmZpZ0NhdGVnb3J5SW5kZXhdLnJhdGVBbmFseXNpc0lkKTtcclxuICAgICAgICAgIGNvbmZpZ0NhdC53b3JrSXRlbXMgPSB0aGlzLmdldFdvcmtpdGVtc0ZvckNvbmZpZ0NhdGVnb3J5KGNvbmZpZ0NhdGVnb3JpZXNbY29uZmlnQ2F0ZWdvcnlJbmRleF0ud29ya0l0ZW1zKTtcclxuICAgICAgICAgIGlmIChjb25maWdDYXQud29ya0l0ZW1zLmxlbmd0aCAhPT0gMCkge1xyXG4gICAgICAgICAgICBidWlsZGluZ0NhdGVnb3JpZXMucHVzaChjb25maWdDYXQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0V29ya2l0ZW1zRm9yQ29uZmlnQ2F0ZWdvcnkoY29uZmlnV29ya2l0ZW1zOiBhbnkpIHtcclxuICAgIGxldCB3b3JrSXRlbXNMaXN0ID0gbmV3IEFycmF5PFdvcmtJdGVtPigpO1xyXG4gICAgZm9yIChsZXQgd29ya2l0ZW1JbmRleCA9IDA7IHdvcmtpdGVtSW5kZXggPCBjb25maWdXb3JraXRlbXMubGVuZ3RoOyB3b3JraXRlbUluZGV4KyspIHtcclxuICAgICAgbGV0IGNvbmZpZ1dvcmtpdGVtID0gdGhpcy5jb252ZXJ0Q29uZmlnb3JraXRlbShjb25maWdXb3JraXRlbXNbd29ya2l0ZW1JbmRleF0pO1xyXG4gICAgICB3b3JrSXRlbXNMaXN0LnB1c2goY29uZmlnV29ya2l0ZW0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHdvcmtJdGVtc0xpc3Q7XHJcbiAgfVxyXG5cclxuICBnZXRXb3JrSXRlbXNXaXRob3V0Q2F0ZWdvcnlGcm9tUmF0ZUFuYWx5c2lzKGNvc3RIZWFkUmF0ZUFuYWx5c2lzSWQ6IG51bWJlciwgd29ya0l0ZW1zUmF0ZUFuYWx5c2lzOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYXRlSXRlbXNSYXRlQW5hbHlzaXM6IGFueSwgdW5pdHNSYXRlQW5hbHlzaXM6IGFueSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdGVzUmF0ZUFuYWx5c2lzOiBhbnksIGJ1aWxkaW5nQ2F0ZWdvcmllczogQXJyYXk8Q2F0ZWdvcnk+LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnQ2F0ZWdvcmllczogQXJyYXk8Q2F0ZWdvcnk+KSB7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ2dldFdvcmtJdGVtc1dpdGhvdXRDYXRlZ29yeUZyb21SYXRlQW5hbHlzaXMgaGFzIGJlZW4gaGl0LicpO1xyXG5cclxuICAgIGxldCB3b3JrSXRlbXNXaXRob3V0Q2F0ZWdvcmllc1JhdGVBbmFseXNpc1NRTCA9ICdTRUxFQ1Qgd29ya0l0ZW0uQzIgQVMgcmF0ZUFuYWx5c2lzSWQsIHdvcmtJdGVtLkMzIEFTIG5hbWUnICtcclxuICAgICAgJyBGUk9NID8gQVMgd29ya0l0ZW0gd2hlcmUgTk9UIHdvcmtJdGVtLkM0IEFORCB3b3JrSXRlbS5DMSA9ICcgKyBjb3N0SGVhZFJhdGVBbmFseXNpc0lkO1xyXG4gICAgbGV0IHdvcmtJdGVtc1dpdGhvdXRDYXRlZ29yaWVzID0gYWxhc3FsKHdvcmtJdGVtc1dpdGhvdXRDYXRlZ29yaWVzUmF0ZUFuYWx5c2lzU1FMLCBbd29ya0l0ZW1zUmF0ZUFuYWx5c2lzXSk7XHJcblxyXG4gICAgbGV0IGJ1aWxkaW5nV29ya0l0ZW1zOiBBcnJheTxXb3JrSXRlbT4gPSBuZXcgQXJyYXk8V29ya0l0ZW0+KCk7XHJcbiAgICBsZXQgY2F0ZWdvcnkgPSBuZXcgQ2F0ZWdvcnkoJ1dvcmsgSXRlbXMnLCAwKTtcclxuICAgIGxldCBjb25maWdXb3JrSXRlbXMgPSBuZXcgQXJyYXk8V29ya0l0ZW0+KCk7XHJcblxyXG4gICAgaWYgKGNvbmZpZ0NhdGVnb3JpZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBmb3IgKGxldCBjb25maWdDYXRlZ29yeSBvZiBjb25maWdDYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgaWYgKGNvbmZpZ0NhdGVnb3J5Lm5hbWUgPT09ICdXb3JrIEl0ZW1zJykge1xyXG4gICAgICAgICAgY29uZmlnV29ya0l0ZW1zID0gY29uZmlnQ2F0ZWdvcnkud29ya0l0ZW1zO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZ2V0V29ya0l0ZW1zRnJvbVJhdGVBbmFseXNpcyh3b3JrSXRlbXNXaXRob3V0Q2F0ZWdvcmllcywgcmF0ZUl0ZW1zUmF0ZUFuYWx5c2lzLFxyXG4gICAgICB1bml0c1JhdGVBbmFseXNpcywgbm90ZXNSYXRlQW5hbHlzaXMsIGJ1aWxkaW5nV29ya0l0ZW1zLCBjb25maWdXb3JrSXRlbXMpO1xyXG5cclxuICAgIGNhdGVnb3J5LndvcmtJdGVtcyA9IGJ1aWxkaW5nV29ya0l0ZW1zO1xyXG4gICAgYnVpbGRpbmdDYXRlZ29yaWVzLnB1c2goY2F0ZWdvcnkpO1xyXG4gIH1cclxuXHJcbiAgc3luY1JhdGVpdGVtRnJvbVJhdGVBbmFseXNpcyhlbnRpdHk6IHN0cmluZywgYnVpbGRpbmdEZXRhaWxzOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgZGF0YTogYW55KSA9PiB2b2lkKSB7XHJcblxyXG4gICAgbGV0IHJhdGVJdGVtVVJMID0gY29uZmlnLmdldChDb25zdGFudHMuUkFURV9BTkFMWVNJU19BUEkgKyBlbnRpdHkgKyBDb25zdGFudHMuUkFURV9BTkFMWVNJU19SQVRFKTtcclxuICAgIGxldCByYXRlSXRlbVJhdGVBbmFseXNpc1Byb21pc2UgPSB0aGlzLmNyZWF0ZVByb21pc2UocmF0ZUl0ZW1VUkwpO1xyXG4gICAgbG9nZ2VyLmluZm8oJ3JhdGVJdGVtUmF0ZUFuYWx5c2lzUHJvbWlzZSBmb3IgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgbGV0IHJhdGVBbmFseXNpc05vdGVzVVJMID0gY29uZmlnLmdldChDb25zdGFudHMuUkFURV9BTkFMWVNJU19BUEkgKyBlbnRpdHkgKyBDb25zdGFudHMuUkFURV9BTkFMWVNJU19OT1RFUyk7XHJcbiAgICBsZXQgbm90ZXNSYXRlQW5hbHlzaXNQcm9taXNlID0gdGhpcy5jcmVhdGVQcm9taXNlKHJhdGVBbmFseXNpc05vdGVzVVJMKTtcclxuICAgIGxvZ2dlci5pbmZvKCdub3Rlc1JhdGVBbmFseXNpc1Byb21pc2UgZm9yIGhhcyBiZWVuIGhpdCcpO1xyXG5cclxuICAgIGxldCBhbGxVbml0c0Zyb21SYXRlQW5hbHlzaXNVUkwgPSBjb25maWcuZ2V0KENvbnN0YW50cy5SQVRFX0FOQUxZU0lTX0FQSSArIGVudGl0eSArIENvbnN0YW50cy5SQVRFX0FOQUxZU0lTX1VOSVQpO1xyXG4gICAgbGV0IHVuaXRzUmF0ZUFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY3JlYXRlUHJvbWlzZShhbGxVbml0c0Zyb21SYXRlQW5hbHlzaXNVUkwpO1xyXG4gICAgbG9nZ2VyLmluZm8oJ3VuaXRzUmF0ZUFuYWx5c2lzUHJvbWlzZSBmb3IgaGFzIGJlZW4gaGl0Jyk7XHJcblxyXG4gICAgbGV0IGNvc3RIZWFkVVJMID0gY29uZmlnLmdldChDb25zdGFudHMuUkFURV9BTkFMWVNJU19BUEkgKyBlbnRpdHkgKyBDb25zdGFudHMuUkFURV9BTkFMWVNJU19DT1NUSEVBRFMpO1xyXG4gICAgbGV0IGNvc3RIZWFkUmF0ZUFuYWx5c2lzUHJvbWlzZSA9IHRoaXMuY3JlYXRlUHJvbWlzZShjb3N0SGVhZFVSTCk7XHJcbiAgICBsb2dnZXIuaW5mbygnY29zdEhlYWRSYXRlQW5hbHlzaXNQcm9taXNlIGZvciBoYXMgYmVlbiBoaXQnKTtcclxuXHJcbiAgICBDQ1Byb21pc2UuYWxsKFtcclxuICAgICAgcmF0ZUl0ZW1SYXRlQW5hbHlzaXNQcm9taXNlLFxyXG4gICAgICBub3Rlc1JhdGVBbmFseXNpc1Byb21pc2UsXHJcbiAgICAgIHVuaXRzUmF0ZUFuYWx5c2lzUHJvbWlzZSxcclxuICAgICAgY29zdEhlYWRSYXRlQW5hbHlzaXNQcm9taXNlXHJcbiAgICBdKS50aGVuKGZ1bmN0aW9uIChkYXRhOiBBcnJheTxhbnk+KSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdjb252ZXJ0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpc1RvQ29zdENvbnRyb2wgUHJvbWlzZS5hbGwgQVBJIGlzIHN1Y2Nlc3MuJyk7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdzdWNjZXNzIGluICBjb252ZXJ0Q29zdEhlYWRzRnJvbVJhdGVBbmFseXNpc1RvQ29zdENvbnRyb2wuJyk7XHJcbiAgICAgIGNhbGxiYWNrKG51bGwsIGRhdGEpO1xyXG4gICAgfSkuY2F0Y2goZnVuY3Rpb24gKGU6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJyBQcm9taXNlIGZhaWxlZCBmb3IgY29udmVydENvc3RIZWFkc0Zyb21SYXRlQW5hbHlzaXNUb0Nvc3RDb250cm9sICEgOicgKyBlLm1lc3NhZ2UpO1xyXG4gICAgICBDQ1Byb21pc2UucmVqZWN0KGUubWVzc2FnZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG5cclxuICBnZXRXb3JrSXRlbXNGcm9tUmF0ZUFuYWx5c2lzKHdvcmtJdGVtc0J5Q2F0ZWdvcnk6IGFueSwgcmF0ZUl0ZW1zUmF0ZUFuYWx5c2lzOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bml0c1JhdGVBbmFseXNpczogYW55LCBub3Rlc1JhdGVBbmFseXNpczogYW55LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVpbGRpbmdXb3JrSXRlbXM6IEFycmF5PFdvcmtJdGVtPiwgY29uZmlnV29ya0l0ZW1zOiBBcnJheTxhbnk+KSB7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ2dldFdvcmtJdGVtc0Zyb21SYXRlQW5hbHlzaXMgaGFzIGJlZW4gaGl0LicpO1xyXG4gICAgZm9yIChsZXQgY2F0ZWdvcnlXb3JraXRlbSBvZiB3b3JrSXRlbXNCeUNhdGVnb3J5KSB7XHJcbiAgICAgIGxldCB3b3JrSXRlbSA9IHRoaXMuZ2V0UmF0ZUFuYWx5c2lzKGNhdGVnb3J5V29ya2l0ZW0sIGNvbmZpZ1dvcmtJdGVtcywgcmF0ZUl0ZW1zUmF0ZUFuYWx5c2lzLFxyXG4gICAgICAgIHVuaXRzUmF0ZUFuYWx5c2lzLCBub3Rlc1JhdGVBbmFseXNpcyk7XHJcbiAgICAgIGlmICh3b3JrSXRlbSkge1xyXG4gICAgICAgIGJ1aWxkaW5nV29ya0l0ZW1zLnB1c2god29ya0l0ZW0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBmb3IgKGxldCBjb25maWdXb3JrSXRlbSBvZiBjb25maWdXb3JrSXRlbXMpIHtcclxuICAgICAgbGV0IGlzV29ya0l0ZW1FeGlzdFNRTCA9ICdTRUxFQ1QgKiBGUk9NID8gQVMgd29ya2l0ZW1zIFdIRVJFIFRSSU0od29ya2l0ZW1zLm5hbWUpPSA/JztcclxuICAgICAgbGV0IHdvcmtJdGVtRXhpc3RBcnJheSA9IGFsYXNxbChpc1dvcmtJdGVtRXhpc3RTUUwsIFt3b3JrSXRlbXNCeUNhdGVnb3J5LCBjb25maWdXb3JrSXRlbS5uYW1lXSk7XHJcbiAgICAgIGlmICh3b3JrSXRlbUV4aXN0QXJyYXkubGVuZ3RoID09PSAwICYmIGNvbmZpZ1dvcmtJdGVtLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgbGV0IHdvcmtpdGVtID0gdGhpcy5jb252ZXJ0Q29uZmlnb3JraXRlbShjb25maWdXb3JrSXRlbSk7XHJcbiAgICAgICAgYnVpbGRpbmdXb3JrSXRlbXMucHVzaCh3b3JraXRlbSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNvbnZlcnRDb25maWdvcmtpdGVtKGNvbmZpZ1dvcmtJdGVtOiBhbnkpIHtcclxuXHJcbiAgICBsZXQgd29ya0l0ZW0gPSBuZXcgV29ya0l0ZW0oY29uZmlnV29ya0l0ZW0ubmFtZSwgY29uZmlnV29ya0l0ZW0ucmF0ZUFuYWx5c2lzSWQpO1xyXG4gICAgd29ya0l0ZW0uaXNEaXJlY3RSYXRlID0gIWNvbmZpZ1dvcmtJdGVtLmlzUmF0ZUFuYWx5c2lzO1xyXG4gICAgd29ya0l0ZW0uaXNSYXRlQW5hbHlzaXMgPSBjb25maWdXb3JrSXRlbS5pc1JhdGVBbmFseXNpcztcclxuICAgIHdvcmtJdGVtLmlzTWVhc3VyZW1lbnRTaGVldCA9IGNvbmZpZ1dvcmtJdGVtLmlzTWVhc3VyZW1lbnRTaGVldDtcclxuICAgIHdvcmtJdGVtLmlzU3RlZWxXb3JrSXRlbSA9IGNvbmZpZ1dvcmtJdGVtLmlzU3RlZWxXb3JrSXRlbTtcclxuICAgIHdvcmtJdGVtLnJhdGVBbmFseXNpc1BlclVuaXQgPSBjb25maWdXb3JrSXRlbS5yYXRlQW5hbHlzaXNQZXJVbml0O1xyXG4gICAgd29ya0l0ZW0ucmF0ZUFuYWx5c2lzVW5pdCA9IGNvbmZpZ1dvcmtJdGVtLnJhdGVBbmFseXNpc1VuaXQ7XHJcbiAgICB3b3JrSXRlbS5pc0l0ZW1CcmVha2Rvd25SZXF1aXJlZCA9IGNvbmZpZ1dvcmtJdGVtLmlzSXRlbUJyZWFrZG93blJlcXVpcmVkO1xyXG4gICAgd29ya0l0ZW0ubGVuZ3RoID0gY29uZmlnV29ya0l0ZW0ubGVuZ3RoO1xyXG4gICAgd29ya0l0ZW0uYnJlYWR0aE9yV2lkdGggPSBjb25maWdXb3JrSXRlbS5icmVhZHRoT3JXaWR0aDtcclxuICAgIHdvcmtJdGVtLmhlaWdodCA9IGNvbmZpZ1dvcmtJdGVtLmhlaWdodDtcclxuICAgIHdvcmtJdGVtLnVuaXQgPSBjb25maWdXb3JrSXRlbS5tZWFzdXJlbWVudFVuaXQ7XHJcblxyXG4gICAgaWYgKCFjb25maWdXb3JrSXRlbS5pc1JhdGVBbmFseXNpcykge1xyXG4gICAgICB3b3JrSXRlbS5yYXRlLnRvdGFsID0gY29uZmlnV29ya0l0ZW0uZGlyZWN0UmF0ZTtcclxuICAgICAgd29ya0l0ZW0ucmF0ZS51bml0ID0gY29uZmlnV29ya0l0ZW0uZGlyZWN0UmF0ZVBlclVuaXQ7XHJcbiAgICAgIHdvcmtJdGVtLnJhdGUuaXNFc3RpbWF0ZWQgPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdXb3JrSXRlbSBlcnJvciBmb3IgcmF0ZUFuYWx5c2lzIDogJyArIGNvbmZpZ1dvcmtJdGVtLm5hbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB3b3JrSXRlbTtcclxuICB9XHJcblxyXG4gIGdldFJhdGVBbmFseXNpcyhjYXRlZ29yeVdvcmtpdGVtOiBXb3JrSXRlbSwgY29uZmlnV29ya0l0ZW1zOiBBcnJheTxhbnk+LCByYXRlSXRlbXNSYXRlQW5hbHlzaXM6IGFueSxcclxuICAgICAgICAgICAgICAgICAgdW5pdHNSYXRlQW5hbHlzaXM6IGFueSwgbm90ZXNSYXRlQW5hbHlzaXM6IGFueSkge1xyXG5cclxuICAgIGxldCBpc1dvcmtJdGVtRXhpc3RTUUwgPSAnU0VMRUNUICogRlJPTSA/IEFTIHdvcmtpdGVtcyBXSEVSRSBUUklNKHdvcmtpdGVtcy5uYW1lKT0gPyc7XHJcbiAgICBsZXQgd29ya0l0ZW1FeGlzdEFycmF5ID0gYWxhc3FsKGlzV29ya0l0ZW1FeGlzdFNRTCwgW2NvbmZpZ1dvcmtJdGVtcywgY2F0ZWdvcnlXb3JraXRlbS5uYW1lXSk7XHJcblxyXG4gICAgaWYgKHdvcmtJdGVtRXhpc3RBcnJheS5sZW5ndGggIT09IDApIHtcclxuXHJcbiAgICAgIGxldCB3b3JrSXRlbSA9IG5ldyBXb3JrSXRlbShjYXRlZ29yeVdvcmtpdGVtLm5hbWUsIGNhdGVnb3J5V29ya2l0ZW0ucmF0ZUFuYWx5c2lzSWQpO1xyXG5cclxuICAgICAgaWYgKGNhdGVnb3J5V29ya2l0ZW0uYWN0aXZlICE9PSB1bmRlZmluZWQgJiYgY2F0ZWdvcnlXb3JraXRlbS5hY3RpdmUgIT09IG51bGwpIHtcclxuICAgICAgICB3b3JrSXRlbSA9IGNhdGVnb3J5V29ya2l0ZW07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHdvcmtJdGVtLnVuaXQgPSB3b3JrSXRlbUV4aXN0QXJyYXlbMF0ubWVhc3VyZW1lbnRVbml0O1xyXG4gICAgICB3b3JrSXRlbS5pc01lYXN1cmVtZW50U2hlZXQgPSB3b3JrSXRlbUV4aXN0QXJyYXlbMF0uaXNNZWFzdXJlbWVudFNoZWV0O1xyXG4gICAgICB3b3JrSXRlbS5pc1JhdGVBbmFseXNpcyA9IHdvcmtJdGVtRXhpc3RBcnJheVswXS5pc1JhdGVBbmFseXNpcztcclxuICAgICAgd29ya0l0ZW0uaXNTdGVlbFdvcmtJdGVtID0gd29ya0l0ZW1FeGlzdEFycmF5WzBdLmlzU3RlZWxXb3JrSXRlbTtcclxuICAgICAgd29ya0l0ZW0ucmF0ZUFuYWx5c2lzUGVyVW5pdCA9IHdvcmtJdGVtRXhpc3RBcnJheVswXS5yYXRlQW5hbHlzaXNQZXJVbml0O1xyXG4gICAgICB3b3JrSXRlbS5pc0l0ZW1CcmVha2Rvd25SZXF1aXJlZCA9IHdvcmtJdGVtRXhpc3RBcnJheVswXS5pc0l0ZW1CcmVha2Rvd25SZXF1aXJlZDtcclxuICAgICAgd29ya0l0ZW0ubGVuZ3RoID0gd29ya0l0ZW1FeGlzdEFycmF5WzBdLmxlbmd0aDtcclxuICAgICAgd29ya0l0ZW0uYnJlYWR0aE9yV2lkdGggPSB3b3JrSXRlbUV4aXN0QXJyYXlbMF0uYnJlYWR0aE9yV2lkdGg7XHJcbiAgICAgIHdvcmtJdGVtLmhlaWdodCA9IHdvcmtJdGVtRXhpc3RBcnJheVswXS5oZWlnaHQ7XHJcblxyXG4gICAgICBsZXQgcmF0ZUl0ZW1zUmF0ZUFuYWx5c2lzU1FMID0gJ1NFTEVDVCByYXRlSXRlbS5DMiBBUyBpdGVtTmFtZSwgcmF0ZUl0ZW0uQzIgQVMgb3JpZ2luYWxJdGVtTmFtZSwnICtcclxuICAgICAgICAncmF0ZUl0ZW0uQzEyIEFTIHJhdGVBbmFseXNpc0lkLCByYXRlSXRlbS5DNiBBUyB0eXBlLCcgK1xyXG4gICAgICAgICdST1VORChyYXRlSXRlbS5DNywyKSBBUyBxdWFudGl0eSwgUk9VTkQocmF0ZUl0ZW0uQzMsMikgQVMgcmF0ZSwgdW5pdC5DMiBBUyB1bml0LCcgK1xyXG4gICAgICAgICdST1VORChyYXRlSXRlbS5DMyAqIHJhdGVJdGVtLkM3LDIpIEFTIHRvdGFsQW1vdW50LCByYXRlSXRlbS5DNSBBUyB0b3RhbFF1YW50aXR5LCByYXRlSXRlbS5DMTMgQVMgbm90ZXNSYXRlQW5hbHlzaXNJZCAgJyArXHJcbiAgICAgICAgJ0ZST00gPyBBUyByYXRlSXRlbSBKT0lOID8gQVMgdW5pdCBPTiB1bml0LkMxID0gcmF0ZUl0ZW0uQzkgd2hlcmUgcmF0ZUl0ZW0uQzEgPSAnXHJcbiAgICAgICAgKyBjYXRlZ29yeVdvcmtpdGVtLnJhdGVBbmFseXNpc0lkO1xyXG4gICAgICBsZXQgcmF0ZUl0ZW1zQnlXb3JrSXRlbSA9IGFsYXNxbChyYXRlSXRlbXNSYXRlQW5hbHlzaXNTUUwsIFtyYXRlSXRlbXNSYXRlQW5hbHlzaXMsIHVuaXRzUmF0ZUFuYWx5c2lzXSk7XHJcbiAgICAgIGxldCBub3RlcyA9ICcnO1xyXG4gICAgICBsZXQgaW1hZ2VVUkwgPSAnJztcclxuICAgICAgd29ya0l0ZW0ucmF0ZS5yYXRlSXRlbXMgPSByYXRlSXRlbXNCeVdvcmtJdGVtO1xyXG4gICAgICB3b3JrSXRlbS5yYXRlLnVuaXQgPSB3b3JrSXRlbUV4aXN0QXJyYXlbMF0ucmF0ZUFuYWx5c2lzVW5pdDtcclxuXHJcbiAgICAgIGlmIChyYXRlSXRlbXNCeVdvcmtJdGVtICYmIHJhdGVJdGVtc0J5V29ya0l0ZW0ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGxldCBub3Rlc1JhdGVBbmFseXNpc1NRTCA9ICdTRUxFQ1Qgbm90ZXMuQzIgQVMgbm90ZXMsIG5vdGVzLkMzIEFTIGltYWdlVVJMIEZST00gPyBBUyBub3RlcyB3aGVyZSBub3Rlcy5DMSA9ICcgK1xyXG4gICAgICAgICAgcmF0ZUl0ZW1zQnlXb3JrSXRlbVswXS5ub3Rlc1JhdGVBbmFseXNpc0lkO1xyXG4gICAgICAgIGxldCBub3Rlc0xpc3QgPSBhbGFzcWwobm90ZXNSYXRlQW5hbHlzaXNTUUwsIFtub3Rlc1JhdGVBbmFseXNpc10pO1xyXG4gICAgICAgIG5vdGVzID0gbm90ZXNMaXN0WzBdLm5vdGVzO1xyXG4gICAgICAgIGltYWdlVVJMID0gbm90ZXNMaXN0WzBdLmltYWdlVVJMO1xyXG5cclxuICAgICAgICB3b3JrSXRlbS5yYXRlLnF1YW50aXR5ID0gcmF0ZUl0ZW1zQnlXb3JrSXRlbVswXS50b3RhbFF1YW50aXR5O1xyXG4gICAgICAgIHdvcmtJdGVtLnN5c3RlbVJhdGUucXVhbnRpdHkgPSByYXRlSXRlbXNCeVdvcmtJdGVtWzBdLnRvdGFsUXVhbnRpdHk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgd29ya0l0ZW0ucmF0ZS5xdWFudGl0eSA9IDE7XHJcbiAgICAgICAgd29ya0l0ZW0uc3lzdGVtUmF0ZS5xdWFudGl0eSA9IDE7XHJcbiAgICAgIH1cclxuICAgICAgd29ya0l0ZW0ucmF0ZS5pc0VzdGltYXRlZCA9IHRydWU7XHJcbiAgICAgIHdvcmtJdGVtLnJhdGUubm90ZXMgPSBub3RlcztcclxuICAgICAgd29ya0l0ZW0ucmF0ZS5pbWFnZVVSTCA9IGltYWdlVVJMO1xyXG5cclxuICAgICAgLy9TeXN0ZW0gcmF0ZVxyXG5cclxuICAgICAgd29ya0l0ZW0uc3lzdGVtUmF0ZS5yYXRlSXRlbXMgPSByYXRlSXRlbXNCeVdvcmtJdGVtO1xyXG4gICAgICB3b3JrSXRlbS5zeXN0ZW1SYXRlLm5vdGVzID0gbm90ZXM7XHJcbiAgICAgIHdvcmtJdGVtLnN5c3RlbVJhdGUuaW1hZ2VVUkwgPSBpbWFnZVVSTDtcclxuICAgICAgcmV0dXJuIHdvcmtJdGVtO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICBzeW5jQWxsUmVnaW9ucygpIHtcclxuICAgIHRoaXMuZ2V0QWxscmVnaW9uc0Zyb21SYXRlQW5hbHlzaXMoKGVycm9yLCByZXNwb25zZSkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnZXJyb3IgOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmxvZygncmVzcG9uc2UgOiAnICsgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcclxuICAgICAgICBmb3IgKGxldCByZWdpb24gb2YgcmVzcG9uc2UpIHtcclxuICAgICAgICAgIHRoaXMuU3luY1JhdGVBbmFseXNpcyhyZWdpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBTeW5jUmF0ZUFuYWx5c2lzKHJlZ2lvbjogYW55KSB7XHJcbiAgICBsZXQgcmF0ZUFuYWx5c2lzU2VydmljZSA9IG5ldyBSYXRlQW5hbHlzaXNTZXJ2aWNlKCk7XHJcbiAgICB0aGlzLmNvbnZlcnRDb3N0SGVhZHNGcm9tUmF0ZUFuYWx5c2lzVG9Db3N0Q29udHJvbChDb25zdGFudHMuQlVJTERJTkcsIHJlZ2lvbiwgKGVycm9yOiBhbnksIGJ1aWxkaW5nRGF0YTogYW55KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGxvZ2dlci5lcnJvcignUmF0ZUFuYWx5c2lzIFN5bmMgRmFpbGVkLicpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuY29udmVydENvc3RIZWFkc0Zyb21SYXRlQW5hbHlzaXNUb0Nvc3RDb250cm9sKENvbnN0YW50cy5CVUlMRElORywgcmVnaW9uLCAoZXJyb3I6IGFueSwgcHJvamVjdERhdGE6IGFueSkgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcignUmF0ZUFuYWx5c2lzIFN5bmMgRmFpbGVkLicpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IGJ1aWxkaW5nQ29zdEhlYWRzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShidWlsZGluZ0RhdGEuYnVpbGRpbmdDb3N0SGVhZHMpKTtcclxuICAgICAgICAgICAgbGV0IHByb2plY3RDb3N0SGVhZHMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHByb2plY3REYXRhLmJ1aWxkaW5nQ29zdEhlYWRzKSk7XHJcbiAgICAgICAgICAgIGxldCBjb25maWdDb3N0SGVhZHMgPSBjb25maWcuZ2V0KCdjb25maWdDb3N0SGVhZHMnKTtcclxuICAgICAgICAgICAgbGV0IGNvbmZpZ1Byb2plY3RDb3N0SGVhZHMgPSBjb25maWcuZ2V0KCdjb25maWdQcm9qZWN0Q29zdEhlYWRzJyk7XHJcbiAgICAgICAgICAgIGxldCBmaXhlZENvc3RDb25maWdQcm9qZWN0Q29zdEhlYWRzID0gY29uZmlnLmdldCgnZml4ZWRDb3N0Q29uZmlnUHJvamVjdENvc3RIZWFkcycpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbnZlcnRDb25maWdDb3N0SGVhZHMoY29uZmlnQ29zdEhlYWRzLCBidWlsZGluZ0Nvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIHRoaXMuY29udmVydENvbmZpZ0Nvc3RIZWFkcyhjb25maWdQcm9qZWN0Q29zdEhlYWRzLCBwcm9qZWN0Q29zdEhlYWRzKTtcclxuICAgICAgICAgICAgdGhpcy5jb252ZXJ0Q29uZmlnQ29zdEhlYWRzKGZpeGVkQ29zdENvbmZpZ1Byb2plY3RDb3N0SGVhZHMsIHByb2plY3RDb3N0SGVhZHMpO1xyXG4gICAgICAgICAgICBidWlsZGluZ0Nvc3RIZWFkcyA9IGFsYXNxbCgnU0VMRUNUICogRlJPTSA/IE9SREVSIEJZIHByaW9yaXR5SWQnLCBbYnVpbGRpbmdDb3N0SGVhZHNdKTtcclxuICAgICAgICAgICAgcHJvamVjdENvc3RIZWFkcyA9IGFsYXNxbCgnU0VMRUNUICogRlJPTSA/IE9SREVSIEJZIHByaW9yaXR5SWQnLCBbcHJvamVjdENvc3RIZWFkc10pO1xyXG4gICAgICAgICAgICBsZXQgYnVpbGRpbmdSYXRlcyA9IHRoaXMuZ2V0UmF0ZXMoYnVpbGRpbmdEYXRhLCBidWlsZGluZ0Nvc3RIZWFkcyk7XHJcbiAgICAgICAgICAgIGxldCBwcm9qZWN0UmF0ZXMgPSB0aGlzLmdldFJhdGVzKHByb2plY3REYXRhLCBwcm9qZWN0Q29zdEhlYWRzKTtcclxuICAgICAgICAgICAgbGV0IHJhdGVBbmFseXNpcyA9IG5ldyBSYXRlQW5hbHlzaXMoYnVpbGRpbmdDb3N0SGVhZHMsIGJ1aWxkaW5nUmF0ZXMsIHByb2plY3RDb3N0SGVhZHMsIHByb2plY3RSYXRlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuc2F2ZVJhdGVBbmFseXNpcyhyYXRlQW5hbHlzaXMsIHJlZ2lvbik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgY29udmVydENvbmZpZ0Nvc3RIZWFkcyhjb25maWdDb3N0SGVhZHM6IEFycmF5PGFueT4sIGNvc3RIZWFkc0RhdGE6IEFycmF5PENvc3RIZWFkPikge1xyXG5cclxuICAgIGZvciAobGV0IGNvbmZpZ0Nvc3RIZWFkIG9mIGNvbmZpZ0Nvc3RIZWFkcykge1xyXG5cclxuICAgICAgbGV0IGNvc3RIZWFkRXhpc3RTUUwgPSAnU0VMRUNUICogRlJPTSA/IEFTIGNvc3RIZWFkcyBXSEVSRSBjb3N0SGVhZHMubmFtZT0gPyc7XHJcbiAgICAgIGxldCBjb3N0SGVhZEV4aXN0QXJyYXkgPSBhbGFzcWwoY29zdEhlYWRFeGlzdFNRTCwgW2Nvc3RIZWFkc0RhdGEsIGNvbmZpZ0Nvc3RIZWFkLm5hbWVdKTtcclxuXHJcbiAgICAgIGlmIChjb3N0SGVhZEV4aXN0QXJyYXkubGVuZ3RoID09PSAwICYmIGNvbmZpZ0Nvc3RIZWFkLnJhdGVBbmFseXNpc0lkKSB7XHJcbiAgICAgICAgbGV0IGNvc3RIZWFkOiBDb3N0SGVhZCA9IG5ldyBDb3N0SGVhZCgpO1xyXG4gICAgICAgIGNvc3RIZWFkLm5hbWUgPSBjb25maWdDb3N0SGVhZC5uYW1lO1xyXG4gICAgICAgIGNvc3RIZWFkLnByaW9yaXR5SWQgPSBjb25maWdDb3N0SGVhZC5wcmlvcml0eUlkO1xyXG4gICAgICAgIGNvc3RIZWFkLnJhdGVBbmFseXNpc0lkID0gY29uZmlnQ29zdEhlYWQucmF0ZUFuYWx5c2lzSWQ7XHJcbiAgICAgICAgbGV0IGNhdGVnb3JpZXNMaXN0ID0gbmV3IEFycmF5PENhdGVnb3J5PigpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBjb25maWdDYXRlZ29yeSBvZiBjb25maWdDb3N0SGVhZC5jYXRlZ29yaWVzKSB7XHJcblxyXG4gICAgICAgICAgbGV0IGNhdGVnb3J5OiBDYXRlZ29yeSA9IG5ldyBDYXRlZ29yeShjb25maWdDYXRlZ29yeS5uYW1lLCBjb25maWdDYXRlZ29yeS5yYXRlQW5hbHlzaXNJZCk7XHJcbiAgICAgICAgICBsZXQgd29ya0l0ZW1zTGlzdDogQXJyYXk8V29ya0l0ZW0+ID0gbmV3IEFycmF5PFdvcmtJdGVtPigpO1xyXG5cclxuICAgICAgICAgIGZvciAobGV0IGNvbmZpZ1dvcmtJdGVtIG9mIGNvbmZpZ0NhdGVnb3J5LndvcmtJdGVtcykge1xyXG5cclxuICAgICAgICAgICAgbGV0IHdvcmtJdGVtOiBXb3JrSXRlbSA9IG5ldyBXb3JrSXRlbShjb25maWdXb3JrSXRlbS5uYW1lLCBjb25maWdXb3JrSXRlbS5yYXRlQW5hbHlzaXNJZCk7XHJcbiAgICAgICAgICAgIHdvcmtJdGVtLmlzRGlyZWN0UmF0ZSA9IHRydWU7XHJcbiAgICAgICAgICAgIHdvcmtJdGVtLnVuaXQgPSBjb25maWdXb3JrSXRlbS5tZWFzdXJlbWVudFVuaXQ7XHJcbiAgICAgICAgICAgIHdvcmtJdGVtLmlzTWVhc3VyZW1lbnRTaGVldCA9IGNvbmZpZ1dvcmtJdGVtLmlzTWVhc3VyZW1lbnRTaGVldDtcclxuICAgICAgICAgICAgd29ya0l0ZW0uaXNSYXRlQW5hbHlzaXMgPSBjb25maWdXb3JrSXRlbS5pc1JhdGVBbmFseXNpcztcclxuICAgICAgICAgICAgd29ya0l0ZW0ucmF0ZUFuYWx5c2lzUGVyVW5pdCA9IGNvbmZpZ1dvcmtJdGVtLnJhdGVBbmFseXNpc1BlclVuaXQ7XHJcbiAgICAgICAgICAgIHdvcmtJdGVtLmlzU3RlZWxXb3JrSXRlbSA9IGNvbmZpZ1dvcmtJdGVtLmlzU3RlZWxXb3JrSXRlbTtcclxuICAgICAgICAgICAgd29ya0l0ZW0uaXNJdGVtQnJlYWtkb3duUmVxdWlyZWQgPSBjb25maWdXb3JrSXRlbS5pc0l0ZW1CcmVha2Rvd25SZXF1aXJlZDtcclxuICAgICAgICAgICAgd29ya0l0ZW0ubGVuZ3RoID0gY29uZmlnV29ya0l0ZW0ubGVuZ3RoO1xyXG4gICAgICAgICAgICB3b3JrSXRlbS5icmVhZHRoT3JXaWR0aCA9IGNvbmZpZ1dvcmtJdGVtLmJyZWFkdGhPcldpZHRoO1xyXG4gICAgICAgICAgICB3b3JrSXRlbS5oZWlnaHQgPSBjb25maWdXb3JrSXRlbS5oZWlnaHQ7XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZmlnV29ya0l0ZW0uZGlyZWN0UmF0ZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgIHdvcmtJdGVtLnJhdGUudG90YWwgPSBjb25maWdXb3JrSXRlbS5kaXJlY3RSYXRlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHdvcmtJdGVtLnJhdGUudG90YWwgPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHdvcmtJdGVtLnJhdGUuaXNFc3RpbWF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB3b3JrSXRlbXNMaXN0LnB1c2god29ya0l0ZW0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY2F0ZWdvcnkud29ya0l0ZW1zID0gd29ya0l0ZW1zTGlzdDtcclxuICAgICAgICAgIGNhdGVnb3JpZXNMaXN0LnB1c2goY2F0ZWdvcnkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29zdEhlYWQuY2F0ZWdvcmllcyA9IGNhdGVnb3JpZXNMaXN0O1xyXG4gICAgICAgIGNvc3RIZWFkLnRodW1iUnVsZVJhdGUgPSBjb25maWcuZ2V0KENvbnN0YW50cy5USFVNQlJVTEVfUkFURSk7XHJcbiAgICAgICAgY29zdEhlYWRzRGF0YS5wdXNoKGNvc3RIZWFkKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNvc3RIZWFkc0RhdGE7XHJcbiAgfVxyXG5cclxuICBnZXRSYXRlcyhyZXN1bHQ6IGFueSwgY29zdEhlYWRzOiBBcnJheTxDb3N0SGVhZD4pIHtcclxuICAgIGxldCBnZXRSYXRlc0xpc3RTUUwgPSAnU0VMRUNUICogRlJPTSA/IEFTIHEgV0hFUkUgcS5DNCBJTiAoU0VMRUNUIHQucmF0ZUFuYWx5c2lzSWQgJyArXHJcbiAgICAgICdGUk9NID8gQVMgdCknO1xyXG4gICAgbGV0IHJhdGVJdGVtcyA9IGFsYXNxbChnZXRSYXRlc0xpc3RTUUwsIFtyZXN1bHQucmF0ZXMsIGNvc3RIZWFkc10pO1xyXG5cclxuICAgIGxldCByYXRlSXRlbXNSYXRlQW5hbHlzaXNTUUwgPSAnU0VMRUNUIHJhdGVJdGVtLkMyIEFTIGl0ZW1OYW1lLCByYXRlSXRlbS5DMiBBUyBvcmlnaW5hbEl0ZW1OYW1lLCcgK1xyXG4gICAgICAncmF0ZUl0ZW0uQzEyIEFTIHJhdGVBbmFseXNpc0lkLCByYXRlSXRlbS5DNiBBUyB0eXBlLCcgK1xyXG4gICAgICAnUk9VTkQocmF0ZUl0ZW0uQzcsMikgQVMgcXVhbnRpdHksIFJPVU5EKHJhdGVJdGVtLkMzLDIpIEFTIHJhdGUsIHVuaXQuQzIgQVMgdW5pdCwnICtcclxuICAgICAgJ1JPVU5EKHJhdGVJdGVtLkMzICogcmF0ZUl0ZW0uQzcsMikgQVMgdG90YWxBbW91bnQsIHJhdGVJdGVtLkM1IEFTIHRvdGFsUXVhbnRpdHkgJyArXHJcbiAgICAgICdGUk9NID8gQVMgcmF0ZUl0ZW0gSk9JTiA/IEFTIHVuaXQgT04gdW5pdC5DMSA9IHJhdGVJdGVtLkM5JztcclxuXHJcbiAgICBsZXQgcmF0ZUl0ZW1zTGlzdCA9IGFsYXNxbChyYXRlSXRlbXNSYXRlQW5hbHlzaXNTUUwsIFtyYXRlSXRlbXMsIHJlc3VsdC51bml0c10pO1xyXG5cclxuICAgIGxldCBkaXN0aW5jdEl0ZW1zU1FMID0gJ3NlbGVjdCBESVNUSU5DVCBpdGVtTmFtZSxvcmlnaW5hbEl0ZW1OYW1lLHJhdGUgRlJPTSA/JztcclxuICAgIHZhciBkaXN0aW5jdFJhdGVzID0gYWxhc3FsKGRpc3RpbmN0SXRlbXNTUUwsIFtyYXRlSXRlbXNMaXN0XSk7XHJcblxyXG4gICAgcmV0dXJuIGRpc3RpbmN0UmF0ZXM7XHJcbiAgfVxyXG5cclxuICBzYXZlUmF0ZUFuYWx5c2lzKHJhdGVBbmFseXNpczogUmF0ZUFuYWx5c2lzLCByZWdpb246IGFueSkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ3NhdmVSYXRlQW5hbHlzaXMgaXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsncmVnaW9uJzogcmVnaW9uLlJlZ2lvbn07XHJcbiAgICByYXRlQW5hbHlzaXMucmVnaW9uID0gcmVnaW9uLlJlZ2lvbjtcclxuICAgIGxvZ2dlci5pbmZvKCdVcGRhdGluZyBSYXRlQW5hbHlzaXMgZm9yICcgKyByZWdpb24uUmVnaW9uKTtcclxuICAgIHRoaXMucmF0ZUFuYWx5c2lzUmVwb3NpdG9yeS5yZXRyaWV2ZSh7J3JlZ2lvbic6IHJlZ2lvbi5SZWdpb259LCAoZXJyb3I6IGFueSwgcmF0ZUFuYWx5c2lzQXJyYXk6IEFycmF5PFJhdGVBbmFseXNpcz4pID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgbG9nZ2VyLmVycm9yKCdVbmFibGUgdG8gcmV0cml2ZSBzeW5jZWQgUmF0ZUFuYWx5c2lzJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKHJhdGVBbmFseXNpc0FycmF5Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIHF1ZXJ5ID0geydyZWdpb24nOiByZWdpb24uUmVnaW9ufTtcclxuICAgICAgICAgIGxldCB1cGRhdGUgPSB7XHJcbiAgICAgICAgICAgICRzZXQ6IHtcclxuICAgICAgICAgICAgICAncHJvamVjdENvc3RIZWFkcyc6IHJhdGVBbmFseXNpcy5wcm9qZWN0Q29zdEhlYWRzLFxyXG4gICAgICAgICAgICAgICdwcm9qZWN0UmF0ZXMnOiByYXRlQW5hbHlzaXMucHJvamVjdFJhdGVzLFxyXG4gICAgICAgICAgICAgICdidWlsZGluZ0Nvc3RIZWFkcyc6IHJhdGVBbmFseXNpcy5idWlsZGluZ0Nvc3RIZWFkcyxcclxuICAgICAgICAgICAgICAnYnVpbGRpbmdSYXRlcyc6IHJhdGVBbmFseXNpcy5idWlsZGluZ1JhdGVzXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICB0aGlzLnJhdGVBbmFseXNpc1JlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlLCB7bmV3OiB0cnVlfSwgKGVycm9yOiBhbnksIHJhdGVBbmFseXNpc0FycmF5OiBSYXRlQW5hbHlzaXMpID0+IHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdzYXZlUmF0ZUFuYWx5c2lzIGZhaWxlZCA9PiAnICsgZXJyb3IubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1VwZGF0ZWQgUmF0ZUFuYWx5c2lzLicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5yYXRlQW5hbHlzaXNSZXBvc2l0b3J5LmNyZWF0ZShyYXRlQW5hbHlzaXMsIChlcnJvcjogYW55LCByZXN1bHQ6IFJhdGVBbmFseXNpcykgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ3NhdmVSYXRlQW5hbHlzaXMgZmFpbGVkID0+ICcgKyBlcnJvci5tZXNzYWdlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnU2F2ZWQgUmF0ZUFuYWx5c2lzLicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q29zdENvbnRyb2xSYXRlQW5hbHlzaXMocXVlcnk6IGFueSwgcHJvamVjdGlvbjogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJhdGVBbmFseXNpczogUmF0ZUFuYWx5c2lzKSA9PiB2b2lkKSB7XHJcbiAgICB0aGlzLnJhdGVBbmFseXNpc1JlcG9zaXRvcnkucmV0cmlldmVXaXRoUHJvamVjdGlvbihxdWVyeSwgcHJvamVjdGlvbiwgKGVycm9yOiBhbnksIHJhdGVBbmFseXNpc0FycmF5OiBBcnJheTxSYXRlQW5hbHlzaXM+KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZiAocmF0ZUFuYWx5c2lzQXJyYXkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0NvbnRDb250cm9sIFJhdGVBbmFseXNpcyBub3QgZm91bmQuJyk7XHJcbiAgICAgICAgICBjYWxsYmFjaygnQ29udENvbnRyb2wgUmF0ZUFuYWx5c2lzIG5vdCBmb3VuZC4nLCBudWxsKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmF0ZUFuYWx5c2lzQXJyYXlbMF0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRBZ2dyZWdhdGVEYXRhKHF1ZXJ5OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgYWdncmVnYXRlRGF0YTogYW55KSA9PiB2b2lkKSB7XHJcbiAgICB0aGlzLnJhdGVBbmFseXNpc1JlcG9zaXRvcnkuYWdncmVnYXRlKHF1ZXJ5LCBjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICBnZXRBbGxyZWdpb25zRnJvbVJhdGVBbmFseXNpcyhjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnUmF0ZSBBbmFseXNpcyBTZXJ2aWNlLCBnZXRDb3N0SGVhZHMgaGFzIGJlZW4gaGl0Jyk7XHJcbiAgICBsZXQgcmVnaW9uTGlzdEZyb21SYXRlQW5hbHlzaXM6IEFycmF5PGFueT47XHJcbiAgICBsZXQgdXJsID0gY29uZmlnLmdldCgncmF0ZUFuYWx5c2lzQVBJLmdldEFsbHJlZ2lvbnMnKTtcclxuICAgIHJlcXVlc3QuZ2V0KHt1cmw6IHVybH0sIGZ1bmN0aW9uIChlcnJvcjogYW55LCByZXNwb25zZTogYW55LCBib2R5OiBhbnkpIHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBmb3IgZ2V0dGluZyBhbGwgcmVnaW9ucy4nKTtcclxuICAgICAgICBsb2dnZXIuZXJyb3IoSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSBpZiAoIWVycm9yICYmIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgbGV0IHJlc3AgPSBKU09OLnBhcnNlKGJvZHkpO1xyXG4gICAgICAgIHJlZ2lvbkxpc3RGcm9tUmF0ZUFuYWx5c2lzID0gcmVzcFsnUmVnaW9ucyddO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdyZWdpb25MaXN0RnJvbVJhdGVBbmFseXNpcyA6ICcgKyBKU09OLnN0cmluZ2lmeShyZWdpb25MaXN0RnJvbVJhdGVBbmFseXNpcykpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlZ2lvbkxpc3RGcm9tUmF0ZUFuYWx5c2lzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRBbGxSZWdpb25OYW1lcyhjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogQXJyYXk8YW55PikgPT4gdm9pZCkge1xyXG4gICAgbGV0IHF1ZXJ5ID0gW1xyXG4gICAgICB7JHVud2luZDogJyRyZWdpb24nfSxcclxuICAgICAgeyRwcm9qZWN0OiB7J3JlZ2lvbic6IDEsIF9pZDogMH19XHJcbiAgICBdO1xyXG4gICAgdGhpcy5yYXRlQW5hbHlzaXNSZXBvc2l0b3J5LmFnZ3JlZ2F0ZShxdWVyeSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChyZXN1bHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2VzLk1TR19FUlJPUl9SRUdJT05TX0FSRV9OT1RfUFJFU0VOVDtcclxuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0QWxsRGF0YUZvckRyb3Bkb3duKHJlZ2lvbk5hbWU6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IEFycmF5PGFueT4pID0+IHZvaWQpIHtcclxuICAgIGxldCBxdWVyeSA9IHtyZWdpb246IHJlZ2lvbk5hbWV9O1xyXG4gICAgbGV0IHByb2plY3Rpb24gPSB7J2J1aWxkaW5nQ29zdEhlYWRzJzogMX07XHJcbiAgICB0aGlzLnJhdGVBbmFseXNpc1JlcG9zaXRvcnkucmV0cmlldmVXaXRoUHJvamVjdGlvbihxdWVyeSwgcHJvamVjdGlvbiwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBjb3N0SGVhZERhdGEgPSByZXN1bHRbMF0uYnVpbGRpbmdDb3N0SGVhZHM7XHJcbiAgICAgICAgbGV0IGJ1aWxkaW5nQ29zdEhlYWRzOiBBcnJheTxSQUNvc3RIZWFkPiA9IFtdO1xyXG4gICAgICAgIGlmKGNvc3RIZWFkRGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGNvc3RIZWFkSW5kZXggPSAwOyBjb3N0SGVhZEluZGV4IDwgY29zdEhlYWREYXRhLmxlbmd0aDsgY29zdEhlYWRJbmRleCsrKSB7XHJcbiAgICAgICAgICAgICBsZXQgY29zdEhlYWQgPSBuZXcgUkFDb3N0SGVhZCgpO1xyXG4gICAgICAgICAgICAgY29zdEhlYWQubmFtZSA9IGNvc3RIZWFkRGF0YVtjb3N0SGVhZEluZGV4XS5uYW1lO1xyXG4gICAgICAgICAgICAgY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQgPSBjb3N0SGVhZERhdGFbY29zdEhlYWRJbmRleF0ucmF0ZUFuYWx5c2lzSWQ7XHJcbiAgICAgICAgICAgICBsZXQgYnVpbGRpbmdDYXRlZ29yaWVzOiBBcnJheTxSQUNhdGVnb3J5PiA9IG5ldyBBcnJheTxSQUNhdGVnb3J5PigpO1xyXG4gICAgICAgICAgICAgdGhpcy5nZXRDYXRlZ29yaWVzKGNvc3RIZWFkRGF0YVtjb3N0SGVhZEluZGV4XS5jYXRlZ29yaWVzLCBidWlsZGluZ0NhdGVnb3JpZXMpO1xyXG4gICAgICAgICAgICAgY29zdEhlYWQuY2F0ZWdvcmllcyA9IGJ1aWxkaW5nQ2F0ZWdvcmllcztcclxuICAgICAgICAgICAgIGlmKGNvc3RIZWFkLmNhdGVnb3JpZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICBidWlsZGluZ0Nvc3RIZWFkcy5wdXNoKGNvc3RIZWFkKTtcclxuICAgICAgICAgICAgIH1cclxuICAgICAgICAgICB9XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCBidWlsZGluZ0Nvc3RIZWFkcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgZXJyb3IubWVzc2FnZSA9IG1lc3NhZ2VzLk1TR19FUlJPUl9SRUdJT05TX0FSRV9OT1RfUFJFU0VOVDtcclxuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q2F0ZWdvcmllcyhjYXRlZ29yaWVzRGF0YTogQXJyYXk8Q2F0ZWdvcnk+LCBidWlsZGluZ0NhdGVnb3JpZXM6IGFueSkge1xyXG4gICAgaWYgKGNhdGVnb3JpZXNEYXRhLmxlbmd0aCA+IDApIHtcclxuICAgICAgZm9yIChsZXQgY2F0ZWdvcnlJbmRleCA9IDA7IGNhdGVnb3J5SW5kZXggPCBjYXRlZ29yaWVzRGF0YS5sZW5ndGg7IGNhdGVnb3J5SW5kZXgrKykge1xyXG4gICAgICAgIGxldCBjYXRlZ29yeSA9IG5ldyBSQUNhdGVnb3J5KCk7XHJcbiAgICAgICAgY2F0ZWdvcnkubmFtZSA9IGNhdGVnb3JpZXNEYXRhW2NhdGVnb3J5SW5kZXhdLm5hbWU7XHJcbiAgICAgICAgY2F0ZWdvcnkucmF0ZUFuYWx5c2lzSWQgPSBjYXRlZ29yaWVzRGF0YVtjYXRlZ29yeUluZGV4XS5yYXRlQW5hbHlzaXNJZDtcclxuICAgICAgICBsZXQgYnVpbGRpbmdXb3JrSXRlbXM6IEFycmF5PFJBV29ya0l0ZW0+ID0gbmV3IEFycmF5PFJBV29ya0l0ZW0+KCk7XHJcbiAgICAgICAgdGhpcy5nZXRXb3JrSXRlbXNGb3JSQShjYXRlZ29yaWVzRGF0YVtjYXRlZ29yeUluZGV4XS53b3JrSXRlbXMsIGJ1aWxkaW5nV29ya0l0ZW1zKTtcclxuICAgICAgICBjYXRlZ29yeS53b3JrSXRlbXMgPSBidWlsZGluZ1dvcmtJdGVtcztcclxuICAgICAgICBpZihjYXRlZ29yeS53b3JrSXRlbXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgYnVpbGRpbmdDYXRlZ29yaWVzLnB1c2goY2F0ZWdvcnkpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0V29ya0l0ZW1zRm9yUkEod29ya0l0ZW1zRGF0YTogQXJyYXk8V29ya0l0ZW0+LCBidWlsZGluZ1dvcmtJdGVtczogYW55KSB7XHJcbiAgICBpZiAod29ya0l0ZW1zRGF0YS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGZvciAobGV0IHdvcmtJdGVtSW5kZXggPSAwOyB3b3JrSXRlbUluZGV4IDwgd29ya0l0ZW1zRGF0YS5sZW5ndGg7IHdvcmtJdGVtSW5kZXgrKykge1xyXG4gICAgICAgIGxldCB3b3JrSXRlbSA9IG5ldyBSQVdvcmtJdGVtKCk7XHJcbiAgICAgICAgd29ya0l0ZW0ubmFtZSA9IHdvcmtJdGVtc0RhdGFbd29ya0l0ZW1JbmRleF0ubmFtZTtcclxuICAgICAgICB3b3JrSXRlbS5yYXRlQW5hbHlzaXNJZCA9IHdvcmtJdGVtc0RhdGFbd29ya0l0ZW1JbmRleF0ucmF0ZUFuYWx5c2lzSWQ7XHJcbiAgICAgICAgd29ya0l0ZW0ucmF0ZSA9IHdvcmtJdGVtc0RhdGFbd29ya0l0ZW1JbmRleF0ucmF0ZTtcclxuICAgICAgICB3b3JrSXRlbS51bml0ID0gd29ya0l0ZW1zRGF0YVt3b3JrSXRlbUluZGV4XS51bml0O1xyXG4gICAgICAgIGlmKHdvcmtJdGVtLnJhdGUucmF0ZUl0ZW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGJ1aWxkaW5nV29ya0l0ZW1zLnB1c2god29ya0l0ZW0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5PYmplY3Quc2VhbChSYXRlQW5hbHlzaXNTZXJ2aWNlKTtcclxuZXhwb3J0ID0gUmF0ZUFuYWx5c2lzU2VydmljZTtcclxuIl19
