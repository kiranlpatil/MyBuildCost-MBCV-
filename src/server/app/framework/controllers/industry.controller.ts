import * as express from "express";
import * as multiparty from "multiparty";
import AuthInterceptor = require("../interceptor/auth.interceptor");
import SendMailService = require("../services/sendmail.service");
import UserModel = require("../dataaccess/model/user.model");
import Messages = require("../shared/messages");
import ResponseService = require("../shared/response.service");
import CandidateModel = require("../dataaccess/model/candidate.model");
import CandidateService = require("../services/candidate.service");
import IndustryService = require("../services/industry.service");


export function retrieve(req: express.Request, res: express.Response, next: any) {
  try {
    console.log("In retrive");
    var industryService = new IndustryService();
   /* var params = req.query;
    delete params.access_token;
    var user = req.user;
    var auth: AuthInterceptor = new AuthInterceptor();*/
    var params={};
    industryService.retrieve(params, (error, result) => {
      console.log("In retrive of industry");
      if (error) {
        next({
          reason: 'Error In Retriving',//Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
          message: Messages.MSG_ERROR_WRONG_TOKEN,
          code: 401
        });

      }
      else {
        console.log("Data "+JSON.stringify(result));
        //  var token = auth.issueTokenWithUid(user);
        res.send({
          "status": "success",
          "data": {
            "Success": "Amit"//user.first_name,
           /* "last_name": user.last_name,
            "email": user.email,
            "mobile_number": user.mobile_number,
            "picture": user.picture,
            "social_profile_picture":user.social_profile_picture,
            "_id": user._id,
            "current_theme":user.current_theme*/
          }//,
          //access_token: token
        });

      }
    });

  }
  catch (e) {
    res.status(403).send({message: e.message});
  }
}
