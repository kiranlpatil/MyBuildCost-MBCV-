import CNextMessages = require('../shared/cnext-messages');
import ProjectAsset = require('../shared/projectasset');
import IndustryRepository = require('../dataaccess/repository/industry.repository');
class IndustryService {
  APP_NAME: string;
  private industryRepository: IndustryRepository;

  constructor() {
    this.industryRepository = new IndustryRepository();
    this.APP_NAME = ProjectAsset.APP_NAME;
  }
//to do retrieve all parameter list
  retrieveAll(field: any, callback: (error: any, result: any) => void) {
    this.industryRepository.retriveIndustriesWithSortedOrder({roles: 0,proficiencies: 0}, callback);
  }

  retrieve(field: any, callback: (error: any, result: any) => void) {
    this.industryRepository.retrieve(field, callback);
  }

  findByName(field: any, callback: (error: any, result: any) => void) {
    this.industryRepository.findByName(field, callback);
  }
  // todo remove unwanted methods and data
  // todo all daw layer code to service
//pushinto Array check
  pushIntoArray(name: any, value: string, callback: (error: any, result: any) => void) {
    this.industryRepository.pushElementInArray(value, callback);
  }

  create(item: any, callback: (error: any, result: any) => void) {

    this.industryRepository.retrieve({ 'code' : item.code }, (errinCreate: any, response: any) => {
      if (errinCreate) {
        callback(new Error(CNextMessages.PROBLEM_IN_CREATING_INDUSTRY), null);
      } else {
        if (response.length === 0) {
          this.industryRepository.create(item, (err, res) => {
            if (err) {
              callback(new Error(CNextMessages.PROBLEM_IN_CREATING_INDUSTRY), null);
            }else {
              callback(null, res);
            }
          });
        } else {
          this.industryRepository.findOneAndUpdate({'_id': response[0]._id}, item, {new: true}, callback);
        }
      }
    });
  }

  getReleventIndustryList(data: any,industryName: string, callback: (error: any, result: any) => void) {

    let query = { 'roles.code': {$in :JSON.parse(data)}};
    this.industryRepository.retrieve(query, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        let industries:any[] = new Array(0);
        if(res.length > 0) {
          for (let item of res) {
            if(industryName !== item.name) {
              let obj = {name: item.name};
              industries.push(obj);
            }
          }
          callback(null, industries);
        } else {
          let industries : any[] = new Array(0);
          callback(null, industries);
        }
      }
    });

  }
}

Object.seal(IndustryService);
export = IndustryService;
