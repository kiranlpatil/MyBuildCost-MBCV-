"use strict";
var ProjectRepository = require("../dataaccess/repository/ProjectRepository");
var BuildingRepository = require("../dataaccess/repository/BuildingRepository");
var UserService = require("./../../framework/services/UserService");
var ProjectAsset = require("../../framework/shared/projectasset");
var BuildingReport = require("../dataaccess/model/project/reports/BuildingReport");
var ThumbRuleReport = require("../dataaccess/model/project/reports/ThumbRuleReport");
var AuthInterceptor = require("../../framework/interceptor/auth.interceptor");
var EstimateReport = require("../dataaccess/model/project/reports/EstimateReport");
var ProjectReport = require("../dataaccess/model/project/reports/ProjectReport");
var ThumbRule = require("../dataaccess/model/project/building/ThumbRule");
var Estimate = require("../dataaccess/model/project/building/Estimate");
var RateAnalysisService = require("./RateAnalysisService");
var alasql = require("alasql");
var Constants = require("../shared/constants");
var ProjectService = require("./ProjectService");
var MaterialTakeOffFlatDetailsDTO = require("../dataaccess/dto/Report/MaterialTakeOffFlatDetailsDTO");
var MaterialTakeOffFiltersListDTO = require("../dataaccess/dto/Report/MaterialTakeOffFiltersListDTO");
var MaterialTakeOffReport = require("../dataaccess/model/project/reports/MaterialTakeOffReport");
var MaterialTakeOffTableView = require("../dataaccess/model/project/reports/MaterialTakeOffTableView");
var MaterialTakeOffTableViewContent = require("../dataaccess/model/project/reports/MaterialTakeOffTableViewContent");
var MaterialTakeOffTableViewSubContent = require("../dataaccess/model/project/reports/MaterialTakeOffTableViewSubContent");
var MaterialTakeOffTableViewHeaders = require("../dataaccess/model/project/reports/MaterialTakeOffTableViewHeaders");
var MaterialTakeOffTableViewFooter = require("../dataaccess/model/project/reports/MaterialTakeOffTableViewFooter");
var CostControllException = require("../exception/CostControllException");
var MaterialTakeOffView = require("../dataaccess/model/project/reports/MaterialTakeOffView");
var config = require('config');
var log4js = require('log4js');
var logger = log4js.getLogger('Report Service');
var ReportService = (function () {
    function ReportService() {
        this.projectRepository = new ProjectRepository();
        this.buildingRepository = new BuildingRepository();
        this.APP_NAME = ProjectAsset.APP_NAME;
        this.authInterceptor = new AuthInterceptor();
        this.userService = new UserService();
        this.rateAnalysisService = new RateAnalysisService();
    }
    ReportService.prototype.getReport = function (projectId, reportType, rateUnit, areaType, user, callback) {
        var _this = this;
        logger.info('Report Service, getReport has been hit');
        var query = { _id: projectId };
        var populate = { path: 'buildings' };
        this.projectRepository.findAndPopulate(query, populate, function (error, result) {
            logger.info('Report Service, findAndPopulate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                var buildings = result[0].buildings;
                var typeOfArea;
                var totalArea = void 0;
                var choice = areaType;
                switch (choice) {
                    case Constants.SLAB_AREA:
                        {
                            typeOfArea = Constants.TOTAL_SLAB_AREA;
                            break;
                        }
                    case Constants.SALEABLE_AREA:
                        {
                            typeOfArea = Constants.TOTAL_SALEABLE_AREA;
                            break;
                        }
                    case Constants.CARPET_AREA:
                        {
                            typeOfArea = Constants.TOTAL_CARPET_AREA;
                            break;
                        }
                    default: callback(error, null);
                }
                var totalOfArea = alasql('VALUE OF SELECT ROUND(SUM(' + typeOfArea + '),2) FROM ?', [buildings]);
                if (rateUnit === Constants.SQUREMETER_UNIT) {
                    totalArea = totalOfArea * config.get(Constants.SQUARE_METER);
                }
                else {
                    totalArea = totalOfArea;
                }
                var projectReport = new ProjectReport();
                projectReport.buildings = _this.generateReportByCostHeads(buildings, typeOfArea, rateUnit);
                var projectCostHeads = result[0].projectCostHeads;
                var projectRates = result[0].rates;
                if (projectCostHeads !== null) {
                    projectReport.commonAmenities = _this.generateReportForProjectCostHeads(projectCostHeads, projectRates, totalArea, rateUnit);
                }
                else {
                    callback(null, error);
                }
                callback(null, { data: projectReport, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ReportService.prototype.generateReportByCostHeads = function (buildings, typeOfArea, rateUnit) {
        var buildingsReport = new Array();
        for (var _i = 0, buildings_1 = buildings; _i < buildings_1.length; _i++) {
            var building = buildings_1[_i];
            var buildingReport = new BuildingReport;
            buildingReport.name = building.name;
            buildingReport._id = building._id;
            if (rateUnit === Constants.SQUREMETER_UNIT) {
                buildingReport.area = building[typeOfArea] * config.get(Constants.SQUARE_METER);
            }
            else {
                buildingReport.area = building[typeOfArea];
            }
            var thumbRule = new ThumbRule();
            var estimate = new Estimate();
            var thumbRuleReports = new Array();
            var estimatedReports = new Array();
            this.getThumbRuleAndEstimatedReport(building, buildingReport, thumbRuleReports, estimatedReports, rateUnit);
            var totalRates = alasql('SELECT ROUND(SUM(amount),2) AS totalAmount, ROUND(SUM(rate),2) AS totalRate FROM ?', [thumbRuleReports]);
            thumbRule.totalRate = totalRates[0].totalRate;
            thumbRule.totalBudgetedCost = Math.round(totalRates[0].totalAmount);
            thumbRule.thumbRuleReports = thumbRuleReports;
            var totalEstimatedRates = alasql('SELECT ROUND(SUM(total),2) AS totalAmount, ROUND(SUM(rate),2) AS totalRate FROM ?', [estimatedReports]);
            estimate.totalRate = totalEstimatedRates[0].totalRate;
            estimate.totalEstimatedCost = totalEstimatedRates[0].totalAmount;
            estimate.estimatedCosts = estimatedReports;
            buildingReport.thumbRule = thumbRule;
            buildingReport.estimate = estimate;
            buildingsReport.push(buildingReport);
        }
        return (buildingsReport);
    };
    ReportService.prototype.getThumbRuleAndEstimatedReport = function (building, buildingReport, thumbRuleReports, estimatedReports, rateUnit) {
        for (var _i = 0, _a = building.costHeads; _i < _a.length; _i++) {
            var costHead = _a[_i];
            if (costHead.active) {
                var thumbRuleReport = new ThumbRuleReport();
                thumbRuleReport.name = costHead.name;
                thumbRuleReport.rateAnalysisId = costHead.rateAnalysisId;
                thumbRuleReport.amount = Math.round(costHead.budgetedCostAmount);
                thumbRuleReport.costHeadActive = costHead.active;
                thumbRuleReport.rate = thumbRuleReport.amount / buildingReport.area;
                thumbRuleReports.push(thumbRuleReport);
                var estimateReport = new EstimateReport();
                estimateReport = this.getEstimatedReport(building.rates, costHead, buildingReport.area, rateUnit);
                estimatedReports.push(estimateReport);
            }
        }
    };
    ReportService.prototype.getEstimatedReport = function (centralizedRates, costHead, area, rateUnit) {
        var estimateReport = new EstimateReport();
        estimateReport.name = costHead.name;
        estimateReport.rateAnalysisId = costHead.rateAnalysisId;
        var costHeadCategories = costHead.categories;
        var projectService = new ProjectService();
        var categoriesObj = projectService.getCategoriesListWithCentralizedRates(costHeadCategories, centralizedRates);
        estimateReport.total = categoriesObj.categoriesAmount;
        estimateReport.rate = estimateReport.total / area;
        return estimateReport;
    };
    ReportService.prototype.generateReportForProjectCostHeads = function (projectCostHeads, projectRates, totalArea, rateUnit) {
        var commonAmenitiesReport = new Array();
        var projectReport = new BuildingReport;
        projectReport.name = Constants.AMENITIES;
        projectReport.area = totalArea;
        var thumbRule = new ThumbRule();
        var estimate = new Estimate();
        var thumbRuleReports = new Array();
        var estimatedReports = new Array();
        this.getThumbRuleAndEstimatedReportForProjectCostHead(projectCostHeads, projectRates, projectReport, thumbRuleReports, estimatedReports, totalArea, rateUnit);
        var totalRates = alasql('SELECT ROUND(SUM(amount),2) AS totalAmount, ROUND(SUM(rate),2) AS totalRate FROM ?', [thumbRuleReports]);
        thumbRule.totalRate = totalRates[0].totalRate;
        thumbRule.totalBudgetedCost = Math.round(totalRates[0].totalAmount);
        thumbRule.thumbRuleReports = thumbRuleReports;
        var totalEstimatedRates = alasql('SELECT ROUND(SUM(total),2) AS totalAmount, ROUND(SUM(rate),2) AS totalRate FROM ?', [estimatedReports]);
        estimate.totalRate = totalEstimatedRates[0].totalRate;
        estimate.totalEstimatedCost = totalEstimatedRates[0].totalAmount;
        estimate.estimatedCosts = estimatedReports;
        projectReport.thumbRule = thumbRule;
        projectReport.estimate = estimate;
        commonAmenitiesReport.push(projectReport);
        return (commonAmenitiesReport);
    };
    ReportService.prototype.getThumbRuleAndEstimatedReportForProjectCostHead = function (projectCostHead, projectRates, projectReport, thumbRuleReports, estimatedReports, totalArea, rateUnit) {
        for (var _i = 0, projectCostHead_1 = projectCostHead; _i < projectCostHead_1.length; _i++) {
            var costHead = projectCostHead_1[_i];
            if (costHead.active) {
                var thumbRuleReport = new ThumbRuleReport();
                thumbRuleReport.name = costHead.name;
                thumbRuleReport.rateAnalysisId = costHead.rateAnalysisId;
                thumbRuleReport.amount = Math.round(costHead.budgetedCostAmount);
                thumbRuleReport.costHeadActive = costHead.active;
                thumbRuleReport.rate = thumbRuleReport.amount / totalArea;
                thumbRuleReports.push(thumbRuleReport);
                var estimateReport = new EstimateReport();
                estimateReport = this.getEstimatedReport(projectRates, costHead, totalArea, rateUnit);
                estimatedReports.push(estimateReport);
            }
        }
    };
    ReportService.prototype.getCostHeads = function (url, user, callback) {
        var _this = this;
        logger.info('Report Service, getCostHeads has been hit');
        this.rateAnalysisService.getCostHeads(url, user, function (error, result) {
            if (error) {
                console.log('error : ' + JSON.stringify(error));
                callback(error, null);
            }
            else {
                callback(null, { data: result, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ReportService.prototype.getWorkItems = function (url, user, callback) {
        var _this = this;
        logger.info('Report Service, getWorkItems has been hit');
        this.rateAnalysisService.getWorkItems(url, user, function (error, result) {
            if (error) {
                console.log('error : ' + JSON.stringify(error));
                callback(error, null);
            }
            else {
                callback(null, { data: result, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ReportService.prototype.getMaterialDetails = function (projectId, user, callback) {
        var _this = this;
        logger.info('Report Service, getMaterialDetails has been hit');
        var query = { _id: projectId };
        var populate = { path: 'buildings' };
        this.projectRepository.findAndPopulate(query, populate, function (error, result) {
            logger.info('Report Service, findAndPopulate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, _this.getBuildingMaterialDetails(result[0].buildings));
            }
        });
    };
    ReportService.prototype.getBuildingMaterialDetails = function (buildings) {
        var materialTakeOffFlatDetailsArray = new Array();
        var buildingName;
        for (var _i = 0, buildings_2 = buildings; _i < buildings_2.length; _i++) {
            var building = buildings_2[_i];
            buildingName = building.name;
            this.addMaterialDTOForActiveCostHeadInDTOArray(building, buildingName, materialTakeOffFlatDetailsArray);
        }
        return materialTakeOffFlatDetailsArray;
    };
    ReportService.prototype.getMaterialFilters = function (projectId, user, callback) {
        var _this = this;
        logger.info('Report Service, getMaterialFilters has been hit');
        var query = { _id: projectId };
        var populate = { path: 'buildings' };
        this.projectRepository.findAndPopulate(query, populate, function (error, result) {
            logger.info('Report Service, findAndPopulate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, _this.getMaterialTakeOffFilterObject(result[0].buildings));
            }
        });
    };
    ReportService.prototype.getMaterialTakeOffReport = function (projectId, building, elementWiseReport, element, user, callback) {
        var _this = this;
        logger.info('Report Service, getMaterialTakeOffReport has been hit');
        var query = { _id: projectId };
        var populate = { path: 'buildings' };
        if (building !== Constants.STR_ALL_BUILDING) {
            populate = { path: 'buildings', match: { name: building } };
        }
        this.projectRepository.findAndPopulate(query, populate, function (error, result) {
            logger.info('Report Service, findAndPopulate has been hit');
            if (error) {
                callback(error, null);
            }
            else {
                if (result[0].buildings.length === 0) {
                    callback(new CostControllException('Unable to find Building', null), null);
                }
                var materialTakeOffFlatDetailsArray = _this.getBuildingMaterialDetails(result[0].buildings);
                var materialReportRowData = _this.getMaterialDataFromFlatDetailsArray(elementWiseReport, element, building, materialTakeOffFlatDetailsArray);
                if (materialReportRowData.length > 0 && materialReportRowData[0].header !== undefined) {
                    var materialTakeOffReport = new MaterialTakeOffReport(null, null);
                    materialTakeOffReport.secondaryView = {};
                    _this.populateMaterialTakeOffReportFromRowData(materialReportRowData, materialTakeOffReport, elementWiseReport, building);
                    var responseData = {};
                    responseData[element] = materialTakeOffReport;
                    callback(null, responseData);
                }
                else {
                    callback(new CostControllException('Material TakeOff Report Not Found For ' + building, null), null);
                }
            }
        });
    };
    ReportService.prototype.populateMaterialTakeOffReportFromRowData = function (materialReportRowData, materialTakeOffReport, elementWiseReport, building) {
        for (var _i = 0, materialReportRowData_1 = materialReportRowData; _i < materialReportRowData_1.length; _i++) {
            var record = materialReportRowData_1[_i];
            if (materialTakeOffReport.secondaryView[record.header] === undefined ||
                materialTakeOffReport.secondaryView[record.header] === null) {
                materialTakeOffReport.title = building;
                var materialTakeOffReportSubTitle = new MaterialTakeOffView('', 0, '');
                materialTakeOffReport.subTitle = materialTakeOffReportSubTitle;
                materialTakeOffReport.secondaryView[record.header] = {};
            }
            var materialTakeOffSecondaryView = materialTakeOffReport.secondaryView[record.header];
            if (materialTakeOffSecondaryView.table === undefined || materialTakeOffSecondaryView.table === null) {
                materialTakeOffSecondaryView.table = new MaterialTakeOffTableView(null, null, null);
            }
            var table = materialTakeOffSecondaryView.table;
            if (table.content === null) {
                table.content = {};
            }
            if (table.header === null) {
                var columnOne = 'Item';
                var columnTwo = 'Quantity';
                var columnThree = 'Unit';
                if (elementWiseReport === Constants.STR_COSTHEAD && building === Constants.STR_ALL_BUILDING) {
                    columnOne = 'Building';
                }
                table.header = new MaterialTakeOffTableViewHeaders(columnOne, columnTwo, columnThree);
            }
            var materialTakeOffTableViewSubContent = null;
            if (record.subValue && record.subValue !== 'default' && record.subValue !== 'Direct') {
                materialTakeOffTableViewSubContent =
                    new MaterialTakeOffTableViewSubContent(record.subValue, record.Total, record.unit);
            }
            if (table.content[record.rowValue] === undefined || table.content[record.rowValue] === null) {
                table.content[record.rowValue] = new MaterialTakeOffTableViewContent(record.rowValue, 0, record.unit, {});
            }
            var tableViewContent = table.content[record.rowValue];
            tableViewContent.columnTwo = tableViewContent.columnTwo + record.Total;
            if (materialTakeOffTableViewSubContent) {
                tableViewContent.subContent[record.subValue] = materialTakeOffTableViewSubContent;
            }
            var materialTakeOffTableViewFooter = null;
            if (table.footer === undefined || table.footer === null) {
                table.footer =
                    new MaterialTakeOffTableViewFooter('Total', 0, record.unit);
            }
            materialTakeOffTableViewFooter = table.footer;
            materialTakeOffTableViewFooter.columnTwo = materialTakeOffTableViewFooter.columnTwo + record.Total;
            materialTakeOffSecondaryView.title = materialTakeOffTableViewFooter.columnTwo + ' '
                + materialTakeOffTableViewFooter.columnThree;
            if (elementWiseReport === Constants.STR_MATERIAL) {
                materialTakeOffReport.subTitle.columnTwo = materialTakeOffReport.subTitle.columnTwo + record.Total;
                materialTakeOffReport.subTitle.columnThree = record.unit;
                materialTakeOffReport.subTitle.columnOne = ': ' + materialTakeOffReport.subTitle.columnTwo + ' ' +
                    materialTakeOffReport.subTitle.columnThree;
            }
        }
    };
    ReportService.prototype.getMaterialDataFromFlatDetailsArray = function (elementWiseReport, element, building, materialTakeOffFlatDetailsArray) {
        var sqlQuery;
        switch (elementWiseReport) {
            case Constants.STR_COSTHEAD:
                sqlQuery = this.alasqlQueryForMaterialTakeOffDataCostHeadWise(building);
                break;
            case Constants.STR_MATERIAL:
                sqlQuery = this.alasqlQueryForMaterialTakeOffDataMaterialWise(building);
                break;
        }
        var materialReportRowData = alasql(sqlQuery, [materialTakeOffFlatDetailsArray, element]);
        return materialReportRowData;
    };
    ReportService.prototype.alasqlQueryForMaterialTakeOffDataMaterialWise = function (building) {
        var select = Constants.STR_EMPTY;
        var from = Constants.ALASQL_FROM;
        var where = Constants.STR_EMPTY;
        var groupBy = Constants.ALASQL_GROUP_BY_MATERIAL_TAKEOFF_MATERIAL_WISE;
        var orderBy = Constants.ALASQL_ORDER_BY_MATERIAL_TAKEOFF_MATERIAL_WISE;
        var sqlQuery;
        if (building !== Constants.STR_ALL_BUILDING) {
            select = Constants.ALASQL_SELECT_MATERIAL_TAKEOFF_MATERIAL_WISE + Constants.STR_COMMA_SPACE +
                Constants.ALASQL_SELECT_QUANTITY_NAME_AS;
            where = Constants.ALASQL_WHERE_MATERIAL_NAME_EQUALS_TO +
                Constants.STR_AND + Constants.ALASQL_SELECT_BUILDING_NAME + building + Constants.STR_DOUBLE_INVERTED_COMMA;
        }
        else {
            select = Constants.ALASQL_SELECT_MATERIAL_TAKEOFF_MATERIAL_WISE;
            where = Constants.ALASQL_WHERE_MATERIAL_NAME_EQUALS_TO;
        }
        where = where + Constants.ALASQL_AND_MATERIAL_NOT_LABOUR;
        sqlQuery = select + from + where + groupBy + orderBy;
        return sqlQuery;
    };
    ReportService.prototype.alasqlQueryForMaterialTakeOffDataCostHeadWise = function (building) {
        var select = Constants.STR_EMPTY;
        var from = Constants.ALASQL_FROM;
        var where = Constants.STR_EMPTY;
        var groupBy = Constants.STR_EMPTY;
        var orderBy = Constants.STR_EMPTY;
        var sqlQuery;
        if (building !== Constants.STR_ALL_BUILDING) {
            select = Constants.ALASQL_SELECT_MATERIAL_TAKEOFF_COSTHEAD_WISE + Constants.STR_COMMA_SPACE +
                Constants.ALASQL_SELECT_QUANTITY_NAME_AS;
            where = Constants.ALASQL_WHERE_COSTHEAD_NAME_EQUALS_TO
                + Constants.STR_AND + Constants.ALASQL_SELECT_BUILDING_NAME + building + Constants.STR_DOUBLE_INVERTED_COMMA;
            groupBy = Constants.ALASQL_GROUP_MATERIAL_WORKITEM_QUANTITY_MATERIAL_TAKEOFF_COSTHEAD_WISE;
            orderBy = Constants.ALASQL_ORDER_BY_MATERIAL_WORKITEM_COSTHEAD_WISE;
        }
        else {
            select = Constants.ALASQL_SELECT_MATERIAL_TAKEOFF_COSTHEAD_WISE_FOR_ALL_BUILDINGS;
            where = Constants.ALASQL_WHERE_COSTHEAD_NAME_EQUALS_TO;
            groupBy = Constants.ALASQL_GROUP_MATERIAL_BUILDING_QUANTITY_MATERIAL_TAKEOFF_COSTHEAD_WISE_FOR_ALL_BUILDINGS;
            orderBy = Constants.ALASQL_ORDER_BY_MATERIAL_BUILDING_MATERIAL_TAKEOFF_COSTHEAD_WISE;
        }
        where = where + Constants.ALASQL_AND_MATERIAL_NOT_LABOUR;
        sqlQuery = select + from + where + groupBy + orderBy;
        return sqlQuery;
    };
    ReportService.prototype.getMaterialTakeOffFilterObject = function (buildings) {
        var materialTakeOffFlatDetailsArray = this.getBuildingMaterialDetails(buildings);
        var column = Constants.STR_BUILDING_NAME;
        var buildingList = this.getDistinctArrayOfStringFromAlasql(column, materialTakeOffFlatDetailsArray);
        column = Constants.STR_COSTHEAD_NAME;
        var costHeadList = this.getDistinctArrayOfStringFromAlasql(column, materialTakeOffFlatDetailsArray);
        column = Constants.STR_Material_NAME;
        var materialList = this.getDistinctArrayOfStringFromAlasql(column, materialTakeOffFlatDetailsArray, Constants.ALASQL_MATERIAL_NOT_LABOUR);
        var materialTakeOffFiltersObject = new MaterialTakeOffFiltersListDTO(buildingList, costHeadList, materialList);
        return materialTakeOffFiltersObject;
    };
    ReportService.prototype.getDistinctArrayOfStringFromAlasql = function (column, materialTakeOffFlatDetailsArray, notLikeOptional) {
        var sqlQuery = 'SELECT DISTINCT flatData.' + column + ' FROM ? AS flatData';
        var where = ' where ' + notLikeOptional;
        if (notLikeOptional) {
            sqlQuery = sqlQuery + where;
        }
        var distinctObjectArray = alasql(sqlQuery, [materialTakeOffFlatDetailsArray]);
        var distinctNameStringArray = new Array();
        for (var _i = 0, distinctObjectArray_1 = distinctObjectArray; _i < distinctObjectArray_1.length; _i++) {
            var distinctObject = distinctObjectArray_1[_i];
            distinctNameStringArray.push(distinctObject[column]);
        }
        return distinctNameStringArray;
    };
    ReportService.prototype.addMaterialDTOForActiveCostHeadInDTOArray = function (building, buildingName, materialTakeOffFlatDetailsArray) {
        var costHeadName;
        for (var _i = 0, _a = building.costHeads; _i < _a.length; _i++) {
            var costHead = _a[_i];
            if (costHead.active) {
                costHeadName = costHead.name;
                this.addMaterialDTOForActiveCategoryInDTOArray(costHead, buildingName, costHeadName, materialTakeOffFlatDetailsArray);
            }
        }
    };
    ReportService.prototype.addMaterialDTOForActiveCategoryInDTOArray = function (costHead, buildingName, costHeadName, materialTakeOffFlatDetailsArray) {
        var categoryName;
        for (var _i = 0, _a = costHead.categories; _i < _a.length; _i++) {
            var category = _a[_i];
            if (category.active) {
                categoryName = category.name;
                this.addMaterialDTOForActiveWorkitemInDTOArray(category, buildingName, costHeadName, categoryName, materialTakeOffFlatDetailsArray);
            }
        }
    };
    ReportService.prototype.addMaterialDTOForActiveWorkitemInDTOArray = function (category, buildingName, costHeadName, categoryName, materialTakeOffFlatDetailsArray) {
        var workItemName;
        for (var _i = 0, _a = category.workItems; _i < _a.length; _i++) {
            var workItem = _a[_i];
            if (workItem.active) {
                workItemName = workItem.name;
                this.addEstimatedQuantityAndRateMaterialItemInDTOArray(workItem, buildingName, costHeadName, categoryName, workItemName, materialTakeOffFlatDetailsArray);
            }
        }
    };
    ReportService.prototype.addEstimatedQuantityAndRateMaterialItemInDTOArray = function (workItem, buildingName, costHeadName, categoryName, workItemName, materialTakeOffFlatDetailsArray) {
        var quantityName;
        if (workItem.quantity.isDirectQuantity && workItem.rate.isEstimated) {
            quantityName = Constants.STR_DIRECT;
            this.createAndAddMaterialDTOObjectInDTOArray(workItem, buildingName, costHeadName, categoryName, workItemName, quantityName, materialTakeOffFlatDetailsArray, workItem.quantity.total);
        }
        else if (workItem.quantity.isEstimated && workItem.rate.isEstimated) {
            for (var _i = 0, _a = workItem.quantity.quantityItemDetails; _i < _a.length; _i++) {
                var quantity = _a[_i];
                quantityName = quantity.name;
                this.createAndAddMaterialDTOObjectInDTOArray(workItem, buildingName, costHeadName, categoryName, workItemName, quantityName, materialTakeOffFlatDetailsArray, quantity.total);
            }
        }
    };
    ReportService.prototype.createAndAddMaterialDTOObjectInDTOArray = function (workItem, buildingName, costHeadName, categoryName, workItemName, quantityName, materialTakeOffFlatDetailsArray, quantity) {
        for (var _i = 0, _a = workItem.rate.rateItems; _i < _a.length; _i++) {
            var rateItem = _a[_i];
            var materialTakeOffFlatDetailDTO = new MaterialTakeOffFlatDetailsDTO(buildingName, costHeadName, categoryName, workItemName, rateItem.itemName, quantityName, Math.ceil(((quantity / workItem.rate.quantity) * rateItem.quantity)), rateItem.unit);
            materialTakeOffFlatDetailsArray.push(materialTakeOffFlatDetailDTO);
        }
    };
    return ReportService;
}());
Object.seal(ReportService);
module.exports = ReportService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUmVwb3J0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsOEVBQWlGO0FBQ2pGLGdGQUFtRjtBQUNuRixvRUFBdUU7QUFDdkUsa0VBQXFFO0FBR3JFLG1GQUFzRjtBQUN0RixxRkFBd0Y7QUFDeEYsOEVBQWlGO0FBRWpGLG1GQUFzRjtBQUN0RixpRkFBb0Y7QUFDcEYsMEVBQTZFO0FBQzdFLHdFQUEyRTtBQUMzRSwyREFBOEQ7QUFFOUQsK0JBQWtDO0FBQ2xDLCtDQUFrRDtBQUNsRCxpREFBb0Q7QUFLcEQsc0dBQXlHO0FBQ3pHLHNHQUF5RztBQUV6RyxpR0FBb0c7QUFDcEcsdUdBQTBHO0FBRTFHLHFIQUF3SDtBQUN4SCwySEFBOEg7QUFDOUgscUhBQXdIO0FBQ3hILG1IQUFzSDtBQUN0SCwwRUFBNkU7QUFDN0UsNkZBQWdHO0FBQ2hHLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsSUFBSSxNQUFNLEdBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRTlDO0lBVUU7UUFDRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ2pELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDbkQsSUFBSSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM3QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztJQUN2RCxDQUFDO0lBRUQsaUNBQVMsR0FBVCxV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R0FBL0MsVUFBZ0QsUUFBa0IsRUFBRSxZQUFvQixFQUFFLFlBQW9CLEVBQUUsWUFBb0IsRUFDcEgsWUFBb0IsRUFBRSxZQUFvQixFQUFFLCtCQUFxRSxFQUNqRixRQUFnQjtRQUM5RCxHQUFHLENBQUMsQ0FBaUIsVUFBdUIsRUFBdkIsS0FBQSxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBdkIsY0FBdUIsRUFBdkIsSUFBdUI7WUFBdkMsSUFBSSxRQUFRLFNBQUE7WUFDZixJQUFJLDRCQUE0QixHQUFHLElBQUksNkJBQTZCLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQzNHLFlBQVksRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFDbkgsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pCLCtCQUErQixDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1NBQ3BFO0lBQ0gsQ0FBQztJQUNILG9CQUFDO0FBQUQsQ0E5Z0JBLEFBOGdCQyxJQUFBO0FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMzQixpQkFBUyxhQUFhLENBQUMiLCJmaWxlIjoiYXBwL2FwcGxpY2F0aW9uUHJvamVjdC9zZXJ2aWNlcy9SZXBvcnRTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFByb2plY3RSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L1Byb2plY3RSZXBvc2l0b3J5Jyk7XHJcbmltcG9ydCBCdWlsZGluZ1JlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvQnVpbGRpbmdSZXBvc2l0b3J5Jyk7XHJcbmltcG9ydCBVc2VyU2VydmljZSA9IHJlcXVpcmUoJy4vLi4vLi4vZnJhbWV3b3JrL3NlcnZpY2VzL1VzZXJTZXJ2aWNlJyk7XHJcbmltcG9ydCBQcm9qZWN0QXNzZXQgPSByZXF1aXJlKCcuLi8uLi9mcmFtZXdvcmsvc2hhcmVkL3Byb2plY3Rhc3NldCcpO1xyXG5pbXBvcnQgVXNlciA9IHJlcXVpcmUoJy4uLy4uL2ZyYW1ld29yay9kYXRhYWNjZXNzL21vbmdvb3NlL3VzZXInKTtcclxuaW1wb3J0IEJ1aWxkaW5nID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb25nb29zZS9CdWlsZGluZycpO1xyXG5pbXBvcnQgQnVpbGRpbmdSZXBvcnQgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9CdWlsZGluZ1JlcG9ydCcpO1xyXG5pbXBvcnQgVGh1bWJSdWxlUmVwb3J0ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L3JlcG9ydHMvVGh1bWJSdWxlUmVwb3J0Jyk7XHJcbmltcG9ydCBBdXRoSW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi8uLi9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvcicpO1xyXG5pbXBvcnQgQ29zdEhlYWQgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vbmdvb3NlL0Nvc3RIZWFkJyk7XHJcbmltcG9ydCBFc3RpbWF0ZVJlcG9ydCA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9yZXBvcnRzL0VzdGltYXRlUmVwb3J0Jyk7XHJcbmltcG9ydCBQcm9qZWN0UmVwb3J0ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L3JlcG9ydHMvUHJvamVjdFJlcG9ydCcpO1xyXG5pbXBvcnQgVGh1bWJSdWxlID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1RodW1iUnVsZScpO1xyXG5pbXBvcnQgRXN0aW1hdGUgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvRXN0aW1hdGUnKTtcclxuaW1wb3J0IFJhdGVBbmFseXNpc1NlcnZpY2UgPSByZXF1aXJlKCcuL1JhdGVBbmFseXNpc1NlcnZpY2UnKTtcclxuaW1wb3J0IENhdGVnb3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL0NhdGVnb3J5Jyk7XHJcbmltcG9ydCBhbGFzcWwgPSByZXF1aXJlKCdhbGFzcWwnKTtcclxuaW1wb3J0IENvbnN0YW50cyA9IHJlcXVpcmUoJy4uL3NoYXJlZC9jb25zdGFudHMnKTtcclxuaW1wb3J0IFByb2plY3RTZXJ2aWNlID0gcmVxdWlyZSgnLi9Qcm9qZWN0U2VydmljZScpO1xyXG5pbXBvcnQgQ2VudHJhbGl6ZWRSYXRlID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L0NlbnRyYWxpemVkUmF0ZScpO1xyXG5pbXBvcnQgTWF0ZXJpYWxEZXRhaWxEVE8gPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL2R0by9wcm9qZWN0L01hdGVyaWFsRGV0YWlsRFRPJyk7XHJcbmltcG9ydCBXb3JrSXRlbSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9idWlsZGluZy9Xb3JrSXRlbScpO1xyXG5pbXBvcnQge1F1YW50aXR5RGV0YWlsc30gZnJvbSAnLi4vLi4vLi4vLi4vY2xpZW50L2FwcC9idWlsZC1pbmZvL2ZyYW1ld29yay9tb2RlbC9xdWFudGl0eS1kZXRhaWxzJztcclxuaW1wb3J0IE1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzRFRPID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9kdG8vUmVwb3J0L01hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzRFRPJyk7XHJcbmltcG9ydCBNYXRlcmlhbFRha2VPZmZGaWx0ZXJzTGlzdERUTyA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvZHRvL1JlcG9ydC9NYXRlcmlhbFRha2VPZmZGaWx0ZXJzTGlzdERUTycpO1xyXG5pbXBvcnQge2VsZW1lbnR9IGZyb20gJ3Byb3RyYWN0b3InO1xyXG5pbXBvcnQgTWF0ZXJpYWxUYWtlT2ZmUmVwb3J0ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L3JlcG9ydHMvTWF0ZXJpYWxUYWtlT2ZmUmVwb3J0Jyk7XHJcbmltcG9ydCBNYXRlcmlhbFRha2VPZmZUYWJsZVZpZXcgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9NYXRlcmlhbFRha2VPZmZUYWJsZVZpZXcnKTtcclxuaW1wb3J0IE1hdGVyaWFsVGFrZU9mZlNlY29uZGFyeVZpZXcgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9NYXRlcmlhbFRha2VPZmZTZWNvbmRhcnlWaWV3Jyk7XHJcbmltcG9ydCBNYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdDb250ZW50ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L3JlcG9ydHMvTWF0ZXJpYWxUYWtlT2ZmVGFibGVWaWV3Q29udGVudCcpO1xyXG5pbXBvcnQgTWF0ZXJpYWxUYWtlT2ZmVGFibGVWaWV3U3ViQ29udGVudCA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9yZXBvcnRzL01hdGVyaWFsVGFrZU9mZlRhYmxlVmlld1N1YkNvbnRlbnQnKTtcclxuaW1wb3J0IE1hdGVyaWFsVGFrZU9mZlRhYmxlVmlld0hlYWRlcnMgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9NYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdIZWFkZXJzJyk7XHJcbmltcG9ydCBNYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdGb290ZXIgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9NYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdGb290ZXInKTtcclxuaW1wb3J0IENvc3RDb250cm9sbEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuLi9leGNlcHRpb24vQ29zdENvbnRyb2xsRXhjZXB0aW9uXCIpO1xyXG5pbXBvcnQgTWF0ZXJpYWxUYWtlT2ZmVmlldyA9IHJlcXVpcmUoXCIuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9NYXRlcmlhbFRha2VPZmZWaWV3XCIpO1xyXG5sZXQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XHJcbnZhciBsb2c0anMgPSByZXF1aXJlKCdsb2c0anMnKTtcclxudmFyIGxvZ2dlcj1sb2c0anMuZ2V0TG9nZ2VyKCdSZXBvcnQgU2VydmljZScpO1xyXG5cclxuY2xhc3MgUmVwb3J0U2VydmljZSB7XHJcbiAgQVBQX05BTUU6IHN0cmluZztcclxuICBjb21wYW55X25hbWU6IHN0cmluZztcclxuICBwcml2YXRlIHByb2plY3RSZXBvc2l0b3J5OiBQcm9qZWN0UmVwb3NpdG9yeTtcclxuICBwcml2YXRlIGJ1aWxkaW5nUmVwb3NpdG9yeTogQnVpbGRpbmdSZXBvc2l0b3J5O1xyXG4gIHByaXZhdGUgYXV0aEludGVyY2VwdG9yOiBBdXRoSW50ZXJjZXB0b3I7XHJcbiAgcHJpdmF0ZSB1c2VyU2VydmljZSA6IFVzZXJTZXJ2aWNlO1xyXG4gIHByaXZhdGUgcmF0ZUFuYWx5c2lzU2VydmljZSA6IFJhdGVBbmFseXNpc1NlcnZpY2U7XHJcbiAgcHJpdmF0ZSBwcm9qZWN0U2VydmljZSA6IFByb2plY3RTZXJ2aWNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkgPSBuZXcgUHJvamVjdFJlcG9zaXRvcnkoKTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5ID0gbmV3IEJ1aWxkaW5nUmVwb3NpdG9yeSgpO1xyXG4gICAgdGhpcy5BUFBfTkFNRSA9IFByb2plY3RBc3NldC5BUFBfTkFNRTtcclxuICAgIHRoaXMuYXV0aEludGVyY2VwdG9yID0gbmV3IEF1dGhJbnRlcmNlcHRvcigpO1xyXG4gICAgdGhpcy51c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xyXG4gICAgdGhpcy5yYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICB9XHJcblxyXG4gIGdldFJlcG9ydCggcHJvamVjdElkIDogYW55LCByZXBvcnRUeXBlIDogc3RyaW5nLCByYXRlVW5pdCA6IHN0cmluZywgYXJlYVR5cGUgOiBzdHJpbmcs4oCC4oCCdXNlcjogVXNlcixcclxuICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnUmVwb3J0IFNlcnZpY2UsIGdldFJlcG9ydCBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHBvcHVsYXRlID0ge3BhdGggOiAnYnVpbGRpbmdzJ307XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRBbmRQb3B1bGF0ZShxdWVyeSwgcG9wdWxhdGUsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZmluZEFuZFBvcHVsYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZihlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgYnVpbGRpbmdzID0gcmVzdWx0WzBdLmJ1aWxkaW5ncztcclxuICAgICAgICB2YXIgdHlwZU9mQXJlYTogc3RyaW5nO1xyXG4gICAgICAgIGxldCB0b3RhbEFyZWE6IG51bWJlcjtcclxuICAgICAgICBsZXQgY2hvaWNlID0gYXJlYVR5cGU7XHJcbiAgICAgICAgc3dpdGNoIChjaG9pY2UpIHtcclxuICAgICAgICAgIGNhc2UgQ29uc3RhbnRzLlNMQUJfQVJFQTpcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdHlwZU9mQXJlYSA9IENvbnN0YW50cy5UT1RBTF9TTEFCX0FSRUE7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGNhc2UgQ29uc3RhbnRzLlNBTEVBQkxFX0FSRUE6XHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHR5cGVPZkFyZWEgPSBDb25zdGFudHMuVE9UQUxfU0FMRUFCTEVfQVJFQTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY2FzZSAgQ29uc3RhbnRzLkNBUlBFVF9BUkVBIDpcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdHlwZU9mQXJlYSA9IENvbnN0YW50cy5UT1RBTF9DQVJQRVRfQVJFQTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBkZWZhdWx0IDogIGNhbGxiYWNrKGVycm9yLG51bGwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAgbGV0IHRvdGFsT2ZBcmVhID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgUk9VTkQoU1VNKCcrdHlwZU9mQXJlYSsnKSwyKSBGUk9NID8nLFtidWlsZGluZ3NdKTtcclxuICAgICAgICBpZihyYXRlVW5pdCA9PT0gQ29uc3RhbnRzLlNRVVJFTUVURVJfVU5JVCkge1xyXG4gICAgICAgICB0b3RhbEFyZWEgPXRvdGFsT2ZBcmVhICogY29uZmlnLmdldChDb25zdGFudHMuU1FVQVJFX01FVEVSKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdG90YWxBcmVhID0gdG90YWxPZkFyZWE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBwcm9qZWN0UmVwb3J0IDogUHJvamVjdFJlcG9ydCA9IG5ldyBQcm9qZWN0UmVwb3J0KCk7XHJcblxyXG4gICAgICAgIHByb2plY3RSZXBvcnQuYnVpbGRpbmdzID0gdGhpcy5nZW5lcmF0ZVJlcG9ydEJ5Q29zdEhlYWRzKGJ1aWxkaW5ncywgdHlwZU9mQXJlYSwgcmF0ZVVuaXQpO1xyXG5cclxuICAgICAgICBsZXQgcHJvamVjdENvc3RIZWFkcyA9IHJlc3VsdFswXS5wcm9qZWN0Q29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBwcm9qZWN0UmF0ZXMgPSByZXN1bHRbMF0ucmF0ZXM7XHJcbiAgICAgICAgaWYocHJvamVjdENvc3RIZWFkcyE9PSBudWxsKSB7XHJcbiAgICAgICAgICBwcm9qZWN0UmVwb3J0LmNvbW1vbkFtZW5pdGllcyA9IHRoaXMuZ2VuZXJhdGVSZXBvcnRGb3JQcm9qZWN0Q29zdEhlYWRzKHByb2plY3RDb3N0SGVhZHMsIHByb2plY3RSYXRlcywgdG90YWxBcmVhLCByYXRlVW5pdCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwsZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsYmFjayhudWxsLHsgZGF0YTogcHJvamVjdFJlcG9ydCwgYWNjZXNzX3Rva2VuOiB0aGlzLmF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKX0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdlbmVyYXRlUmVwb3J0QnlDb3N0SGVhZHMoIGJ1aWxkaW5nczogIEFycmF5PEJ1aWxkaW5nPiAsIHR5cGVPZkFyZWE6IHN0cmluZywgcmF0ZVVuaXQ6IHN0cmluZykge1xyXG5cclxuICAgIGxldCBidWlsZGluZ3NSZXBvcnQgOiBBcnJheTxCdWlsZGluZ1JlcG9ydD4gPSBuZXcgQXJyYXk8QnVpbGRpbmdSZXBvcnQ+KCk7XHJcbiAgICBmb3IgKGxldCBidWlsZGluZyBvZiBidWlsZGluZ3MpIHtcclxuICAgICAgbGV0IGJ1aWxkaW5nUmVwb3J0ID0gbmV3IEJ1aWxkaW5nUmVwb3J0O1xyXG4gICAgICBidWlsZGluZ1JlcG9ydC5uYW1lID0gYnVpbGRpbmcubmFtZTtcclxuICAgICAgYnVpbGRpbmdSZXBvcnQuX2lkID0gYnVpbGRpbmcuX2lkO1xyXG4gICAgICBpZihyYXRlVW5pdCA9PT0gQ29uc3RhbnRzLlNRVVJFTUVURVJfVU5JVCkge1xyXG4gICAgICAgIGJ1aWxkaW5nUmVwb3J0LmFyZWEgPSAgYnVpbGRpbmdbdHlwZU9mQXJlYV0gKiBjb25maWcuZ2V0KENvbnN0YW50cy5TUVVBUkVfTUVURVIpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGJ1aWxkaW5nUmVwb3J0LmFyZWEgPSBidWlsZGluZ1t0eXBlT2ZBcmVhXTtcclxuICAgICAgfVxyXG4gICAgICBsZXQgdGh1bWJSdWxlICA9IG5ldyBUaHVtYlJ1bGUoKTtcclxuICAgICAgbGV0IGVzdGltYXRlICA9IG5ldyBFc3RpbWF0ZSgpO1xyXG4gICAgICBsZXQgdGh1bWJSdWxlUmVwb3J0cyA9IG5ldyBBcnJheTxUaHVtYlJ1bGVSZXBvcnQ+KCk7XHJcbiAgICAgIGxldCBlc3RpbWF0ZWRSZXBvcnRzID0gbmV3IEFycmF5PEVzdGltYXRlUmVwb3J0PigpO1xyXG5cclxuXHJcbiAgICAgIHRoaXMuZ2V0VGh1bWJSdWxlQW5kRXN0aW1hdGVkUmVwb3J0KGJ1aWxkaW5nLCBidWlsZGluZ1JlcG9ydCwgdGh1bWJSdWxlUmVwb3J0cywgZXN0aW1hdGVkUmVwb3J0cywgcmF0ZVVuaXQpO1xyXG5cclxuICAgICAgbGV0IHRvdGFsUmF0ZXMgPSBhbGFzcWwoJ1NFTEVDVCBST1VORChTVU0oYW1vdW50KSwyKSBBUyB0b3RhbEFtb3VudCwgUk9VTkQoU1VNKHJhdGUpLDIpIEFTIHRvdGFsUmF0ZSBGUk9NID8nLFt0aHVtYlJ1bGVSZXBvcnRzXSk7XHJcbiAgICAgIHRodW1iUnVsZS50b3RhbFJhdGUgPSB0b3RhbFJhdGVzWzBdLnRvdGFsUmF0ZTtcclxuICAgICAgdGh1bWJSdWxlLnRvdGFsQnVkZ2V0ZWRDb3N0ID0gTWF0aC5yb3VuZCh0b3RhbFJhdGVzWzBdLnRvdGFsQW1vdW50KTtcclxuICAgICAgdGh1bWJSdWxlLnRodW1iUnVsZVJlcG9ydHMgPSB0aHVtYlJ1bGVSZXBvcnRzO1xyXG5cclxuICAgICAgbGV0IHRvdGFsRXN0aW1hdGVkUmF0ZXMgPSBhbGFzcWwoJ1NFTEVDVCBST1VORChTVU0odG90YWwpLDIpIEFTIHRvdGFsQW1vdW50LCBST1VORChTVU0ocmF0ZSksMikgQVMgdG90YWxSYXRlIEZST00gPycsXHJcbiAgICAgICAgW2VzdGltYXRlZFJlcG9ydHNdKTtcclxuICAgICAgZXN0aW1hdGUudG90YWxSYXRlID0gdG90YWxFc3RpbWF0ZWRSYXRlc1swXS50b3RhbFJhdGU7XHJcbiAgICAgIGVzdGltYXRlLnRvdGFsRXN0aW1hdGVkQ29zdCA9IHRvdGFsRXN0aW1hdGVkUmF0ZXNbMF0udG90YWxBbW91bnQ7XHJcbiAgICAgIGVzdGltYXRlLmVzdGltYXRlZENvc3RzID0gZXN0aW1hdGVkUmVwb3J0cztcclxuXHJcbiAgICAgIGJ1aWxkaW5nUmVwb3J0LnRodW1iUnVsZSA9IHRodW1iUnVsZTtcclxuICAgICAgYnVpbGRpbmdSZXBvcnQuZXN0aW1hdGUgPSBlc3RpbWF0ZTtcclxuICAgICAgYnVpbGRpbmdzUmVwb3J0LnB1c2goYnVpbGRpbmdSZXBvcnQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuKGJ1aWxkaW5nc1JlcG9ydCk7XHJcbiAgfVxyXG5cclxuXHJcbiAgZ2V0VGh1bWJSdWxlQW5kRXN0aW1hdGVkUmVwb3J0KGJ1aWxkaW5nIDpCdWlsZGluZywgYnVpbGRpbmdSZXBvcnQ6IEJ1aWxkaW5nUmVwb3J0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHVtYlJ1bGVSZXBvcnRzOiBUaHVtYlJ1bGVSZXBvcnRbXSwgZXN0aW1hdGVkUmVwb3J0czogRXN0aW1hdGVSZXBvcnRbXSwgcmF0ZVVuaXQ6c3RyaW5nKSB7XHJcblxyXG4gICAgZm9yIChsZXQgY29zdEhlYWQgb2YgYnVpbGRpbmcuY29zdEhlYWRzKSB7XHJcblxyXG4gICAgICBpZihjb3N0SGVhZC5hY3RpdmUpIHtcclxuICAgICAgICAvL1RodW1iUnVsZSBSZXBvcnRcclxuICAgICAgICBsZXQgdGh1bWJSdWxlUmVwb3J0ID0gbmV3IFRodW1iUnVsZVJlcG9ydCgpO1xyXG4gICAgICAgIHRodW1iUnVsZVJlcG9ydC5uYW1lID0gY29zdEhlYWQubmFtZTtcclxuICAgICAgICB0aHVtYlJ1bGVSZXBvcnQucmF0ZUFuYWx5c2lzSWQgPSBjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZDtcclxuICAgICAgICB0aHVtYlJ1bGVSZXBvcnQuYW1vdW50ID0gTWF0aC5yb3VuZChjb3N0SGVhZC5idWRnZXRlZENvc3RBbW91bnQpO1xyXG4gICAgICAgIHRodW1iUnVsZVJlcG9ydC5jb3N0SGVhZEFjdGl2ZSA9IGNvc3RIZWFkLmFjdGl2ZTtcclxuICAgICAgICB0aHVtYlJ1bGVSZXBvcnQucmF0ZSA9IHRodW1iUnVsZVJlcG9ydC5hbW91bnQgLyBidWlsZGluZ1JlcG9ydC5hcmVhO1xyXG4gICAgICAgIHRodW1iUnVsZVJlcG9ydHMucHVzaCh0aHVtYlJ1bGVSZXBvcnQpO1xyXG5cclxuICAgICAgICAvL0VzdGltYXRlZCBjb3N0IFJlcG9ydFxyXG4gICAgICAgIGxldCBlc3RpbWF0ZVJlcG9ydCA9IG5ldyBFc3RpbWF0ZVJlcG9ydCgpO1xyXG4gICAgICAgIGVzdGltYXRlUmVwb3J0ID0gdGhpcy5nZXRFc3RpbWF0ZWRSZXBvcnQoYnVpbGRpbmcucmF0ZXMsIGNvc3RIZWFkLCBidWlsZGluZ1JlcG9ydC5hcmVhLCByYXRlVW5pdCk7XHJcbiAgICAgICAgZXN0aW1hdGVkUmVwb3J0cy5wdXNoKGVzdGltYXRlUmVwb3J0KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0RXN0aW1hdGVkUmVwb3J0KGNlbnRyYWxpemVkUmF0ZXM6QXJyYXk8Q2VudHJhbGl6ZWRSYXRlPiwgY29zdEhlYWQ6IGFueSwgYXJlYTpudW1iZXIsIHJhdGVVbml0OnN0cmluZykge1xyXG5cclxuICAgIGxldCBlc3RpbWF0ZVJlcG9ydCA9IG5ldyBFc3RpbWF0ZVJlcG9ydCgpO1xyXG4gICAgZXN0aW1hdGVSZXBvcnQubmFtZSA9IGNvc3RIZWFkLm5hbWU7XHJcbiAgICBlc3RpbWF0ZVJlcG9ydC5yYXRlQW5hbHlzaXNJZCA9IGNvc3RIZWFkLnJhdGVBbmFseXNpc0lkO1xyXG5cclxuICAgIGxldCBjb3N0SGVhZENhdGVnb3JpZXM6IEFycmF5PENhdGVnb3J5PiA9IGNvc3RIZWFkLmNhdGVnb3JpZXM7XHJcbiAgICBsZXQgcHJvamVjdFNlcnZpY2UgOiBQcm9qZWN0U2VydmljZSA9IG5ldyBQcm9qZWN0U2VydmljZSgpO1xyXG4gICAgbGV0IGNhdGVnb3JpZXNPYmogPSBwcm9qZWN0U2VydmljZS5nZXRDYXRlZ29yaWVzTGlzdFdpdGhDZW50cmFsaXplZFJhdGVzKGNvc3RIZWFkQ2F0ZWdvcmllcywgY2VudHJhbGl6ZWRSYXRlcyk7XHJcbiAgICBlc3RpbWF0ZVJlcG9ydC50b3RhbCA9IGNhdGVnb3JpZXNPYmouY2F0ZWdvcmllc0Ftb3VudDtcclxuICAgIGVzdGltYXRlUmVwb3J0LnJhdGUgPSBlc3RpbWF0ZVJlcG9ydC50b3RhbCAvIGFyZWE7XHJcbiAgICByZXR1cm4gZXN0aW1hdGVSZXBvcnQ7XHJcbiAgfVxyXG5cclxuICBnZW5lcmF0ZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZHMocHJvamVjdENvc3RIZWFkczogIEFycmF5PENvc3RIZWFkPiwgcHJvamVjdFJhdGVzOiBBcnJheTxDZW50cmFsaXplZFJhdGU+LCB0b3RhbEFyZWE6IG51bWJlcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhdGVVbml0OiBzdHJpbmcpIHtcclxuICAgIGxldCBjb21tb25BbWVuaXRpZXNSZXBvcnQgOiBBcnJheTxCdWlsZGluZ1JlcG9ydD4gPSBuZXcgQXJyYXk8QnVpbGRpbmdSZXBvcnQ+KCk7XHJcbiAgICAgIGxldCBwcm9qZWN0UmVwb3J0ID0gbmV3IEJ1aWxkaW5nUmVwb3J0O1xyXG4gICAgICBwcm9qZWN0UmVwb3J0Lm5hbWUgPSBDb25zdGFudHMuQU1FTklUSUVTO1xyXG4gICAgICBwcm9qZWN0UmVwb3J0LmFyZWEgPSB0b3RhbEFyZWE7XHJcblxyXG4gICAgICBsZXQgdGh1bWJSdWxlICA9IG5ldyBUaHVtYlJ1bGUoKTtcclxuICAgICAgbGV0IGVzdGltYXRlICA9IG5ldyBFc3RpbWF0ZSgpO1xyXG4gICAgICBsZXQgdGh1bWJSdWxlUmVwb3J0cyA9IG5ldyBBcnJheTxUaHVtYlJ1bGVSZXBvcnQ+KCk7XHJcbiAgICAgIGxldCBlc3RpbWF0ZWRSZXBvcnRzID0gbmV3IEFycmF5PEVzdGltYXRlUmVwb3J0PigpO1xyXG5cclxuXHJcbiAgICAgIHRoaXMuZ2V0VGh1bWJSdWxlQW5kRXN0aW1hdGVkUmVwb3J0Rm9yUHJvamVjdENvc3RIZWFkKHByb2plY3RDb3N0SGVhZHMsIHByb2plY3RSYXRlcyxcclxuICAgICAgICBwcm9qZWN0UmVwb3J0LCB0aHVtYlJ1bGVSZXBvcnRzLCBlc3RpbWF0ZWRSZXBvcnRzLCB0b3RhbEFyZWEsIHJhdGVVbml0KTtcclxuXHJcbiAgICBsZXQgdG90YWxSYXRlcyA9IGFsYXNxbCgnU0VMRUNUIFJPVU5EKFNVTShhbW91bnQpLDIpIEFTIHRvdGFsQW1vdW50LCBST1VORChTVU0ocmF0ZSksMikgQVMgdG90YWxSYXRlIEZST00gPycsW3RodW1iUnVsZVJlcG9ydHNdKTtcclxuICAgICAgdGh1bWJSdWxlLnRvdGFsUmF0ZSA9IHRvdGFsUmF0ZXNbMF0udG90YWxSYXRlO1xyXG4gICAgICB0aHVtYlJ1bGUudG90YWxCdWRnZXRlZENvc3QgPSBNYXRoLnJvdW5kKHRvdGFsUmF0ZXNbMF0udG90YWxBbW91bnQpO1xyXG4gICAgICB0aHVtYlJ1bGUudGh1bWJSdWxlUmVwb3J0cyA9IHRodW1iUnVsZVJlcG9ydHM7XHJcblxyXG4gICAgbGV0IHRvdGFsRXN0aW1hdGVkUmF0ZXMgPSBhbGFzcWwoJ1NFTEVDVCBST1VORChTVU0odG90YWwpLDIpIEFTIHRvdGFsQW1vdW50LCBST1VORChTVU0ocmF0ZSksMikgQVMgdG90YWxSYXRlIEZST00gPycsXHJcbiAgICAgIFtlc3RpbWF0ZWRSZXBvcnRzXSk7XHJcbiAgICAgIGVzdGltYXRlLnRvdGFsUmF0ZSA9IHRvdGFsRXN0aW1hdGVkUmF0ZXNbMF0udG90YWxSYXRlO1xyXG4gICAgICBlc3RpbWF0ZS50b3RhbEVzdGltYXRlZENvc3QgPSB0b3RhbEVzdGltYXRlZFJhdGVzWzBdLnRvdGFsQW1vdW50O1xyXG4gICAgICBlc3RpbWF0ZS5lc3RpbWF0ZWRDb3N0cyA9IGVzdGltYXRlZFJlcG9ydHM7XHJcblxyXG4gICAgICBwcm9qZWN0UmVwb3J0LnRodW1iUnVsZSA9IHRodW1iUnVsZTtcclxuICAgICAgcHJvamVjdFJlcG9ydC5lc3RpbWF0ZSA9IGVzdGltYXRlO1xyXG4gICAgY29tbW9uQW1lbml0aWVzUmVwb3J0LnB1c2gocHJvamVjdFJlcG9ydCk7XHJcbiAgICByZXR1cm4oY29tbW9uQW1lbml0aWVzUmVwb3J0KTtcclxuICB9XHJcblxyXG4gIGdldFRodW1iUnVsZUFuZEVzdGltYXRlZFJlcG9ydEZvclByb2plY3RDb3N0SGVhZChwcm9qZWN0Q29zdEhlYWQ6IEFycmF5PENvc3RIZWFkPiwgcHJvamVjdFJhdGVzOiBBcnJheTxDZW50cmFsaXplZFJhdGU+LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0UmVwb3J0OiBCdWlsZGluZ1JlcG9ydCwgdGh1bWJSdWxlUmVwb3J0czogVGh1bWJSdWxlUmVwb3J0W10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVzdGltYXRlZFJlcG9ydHM6IEVzdGltYXRlUmVwb3J0W10sIHRvdGFsQXJlYTpudW1iZXIsIHJhdGVVbml0OnN0cmluZykge1xyXG4gIGZvciAobGV0IGNvc3RIZWFkICBvZiBwcm9qZWN0Q29zdEhlYWQpIHtcclxuICAgIGlmIChjb3N0SGVhZC5hY3RpdmUpIHtcclxuICAgICAgLy9UaHVtYlJ1bGUgUmVwb3J0XHJcbiAgICAgIGxldCB0aHVtYlJ1bGVSZXBvcnQgPSBuZXcgVGh1bWJSdWxlUmVwb3J0KCk7XHJcbiAgICAgIHRodW1iUnVsZVJlcG9ydC5uYW1lID0gY29zdEhlYWQubmFtZTtcclxuICAgICAgdGh1bWJSdWxlUmVwb3J0LnJhdGVBbmFseXNpc0lkID0gY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQ7XHJcbiAgICAgIHRodW1iUnVsZVJlcG9ydC5hbW91bnQgPSBNYXRoLnJvdW5kKGNvc3RIZWFkLmJ1ZGdldGVkQ29zdEFtb3VudCk7XHJcbiAgICAgIHRodW1iUnVsZVJlcG9ydC5jb3N0SGVhZEFjdGl2ZSA9IGNvc3RIZWFkLmFjdGl2ZTtcclxuICAgICAgdGh1bWJSdWxlUmVwb3J0LnJhdGUgPSB0aHVtYlJ1bGVSZXBvcnQuYW1vdW50IC8gdG90YWxBcmVhO1xyXG4gICAgICB0aHVtYlJ1bGVSZXBvcnRzLnB1c2godGh1bWJSdWxlUmVwb3J0KTtcclxuXHJcbiAgICAgIC8vRXN0aW1hdGVkIGNvc3QgUmVwb3J0XHJcbiAgICAgIGxldCBlc3RpbWF0ZVJlcG9ydCA9IG5ldyBFc3RpbWF0ZVJlcG9ydCgpO1xyXG4gICAgICBlc3RpbWF0ZVJlcG9ydCA9IHRoaXMuZ2V0RXN0aW1hdGVkUmVwb3J0KHByb2plY3RSYXRlcywgY29zdEhlYWQsIHRvdGFsQXJlYSwgcmF0ZVVuaXQpO1xyXG4gICAgICBlc3RpbWF0ZWRSZXBvcnRzLnB1c2goZXN0aW1hdGVSZXBvcnQpO1xyXG4gICAgfVxyXG4gICB9XHJcbiAgfVxyXG5cclxuXHJcbiAgZ2V0Q29zdEhlYWRzKCAgdXJsOiBzdHJpbmcgLCB1c2VyOiBVc2VyLGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZ2V0Q29zdEhlYWRzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5yYXRlQW5hbHlzaXNTZXJ2aWNlLmdldENvc3RIZWFkcyggdXJsLCB1c2VyLChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yIDogJytKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLHsgZGF0YTogcmVzdWx0LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0V29ya0l0ZW1zKCB1cmw6IHN0cmluZyAsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZ2V0V29ya0l0ZW1zIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5yYXRlQW5hbHlzaXNTZXJ2aWNlLmdldFdvcmtJdGVtcyggdXJsLCB1c2VyLChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yIDogJytKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLHsgZGF0YTogcmVzdWx0LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0TWF0ZXJpYWxEZXRhaWxzKCBwcm9qZWN0SWQgOiBhbnks4oCCdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnUmVwb3J0IFNlcnZpY2UsIGdldE1hdGVyaWFsRGV0YWlscyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHBvcHVsYXRlID0ge3BhdGggOiAnYnVpbGRpbmdzJ307XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRBbmRQb3B1bGF0ZShxdWVyeSwgcG9wdWxhdGUsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZmluZEFuZFBvcHVsYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZihlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB0aGlzLmdldEJ1aWxkaW5nTWF0ZXJpYWxEZXRhaWxzKHJlc3VsdFswXS5idWlsZGluZ3MpKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRCdWlsZGluZ01hdGVyaWFsRGV0YWlscyhidWlsZGluZ3MgOiBBcnJheTxCdWlsZGluZz4pOiBBcnJheTxNYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0RUTz4ge1xyXG4gICAgbGV0IG1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzQXJyYXkgOiBBcnJheTxNYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0RUTz49IG5ldyBBcnJheTxNYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0RUTz4oKTtcclxuICAgIGxldCBidWlsZGluZ05hbWU6IHN0cmluZztcclxuICAgIGZvcihsZXQgYnVpbGRpbmc6IEJ1aWxkaW5nIG9mIGJ1aWxkaW5ncykge1xyXG4gICAgICBidWlsZGluZ05hbWUgPSBidWlsZGluZy5uYW1lO1xyXG4gICAgICB0aGlzLmFkZE1hdGVyaWFsRFRPRm9yQWN0aXZlQ29zdEhlYWRJbkRUT0FycmF5KGJ1aWxkaW5nLCBidWlsZGluZ05hbWUsIG1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzQXJyYXkpO1xyXG5cclxuICAgIH1cclxuICAgIHJldHVybiBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5O1xyXG4gIH1cclxuXHJcbiAgZ2V0TWF0ZXJpYWxGaWx0ZXJzKCBwcm9qZWN0SWQgOiBhbnks4oCCdXNlcjogVXNlcixcclxuICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnUmVwb3J0IFNlcnZpY2UsIGdldE1hdGVyaWFsRmlsdGVycyBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHBvcHVsYXRlID0ge3BhdGggOiAnYnVpbGRpbmdzJ307XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRBbmRQb3B1bGF0ZShxdWVyeSwgcG9wdWxhdGUsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZmluZEFuZFBvcHVsYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZihlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB0aGlzLmdldE1hdGVyaWFsVGFrZU9mZkZpbHRlck9iamVjdChyZXN1bHRbMF0uYnVpbGRpbmdzKSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0TWF0ZXJpYWxUYWtlT2ZmUmVwb3J0KCBwcm9qZWN0SWQgOiBhbnksIGJ1aWxkaW5nOiBzdHJpbmcsIGVsZW1lbnRXaXNlUmVwb3J0OiBzdHJpbmcsIGVsZW1lbnQ6IHN0cmluZyzigIJ1c2VyOiBVc2VyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZ2V0TWF0ZXJpYWxUYWtlT2ZmUmVwb3J0IGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgbGV0IHF1ZXJ5ID0geyBfaWQ6IHByb2plY3RJZH07XHJcbiAgICBsZXQgcG9wdWxhdGUgPSB7cGF0aCA6ICdidWlsZGluZ3MnfTtcclxuICAgIGlmKGJ1aWxkaW5nICE9PSBDb25zdGFudHMuU1RSX0FMTF9CVUlMRElORykge1xyXG4gICAgICBwb3B1bGF0ZSA9IHtwYXRoIDogJ2J1aWxkaW5ncycsIG1hdGNoOntuYW1lOiBidWlsZGluZ319O1xyXG4gICAgfVxyXG4gICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQW5kUG9wdWxhdGUocXVlcnksIHBvcHVsYXRlLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUmVwb3J0IFNlcnZpY2UsIGZpbmRBbmRQb3B1bGF0ZSBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgaWYoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYocmVzdWx0WzBdLmJ1aWxkaW5ncy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG5ldyBDb3N0Q29udHJvbGxFeGNlcHRpb24oJ1VuYWJsZSB0byBmaW5kIEJ1aWxkaW5nJyxudWxsKSwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5OiBBcnJheTxNYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0RUTz4gPSB0aGlzLmdldEJ1aWxkaW5nTWF0ZXJpYWxEZXRhaWxzKHJlc3VsdFswXS5idWlsZGluZ3MpO1xyXG4gICAgICAgIGxldCBtYXRlcmlhbFJlcG9ydFJvd0RhdGEgPVxyXG4gICAgICAgICAgdGhpcy5nZXRNYXRlcmlhbERhdGFGcm9tRmxhdERldGFpbHNBcnJheShlbGVtZW50V2lzZVJlcG9ydCwgZWxlbWVudCwgYnVpbGRpbmcsIG1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzQXJyYXkpO1xyXG4gICAgICAgIGlmKG1hdGVyaWFsUmVwb3J0Um93RGF0YS5sZW5ndGg+MCAmJiBtYXRlcmlhbFJlcG9ydFJvd0RhdGFbMF0uaGVhZGVyICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgIGxldCBtYXRlcmlhbFRha2VPZmZSZXBvcnQ6IE1hdGVyaWFsVGFrZU9mZlJlcG9ydCA9IG5ldyBNYXRlcmlhbFRha2VPZmZSZXBvcnQobnVsbCwgbnVsbCk7XHJcbiAgICAgICAgICBtYXRlcmlhbFRha2VPZmZSZXBvcnQuc2Vjb25kYXJ5VmlldyA9IHt9O1xyXG4gICAgICAgICAgdGhpcy5wb3B1bGF0ZU1hdGVyaWFsVGFrZU9mZlJlcG9ydEZyb21Sb3dEYXRhKG1hdGVyaWFsUmVwb3J0Um93RGF0YSwgbWF0ZXJpYWxUYWtlT2ZmUmVwb3J0LCBlbGVtZW50V2lzZVJlcG9ydCwgYnVpbGRpbmcpO1xyXG4gICAgICAgICAgbGV0IHJlc3BvbnNlRGF0YSA9IHt9O1xyXG4gICAgICAgICAgcmVzcG9uc2VEYXRhW2VsZW1lbnRdPSBtYXRlcmlhbFRha2VPZmZSZXBvcnQ7XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXNwb25zZURhdGEpO1xyXG4gICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG5ldyBDb3N0Q29udHJvbGxFeGNlcHRpb24oJ01hdGVyaWFsIFRha2VPZmYgUmVwb3J0IE5vdCBGb3VuZCBGb3IgJysgYnVpbGRpbmcgLCBudWxsKSwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcG9wdWxhdGVNYXRlcmlhbFRha2VPZmZSZXBvcnRGcm9tUm93RGF0YShtYXRlcmlhbFJlcG9ydFJvd0RhdGE6IGFueSwgbWF0ZXJpYWxUYWtlT2ZmUmVwb3J0OiBNYXRlcmlhbFRha2VPZmZSZXBvcnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRXaXNlUmVwb3J0OiBzdHJpbmcsIGJ1aWxkaW5nOiBzdHJpbmcpIHtcclxuICAgIGZvciAobGV0IHJlY29yZCBvZiBtYXRlcmlhbFJlcG9ydFJvd0RhdGEpIHtcclxuICAgICAgaWYgKG1hdGVyaWFsVGFrZU9mZlJlcG9ydC5zZWNvbmRhcnlWaWV3W3JlY29yZC5oZWFkZXJdID09PSB1bmRlZmluZWQgfHxcclxuICAgICAgICBtYXRlcmlhbFRha2VPZmZSZXBvcnQuc2Vjb25kYXJ5Vmlld1tyZWNvcmQuaGVhZGVyXSA9PT0gbnVsbCkge1xyXG4gICAgICAgIG1hdGVyaWFsVGFrZU9mZlJlcG9ydC50aXRsZSA9IGJ1aWxkaW5nO1xyXG4gICAgICAgIC8qaWYoZWxlbWVudFdpc2VSZXBvcnQgPT09IENvbnN0YW50cy5TVFJfTUFURVJJQUwpIHsqL1xyXG4gICAgICAgICAgbGV0IG1hdGVyaWFsVGFrZU9mZlJlcG9ydFN1YlRpdGxlOiBNYXRlcmlhbFRha2VPZmZWaWV3ID0gbmV3IE1hdGVyaWFsVGFrZU9mZlZpZXcoJycsIDAsICcnKTtcclxuICAgICAgICAgIC8vIG1hdGVyaWFsVGFrZU9mZlZpZXcgYXJndW1lbnRzIHRvdGFsK3VuaXQsIHRvdGFsLCB1bml0XHJcbiAgICAgICAgICBtYXRlcmlhbFRha2VPZmZSZXBvcnQuc3ViVGl0bGUgPSBtYXRlcmlhbFRha2VPZmZSZXBvcnRTdWJUaXRsZTtcclxuICAgICAgICAvKn0qL1xyXG4gICAgICAgIG1hdGVyaWFsVGFrZU9mZlJlcG9ydC5zZWNvbmRhcnlWaWV3W3JlY29yZC5oZWFkZXJdID0ge307XHJcbiAgICAgIH1cclxuICAgICAgbGV0IG1hdGVyaWFsVGFrZU9mZlNlY29uZGFyeVZpZXc6IE1hdGVyaWFsVGFrZU9mZlNlY29uZGFyeVZpZXcgPSBtYXRlcmlhbFRha2VPZmZSZXBvcnQuc2Vjb25kYXJ5Vmlld1tyZWNvcmQuaGVhZGVyXTtcclxuICAgICAgaWYobWF0ZXJpYWxUYWtlT2ZmU2Vjb25kYXJ5Vmlldy50YWJsZSA9PT0gdW5kZWZpbmVkIHx8IG1hdGVyaWFsVGFrZU9mZlNlY29uZGFyeVZpZXcudGFibGUgPT09IG51bGwpIHtcclxuICAgICAgICBtYXRlcmlhbFRha2VPZmZTZWNvbmRhcnlWaWV3LnRhYmxlID0gbmV3IE1hdGVyaWFsVGFrZU9mZlRhYmxlVmlldyhudWxsLCBudWxsLCBudWxsKTtcclxuICAgICAgfVxyXG4gICAgICBsZXQgdGFibGU6IE1hdGVyaWFsVGFrZU9mZlRhYmxlVmlldyA9IG1hdGVyaWFsVGFrZU9mZlNlY29uZGFyeVZpZXcudGFibGU7XHJcbiAgICAgIGlmKHRhYmxlLmNvbnRlbnQgPT09IG51bGwpIHtcclxuICAgICAgICB0YWJsZS5jb250ZW50ID0ge307XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHRhYmxlLmhlYWRlciA9PT0gbnVsbCkge1xyXG4gICAgICAgIGxldCBjb2x1bW5PbmU6IHN0cmluZyA9ICdJdGVtJztcclxuICAgICAgICBsZXQgY29sdW1uVHdvOiBzdHJpbmcgPSAnUXVhbnRpdHknO1xyXG4gICAgICAgIGxldCBjb2x1bW5UaHJlZTogc3RyaW5nID0gICdVbml0JztcclxuICAgICAgICBpZihlbGVtZW50V2lzZVJlcG9ydCA9PT0gQ29uc3RhbnRzLlNUUl9DT1NUSEVBRCAmJiBidWlsZGluZyA9PT0gQ29uc3RhbnRzLlNUUl9BTExfQlVJTERJTkcpe1xyXG4gICAgICAgICAgY29sdW1uT25lID0gJ0J1aWxkaW5nJztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGFibGUuaGVhZGVyID0gbmV3IE1hdGVyaWFsVGFrZU9mZlRhYmxlVmlld0hlYWRlcnMoY29sdW1uT25lLCBjb2x1bW5Ud28sIGNvbHVtblRocmVlKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IG1hdGVyaWFsVGFrZU9mZlRhYmxlVmlld1N1YkNvbnRlbnQgPSBudWxsO1xyXG4gICAgICBpZiAocmVjb3JkLnN1YlZhbHVlICYmIHJlY29yZC5zdWJWYWx1ZSAhPT0gJ2RlZmF1bHQnICYmIHJlY29yZC5zdWJWYWx1ZSAhPT0gJ0RpcmVjdCcpIHtcclxuICAgICAgICBtYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdTdWJDb250ZW50ID1cclxuICAgICAgICAgIG5ldyBNYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdTdWJDb250ZW50KHJlY29yZC5zdWJWYWx1ZSwgcmVjb3JkLlRvdGFsLCByZWNvcmQudW5pdCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHRhYmxlLmNvbnRlbnRbcmVjb3JkLnJvd1ZhbHVlXSA9PT0gdW5kZWZpbmVkIHx8IHRhYmxlLmNvbnRlbnRbcmVjb3JkLnJvd1ZhbHVlXSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRhYmxlLmNvbnRlbnRbcmVjb3JkLnJvd1ZhbHVlXSA9IG5ldyBNYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdDb250ZW50KHJlY29yZC5yb3dWYWx1ZSwgMCwgcmVjb3JkLnVuaXQsIHt9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IHRhYmxlVmlld0NvbnRlbnQ6IE1hdGVyaWFsVGFrZU9mZlRhYmxlVmlld0NvbnRlbnQgPSB0YWJsZS5jb250ZW50W3JlY29yZC5yb3dWYWx1ZV07XHJcbiAgICAgIHRhYmxlVmlld0NvbnRlbnQuY29sdW1uVHdvID0gdGFibGVWaWV3Q29udGVudC5jb2x1bW5Ud28gKyByZWNvcmQuVG90YWw7ICAgLy8gdXBkYXRlIHRvdGFsXHJcblxyXG4gICAgICBpZihtYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdTdWJDb250ZW50KSB7XHJcbiAgICAgICAgdGFibGVWaWV3Q29udGVudC5zdWJDb250ZW50W3JlY29yZC5zdWJWYWx1ZV0gPSBtYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdTdWJDb250ZW50O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsZXQgbWF0ZXJpYWxUYWtlT2ZmVGFibGVWaWV3Rm9vdGVyOiBNYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdGb290ZXIgPSBudWxsO1xyXG4gICAgICBpZih0YWJsZS5mb290ZXIgPT09IHVuZGVmaW5lZCB8fCB0YWJsZS5mb290ZXIgPT09IG51bGwpIHtcclxuICAgICAgICB0YWJsZS5mb290ZXIgPVxyXG4gICAgICAgICAgbmV3IE1hdGVyaWFsVGFrZU9mZlRhYmxlVmlld0Zvb3RlcignVG90YWwnLCAwLCByZWNvcmQudW5pdCk7XHJcbiAgICAgIH1cclxuICAgICAgbWF0ZXJpYWxUYWtlT2ZmVGFibGVWaWV3Rm9vdGVyID0gdGFibGUuZm9vdGVyO1xyXG4gICAgICBtYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdGb290ZXIuY29sdW1uVHdvID0gIG1hdGVyaWFsVGFrZU9mZlRhYmxlVmlld0Zvb3Rlci5jb2x1bW5Ud28gKyByZWNvcmQuVG90YWw7XHJcbiAgICAgIG1hdGVyaWFsVGFrZU9mZlNlY29uZGFyeVZpZXcudGl0bGUgPSBtYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdGb290ZXIuY29sdW1uVHdvICsgJyAnXHJcbiAgICAgICAgKyBtYXRlcmlhbFRha2VPZmZUYWJsZVZpZXdGb290ZXIuY29sdW1uVGhyZWU7XHJcbiAgICAgIGlmKGVsZW1lbnRXaXNlUmVwb3J0ID09PSBDb25zdGFudHMuU1RSX01BVEVSSUFMKSB7XHJcbiAgICAgICAgbWF0ZXJpYWxUYWtlT2ZmUmVwb3J0LnN1YlRpdGxlLmNvbHVtblR3byA9IG1hdGVyaWFsVGFrZU9mZlJlcG9ydC5zdWJUaXRsZS5jb2x1bW5Ud28gKyByZWNvcmQuVG90YWw7XHJcbiAgICAgICAgbWF0ZXJpYWxUYWtlT2ZmUmVwb3J0LnN1YlRpdGxlLmNvbHVtblRocmVlID0gcmVjb3JkLnVuaXQ7XHJcbiAgICAgICAgbWF0ZXJpYWxUYWtlT2ZmUmVwb3J0LnN1YlRpdGxlLmNvbHVtbk9uZSA9ICc6ICcrbWF0ZXJpYWxUYWtlT2ZmUmVwb3J0LnN1YlRpdGxlLmNvbHVtblR3byArJyAnK1xyXG4gICAgICAgICAgbWF0ZXJpYWxUYWtlT2ZmUmVwb3J0LnN1YlRpdGxlLmNvbHVtblRocmVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldE1hdGVyaWFsRGF0YUZyb21GbGF0RGV0YWlsc0FycmF5KGVsZW1lbnRXaXNlUmVwb3J0OiBzdHJpbmcsIGVsZW1lbnQ6IHN0cmluZywgYnVpbGRpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzQXJyYXk6IEFycmF5PE1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzRFRPPikge1xyXG4gICAgbGV0IHNxbFF1ZXJ5OiBzdHJpbmc7XHJcbiAgICBzd2l0Y2goZWxlbWVudFdpc2VSZXBvcnQpIHtcclxuICAgICAgY2FzZSBDb25zdGFudHMuU1RSX0NPU1RIRUFEOlxyXG4gICAgICAgIHNxbFF1ZXJ5ID0gdGhpcy5hbGFzcWxRdWVyeUZvck1hdGVyaWFsVGFrZU9mZkRhdGFDb3N0SGVhZFdpc2UoYnVpbGRpbmcpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIENvbnN0YW50cy5TVFJfTUFURVJJQUw6XHJcbiAgICAgICAgc3FsUXVlcnkgPSB0aGlzLmFsYXNxbFF1ZXJ5Rm9yTWF0ZXJpYWxUYWtlT2ZmRGF0YU1hdGVyaWFsV2lzZShidWlsZGluZyk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICBsZXQgbWF0ZXJpYWxSZXBvcnRSb3dEYXRhID0gYWxhc3FsKHNxbFF1ZXJ5LCBbbWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbHNBcnJheSxlbGVtZW50XSk7XHJcbiAgICByZXR1cm4gbWF0ZXJpYWxSZXBvcnRSb3dEYXRhO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhbGFzcWxRdWVyeUZvck1hdGVyaWFsVGFrZU9mZkRhdGFNYXRlcmlhbFdpc2UoYnVpbGRpbmc6IHN0cmluZykge1xyXG4gICAgbGV0IHNlbGVjdDogc3RyaW5nID0gQ29uc3RhbnRzLlNUUl9FTVBUWTtcclxuICAgIGxldCBmcm9tOiBzdHJpbmcgPSBDb25zdGFudHMuQUxBU1FMX0ZST007XHJcbiAgICBsZXQgd2hlcmU6IHN0cmluZyA9IENvbnN0YW50cy5TVFJfRU1QVFk7XHJcbiAgICBsZXQgZ3JvdXBCeTogc3RyaW5nID0gQ29uc3RhbnRzLkFMQVNRTF9HUk9VUF9CWV9NQVRFUklBTF9UQUtFT0ZGX01BVEVSSUFMX1dJU0U7XHJcbiAgICBsZXQgb3JkZXJCeTogc3RyaW5nID0gQ29uc3RhbnRzLkFMQVNRTF9PUkRFUl9CWV9NQVRFUklBTF9UQUtFT0ZGX01BVEVSSUFMX1dJU0U7XHJcbiAgICBsZXQgc3FsUXVlcnk6IHN0cmluZztcclxuICAgIGlmIChidWlsZGluZyAhPT0gQ29uc3RhbnRzLlNUUl9BTExfQlVJTERJTkcpIHtcclxuICAgICAgc2VsZWN0ID0gQ29uc3RhbnRzLkFMQVNRTF9TRUxFQ1RfTUFURVJJQUxfVEFLRU9GRl9NQVRFUklBTF9XSVNFICsgQ29uc3RhbnRzLlNUUl9DT01NQV9TUEFDRSArXHJcbiAgICAgICAgQ29uc3RhbnRzLkFMQVNRTF9TRUxFQ1RfUVVBTlRJVFlfTkFNRV9BUztcclxuICAgICAgd2hlcmUgPSBDb25zdGFudHMuQUxBU1FMX1dIRVJFX01BVEVSSUFMX05BTUVfRVFVQUxTX1RPICArXHJcbiAgICAgICAgQ29uc3RhbnRzLlNUUl9BTkQgKyBDb25zdGFudHMuQUxBU1FMX1NFTEVDVF9CVUlMRElOR19OQU1FICsgYnVpbGRpbmcgKyBDb25zdGFudHMuU1RSX0RPVUJMRV9JTlZFUlRFRF9DT01NQTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNlbGVjdCA9IENvbnN0YW50cy5BTEFTUUxfU0VMRUNUX01BVEVSSUFMX1RBS0VPRkZfTUFURVJJQUxfV0lTRSA7XHJcbiAgICAgIHdoZXJlID0gQ29uc3RhbnRzLkFMQVNRTF9XSEVSRV9NQVRFUklBTF9OQU1FX0VRVUFMU19UTyA7XHJcbiAgICB9XHJcbiAgICB3aGVyZSA9IHdoZXJlICsgQ29uc3RhbnRzLkFMQVNRTF9BTkRfTUFURVJJQUxfTk9UX0xBQk9VUjtcclxuICAgIHNxbFF1ZXJ5ID0gc2VsZWN0ICsgZnJvbSArIHdoZXJlICsgZ3JvdXBCeSArIG9yZGVyQnk7XHJcbiAgICByZXR1cm4gc3FsUXVlcnk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFsYXNxbFF1ZXJ5Rm9yTWF0ZXJpYWxUYWtlT2ZmRGF0YUNvc3RIZWFkV2lzZShidWlsZGluZzogc3RyaW5nKSB7XHJcbiAgICBsZXQgc2VsZWN0OiBzdHJpbmcgPSBDb25zdGFudHMuU1RSX0VNUFRZO1xyXG4gICAgbGV0IGZyb206IHN0cmluZyA9IENvbnN0YW50cy5BTEFTUUxfRlJPTTtcclxuICAgIGxldCB3aGVyZTogc3RyaW5nID0gQ29uc3RhbnRzLlNUUl9FTVBUWTtcclxuICAgIGxldCBncm91cEJ5OiBzdHJpbmcgPSBDb25zdGFudHMuU1RSX0VNUFRZO1xyXG4gICAgbGV0IG9yZGVyQnk6IHN0cmluZyA9IENvbnN0YW50cy5TVFJfRU1QVFk7XHJcbiAgICBsZXQgc3FsUXVlcnk6IHN0cmluZztcclxuICAgIGlmIChidWlsZGluZyAhPT0gQ29uc3RhbnRzLlNUUl9BTExfQlVJTERJTkcpIHtcclxuICAgICAgc2VsZWN0ID0gQ29uc3RhbnRzLkFMQVNRTF9TRUxFQ1RfTUFURVJJQUxfVEFLRU9GRl9DT1NUSEVBRF9XSVNFICsgQ29uc3RhbnRzLlNUUl9DT01NQV9TUEFDRSArXHJcbiAgICAgICAgQ29uc3RhbnRzLkFMQVNRTF9TRUxFQ1RfUVVBTlRJVFlfTkFNRV9BUztcclxuICAgICAgd2hlcmUgPSBDb25zdGFudHMuQUxBU1FMX1dIRVJFX0NPU1RIRUFEX05BTUVfRVFVQUxTX1RPXHJcbiAgICAgICAgKyBDb25zdGFudHMuU1RSX0FORCArIENvbnN0YW50cy5BTEFTUUxfU0VMRUNUX0JVSUxESU5HX05BTUUgKyBidWlsZGluZyArIENvbnN0YW50cy5TVFJfRE9VQkxFX0lOVkVSVEVEX0NPTU1BO1xyXG4gICAgICBncm91cEJ5ID0gQ29uc3RhbnRzLkFMQVNRTF9HUk9VUF9NQVRFUklBTF9XT1JLSVRFTV9RVUFOVElUWV9NQVRFUklBTF9UQUtFT0ZGX0NPU1RIRUFEX1dJU0U7XHJcbiAgICAgIG9yZGVyQnkgPSBDb25zdGFudHMuQUxBU1FMX09SREVSX0JZX01BVEVSSUFMX1dPUktJVEVNX0NPU1RIRUFEX1dJU0U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzZWxlY3QgPSBDb25zdGFudHMuQUxBU1FMX1NFTEVDVF9NQVRFUklBTF9UQUtFT0ZGX0NPU1RIRUFEX1dJU0VfRk9SX0FMTF9CVUlMRElOR1M7XHJcbiAgICAgIHdoZXJlID0gQ29uc3RhbnRzLkFMQVNRTF9XSEVSRV9DT1NUSEVBRF9OQU1FX0VRVUFMU19UTztcclxuICAgICAgZ3JvdXBCeSA9IENvbnN0YW50cy5BTEFTUUxfR1JPVVBfTUFURVJJQUxfQlVJTERJTkdfUVVBTlRJVFlfTUFURVJJQUxfVEFLRU9GRl9DT1NUSEVBRF9XSVNFX0ZPUl9BTExfQlVJTERJTkdTO1xyXG4gICAgICBvcmRlckJ5ID0gQ29uc3RhbnRzLkFMQVNRTF9PUkRFUl9CWV9NQVRFUklBTF9CVUlMRElOR19NQVRFUklBTF9UQUtFT0ZGX0NPU1RIRUFEX1dJU0U7XHJcbiAgICB9XHJcbiAgICB3aGVyZSA9IHdoZXJlICsgQ29uc3RhbnRzLkFMQVNRTF9BTkRfTUFURVJJQUxfTk9UX0xBQk9VUjtcclxuICAgIHNxbFF1ZXJ5ID0gc2VsZWN0ICsgZnJvbSArIHdoZXJlICsgZ3JvdXBCeSArIG9yZGVyQnk7XHJcbiAgICByZXR1cm4gc3FsUXVlcnk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldE1hdGVyaWFsVGFrZU9mZkZpbHRlck9iamVjdChidWlsZGluZ3M6IEFycmF5PEJ1aWxkaW5nPikge1xyXG4gICAgbGV0IG1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzQXJyYXk6IEFycmF5PE1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzRFRPPiA9IHRoaXMuZ2V0QnVpbGRpbmdNYXRlcmlhbERldGFpbHMoYnVpbGRpbmdzKTtcclxuICAgIGxldCBjb2x1bW46IHN0cmluZyA9IENvbnN0YW50cy5TVFJfQlVJTERJTkdfTkFNRTtcclxuICAgIGxldCBidWlsZGluZ0xpc3Q6IEFycmF5PHN0cmluZz4gPSB0aGlzLmdldERpc3RpbmN0QXJyYXlPZlN0cmluZ0Zyb21BbGFzcWwoY29sdW1uLCBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5KTtcclxuICAgIGNvbHVtbiA9IENvbnN0YW50cy5TVFJfQ09TVEhFQURfTkFNRTtcclxuICAgIGxldCBjb3N0SGVhZExpc3Q6IEFycmF5PHN0cmluZz4gPSB0aGlzLmdldERpc3RpbmN0QXJyYXlPZlN0cmluZ0Zyb21BbGFzcWwoY29sdW1uLCBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5KTtcclxuICAgIGNvbHVtbiA9IENvbnN0YW50cy5TVFJfTWF0ZXJpYWxfTkFNRTtcclxuICAgIGxldCBtYXRlcmlhbExpc3Q6IEFycmF5PHN0cmluZz4gPSB0aGlzLmdldERpc3RpbmN0QXJyYXlPZlN0cmluZ0Zyb21BbGFzcWwoY29sdW1uLCBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5LFxyXG4gICAgICBDb25zdGFudHMuQUxBU1FMX01BVEVSSUFMX05PVF9MQUJPVVIpO1xyXG4gICAgbGV0IG1hdGVyaWFsVGFrZU9mZkZpbHRlcnNPYmplY3Q6IE1hdGVyaWFsVGFrZU9mZkZpbHRlcnNMaXN0RFRPID0gbmV3IE1hdGVyaWFsVGFrZU9mZkZpbHRlcnNMaXN0RFRPKGJ1aWxkaW5nTGlzdCwgY29zdEhlYWRMaXN0LFxyXG4gICAgICBtYXRlcmlhbExpc3QpO1xyXG4gICAgcmV0dXJuIG1hdGVyaWFsVGFrZU9mZkZpbHRlcnNPYmplY3Q7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldERpc3RpbmN0QXJyYXlPZlN0cmluZ0Zyb21BbGFzcWwoY29sdW1uOiBzdHJpbmcsIG1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzQXJyYXk6IEFycmF5PE1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzRFRPPixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm90TGlrZU9wdGlvbmFsPzogc3RyaW5nKSB7XHJcbiAgICBsZXQgc3FsUXVlcnk6IHN0cmluZyA9ICdTRUxFQ1QgRElTVElOQ1QgZmxhdERhdGEuJyArIGNvbHVtbiArICcgRlJPTSA/IEFTIGZsYXREYXRhJztcclxuICAgIGxldCB3aGVyZSA9ICcgd2hlcmUgJysgbm90TGlrZU9wdGlvbmFsO1xyXG4gICAgaWYobm90TGlrZU9wdGlvbmFsKSB7XHJcbiAgICAgIHNxbFF1ZXJ5ID0gc3FsUXVlcnkgKyB3aGVyZTtcclxuICAgIH1cclxuICAgIGxldCBkaXN0aW5jdE9iamVjdEFycmF5ID0gYWxhc3FsKHNxbFF1ZXJ5LCBbbWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbHNBcnJheV0pO1xyXG4gICAgbGV0IGRpc3RpbmN0TmFtZVN0cmluZ0FycmF5OiBBcnJheTxzdHJpbmc+ID0gbmV3IEFycmF5PHN0cmluZz4oKTtcclxuICAgIGZvcihsZXQgZGlzdGluY3RPYmplY3Qgb2YgZGlzdGluY3RPYmplY3RBcnJheSkge1xyXG4gICAgICBkaXN0aW5jdE5hbWVTdHJpbmdBcnJheS5wdXNoKGRpc3RpbmN0T2JqZWN0W2NvbHVtbl0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRpc3RpbmN0TmFtZVN0cmluZ0FycmF5O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhZGRNYXRlcmlhbERUT0ZvckFjdGl2ZUNvc3RIZWFkSW5EVE9BcnJheShidWlsZGluZzogQnVpbGRpbmcsIGJ1aWxkaW5nTmFtZTogc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbHNBcnJheTogQXJyYXk8TWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbHNEVE8+KSB7XHJcbiAgICBsZXQgY29zdEhlYWROYW1lO1xyXG4gICAgZm9yIChsZXQgY29zdEhlYWQ6IENvc3RIZWFkIG9mIGJ1aWxkaW5nLmNvc3RIZWFkcykge1xyXG4gICAgICBpZiAoY29zdEhlYWQuYWN0aXZlKSB7XHJcbiAgICAgICAgY29zdEhlYWROYW1lID0gY29zdEhlYWQubmFtZTtcclxuICAgICAgICB0aGlzLmFkZE1hdGVyaWFsRFRPRm9yQWN0aXZlQ2F0ZWdvcnlJbkRUT0FycmF5KGNvc3RIZWFkLCBidWlsZGluZ05hbWUsIGNvc3RIZWFkTmFtZSwgbWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbHNBcnJheSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkTWF0ZXJpYWxEVE9Gb3JBY3RpdmVDYXRlZ29yeUluRFRPQXJyYXkoY29zdEhlYWQ6IENvc3RIZWFkLCBidWlsZGluZ05hbWU6IHN0cmluZywgY29zdEhlYWROYW1lOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5OiBBcnJheTxNYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0RUTz4pIHtcclxuICAgIGxldCBjYXRlZ29yeU5hbWU6IHN0cmluZztcclxuICAgIGZvciAobGV0IGNhdGVnb3J5IG9mIGNvc3RIZWFkLmNhdGVnb3JpZXMpIHtcclxuICAgICAgaWYgKGNhdGVnb3J5LmFjdGl2ZSkge1xyXG4gICAgICAgIGNhdGVnb3J5TmFtZSA9IGNhdGVnb3J5Lm5hbWU7XHJcbiAgICAgICAgdGhpcy5hZGRNYXRlcmlhbERUT0ZvckFjdGl2ZVdvcmtpdGVtSW5EVE9BcnJheShjYXRlZ29yeSwgYnVpbGRpbmdOYW1lLCBjb3N0SGVhZE5hbWUsIGNhdGVnb3J5TmFtZSwgbWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbHNBcnJheSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkTWF0ZXJpYWxEVE9Gb3JBY3RpdmVXb3JraXRlbUluRFRPQXJyYXkoY2F0ZWdvcnk6IENhdGVnb3J5LCBidWlsZGluZ05hbWU6IHN0cmluZywgY29zdEhlYWROYW1lOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeU5hbWU6IHN0cmluZywgbWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbHNBcnJheTogQXJyYXk8TWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbHNEVE8+KSB7XHJcbiAgICBsZXQgd29ya0l0ZW1OYW1lOiBzdHJpbmc7XHJcbiAgICBmb3IgKGxldCB3b3JrSXRlbSBvZiBjYXRlZ29yeS53b3JrSXRlbXMpIHtcclxuICAgICAgaWYgKHdvcmtJdGVtLmFjdGl2ZSkge1xyXG4gICAgICAgIHdvcmtJdGVtTmFtZSA9IHdvcmtJdGVtLm5hbWU7XHJcbiAgICAgICAgdGhpcy5hZGRFc3RpbWF0ZWRRdWFudGl0eUFuZFJhdGVNYXRlcmlhbEl0ZW1JbkRUT0FycmF5KHdvcmtJdGVtLCBidWlsZGluZ05hbWUsIGNvc3RIZWFkTmFtZSwgY2F0ZWdvcnlOYW1lLFxyXG4gICAgICAgICAgd29ya0l0ZW1OYW1lLCBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhZGRFc3RpbWF0ZWRRdWFudGl0eUFuZFJhdGVNYXRlcmlhbEl0ZW1JbkRUT0FycmF5KHdvcmtJdGVtOiBXb3JrSXRlbSwgYnVpbGRpbmdOYW1lOiBzdHJpbmcsIGNvc3RIZWFkTmFtZTogc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICBjYXRlZ29yeU5hbWUgOiBzdHJpbmcsIHdvcmtJdGVtTmFtZTogc3RyaW5nLCBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5OiBBcnJheTxNYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0RUTz4pIHtcclxuICAgIGxldCBxdWFudGl0eU5hbWU6IHN0cmluZztcclxuICAgIGlmKHdvcmtJdGVtLnF1YW50aXR5LmlzRGlyZWN0UXVhbnRpdHkgJiYgd29ya0l0ZW0ucmF0ZS5pc0VzdGltYXRlZCkge1xyXG4gICAgICBxdWFudGl0eU5hbWUgPSBDb25zdGFudHMuU1RSX0RJUkVDVDtcclxuICAgICAgdGhpcy5jcmVhdGVBbmRBZGRNYXRlcmlhbERUT09iamVjdEluRFRPQXJyYXkod29ya0l0ZW0sIGJ1aWxkaW5nTmFtZSwgY29zdEhlYWROYW1lLCBjYXRlZ29yeU5hbWUsIHdvcmtJdGVtTmFtZSwgcXVhbnRpdHlOYW1lLFxyXG4gICAgICAgIG1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxzQXJyYXksIHdvcmtJdGVtLnF1YW50aXR5LnRvdGFsKTtcclxuICAgIH0gZWxzZSBpZiAod29ya0l0ZW0ucXVhbnRpdHkuaXNFc3RpbWF0ZWQgJiYgd29ya0l0ZW0ucmF0ZS5pc0VzdGltYXRlZCkge1xyXG4gICAgICBmb3IgKGxldCBxdWFudGl0eSBvZiB3b3JrSXRlbS5xdWFudGl0eS5xdWFudGl0eUl0ZW1EZXRhaWxzKSB7XHJcbiAgICAgICAgcXVhbnRpdHlOYW1lID0gcXVhbnRpdHkubmFtZTtcclxuICAgICAgICB0aGlzLmNyZWF0ZUFuZEFkZE1hdGVyaWFsRFRPT2JqZWN0SW5EVE9BcnJheSh3b3JrSXRlbSwgYnVpbGRpbmdOYW1lLCBjb3N0SGVhZE5hbWUsIGNhdGVnb3J5TmFtZSwgd29ya0l0ZW1OYW1lLCBxdWFudGl0eU5hbWUsXHJcbiAgICAgICAgICBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5LCBxdWFudGl0eS50b3RhbCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQW5kQWRkTWF0ZXJpYWxEVE9PYmplY3RJbkRUT0FycmF5KHdvcmtJdGVtOiBXb3JrSXRlbSwgYnVpbGRpbmdOYW1lOiBzdHJpbmcsIGNvc3RIZWFkTmFtZTogc3RyaW5nLCBjYXRlZ29yeU5hbWU6IHN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgd29ya0l0ZW1OYW1lOiBzdHJpbmcsIHF1YW50aXR5TmFtZTogc3RyaW5nLCBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5OiBBcnJheTxNYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0RUTz4sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IG51bWJlcikge1xyXG4gICAgZm9yIChsZXQgcmF0ZUl0ZW0gb2Ygd29ya0l0ZW0ucmF0ZS5yYXRlSXRlbXMpIHtcclxuICAgICAgbGV0IG1hdGVyaWFsVGFrZU9mZkZsYXREZXRhaWxEVE8gPSBuZXcgTWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbHNEVE8oYnVpbGRpbmdOYW1lLCBjb3N0SGVhZE5hbWUsIGNhdGVnb3J5TmFtZSxcclxuICAgICAgICB3b3JrSXRlbU5hbWUsIHJhdGVJdGVtLml0ZW1OYW1lLCBxdWFudGl0eU5hbWUsIE1hdGguY2VpbCgoKHF1YW50aXR5IC8gd29ya0l0ZW0ucmF0ZS5xdWFudGl0eSkgKiByYXRlSXRlbS5xdWFudGl0eSkpLFxyXG4gICAgICAgIHJhdGVJdGVtLnVuaXQpO1xyXG4gICAgICBtYXRlcmlhbFRha2VPZmZGbGF0RGV0YWlsc0FycmF5LnB1c2gobWF0ZXJpYWxUYWtlT2ZmRmxhdERldGFpbERUTyk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5PYmplY3Quc2VhbChSZXBvcnRTZXJ2aWNlKTtcclxuZXhwb3J0ID0gUmVwb3J0U2VydmljZTtcclxuXHJcbiJdfQ==
