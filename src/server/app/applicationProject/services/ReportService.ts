import ProjectRepository = require('../dataaccess/repository/ProjectRepository');
import BuildingRepository = require('../dataaccess/repository/BuildingRepository');
import Messages = require('../shared/messages');
import UserService = require('./../../framework/services/UserService');
import ProjectAsset = require('../../framework/shared/projectasset');
import User = require('../../framework/dataaccess/mongoose/user');
import Project = require('../dataaccess/mongoose/Project');
import Building = require('../dataaccess/mongoose/Building');
import BuildingReport = require('../dataaccess/model/BuildingReport');
import ThumbRuleReport = require('../dataaccess/model/ThumbRuleReport');
import AuthInterceptor = require('../../framework/interceptor/auth.interceptor');
import CostControllException = require('../exception/CostControllException');

class ReportService {
  APP_NAME: string;
  company_name: string;
  private projectRepository: ProjectRepository;
  private buildingRepository: BuildingRepository;
  private authInterceptor: AuthInterceptor;
  private userService : UserService;

  category:any=[];
  reportThumbrule:any = [];

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.buildingRepository = new BuildingRepository();
    this.APP_NAME = ProjectAsset.APP_NAME;
    this.authInterceptor = new AuthInterceptor();
    this.userService = new UserService();
    //this.categoryDetails = new categoryDetails();
  }

  getReport( projectId : any,reportType : string, projectRate : string, areaType : string,  user: User,
             callback: (error: any, result: any) => void) {
    let query = { _id: projectId};
    let populate = {path : 'building'};

    this.projectRepository.findAndPopulate(query, populate, (error, result) => {
      if(error) {
        callback(error, null);
      } else {

        let costHeads = result[0].costHead;
        let buildings = result[0].building;

        for(let costHead of costHeads) {
          let catDetails : ThumbRuleReport = new ThumbRuleReport();
          catDetails.name = costHead.name;
          catDetails.rate = costHead[reportType][areaType][projectRate];
          this.category.push(catDetails);
        }

        for(let building of buildings) {
          let buildingReport : BuildingReport = new BuildingReport();
          buildingReport.name = building.name;
          buildingReport.area = (areaType === 'slabArea') ? building.totalSlabArea : building.totalSaleableAreaOfUnit;
          buildingReport.category = this.category;
          this.reportThumbrule.push(buildingReport);
        }

        callback(null,{ data: this.reportThumbrule, access_token: this.authInterceptor.issueTokenWithUid(user)});
      }
    });
  }
}

Object.seal(ReportService);
export = ReportService;
