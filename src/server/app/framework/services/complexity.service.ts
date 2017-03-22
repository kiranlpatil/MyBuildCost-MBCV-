import * as fs from 'fs';
var config = require('config');
import CNextMessages = require("../shared/cnext-messages");
import ProjectAsset = require("../shared/projectasset");
import ComplexityRepository = require("../dataaccess/repository/complexity.repository");
class ComplexityService {
  private complexityRepository:ComplexityRepository;
  APP_NAME:string;

  constructor() {
    this.complexityRepository = new ComplexityRepository();
    this.APP_NAME = ProjectAsset.APP_NAME;
  }

  retrieve(field:any, callback:(error:any, result:any) => void) {
    this.complexityRepository.retrieveAll(field, callback);
  }

  create(item:any, callback:(error:any, result:any) => void) {
    this.complexityRepository.create(item, (err, res) => {
      if (err) {
        callback(new Error("Problem in Creating Complexity model"), null);
      }
      else {
        callback(null, res);
      }
    });
  }

  retrieveByMultiIds(item:any, callback:(error:any, result:any) => void) {
    this.complexityRepository.retrieveByMultiIds(item,{  _id: 0 }, callback);
  }



}

Object.seal(ComplexityService);
export = ComplexityService;
