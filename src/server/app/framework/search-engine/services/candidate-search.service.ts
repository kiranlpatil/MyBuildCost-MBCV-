import { SearchService } from './search.service';
import RecruiterRepository = require('../../dataaccess/repository/recruiter.repository');
import {JobDetail} from '../models/output-model/job-detail';
import JobProfileModel = require('../../dataaccess/model/jobprofile.model');
import { BaseDetail } from '../models/output-model/base-detail';
export class CandidateSearchService extends SearchService {
  recruiterRepository : RecruiterRepository;
  constructor() {
    super();
    this.recruiterRepository= new RecruiterRepository();
  }
  getUserDetails(jobId: string, callback : (err : Error, res : BaseDetail)=> void) : void {

    this.recruiterRepository.getJobById(jobId, (myError: Error, response : JobProfileModel) => {
        if(myError) {
          callback(myError,null);
          return ;
        }
        let jobDetail = new JobDetail();
        jobDetail.interestedIndustries= response.interestedIndustries;
        jobDetail.industryName = response.industry.name;
        jobDetail.relevantIndustries = response.releventIndustries;
        jobDetail.city = response.location.city;
        jobDetail.candidateList = response.candidate_list;
        jobDetail.capability_matrix = response.capability_matrix;
        callback(null,jobDetail);
    });
  }
}
