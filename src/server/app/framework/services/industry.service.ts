import * as fs from 'fs';
var config = require('config');
import Messages = require("../shared/messages");
import ProjectAsset = require("../shared/projectasset");
import IndustryRepository = require("../dataaccess/repository/industry.repository");
class IndustryService {
  private industryRepository:IndustryRepository;
  APP_NAME:string;

  constructor() {
    this.industryRepository = new IndustryRepository();
    this.APP_NAME = ProjectAsset.APP_NAME;
  }

  retrieve(field: any, callback: (error: any, result: any) => void) {
    this.industryRepository.retrieveAll(field, callback);
  }

}

Object.seal(IndustryService);
export = IndustryService;
