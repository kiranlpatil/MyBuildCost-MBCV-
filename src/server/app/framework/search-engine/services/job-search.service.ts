import { SearchService } from './search.service';
import { CandidateDetail } from '../models/output-model/candidate-detail';
import CandidateRepository = require('../../dataaccess/repository/candidate.repository');
import {EList} from '../models/input-model/list-enum';
import * as mongoose from 'mongoose';
import { ConstVariables } from '../../shared/sharedconstants';
import { UtilityFunction } from '../../uitility/utility-function';
import CandidateModel = require('../../dataaccess/model/candidate.model');
import JobProfileModel = require('../../dataaccess/model/jobprofile.model');
import { CandidateDetailsWithJobMatching } from '../../dataaccess/model/candidatedetailswithjobmatching';

export class JobSearchService extends SearchService {
  candidateRepository : CandidateRepository;
  constructor() {
    super();
    this.candidateRepository= new CandidateRepository();
  }

  getUserDetails(canId: string,callback : (err : Error, res : CandidateDetail)=> void) : any {
    this.candidateRepository.findById(canId, (myError: Error, response : any) => {
      if(myError) {
        callback(myError,null);
        return ;
      }
      let canDetail = new CandidateDetail();
      canDetail.industryName= response.industry.name;
      canDetail.capability_matrix = response.capability_matrix;
      canDetail.job_list = response.job_list;
      canDetail.userId = response.userId;
      callback(null,canDetail);
    });
   }

  getCandidateDetails(canId: string, callback: (err: Error, res: any) => void): any {
     this.candidateRepository.findById(canId, (myErr: any, response: any) => {
       if (myErr) {
         callback(myErr, null);
         return;
       }
       callback(null,response);
     });
   }

  getObjectIdsByList(candidateDetails: CandidateDetail, listName : EList) : mongoose.Types.ObjectId [] {
    let list : string;
    switch (listName) {
      case EList.JOB_APPLIED :
        list = ConstVariables.APPLIED_CANDIDATE;
        break;
      case EList.JOB_NOT_INTERESTED :
        list = ConstVariables.BLOCKED_CANDIDATE;
        break;
    }
    let send_ids : mongoose.Types.ObjectId[];
    send_ids  = new Array(0);
    for(let obj of candidateDetails.job_list) {
      if (list === obj.name) {
        for(let id of obj.ids) {
          send_ids.push(mongoose.Types.ObjectId(id));
        }
        break;
      }
    }
    return send_ids;
  }

  getCandidateVisibilityAgainstRecruiter(candidateDetails:CandidateModel, jobProfiles:JobProfileModel[]) {
    let isGotIt = true;
    let _canDetailsWithJobMatching:CandidateDetailsWithJobMatching = new CandidateDetailsWithJobMatching();
    for (let job of jobProfiles) {
      for (let item of job.candidate_list) {
        if (item.name === 'cartListed') {
          if (item.ids.indexOf(new mongoose.Types.ObjectId(candidateDetails._id).toString()) !== -1) {
            isGotIt = false;
            break;
          }
        }
      }
      if (!isGotIt) {
        break;
      }
    }

    if (isGotIt) {
      candidateDetails.personalDetails.last_name = UtilityFunction.valueHide(candidateDetails.personalDetails.last_name);
      candidateDetails.personalDetails.mobile_number = UtilityFunction.mobileNumberHider(candidateDetails.personalDetails.mobile_number);
      candidateDetails.personalDetails.email = UtilityFunction.emailValueHider(candidateDetails.personalDetails.email);
      candidateDetails.academics = [];
      candidateDetails.employmentHistory = [];
      candidateDetails.areaOfWork = [];
      candidateDetails.proficiencies = [];
      candidateDetails.awards = [];
      candidateDetails.proficiencies = [];
    }
    candidateDetails.personalDetails.password = '';
    _canDetailsWithJobMatching.candidateDetails = candidateDetails;
    _canDetailsWithJobMatching.isShowCandidateDetails = isGotIt;
    return _canDetailsWithJobMatching;
  }
}
