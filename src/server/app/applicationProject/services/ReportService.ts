import ProjectRepository = require('../dataaccess/repository/ProjectRepository');
import BuildingRepository = require('../dataaccess/repository/BuildingRepository');
import Messages = require('../shared/messages');
import UserService = require('./../../framework/services/UserService');
import ProjectAsset = require('../../framework/shared/projectasset');
import User = require('../../framework/dataaccess/mongoose/user');
import Project = require('../dataaccess/mongoose/Project');
import Building = require('../dataaccess/mongoose/Building');
import BuildingReport = require('../dataaccess/model/project/reports/BuildingReport');
import ThumbRuleReport = require('../dataaccess/model/project/reports/ThumbRuleReport');
import AuthInterceptor = require('../../framework/interceptor/auth.interceptor');
import CostControllException = require('../exception/CostControllException');
import CostHead = require('../dataaccess/mongoose/CostHead');
import EstimateReport = require('../dataaccess/model/project/reports/EstimateReport');
import ProjectReport = require('../dataaccess/model/project/reports/ProjectReport');
import WorkItem = require('../dataaccess/model/project/building/WorkItem');
import ThumbRule = require('../dataaccess/model/project/building/ThumbRule');
import Estimate = require('../dataaccess/model/project/building/Estimate');
import RateAnalysisService = require('./RateAnalysisService');
import Category = require('../dataaccess/model/project/building/Category');
import alasql = require('alasql');
import Constants = require('../shared/constants');
let config = require('config');
var log4js = require('log4js');
var logger=log4js.getLogger('Report Service');

class ReportService {
  APP_NAME: string;
  company_name: string;
  private projectRepository: ProjectRepository;
  private buildingRepository: BuildingRepository;
  private authInterceptor: AuthInterceptor;
  private userService : UserService;
  private rateAnalysisService : RateAnalysisService;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.buildingRepository = new BuildingRepository();
    this.APP_NAME = ProjectAsset.APP_NAME;
    this.authInterceptor = new AuthInterceptor();
    this.userService = new UserService();
    this.rateAnalysisService = new RateAnalysisService();
    //this.categoryDetails = new categoryDetails();
  }

  getReport( projectId : any, reportType : string, rateUnit : string, areaType : string,  user: User,
             callback: (error: any, result: any) => void) {

    logger.info('Report Service, getReport has been hit');
    let query = { _id: projectId};
    let populate = {path : 'buildings'};
    this.projectRepository.findAndPopulate(query, populate, (error, result) => {
      logger.info('Report Service, findAndPopulate has been hit');
      if(error) {
        callback(error, null);
      } else {
        let buildings = result[0].buildings;
        if (areaType === Constants.SLAB_AREA) {
            var typeOfArea = Constants.TOTAL_SLAB_AREA;
          } else if (areaType === Constants.SALEABLE_AREA) {
            typeOfArea = Constants.TOTAL_SALEABLE_AREA;
          } else if (areaType === Constants.CARPET_AREA) {
            typeOfArea = Constants.TOTAL_CARPET_AREA;
          }
        let totalArea = alasql('VALUE OF SELECT SUM('+typeOfArea+') FROM ?',[buildings]);
        let projectCostHeads = result[0].projectCostHeads;
        let projectReport : ProjectReport = new ProjectReport();
        let buildingReport : Array<BuildingReport> = new Array<BuildingReport>();
        this.generateReportByCostHeads( 'buildingReport', buildings, areaType, rateUnit, buildingReport);
        projectReport.buildings = buildingReport;
        let commonAmenitiesReport : Array<BuildingReport> = new Array<BuildingReport>();
        this.generateReportForProjectCostHeads('commonAmenitiesReport',projectCostHeads ,totalArea,
          areaType, rateUnit, commonAmenitiesReport);
        projectReport.commonAmenities = commonAmenitiesReport;
        callback(null,{ data: projectReport, access_token: this.authInterceptor.issueTokenWithUid(user)});
      }
    });
  }

  generateReportByCostHeads( reportType : string, buildings:  Array<Building> , areaType: string, rateUnit: string,
                             report: Array<BuildingReport>) {
    for (let index = 0; index < buildings.length; index++) {
      let buildingReport = new BuildingReport;
      let thumbRuleReport: ThumbRule = new ThumbRule();
      let estimatedReport: Estimate = new Estimate();
      buildingReport.name = buildings[index].name;
      buildingReport._id = buildings[index]._id;
      if (areaType === Constants.SLAB_AREA) {
        if (rateUnit === Constants.SQUREMETER_UNIT) {
          buildingReport.area = parseFloat((buildings[index].totalSlabArea * config.get(Constants.SQUARE_METER)).toFixed(
            Constants.NUMBER_OF_FRACTION_DIGIT));
        } else {
          buildingReport.area = parseFloat((buildings[index].totalSlabArea).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
        }
      } else if (areaType === Constants.CARPET_AREA) {
        if (rateUnit === Constants.SQUREMETER_UNIT) {
          buildingReport.area = parseFloat((buildings[index].totalCarpetAreaOfUnit * config.get(Constants.SQUARE_METER)).toFixed(
            Constants.NUMBER_OF_FRACTION_DIGIT));
        } else {
          buildingReport.area = parseFloat((buildings[index].totalCarpetAreaOfUnit).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
        }
      } else {
        if (rateUnit === Constants.SQUREMETER_UNIT) {
          buildingReport.area = parseFloat((buildings[index].totalSaleableAreaOfUnit * config.get(Constants.SQUARE_METER)
          ).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
        } else {
          buildingReport.area = parseFloat((buildings[index].totalSaleableAreaOfUnit).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
        }
      }
      let costHeadArray: any = buildings[index].costHeads;
      for (let costHeadIndex = 0; costHeadIndex < costHeadArray.length; costHeadIndex++) {

        if (costHeadArray[costHeadIndex].active === true) {

          let thumbRule: ThumbRuleReport = new ThumbRuleReport();
          let estimateReport: EstimateReport = new EstimateReport();
          thumbRule.name = costHeadArray[costHeadIndex].name;
          estimateReport.name = costHeadArray[costHeadIndex].name;
          thumbRule.rateAnalysisId = costHeadArray[costHeadIndex].rateAnalysisId;
          estimateReport.rateAnalysisId = costHeadArray[costHeadIndex].rateAnalysisId;
          if (areaType === Constants.SLAB_AREA) {
            //Slab Area
            thumbRuleReport.area = buildings[index].totalSlabArea;
            estimatedReport.area = buildings[index].totalSlabArea;
            if (rateUnit === Constants.SQUREFEET_UNIT) {
              thumbRule.rate = parseFloat((costHeadArray[costHeadIndex].thumbRuleRate.slabArea.sqft).toFixed(
                Constants.NUMBER_OF_FRACTION_DIGIT));
            } else {
              thumbRule.rate = parseFloat((costHeadArray[costHeadIndex].thumbRuleRate.slabArea.sqmt).toFixed(
                Constants.NUMBER_OF_FRACTION_DIGIT));
              thumbRuleReport.area = parseFloat((buildings[index].totalSlabArea * config.get(Constants.SQUARE_METER)).toFixed(
                Constants.NUMBER_OF_FRACTION_DIGIT));
              estimatedReport.area = parseFloat((buildings[index].totalSlabArea * config.get(Constants.SQUARE_METER)).toFixed(
                Constants.NUMBER_OF_FRACTION_DIGIT));
            }
          } else if (areaType === Constants.CARPET_AREA) {
            //Carpet Area
            thumbRuleReport.area = buildings[index].totalCarpetAreaOfUnit;
            estimatedReport.area = buildings[index].totalCarpetAreaOfUnit;
            if (rateUnit === Constants.SQUREFEET_UNIT) {
              thumbRule.rate = parseFloat((costHeadArray[costHeadIndex].thumbRuleRate.carpetArea.sqft).toFixed(
                Constants.NUMBER_OF_FRACTION_DIGIT));
            } else {
              thumbRule.rate = parseFloat((costHeadArray[costHeadIndex].thumbRuleRate.carpetArea.sqmt).toFixed(
                Constants.NUMBER_OF_FRACTION_DIGIT));
              thumbRuleReport.area = parseFloat((buildings[index].totalCarpetAreaOfUnit * config.get(Constants.SQUARE_METER)
              ).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
              estimatedReport.area = parseFloat((buildings[index].totalCarpetAreaOfUnit * config.get(Constants.SQUARE_METER)
              ).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
            }
          } else {
            //Saleable Area
            thumbRuleReport.area = buildings[index].totalSaleableAreaOfUnit;
            estimatedReport.area = buildings[index].totalSaleableAreaOfUnit;
            if (rateUnit === Constants.SQUREFEET_UNIT) {
              thumbRule.rate = parseFloat((costHeadArray[costHeadIndex].thumbRuleRate.saleableArea.sqft).toFixed(
                Constants.NUMBER_OF_FRACTION_DIGIT));
            } else {
              thumbRule.rate = parseFloat((costHeadArray[costHeadIndex].thumbRuleRate.saleableArea.sqmt).toFixed(
                Constants.NUMBER_OF_FRACTION_DIGIT));
              thumbRuleReport.area = parseFloat((buildings[index].totalSaleableAreaOfUnit * config.get(
                Constants.SQUARE_METER)).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
              estimatedReport.area = parseFloat((buildings[index].totalSaleableAreaOfUnit * config.get(
                Constants.SQUARE_METER)).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
            }
          }
          let category: Array<Category> = costHeadArray[costHeadIndex].categories;
          if (category.length !== 0) {

            for (let categoryKey in category) {
              if (category[categoryKey].active) {
                let workItem = category[categoryKey].workItems;
                if (workItem.length !== 0) {
                  for (let key in workItem) {
                    if (workItem[key].active) {
                      if (workItem[key].quantity.total !== null && workItem[key].rate.total !== null
                        && workItem[key].quantity.total !== 0 && workItem[key].rate.total !== 0) {
                        estimateReport.total = parseFloat((workItem[key].quantity.total * workItem[key].rate.total
                          + estimateReport.total).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
                        estimateReport.rate = parseFloat((estimateReport.total / buildingReport.area).toFixed(
                          Constants.NUMBER_OF_FRACTION_DIGIT));
                      } else {
                        /*estimateReport.total = 0.0;
                            estimateReport.rate = 0.0;
                            break;*/
                      }
                    }
                  }
                } else {
                  /*estimateReport.total = 0.0;
                      estimateReport.rate = 0.0;
                      break;*/
                }
              }
            }

          }
          estimatedReport.totalEstimatedCost = parseFloat((estimateReport.total + estimatedReport.totalEstimatedCost).toFixed(
            Constants.NUMBER_OF_FRACTION_DIGIT));
          estimatedReport.totalRate = parseFloat((estimatedReport.totalRate + estimateReport.rate).toFixed(
            Constants.NUMBER_OF_FRACTION_DIGIT));
          estimatedReport.estimatedCosts.push(estimateReport);
          if (costHeadArray[costHeadIndex].budgetedCostAmount === 0 ||
            costHeadArray[costHeadIndex].budgetedCostAmount === undefined) {
            thumbRule.amount = parseFloat((thumbRuleReport.area * thumbRule.rate).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
          } else {
            thumbRule.amount = parseFloat((costHeadArray[costHeadIndex].budgetedCostAmount).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
          }
          thumbRule.costHeadActive = costHeadArray[costHeadIndex].active;
          thumbRuleReport.thumbRuleReports.push(thumbRule);
          thumbRuleReport.totalRate = parseFloat((thumbRuleReport.totalRate + thumbRule.rate).toFixed(Constants.NUMBER_OF_FRACTION_DIGIT));
          thumbRuleReport.totalBudgetedCost = parseFloat((thumbRuleReport.totalBudgetedCost + thumbRule.amount).toFixed(
            Constants.NUMBER_OF_FRACTION_DIGIT));
          buildingReport.estimate = estimatedReport;
          buildingReport.thumbRule = thumbRuleReport;
        }
      }
      report.push(buildingReport);
    }
  }


generateReportForProjectCostHeads( reportType : string, projectCostHeads:  Array<CostHead>, totalArea: number,
                                   areaType: string, rateUnit: string, report: Array<BuildingReport>) {

      let projectCostHeadArray: Array<CostHead> = projectCostHeads;
      let projectReport = new BuildingReport;
       for (let projectCostHeadIndex in projectCostHeadArray) {

         let thumbRule: ThumbRule = new ThumbRule();
         let estimate : Estimate = new Estimate();

         if (projectCostHeadArray[projectCostHeadIndex].active) {

          let thumbRuleReport: ThumbRuleReport = new ThumbRuleReport();
          let estimateReport: EstimateReport = new EstimateReport();

           estimateReport.name = projectCostHeadArray[projectCostHeadIndex].name;
           estimateReport.rateAnalysisId = projectCostHeadArray[projectCostHeadIndex].rateAnalysisId;

          let categoryArray : Array<Category> = projectCostHeadArray[projectCostHeadIndex].categories;
          for (let categoryIndex in categoryArray) {
            if (categoryArray[categoryIndex].active) {
              let workItemArray = categoryArray[categoryIndex].workItems;
              if (workItemArray.length !== 0) {
                for (let workItemIndex in workItemArray) {
                  if (workItemArray[workItemIndex].active) {
                    if (workItemArray[workItemIndex].quantity.total !== null && workItemArray[workItemIndex].rate.total !== null
                      && workItemArray[workItemIndex].quantity.total !== 0 && workItemArray[workItemIndex].rate.total !== 0) {
                      estimateReport.total = parseFloat((workItemArray[workItemIndex].quantity.total *
                        workItemArray[workItemIndex].rate.total + estimateReport.total).toFixed(2));
                      estimateReport.rate = parseFloat((estimateReport.total / totalArea).toFixed(2));
                    } else {
                      /*  estimateReport.total = 0.0;
                        estimateReport.rate = 0.0;
                        break;*/
                    }
                  }
                }
              }
            }
          }
          estimate.totalEstimatedCost = parseFloat((estimateReport.total + estimate.totalEstimatedCost).toFixed(2));
          estimate.totalRate = parseFloat((estimate.totalRate + estimateReport.rate).toFixed(2));
          estimate.estimatedCosts.push(estimateReport);

           thumbRuleReport.name = projectCostHeadArray[projectCostHeadIndex].name;
           thumbRuleReport.rateAnalysisId = projectCostHeadArray[projectCostHeadIndex].rateAnalysisId;
           thumbRuleReport.amount = parseFloat((projectCostHeadArray[projectCostHeadIndex].budgetedCostAmount).toFixed(2));

            if (rateUnit === Constants.SQUREFEET_UNIT) {
              thumbRuleReport.rate =  parseFloat((thumbRuleReport.amount/totalArea).toFixed(2));
            } else  {
              thumbRule.area = thumbRuleReport.amount * config.get(Constants.SQUARE_METER);
              thumbRuleReport.rate = parseFloat((thumbRuleReport.amount/thumbRule.area).toFixed(2));
            }
          thumbRule.totalRate = parseFloat((thumbRule.totalRate + thumbRuleReport.rate).toFixed(2));
          thumbRule.totalBudgetedCost = parseFloat((thumbRule.totalBudgetedCost + thumbRuleReport.amount).toFixed(2));
          thumbRule.thumbRuleReports.push(thumbRuleReport);
          projectReport.thumbRule = thumbRule;
          projectReport.estimate = estimate;
        }
      }
      report.push(projectReport);
  }

  getCostHeads(  url: string , user: User,callback: (error: any, result: any) => void) {
    logger.info('Report Service, getCostHeads has been hit');
    this.rateAnalysisService.getCostHeads( url, user,(error, result) => {
      if(error) {
        console.log('error : '+JSON.stringify(error));
        callback(error, null);
      } else {
        callback(null,{ data: result, access_token: this.authInterceptor.issueTokenWithUid(user)});
      }
    });
  }

  getWorkItems( url: string , user: User, callback: (error: any, result: any) => void) {
    logger.info('Report Service, getWorkItems has been hit');
    this.rateAnalysisService.getWorkItems( url, user,(error, result) => {
      if(error) {
        console.log('error : '+JSON.stringify(error));
        callback(error, null);
      } else {
        callback(null,{ data: result, access_token: this.authInterceptor.issueTokenWithUid(user)});
      }
    });
  }

}

Object.seal(ReportService);
export = ReportService;

