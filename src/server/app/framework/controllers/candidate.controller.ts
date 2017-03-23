import * as express from "express";
import * as multiparty from "multiparty";
import AuthInterceptor = require("../interceptor/auth.interceptor");
import SendMailService = require("../services/sendmail.service");
import UserModel = require("../dataaccess/model/user.model");
import Messages = require("../shared/messages");
import ResponseService = require("../shared/response.service");
import CandidateModel = require("../dataaccess/model/candidate.model");
import CandidateService = require("../services/candidate.service");
import EmployeeHistoryService = require("../services/employee-history.service");
import ProfessionalDetailsService = require("../services/professional-details.service");


export function create(req:express.Request, res:express.Response, next:any) {
  try {

    var newUser:CandidateModel = <CandidateModel>req.body;
    var candidateService = new CandidateService();
    candidateService.createUser(newUser, (error, result) => {
      if (error) {
        console.log("crt user error", error);
        if (error == Messages.MSG_ERROR_CHECK_EMAIL_PRESENT) {
          next({
            reason: Messages.MSG_ERROR_RSN_EXISTING_USER,
            message: Messages.MSG_ERROR_VERIFY_ACCOUNT,
            code: 403
          });
        }
        else if (error == Messages.MSG_ERROR_CHECK_MOBILE_PRESENT) {
          next({
            reason: Messages.MSG_ERROR_RSN_EXISTING_USER,
            message: Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER,
            code: 403
          });
        }
        else {
          next({
            reason: Messages.MSG_ERROR_RSN_EXISTING_USER,
            message: Messages.MSG_ERROR_USER_WITH_EMAIL_PRESENT,
            code: 403
          });
        }
      }
      else {
        var auth:AuthInterceptor = new AuthInterceptor();
        var token = auth.issueTokenWithUid(newUser);
        res.status(200).send({
          "status": Messages.STATUS_SUCCESS,
          "data": {
            "reason": Messages.MSG_SUCCESS_REGISTRATION,
            "_id": result.userId,
          },
          access_token: token
        });
      }
    });
  }
  catch (e) {
    res.status(403).send({"status": Messages.STATUS_ERROR, "error_message": e.message});
  }
}

export function professionaldata(req:express.Request, res:express.Response, next:any) {
  try {
    var bodyParam = req.body;
    console.log(JSON.stringify(bodyParam));
    res.status(200).send({
      "status": Messages.STATUS_SUCCESS,
      "data": {
        "reason": "from professional data",
      }
    });
  }
  catch (e) {
    res.status(403).send({"status": Messages.STATUS_ERROR, "error_message": e.message});
  }
}

export function updateDetails(req:express.Request, res:express.Response, next:any) {
  try {
    var updatedCandidate:CandidateModel = <CandidateModel>req.body;
    var params = req.query;
    delete params.access_token;
    //var user = req.params.id;
    var _id:string = req.params.id;//user._id;
    console.log("candidate" + updatedCandidate);
    var auth:AuthInterceptor = new AuthInterceptor();
    var candidateService = new CandidateService();
    var employeeHistoryService = new EmployeeHistoryService();
    var professionalDetailsService = new ProfessionalDetailsService();
    let employementids:string[] = new Array(0);
    let professionalids:string[] = new Array(0);
    let employments:any;
    let professionals:any;
    employeeHistoryService.create(updatedCandidate.employmentHistory, (error, result) => {   // todo handle the exception as like seed project remove setTimeout
      if (error) {
        console.log("crt employement history error", error);
      }
      else {
        //updatedCandidate.employmentHistory = result;
        employments = result;
      }
    });
    professionalDetailsService.create(updatedCandidate.professionalDetails, (error, result) => {   // todo handle the exception as like seed project remove setTimeout
      if (error) {
        console.log("crt professional details error", error);
      }
      else {
        //updatedCandidate.employmentHistory = result;
        professionals = result;
      }
    });


    setTimeout(function () {
      for(let item of employments) {
        employementids.push(item._id);
      }
      for(let item of professionals) {
        professionalids.push(item._id);
      }
      updatedCandidate.employmentHistory = employementids;
      updatedCandidate.professionalDetails = employementids;
      console.log("ids of professionalDetails" + updatedCandidate.professionalDetails);
      candidateService.update(_id, updatedCandidate, (error, result) => {
        if (error) {
          next(error);
        }
        else {
          candidateService.retrieve(result._id, (error, result) => {
            if (error) {
              next({
                reason: Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
                message: Messages.MSG_ERROR_WRONG_TOKEN,
                code: 401
              });
            }
            else {
              var token = auth.issueTokenWithUid(updatedCandidate);
              res.send({
                "status": "success",
                "data": {},
                access_token: token
              });
            }
          });
        }
      });

    }, 2000);
  }
  catch (e) {
    res.status(403).send({message: e.message});
  }
}
