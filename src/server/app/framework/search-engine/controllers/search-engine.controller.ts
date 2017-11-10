import * as express from 'express';
import { CandidateSearchEngine } from '../engines/candidate-search.engine';
import { AppliedFilter } from '../models/input-model/applied-filter';
import { EList } from '../models/input-model/list-enum';
import { JobDetail } from '../models/output-model/job-detail';
import { JobSearchService } from '../services/job-search.service';
import { BaseDetail } from '../models/output-model/base-detail';
import { CandidateSearchService } from '../services/candidate-search.service';

export class SearchEngineController {
    getMatchingProfile(req: express.Request, res: express.Response, next: any) : void {
      let searchEngine = new CandidateSearchEngine();
      //let searchEngine = new JobSearchEngine();
      //searchEngine.getMatchingObjects();
      let profileId = req.params.id;
      let appliedFilters : AppliedFilter = req.body.obj;
      let searchService = new CandidateSearchService();
     //let searchService  = new JobSearchService();
      searchService.getUserDetails(profileId, (err: Error, againstDetails: BaseDetail) => {
        if(err) {
          res.send();
        } else {
          let criteria : any;
          if(appliedFilters.listName === EList.CAN_MATCHED) {
          //if(appliedFilters.listName === EList.JOB_MATCHED) {
            criteria = searchEngine.buildBusinessCriteria(<JobDetail>againstDetails);
          }else {
            let ids = searchService.getIdsByList(<JobDetail>againstDetails, appliedFilters.listName);
            criteria = { '_id': { $in: ids}};
          }
          let mainCriteria =searchEngine.buildUserCriteria(appliedFilters,criteria);
          searchEngine.getMatchingObjects(mainCriteria, (error : any, response : any) => {
            if(error) {
              res.send();
            }else {
              //let jobs = searchService.getJobsByCriteria(response,againstDetails); //todo handle it for recruiter dashboard
              let q_cards = searchEngine.buildQCards(response,againstDetails,appliedFilters.sortBy);
              res.status(200).send(q_cards);
            }
          });
        }
      });
    }
}
