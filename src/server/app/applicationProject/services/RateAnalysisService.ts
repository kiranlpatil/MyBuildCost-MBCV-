import UserService = require('./../../framework/services/UserService');
import ProjectAsset = require('../../framework/shared/projectasset');
import User = require('../../framework/dataaccess/mongoose/user');
import AuthInterceptor = require('../../framework/interceptor/auth.interceptor');
import CostControllException = require('../exception/CostControllException');
import WorkItem = require('../dataaccess/model/WorkItem');
let request = require('request');

class RateAnalysisService {
  APP_NAME: string;
  company_name: string;
  private authInterceptor: AuthInterceptor;
  private userService: UserService;

  constructor() {
    this.APP_NAME = ProjectAsset.APP_NAME;
    this.authInterceptor = new AuthInterceptor();
    this.userService = new UserService();
  }

  getCostHeads(user: User, url: string, callback: (error: any, result: any) => void) {

    request.get({url: url}, function (error: any, response: any, body: any) {
      if (error) {
        callback(error, null);
      } else if (!error && response.statusCode === 200) {
        console.log('RESPONSE JSON : ' + JSON.stringify(JSON.parse(body)));
        let res = JSON.parse(body);
        callback(null, res);
      }
    });
  }

  getWorkItems(user: User, url: string, callback: (error: any, result: any) => void) {

    request.get({url: url}, function (error: any, response: any, body: any) {
      if (error) {
        callback(error, null);
      } else if (!error && response.statusCode === 200) {
        let res = JSON.parse(body);
        callback(null, res);
      }
    });
  }

  getWorkItemsByCostHeadId(costHeadId: number, user: User, url: string, callback: (error: any, result: any) => void) {

    let workItems : Array<WorkItem> = [];
    request.get({url: url}, function (error: any, response: any, body: any) {
      if (error) {
        callback(error, null);
      } else if (!error && response.statusCode === 200) {
        let res = JSON.parse(body);
        if(res) {

          for(let workitem of res.SubItemType) {
            let workitemDetails = new WorkItem;
            if(parseInt(costHeadId) === workitem.C3) {
              workitemDetails.name = workitem.C2;
              workitemDetails.rateAnalysisId = workitem.C1;
              workItems.push(workitemDetails);
            }
          }
        }
        callback(null, workItems);
      }
    });
  }
}

Object.seal(RateAnalysisService);
export = RateAnalysisService;
