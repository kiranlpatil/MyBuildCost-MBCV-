import * as express from "express";
import {CandidateDetailsWithJobMatching} from "../../dataaccess/model/candidatedetailswithjobmatching";
import JobProfileModel = require('../../dataaccess/model/jobprofile.model');
import SearchService = require('../services/search.service');
import CandidateService = require('../../services/candidate.service');
import RecruiterService = require('../../services/recruiter.service');
import CandidateSearchService = require('../../services/candidate-search.service');

export class SearchController {

  getMatchingCandidates(req: express.Request, res: express.Response) {
    console.time('getMatchingCandidatesController');
    let searchService = new SearchService();
    let profileId = req.params.id;
    let recruiterService = new RecruiterService();
    recruiterService.getJobById(profileId, (err: any, jobRes: JobProfileModel) => {
      searchService.getMatchingCandidates(jobRes, (error: Error, result: any) => {
        if (error) {
          res.status(304).send(error);
        } else {
          console.timeEnd('getMatchingCandidatesController');
          res.status(200).send(result);
        }
      });
    });
  }

  getMatchingJobProfiles(req: express.Request, res: express.Response) {
    let searchService = new SearchService();
    let candidateService = new CandidateService();
    let candidateId = req.params.id;
    candidateService.findById(candidateId, (error: Error, candiRes: any) => {
      if (error) {
        res.status(304).send(error);
      } else {
        searchService.getMatchingJobProfile(candiRes, (error: Error, result: any) => {
          if (error) {
            res.status(304).send(error);
          } else {
            res.status(200).send(result);
          }
        });
      }
    });
  }

  searchCandidateJobProfiles(req:express.Request, res:express.Response) {
    let candidateSearchService = new CandidateSearchService();
    let candidateService = new CandidateService();
    let candidateId = req.params.candidateId;
    let searchService = new SearchService();
    let recruiterId = req.params.recruiterId;
    candidateService.findById(candidateId, (error:Error, candiRes:any) => {
      if (error) {
        res.status(304).send(error);
      } else {
        candidateSearchService.searchMatchingJobProfile(candiRes, recruiterId, 'searchView', (error:Error, result:any) => {
          if (error) {
            res.status(304).send(error);
          } else {
            candidateSearchService.getCandidateInfoById([candidateId], (error, candidateDetails) => {
              if (error) {
                res.status(304).send(error);
              }
              else {
                let _candidateDetails:CandidateDetailsWithJobMatching = searchService.getCandidateVisibilityAgainstRecruiter(candidateDetails[0], result);
                _candidateDetails.jobQCardMatching = candidateDetails[0].isVisible ? result : [];
                res.send({
                  'status': 'success',
                  'data': _candidateDetails
                });
              }
            });
          }
        });
      }
    });
  }


}
