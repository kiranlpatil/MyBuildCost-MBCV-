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
                var totalArea = alasql('VALUE OF SELECT SUM(' + typeOfArea + ') FROM ?', [buildings]);
                var projectCostHeads = result[0].projectCostHeads;
                var projectReport = new ProjectReport();
                var buildingReport = new Array();
                _this.generateReportByCostHeads(buildings, typeOfArea, rateUnit, buildingReport);
                projectReport.buildings = buildingReport;
                var commonAmenitiesReport = new Array();
                _this.generateReportForProjectCostHeads(projectCostHeads, totalArea, areaType, rateUnit, commonAmenitiesReport);
                projectReport.commonAmenities = commonAmenitiesReport;
                callback(null, { data: projectReport, access_token: _this.authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    ReportService.prototype.generateReportByCostHeads = function (buildings, typeOfArea, rateUnit, report) {
        for (var _i = 0, buildings_1 = buildings; _i < buildings_1.length; _i++) {
            var building = buildings_1[_i];
            var buildingReport = new BuildingReport;
            buildingReport.name = building.name;
            buildingReport._id = building._id;
            buildingReport.area = building[typeOfArea];
            var thumbRule = new ThumbRule();
            var estimate = new Estimate();
            var thumbRuleReports = new Array();
            var estimatedReports = new Array();
            this.getThumbRuleAndEstimatedReport(building, buildingReport, thumbRuleReports, estimatedReports, rateUnit);
            var totalRates = alasql('SELECT SUM(amount) AS totalAmount, SUM(rate) AS totalRate FROM ?', [thumbRuleReports]);
            thumbRule.totalRate = totalRates[0].totalRate;
            if (rateUnit === Constants.SQUREMETER_UNIT) {
                thumbRule.totalRate = parseFloat((thumbRule.totalRate * config.get(Constants.SQUARE_METER)).toFixed(2));
            }
            thumbRule.totalBudgetedCost = totalRates[0].totalAmount;
            thumbRule.thumbRuleReports = thumbRuleReports;
            var totalEstimatedRates = alasql('SELECT SUM(total) AS totalAmount, SUM(rate) AS totalRate FROM ?', [estimatedReports]);
            estimate.totalRate = totalEstimatedRates[0].totalRate;
            if (rateUnit === Constants.SQUREMETER_UNIT) {
                estimate.totalRate = parseFloat((estimate.totalRate * config.get(Constants.SQUARE_METER)).toFixed(2));
            }
            estimate.totalEstimatedCost = totalEstimatedRates[0].totalAmount;
            estimate.estimatedCosts = estimatedReports;
            buildingReport.thumbRule = thumbRule;
            buildingReport.estimate = estimate;
            report.push(buildingReport);
        }
    };
    ReportService.prototype.getThumbRuleAndEstimatedReport = function (building, buildingReport, thumbRuleReports, estimatedReports, rateUnit) {
        for (var _i = 0, _a = building.costHeads; _i < _a.length; _i++) {
            var costHead = _a[_i];
            if (costHead.active) {
                var thumbRuleReport = new ThumbRuleReport();
                thumbRuleReport.name = costHead.name;
                thumbRuleReport.rateAnalysisId = costHead.rateAnalysisId;
                thumbRuleReport.amount = costHead.budgetedCostAmount;
                thumbRuleReport.costHeadActive = costHead.active;
                thumbRuleReport.rate = parseFloat((costHead.budgetedCostAmount / buildingReport.area).toFixed(2));
                if (rateUnit === Constants.SQUREMETER_UNIT) {
                    thumbRuleReport.rate = parseFloat((thumbRuleReport.rate * config.get(Constants.SQUARE_METER)).toFixed(2));
                }
                thumbRuleReports.push(thumbRuleReport);
                var estimateReport = new EstimateReport();
                estimateReport.name = costHead.name;
                estimateReport.rateAnalysisId = costHead.rateAnalysisId;
                var costHeadCategories = costHead.categories;
                for (var _b = 0, costHeadCategories_1 = costHeadCategories; _b < costHeadCategories_1.length; _b++) {
                    var category = costHeadCategories_1[_b];
                    var workItemList = category.workItems;
                    if (workItemList.length !== 0) {
                        for (var _c = 0, workItemList_1 = workItemList; _c < workItemList_1.length; _c++) {
                            var workItem = workItemList_1[_c];
                            if (workItem.quantity.total !== null && workItem.rate.total !== null
                                && workItem.quantity.total !== 0 && workItem.rate.total !== 0) {
                                estimateReport.total = parseFloat((workItem.quantity.total * workItem.rate.total + estimateReport.total).toFixed(2));
                                estimateReport.rate = parseFloat((estimateReport.total / buildingReport.area).toFixed(2));
                            }
                        }
                    }
                }
                if (rateUnit === Constants.SQUREMETER_UNIT) {
                    estimateReport.rate = parseFloat((estimateReport.rate * config.get(Constants.SQUARE_METER)).toFixed(2));
                }
                estimatedReports.push(estimateReport);
            }
        }
    };
    ReportService.prototype.generateReportForProjectCostHeads = function (projectCostHeads, totalArea, areaType, rateUnit, report) {
        var projectCostHeadArray = projectCostHeads;
        var projectReport = new BuildingReport;
        for (var projectCostHeadIndex in projectCostHeadArray) {
            var thumbRule = new ThumbRule();
            var estimate = new Estimate();
            if (projectCostHeadArray[projectCostHeadIndex].active) {
                var thumbRuleReport = new ThumbRuleReport();
                var estimateReport = new EstimateReport();
                estimateReport.name = projectCostHeadArray[projectCostHeadIndex].name;
                estimateReport.rateAnalysisId = projectCostHeadArray[projectCostHeadIndex].rateAnalysisId;
                var categoryArray = projectCostHeadArray[projectCostHeadIndex].categories;
                for (var categoryIndex in categoryArray) {
                    if (categoryArray[categoryIndex].active) {
                        var workItemArray = categoryArray[categoryIndex].workItems;
                        if (workItemArray.length !== 0) {
                            for (var workItemIndex in workItemArray) {
                                if (workItemArray[workItemIndex].active) {
                                    if (workItemArray[workItemIndex].quantity.total !== null && workItemArray[workItemIndex].rate.total !== null
                                        && workItemArray[workItemIndex].quantity.total !== 0 && workItemArray[workItemIndex].rate.total !== 0) {
                                        estimateReport.total = parseFloat((workItemArray[workItemIndex].quantity.total *
                                            workItemArray[workItemIndex].rate.total + estimateReport.total).toFixed(2));
                                        estimateReport.rate = parseFloat((estimateReport.total / totalArea).toFixed(2));
                                    }
                                }
                            }
                        }
                    }
                }
                estimate.totalEstimatedCost = parseFloat((estimateReport.total + estimate.totalEstimatedCost).toFixed(2));
                estimate.totalRate = parseFloat((estimate.totalRate + estimateReport.rate).toFixed(2));
                if (rateUnit === Constants.SQUREMETER_UNIT) {
                    estimate.totalRate = parseFloat((estimateReport.rate * config.get(Constants.SQUARE_METER)).toFixed(2));
                }
                estimate.estimatedCosts.push(estimateReport);
                thumbRuleReport.name = projectCostHeadArray[projectCostHeadIndex].name;
                thumbRuleReport.rateAnalysisId = projectCostHeadArray[projectCostHeadIndex].rateAnalysisId;
                thumbRuleReport.amount = parseFloat((projectCostHeadArray[projectCostHeadIndex].budgetedCostAmount).toFixed(2));
                thumbRuleReport.rate = parseFloat((thumbRuleReport.amount / totalArea).toFixed(2));
                if (rateUnit === Constants.SQUREMETER_UNIT) {
                    thumbRuleReport.rate = parseFloat((thumbRuleReport.rate * config.get(Constants.SQUARE_METER)).toFixed(2));
                }
                thumbRule.totalRate = parseFloat((thumbRule.totalRate + thumbRuleReport.rate).toFixed(2));
                thumbRule.totalBudgetedCost = parseFloat((thumbRule.totalBudgetedCost + thumbRuleReport.amount).toFixed(2));
                thumbRule.thumbRuleReports.push(thumbRuleReport);
                projectReport.thumbRule = thumbRule;
                projectReport.estimate = estimate;
            }
        }
        report.push(projectReport);
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
    return ReportService;
}());
Object.seal(ReportService);
module.exports = ReportService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvUmVwb3J0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsOEVBQWlGO0FBQ2pGLGdGQUFtRjtBQUNuRixvRUFBdUU7QUFDdkUsa0VBQXFFO0FBR3JFLG1GQUFzRjtBQUN0RixxRkFBd0Y7QUFDeEYsOEVBQWlGO0FBRWpGLG1GQUFzRjtBQUN0RixpRkFBb0Y7QUFDcEYsMEVBQTZFO0FBQzdFLHdFQUEyRTtBQUMzRSwyREFBOEQ7QUFFOUQsK0JBQWtDO0FBQ2xDLCtDQUFrRDtBQUNsRCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksTUFBTSxHQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUU5QztJQVNFO1FBQ0UsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUNqRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQ25ELElBQUksQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQztRQUN0QyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDN0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDdkQsQ0FBQztJQUVELGlDQUFTLEdBQVQsVUFBVyxTQUFlLEVBQUUsVUFBbUIsRUFBRSxRQUFpQixFQUFFLFFBQWlCLEVBQUcsSUFBVSxFQUN2RixRQUEyQztRQUR0RCxpQkFnREM7UUE3Q0MsTUFBTSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO1FBQ3RELElBQUksS0FBSyxHQUFHLEVB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Q0FBRSxHQUFHLEVBQUUsSUFBSSxFQUFDLFVBQUMsS0FBSyxFQUFFLE1BQU07WUFDN0QsRUFBRSxDQUFBLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQzlDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEIsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLFFBQVEsQ0FBQyxJQUFJLEVBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxLQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQztZQUM3RixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUgsb0JBQUM7QUFBRCxDQTdPQSxBQTZPQyxJQUFBO0FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMzQixpQkFBUyxhQUFhLENBQUMiLCJmaWxlIjoiYXBwL2FwcGxpY2F0aW9uUHJvamVjdC9zZXJ2aWNlcy9SZXBvcnRTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFByb2plY3RSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L1Byb2plY3RSZXBvc2l0b3J5Jyk7XHJcbmltcG9ydCBCdWlsZGluZ1JlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvQnVpbGRpbmdSZXBvc2l0b3J5Jyk7XHJcbmltcG9ydCBVc2VyU2VydmljZSA9IHJlcXVpcmUoJy4vLi4vLi4vZnJhbWV3b3JrL3NlcnZpY2VzL1VzZXJTZXJ2aWNlJyk7XHJcbmltcG9ydCBQcm9qZWN0QXNzZXQgPSByZXF1aXJlKCcuLi8uLi9mcmFtZXdvcmsvc2hhcmVkL3Byb2plY3Rhc3NldCcpO1xyXG5pbXBvcnQgVXNlciA9IHJlcXVpcmUoJy4uLy4uL2ZyYW1ld29yay9kYXRhYWNjZXNzL21vbmdvb3NlL3VzZXInKTtcclxuaW1wb3J0IEJ1aWxkaW5nID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb25nb29zZS9CdWlsZGluZycpO1xyXG5pbXBvcnQgQnVpbGRpbmdSZXBvcnQgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvcmVwb3J0cy9CdWlsZGluZ1JlcG9ydCcpO1xyXG5pbXBvcnQgVGh1bWJSdWxlUmVwb3J0ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L3JlcG9ydHMvVGh1bWJSdWxlUmVwb3J0Jyk7XHJcbmltcG9ydCBBdXRoSW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi8uLi9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvcicpO1xyXG5pbXBvcnQgQ29zdEhlYWQgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vbmdvb3NlL0Nvc3RIZWFkJyk7XHJcbmltcG9ydCBFc3RpbWF0ZVJlcG9ydCA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9yZXBvcnRzL0VzdGltYXRlUmVwb3J0Jyk7XHJcbmltcG9ydCBQcm9qZWN0UmVwb3J0ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L3JlcG9ydHMvUHJvamVjdFJlcG9ydCcpO1xyXG5pbXBvcnQgVGh1bWJSdWxlID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL1RodW1iUnVsZScpO1xyXG5pbXBvcnQgRXN0aW1hdGUgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvYnVpbGRpbmcvRXN0aW1hdGUnKTtcclxuaW1wb3J0IFJhdGVBbmFseXNpc1NlcnZpY2UgPSByZXF1aXJlKCcuL1JhdGVBbmFseXNpc1NlcnZpY2UnKTtcclxuaW1wb3J0IENhdGVnb3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L2J1aWxkaW5nL0NhdGVnb3J5Jyk7XHJcbmltcG9ydCBhbGFzcWwgPSByZXF1aXJlKCdhbGFzcWwnKTtcclxuaW1wb3J0IENvbnN0YW50cyA9IHJlcXVpcmUoJy4uL3NoYXJlZC9jb25zdGFudHMnKTtcclxubGV0IGNvbmZpZyA9IHJlcXVpcmUoJ2NvbmZpZycpO1xyXG52YXIgbG9nNGpzID0gcmVxdWlyZSgnbG9nNGpzJyk7XHJcbnZhciBsb2dnZXI9bG9nNGpzLmdldExvZ2dlcignUmVwb3J0IFNlcnZpY2UnKTtcclxuXHJcbmNsYXNzIFJlcG9ydFNlcnZpY2Uge1xyXG4gIEFQUF9OQU1FOiBzdHJpbmc7XHJcbiAgY29tcGFueV9uYW1lOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBwcm9qZWN0UmVwb3NpdG9yeTogUHJvamVjdFJlcG9zaXRvcnk7XHJcbiAgcHJpdmF0ZSBidWlsZGluZ1JlcG9zaXRvcnk6IEJ1aWxkaW5nUmVwb3NpdG9yeTtcclxuICBwcml2YXRlIGF1dGhJbnRlcmNlcHRvcjogQXV0aEludGVyY2VwdG9yO1xyXG4gIHByaXZhdGUgdXNlclNlcnZpY2UgOiBVc2VyU2VydmljZTtcclxuICBwcml2YXRlIHJhdGVBbmFseXNpc1NlcnZpY2UgOiBSYXRlQW5hbHlzaXNTZXJ2aWNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMucHJvamVjdFJlcG9zaXRvcnkgPSBuZXcgUHJvamVjdFJlcG9zaXRvcnkoKTtcclxuICAgIHRoaXMuYnVpbGRpbmdSZXBvc2l0b3J5ID0gbmV3IEJ1aWxkaW5nUmVwb3NpdG9yeSgpO1xyXG4gICAgdGhpcy5BUFBfTkFNRSA9IFByb2plY3RBc3NldC5BUFBfTkFNRTtcclxuICAgIHRoaXMuYXV0aEludGVyY2VwdG9yID0gbmV3IEF1dGhJbnRlcmNlcHRvcigpO1xyXG4gICAgdGhpcy51c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xyXG4gICAgdGhpcy5yYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcclxuICB9XHJcblxyXG4gIGdldFJlcG9ydCggcHJvamVjdElkIDogYW55LCByZXBvcnRUeXBlIDogc3RyaW5nLCByYXRlVW5pdCA6IHN0cmluZywgYXJlYVR5cGUgOiBzdHJpbmcs4oCC4oCCdXNlcjogVXNlcixcclxuICAgICAgICAgICAgIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnUmVwb3J0IFNlcnZpY2UsIGdldFJlcG9ydCBoYXMgYmVlbiBoaXQnKTtcclxuICAgIGxldCBxdWVyeSA9IHsgX2lkOiBwcm9qZWN0SWR9O1xyXG4gICAgbGV0IHBvcHVsYXRlID0ge3BhdGggOiAnYnVpbGRpbmdzJ307XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5LmZpbmRBbmRQb3B1bGF0ZShxdWVyeSwgcG9wdWxhdGUsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZmluZEFuZFBvcHVsYXRlIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgICBpZihlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgYnVpbGRpbmdzID0gcmVzdWx0WzBdLmJ1aWxkaW5ncztcclxuICAgICAgICB2YXIgdHlwZU9mQXJlYTogc3RyaW5nO1xyXG4gICAgICAgIGxldCBjaG9pY2UgPSBhcmVhVHlwZTtcclxuICAgICAgICBzd2l0Y2ggKGNob2ljZSkge1xyXG4gICAgICAgICAgY2FzZSBDb25zdGFudHMuU0xBQl9BUkVBOlxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB0eXBlT2ZBcmVhID0gQ29uc3RhbnRzLlRPVEFMX1NMQUJfQVJFQTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY2FzZSBDb25zdGFudHMuU0FMRUFCTEVfQVJFQTpcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdHlwZU9mQXJlYSA9IENvbnN0YW50cy5UT1RBTF9TQUxFQUJMRV9BUkVBO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjYXNlICBDb25zdGFudHMuQ0FSUEVUX0FSRUEgOlxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB0eXBlT2ZBcmVhID0gQ29uc3RhbnRzLlRPVEFMX0NBUlBFVF9BUkVBO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGRlZmF1bHQgOiAgY2FsbGJhY2soZXJyb3IsbnVsbCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdG90YWxBcmVhID0gYWxhc3FsKCdWQUxVRSBPRiBTRUxFQ1QgU1VNKCcrdHlwZU9mQXJlYSsnKSBGUk9NID8nLFtidWlsZGluZ3NdKTtcclxuICAgICAgICBsZXQgcHJvamVjdENvc3RIZWFkcyA9IHJlc3VsdFswXS5wcm9qZWN0Q29zdEhlYWRzO1xyXG4gICAgICAgIGxldCBwcm9qZWN0UmVwb3J0IDogUHJvamVjdFJlcG9ydCA9IG5ldyBQcm9qZWN0UmVwb3J0KCk7XHJcbiAgICAgICAgbGV0IGJ1aWxkaW5nUmVwb3J0IDogQXJyYXk8QnVpbGRpbmdSZXBvcnQ+ID0gbmV3IEFycmF5PEJ1aWxkaW5nUmVwb3J0PigpO1xyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVSZXBvcnRCeUNvc3RIZWFkcyggIGJ1aWxkaW5ncywgdHlwZU9mQXJlYSwgcmF0ZVVuaXQsIGJ1aWxkaW5nUmVwb3J0KTtcclxuICAgICAgICBwcm9qZWN0UmVwb3J0LmJ1aWxkaW5ncyA9IGJ1aWxkaW5nUmVwb3J0O1xyXG4gICAgICAgIGxldCBjb21tb25BbWVuaXRpZXNSZXBvcnQgOiBBcnJheTxCdWlsZGluZ1JlcG9ydD4gPSBuZXcgQXJyYXk8QnVpbGRpbmdSZXBvcnQ+KCk7XHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZHMocHJvamVjdENvc3RIZWFkcyAsdG90YWxBcmVhLFxyXG4gICAgICAgICAgYXJlYVR5cGUsIHJhdGVVbml0LCBjb21tb25BbWVuaXRpZXNSZXBvcnQpO1xyXG4gICAgICAgIHByb2plY3RSZXBvcnQuY29tbW9uQW1lbml0aWVzID0gY29tbW9uQW1lbml0aWVzUmVwb3J0O1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwseyBkYXRhOiBwcm9qZWN0UmVwb3J0LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2VuZXJhdGVSZXBvcnRCeUNvc3RIZWFkcyggYnVpbGRpbmdzOiAgQXJyYXk8QnVpbGRpbmc+ICwgdHlwZU9mQXJlYTogc3RyaW5nLCByYXRlVW5pdDogc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcG9ydDogQXJyYXk8QnVpbGRpbmdSZXBvcnQ+KSB7XHJcbiAgICBmb3IgKGxldCBidWlsZGluZyBvZiBidWlsZGluZ3MpIHtcclxuICAgICAgbGV0IGJ1aWxkaW5nUmVwb3J0ID0gbmV3IEJ1aWxkaW5nUmVwb3J0O1xyXG4gICAgICBidWlsZGluZ1JlcG9ydC5uYW1lID0gYnVpbGRpbmcubmFtZTtcclxuICAgICAgYnVpbGRpbmdSZXBvcnQuX2lkID0gYnVpbGRpbmcuX2lkO1xyXG4gICAgICBidWlsZGluZ1JlcG9ydC5hcmVhID0gYnVpbGRpbmdbdHlwZU9mQXJlYV07XHJcblxyXG4gICAgICBsZXQgdGh1bWJSdWxlICA9IG5ldyBUaHVtYlJ1bGUoKTtcclxuICAgICAgbGV0IGVzdGltYXRlICA9IG5ldyBFc3RpbWF0ZSgpO1xyXG4gICAgICBsZXQgdGh1bWJSdWxlUmVwb3J0cyA9IG5ldyBBcnJheTxUaHVtYlJ1bGVSZXBvcnQ+KCk7XHJcbiAgICAgIGxldCBlc3RpbWF0ZWRSZXBvcnRzID0gbmV3IEFycmF5PEVzdGltYXRlUmVwb3J0PigpO1xyXG5cclxuXHJcbiAgICAgIHRoaXMuZ2V0VGh1bWJSdWxlQW5kRXN0aW1hdGVkUmVwb3J0KGJ1aWxkaW5nLCBidWlsZGluZ1JlcG9ydCwgdGh1bWJSdWxlUmVwb3J0cywgZXN0aW1hdGVkUmVwb3J0cywgcmF0ZVVuaXQpO1xyXG5cclxuICAgICAgbGV0IHRvdGFsUmF0ZXMgPSBhbGFzcWwoJ1NFTEVDVCBTVU0oYW1vdW50KSBBUyB0b3RhbEFtb3VudCwgU1VNKHJhdGUpIEFTIHRvdGFsUmF0ZSBGUk9NID8nLFt0aHVtYlJ1bGVSZXBvcnRzXSk7XHJcbiAgICAgIHRodW1iUnVsZS50b3RhbFJhdGUgPSB0b3RhbFJhdGVzWzBdLnRvdGFsUmF0ZTtcclxuICAgICAgaWYocmF0ZVVuaXQgPT09IENvbnN0YW50cy5TUVVSRU1FVEVSX1VOSVQpIHtcclxuICAgICAgICB0aHVtYlJ1bGUudG90YWxSYXRlID0gIHBhcnNlRmxvYXQoKHRodW1iUnVsZS50b3RhbFJhdGUgKiBjb25maWcuZ2V0KENvbnN0YW50cy5TUVVBUkVfTUVURVIpKS50b0ZpeGVkKDIpKTtcclxuICAgICAgfVxyXG4gICAgICB0aHVtYlJ1bGUudG90YWxCdWRnZXRlZENvc3QgPSB0b3RhbFJhdGVzWzBdLnRvdGFsQW1vdW50O1xyXG4gICAgICB0aHVtYlJ1bGUudGh1bWJSdWxlUmVwb3J0cyA9IHRodW1iUnVsZVJlcG9ydHM7XHJcblxyXG4gICAgICBsZXQgdG90YWxFc3RpbWF0ZWRSYXRlcyA9IGFsYXNxbCgnU0VMRUNUIFNVTSh0b3RhbCkgQVMgdG90YWxBbW91bnQsIFNVTShyYXRlKSBBUyB0b3RhbFJhdGUgRlJPTSA/JyxbZXN0aW1hdGVkUmVwb3J0c10pO1xyXG4gICAgICBlc3RpbWF0ZS50b3RhbFJhdGUgPSB0b3RhbEVzdGltYXRlZFJhdGVzWzBdLnRvdGFsUmF0ZTtcclxuICAgICAgaWYocmF0ZVVuaXQgPT09IENvbnN0YW50cy5TUVVSRU1FVEVSX1VOSVQpIHtcclxuICAgICAgICBlc3RpbWF0ZS50b3RhbFJhdGUgPSAgcGFyc2VGbG9hdCgoZXN0aW1hdGUudG90YWxSYXRlICogY29uZmlnLmdldChDb25zdGFudHMuU1FVQVJFX01FVEVSKSkudG9GaXhlZCgyKSk7XHJcbiAgICAgIH1cclxuICAgICAgZXN0aW1hdGUudG90YWxFc3RpbWF0ZWRDb3N0ID0gdG90YWxFc3RpbWF0ZWRSYXRlc1swXS50b3RhbEFtb3VudDtcclxuICAgICAgZXN0aW1hdGUuZXN0aW1hdGVkQ29zdHMgPSBlc3RpbWF0ZWRSZXBvcnRzO1xyXG5cclxuICAgICAgYnVpbGRpbmdSZXBvcnQudGh1bWJSdWxlID0gdGh1bWJSdWxlO1xyXG4gICAgICBidWlsZGluZ1JlcG9ydC5lc3RpbWF0ZSA9IGVzdGltYXRlO1xyXG4gICAgICByZXBvcnQucHVzaChidWlsZGluZ1JlcG9ydCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuXHJcbiAgZ2V0VGh1bWJSdWxlQW5kRXN0aW1hdGVkUmVwb3J0KGJ1aWxkaW5nIDpCdWlsZGluZywgYnVpbGRpbmdSZXBvcnQ6IEJ1aWxkaW5nUmVwb3J0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHVtYlJ1bGVSZXBvcnRzOiBUaHVtYlJ1bGVSZXBvcnRbXSwgZXN0aW1hdGVkUmVwb3J0czogRXN0aW1hdGVSZXBvcnRbXSwgcmF0ZVVuaXQ6c3RyaW5nKSB7XHJcblxyXG4gICAgZm9yIChsZXQgY29zdEhlYWQgb2YgYnVpbGRpbmcuY29zdEhlYWRzKSB7XHJcblxyXG4gICAgICBpZihjb3N0SGVhZC5hY3RpdmUpIHtcclxuICAgICAgICAvL1RodW1iUnVsZSBSZXBvcnRcclxuICAgICAgICBsZXQgdGh1bWJSdWxlUmVwb3J0ID0gbmV3IFRodW1iUnVsZVJlcG9ydCgpO1xyXG4gICAgICAgIHRodW1iUnVsZVJlcG9ydC5uYW1lID0gY29zdEhlYWQubmFtZTtcclxuICAgICAgICB0aHVtYlJ1bGVSZXBvcnQucmF0ZUFuYWx5c2lzSWQgPSBjb3N0SGVhZC5yYXRlQW5hbHlzaXNJZDtcclxuICAgICAgICB0aHVtYlJ1bGVSZXBvcnQuYW1vdW50ID0gY29zdEhlYWQuYnVkZ2V0ZWRDb3N0QW1vdW50O1xyXG4gICAgICAgIHRodW1iUnVsZVJlcG9ydC5jb3N0SGVhZEFjdGl2ZSA9IGNvc3RIZWFkLmFjdGl2ZTtcclxuICAgICAgICB0aHVtYlJ1bGVSZXBvcnQucmF0ZSA9IHBhcnNlRmxvYXQoKGNvc3RIZWFkLmJ1ZGdldGVkQ29zdEFtb3VudCAvIGJ1aWxkaW5nUmVwb3J0LmFyZWEpLnRvRml4ZWQoMikpO1xyXG4gICAgICAgIGlmKHJhdGVVbml0ID09PSBDb25zdGFudHMuU1FVUkVNRVRFUl9VTklUKSB7XHJcbiAgICAgICAgICB0aHVtYlJ1bGVSZXBvcnQucmF0ZSA9IHBhcnNlRmxvYXQoKHRodW1iUnVsZVJlcG9ydC5yYXRlICogY29uZmlnLmdldChDb25zdGFudHMuU1FVQVJFX01FVEVSKSkudG9GaXhlZCgyKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRodW1iUnVsZVJlcG9ydHMucHVzaCh0aHVtYlJ1bGVSZXBvcnQpO1xyXG5cclxuICAgICAgICAvL0VzdGltYXRlZCBjb3N0IFJlcG9ydFxyXG4gICAgICAgIGxldCBlc3RpbWF0ZVJlcG9ydCA9IG5ldyBFc3RpbWF0ZVJlcG9ydCgpO1xyXG4gICAgICAgIGVzdGltYXRlUmVwb3J0Lm5hbWUgPSBjb3N0SGVhZC5uYW1lO1xyXG4gICAgICAgIGVzdGltYXRlUmVwb3J0LnJhdGVBbmFseXNpc0lkID0gY29zdEhlYWQucmF0ZUFuYWx5c2lzSWQ7XHJcblxyXG4gICAgICAgIGxldCBjb3N0SGVhZENhdGVnb3JpZXM6IEFycmF5PENhdGVnb3J5PiA9IGNvc3RIZWFkLmNhdGVnb3JpZXM7XHJcbiAgICAgICAgZm9yIChsZXQgY2F0ZWdvcnkgb2YgY29zdEhlYWRDYXRlZ29yaWVzKSB7XHJcbiAgICAgICAgICBsZXQgd29ya0l0ZW1MaXN0ID0gY2F0ZWdvcnkud29ya0l0ZW1zO1xyXG4gICAgICAgICAgaWYgKHdvcmtJdGVtTGlzdC5sZW5ndGggIT09IDApIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgd29ya0l0ZW0gb2Ygd29ya0l0ZW1MaXN0KSB7XHJcbiAgICAgICAgICAgICAgaWYgKHdvcmtJdGVtLnF1YW50aXR5LnRvdGFsICE9PSBudWxsICYmIHdvcmtJdGVtLnJhdGUudG90YWwgIT09IG51bGxcclxuICAgICAgICAgICAgICAgICYmIHdvcmtJdGVtLnF1YW50aXR5LnRvdGFsICE9PSAwICYmIHdvcmtJdGVtLnJhdGUudG90YWwgIT09IDApIHtcclxuICAgICAgICAgICAgICAgIGVzdGltYXRlUmVwb3J0LnRvdGFsID0gcGFyc2VGbG9hdCgod29ya0l0ZW0ucXVhbnRpdHkudG90YWwgKiB3b3JrSXRlbS5yYXRlLnRvdGFsICsgZXN0aW1hdGVSZXBvcnQudG90YWwpLnRvRml4ZWQoMikpO1xyXG4gICAgICAgICAgICAgICAgZXN0aW1hdGVSZXBvcnQucmF0ZSA9IHBhcnNlRmxvYXQoKGVzdGltYXRlUmVwb3J0LnRvdGFsIC8gYnVpbGRpbmdSZXBvcnQuYXJlYSkudG9GaXhlZCgyKSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHJhdGVVbml0ID09PSBDb25zdGFudHMuU1FVUkVNRVRFUl9VTklUKSB7XHJcbiAgICAgICAgICBlc3RpbWF0ZVJlcG9ydC5yYXRlID0gcGFyc2VGbG9hdCgoZXN0aW1hdGVSZXBvcnQucmF0ZSAqIGNvbmZpZy5nZXQoQ29uc3RhbnRzLlNRVUFSRV9NRVRFUikpLnRvRml4ZWQoMikpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlc3RpbWF0ZWRSZXBvcnRzLnB1c2goZXN0aW1hdGVSZXBvcnQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZW5lcmF0ZVJlcG9ydEZvclByb2plY3RDb3N0SGVhZHMocHJvamVjdENvc3RIZWFkczogIEFycmF5PENvc3RIZWFkPiwgdG90YWxBcmVhOiBudW1iZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmVhVHlwZTogc3RyaW5nLCByYXRlVW5pdDogc3RyaW5nLCByZXBvcnQ6IEFycmF5PEJ1aWxkaW5nUmVwb3J0Pikge1xyXG5cclxuICAgIGxldCBwcm9qZWN0Q29zdEhlYWRBcnJheTogQXJyYXk8Q29zdEhlYWQ+ID0gcHJvamVjdENvc3RIZWFkcztcclxuICAgIGxldCBwcm9qZWN0UmVwb3J0ID0gbmV3IEJ1aWxkaW5nUmVwb3J0O1xyXG4gICAgZm9yIChsZXQgcHJvamVjdENvc3RIZWFkSW5kZXggaW4gcHJvamVjdENvc3RIZWFkQXJyYXkpIHtcclxuXHJcbiAgICAgIGxldCB0aHVtYlJ1bGU6IFRodW1iUnVsZSA9IG5ldyBUaHVtYlJ1bGUoKTtcclxuICAgICAgbGV0IGVzdGltYXRlIDogRXN0aW1hdGUgPSBuZXcgRXN0aW1hdGUoKTtcclxuXHJcbiAgICAgIGlmIChwcm9qZWN0Q29zdEhlYWRBcnJheVtwcm9qZWN0Q29zdEhlYWRJbmRleF0uYWN0aXZlKSB7XHJcblxyXG4gICAgICAgIGxldCB0aHVtYlJ1bGVSZXBvcnQ6IFRodW1iUnVsZVJlcG9ydCA9IG5ldyBUaHVtYlJ1bGVSZXBvcnQoKTtcclxuICAgICAgICBsZXQgZXN0aW1hdGVSZXBvcnQ6IEVzdGltYXRlUmVwb3J0ID0gbmV3IEVzdGltYXRlUmVwb3J0KCk7XHJcblxyXG4gICAgICAgIGVzdGltYXRlUmVwb3J0Lm5hbWUgPSBwcm9qZWN0Q29zdEhlYWRBcnJheVtwcm9qZWN0Q29zdEhlYWRJbmRleF0ubmFtZTtcclxuICAgICAgICBlc3RpbWF0ZVJlcG9ydC5yYXRlQW5hbHlzaXNJZCA9IHByb2plY3RDb3N0SGVhZEFycmF5W3Byb2plY3RDb3N0SGVhZEluZGV4XS5yYXRlQW5hbHlzaXNJZDtcclxuXHJcbiAgICAgICAgbGV0IGNhdGVnb3J5QXJyYXkgOiBBcnJheTxDYXRlZ29yeT4gPSBwcm9qZWN0Q29zdEhlYWRBcnJheVtwcm9qZWN0Q29zdEhlYWRJbmRleF0uY2F0ZWdvcmllcztcclxuICAgICAgICBmb3IgKGxldCBjYXRlZ29yeUluZGV4IGluIGNhdGVnb3J5QXJyYXkpIHtcclxuICAgICAgICAgIGlmIChjYXRlZ29yeUFycmF5W2NhdGVnb3J5SW5kZXhdLmFjdGl2ZSkge1xyXG4gICAgICAgICAgICBsZXQgd29ya0l0ZW1BcnJheSA9IGNhdGVnb3J5QXJyYXlbY2F0ZWdvcnlJbmRleF0ud29ya0l0ZW1zO1xyXG4gICAgICAgICAgICBpZiAod29ya0l0ZW1BcnJheS5sZW5ndGggIT09IDApIHtcclxuICAgICAgICAgICAgICBmb3IgKGxldCB3b3JrSXRlbUluZGV4IGluIHdvcmtJdGVtQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgIGlmICh3b3JrSXRlbUFycmF5W3dvcmtJdGVtSW5kZXhdLmFjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICBpZiAod29ya0l0ZW1BcnJheVt3b3JrSXRlbUluZGV4XS5xdWFudGl0eS50b3RhbCAhPT0gbnVsbCAmJiB3b3JrSXRlbUFycmF5W3dvcmtJdGVtSW5kZXhdLnJhdGUudG90YWwgIT09IG51bGxcclxuICAgICAgICAgICAgICAgICAgICAmJiB3b3JrSXRlbUFycmF5W3dvcmtJdGVtSW5kZXhdLnF1YW50aXR5LnRvdGFsICE9PSAwICYmIHdvcmtJdGVtQXJyYXlbd29ya0l0ZW1JbmRleF0ucmF0ZS50b3RhbCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVzdGltYXRlUmVwb3J0LnRvdGFsID0gcGFyc2VGbG9hdCgod29ya0l0ZW1BcnJheVt3b3JrSXRlbUluZGV4XS5xdWFudGl0eS50b3RhbCAqXHJcbiAgICAgICAgICAgICAgICAgICAgICB3b3JrSXRlbUFycmF5W3dvcmtJdGVtSW5kZXhdLnJhdGUudG90YWwgKyBlc3RpbWF0ZVJlcG9ydC50b3RhbCkudG9GaXhlZCgyKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZXN0aW1hdGVSZXBvcnQucmF0ZSA9IHBhcnNlRmxvYXQoKGVzdGltYXRlUmVwb3J0LnRvdGFsIC8gdG90YWxBcmVhKS50b0ZpeGVkKDIpKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlc3RpbWF0ZS50b3RhbEVzdGltYXRlZENvc3QgPSBwYXJzZUZsb2F0KChlc3RpbWF0ZVJlcG9ydC50b3RhbCArIGVzdGltYXRlLnRvdGFsRXN0aW1hdGVkQ29zdCkudG9GaXhlZCgyKSk7XHJcbiAgICAgICAgZXN0aW1hdGUudG90YWxSYXRlID0gcGFyc2VGbG9hdCgoZXN0aW1hdGUudG90YWxSYXRlICsgZXN0aW1hdGVSZXBvcnQucmF0ZSkudG9GaXhlZCgyKSk7XHJcbiAgICAgICAgaWYocmF0ZVVuaXQgPT09IENvbnN0YW50cy5TUVVSRU1FVEVSX1VOSVQpIHtcclxuICAgICAgICAgIGVzdGltYXRlLnRvdGFsUmF0ZSA9IHBhcnNlRmxvYXQoKGVzdGltYXRlUmVwb3J0LnJhdGUgKiBjb25maWcuZ2V0KENvbnN0YW50cy5TUVVBUkVfTUVURVIpKS50b0ZpeGVkKDIpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZXN0aW1hdGUuZXN0aW1hdGVkQ29zdHMucHVzaChlc3RpbWF0ZVJlcG9ydCk7XHJcblxyXG4gICAgICAgIHRodW1iUnVsZVJlcG9ydC5uYW1lID0gcHJvamVjdENvc3RIZWFkQXJyYXlbcHJvamVjdENvc3RIZWFkSW5kZXhdLm5hbWU7XHJcbiAgICAgICAgdGh1bWJSdWxlUmVwb3J0LnJhdGVBbmFseXNpc0lkID0gcHJvamVjdENvc3RIZWFkQXJyYXlbcHJvamVjdENvc3RIZWFkSW5kZXhdLnJhdGVBbmFseXNpc0lkO1xyXG4gICAgICAgIHRodW1iUnVsZVJlcG9ydC5hbW91bnQgPSBwYXJzZUZsb2F0KChwcm9qZWN0Q29zdEhlYWRBcnJheVtwcm9qZWN0Q29zdEhlYWRJbmRleF0uYnVkZ2V0ZWRDb3N0QW1vdW50KS50b0ZpeGVkKDIpKTtcclxuICAgICAgICB0aHVtYlJ1bGVSZXBvcnQucmF0ZSA9ICBwYXJzZUZsb2F0KCh0aHVtYlJ1bGVSZXBvcnQuYW1vdW50L3RvdGFsQXJlYSkudG9GaXhlZCgyKSk7XHJcblxyXG4gICAgICAgICBpZihyYXRlVW5pdCA9PT0gQ29uc3RhbnRzLlNRVVJFTUVURVJfVU5JVCkge1xyXG4gICAgICAgICAgIHRodW1iUnVsZVJlcG9ydC5yYXRlID0gcGFyc2VGbG9hdCgodGh1bWJSdWxlUmVwb3J0LnJhdGUgKiBjb25maWcuZ2V0KENvbnN0YW50cy5TUVVBUkVfTUVURVIpKS50b0ZpeGVkKDIpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGh1bWJSdWxlLnRvdGFsUmF0ZSA9IHBhcnNlRmxvYXQoKHRodW1iUnVsZS50b3RhbFJhdGUgKyB0aHVtYlJ1bGVSZXBvcnQucmF0ZSkudG9GaXhlZCgyKSk7XHJcbiAgICAgICAgdGh1bWJSdWxlLnRvdGFsQnVkZ2V0ZWRDb3N0ID0gcGFyc2VGbG9hdCgodGh1bWJSdWxlLnRvdGFsQnVkZ2V0ZWRDb3N0ICsgdGh1bWJSdWxlUmVwb3J0LmFtb3VudCkudG9GaXhlZCgyKSk7XHJcbiAgICAgICAgdGh1bWJSdWxlLnRodW1iUnVsZVJlcG9ydHMucHVzaCh0aHVtYlJ1bGVSZXBvcnQpO1xyXG5cclxuICAgICAgICBwcm9qZWN0UmVwb3J0LnRodW1iUnVsZSA9IHRodW1iUnVsZTtcclxuICAgICAgICBwcm9qZWN0UmVwb3J0LmVzdGltYXRlID0gZXN0aW1hdGU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJlcG9ydC5wdXNoKHByb2plY3RSZXBvcnQpO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q29zdEhlYWRzKCAgdXJsOiBzdHJpbmcgLCB1c2VyOiBVc2VyLGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZ2V0Q29zdEhlYWRzIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5yYXRlQW5hbHlzaXNTZXJ2aWNlLmdldENvc3RIZWFkcyggdXJsLCB1c2VyLChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yIDogJytKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLHsgZGF0YTogcmVzdWx0LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0V29ya0l0ZW1zKCB1cmw6IHN0cmluZyAsIHVzZXI6IFVzZXIsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgU2VydmljZSwgZ2V0V29ya0l0ZW1zIGhhcyBiZWVuIGhpdCcpO1xyXG4gICAgdGhpcy5yYXRlQW5hbHlzaXNTZXJ2aWNlLmdldFdvcmtJdGVtcyggdXJsLCB1c2VyLChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2Vycm9yIDogJytKU09OLnN0cmluZ2lmeShlcnJvcikpO1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLHsgZGF0YTogcmVzdWx0LCBhY2Nlc3NfdG9rZW46IHRoaXMuYXV0aEludGVyY2VwdG9yLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbn1cclxuXHJcbk9iamVjdC5zZWFsKFJlcG9ydFNlcnZpY2UpO1xyXG5leHBvcnQgPSBSZXBvcnRTZXJ2aWNlO1xyXG5cclxuIl19
