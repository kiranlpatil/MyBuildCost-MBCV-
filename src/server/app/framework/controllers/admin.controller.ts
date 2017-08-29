/**
 * Created by techprime002 on 8/28/2017.
 */
/**
 * Created by techprime002 on 7/11/2017.
 */
import * as express from 'express';
import fs = require('fs');
import AuthInterceptor = require('../interceptor/auth.interceptor');
import Messages = require('../shared/messages');
import ImportIndustryService = require('../services/import-industries.service');
import UserService = require("../services/user.service");
import AdminService = require("../services/admin.service");
let importIndustriesService = new ImportIndustryService();

export function getAllUser(req: express.Request, res: express.Response, next: any) {
  try {
    var userService = new UserService();
    var adminService = new AdminService();
    var params = {};
    userService.retrieveAll(params, (error, result) => {
      if (error) {
        next({
          reason: 'Error In Retrieving',//Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
          message: "error in create excel",
          code: 403
        });
      } else {
        adminService.seperateUsers(result,(error, resp) => {
          if (error) {
            next({
              reason: 'Error In Retrieving',//Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
              message: "error in create excel",
              code: 403
            });
          }else {
            adminService.createXlsx(resp, (err, respo)=> {
              if (err) {
                next({
                  reason: 'Error In Retrieving',//Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
                  message: "error in create excel",
                  code: 403
                });
              }
              else {
                res.status(200).send({
                  'status': 'success',
                  'data': resp
                });
              }
            });
          }

        });
      }
    });
  }
  catch (e) {
    res.status(403).send({message: e.message});
  }
};
