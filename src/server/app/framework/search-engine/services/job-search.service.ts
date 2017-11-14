import { SearchService } from './search.service';
import { CandidateDetail } from '../models/output-model/candidate-detail';
import CandidateRepository = require('../../dataaccess/repository/candidate.repository');
import CandidateClassModel = require('../../dataaccess/model/candidate-class.model');
import RecruiterClassModel = require('../../dataaccess/model/recruiterClass.model');
import JobProfileModel = require('../../dataaccess/model/jobprofile.model');
import {EList} from '../models/input-model/list-enum';
import * as mongoose from 'mongoose';
import {ConstVariables} from "../../shared/sharedconstants";

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
      callback(null,canDetail);
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



}
