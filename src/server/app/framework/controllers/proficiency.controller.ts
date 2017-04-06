import * as express from "express";
import Messages = require("../shared/messages");
import IndustryService = require("../services/industry.service");
import * as mongoose from "mongoose";



export function retrieve(req:express.Request, res:express.Response, next:any) {
  try {
    var industryService = new IndustryService();
    var params = req.params.id;
    industryService.findByName(params, (error, result) => {
      if (error) {
        next({
          reason: 'Error In Retriving',//Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
          message: CNextMessages.MSG_NOT_FOUND_ANY_RECORD_OF_INDUSTRY,
          code: 401
        });
      }
      else {
        console.log("Data " + JSON.stringify(result));
        //  var token = auth.issueTokenWithUid(user);
        res.send({
          "status": "success",
          "data": result[0].proficiencies
        });
      }
    });
  }
  catch (e) {
    res.status(403).send({message: e.message});
  }
}
