import Messages = require('../shared/messages');
import UserService = require('./../../framework/services/UserService');
import ProjectAsset = require('../../framework/shared/projectasset');
import User = require('../../framework/dataaccess/mongoose/user');
import AuthInterceptor = require('../../framework/interceptor/auth.interceptor');
import CostControllException = require('../exception/CostControllException');
let request = require('request');

class RateAnalysisService {
  APP_NAME: string;
  company_name: string;
  private authInterceptor: AuthInterceptor;
  private userService : UserService;

  constructor() {
    this.APP_NAME = ProjectAsset.APP_NAME;
    this.authInterceptor = new AuthInterceptor();
    this.userService = new UserService();
  }

  getCostHeads( projectId : any, user: User, callback: (error: any, result: any) => void) {
    let url = 'http://mobileapiv4.buildinfo.co.in/ItemType/ItemTypeResult?DeviceId=2fc85276aee45b7a&mobilenumber' +
      '=8928520179&regionID=1&NeedFullData=y&AppCode=RA';
    request.get({ url:  url },
      function(error, response, body) {
      if(error) {
        callback(error, null);
      } else if (!error && response.statusCode === 200) {
        console.log('RESPONSE JSON : '+JSON.stringify(JSON.parse(body)));
        let res = JSON.parse(body);
        callback(null, res);
      }
    });
  }

}

Object.seal(RateAnalysisService);
export = RateAnalysisService;
