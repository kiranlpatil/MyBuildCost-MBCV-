import CandidateModel = require("../dataaccess/model/candidate.model");
import RecruiterRepository = require("../dataaccess/repository/recruiter.repository");

export class CandidateSearchService {

  recruiterRepository:RecruiterRepository;

  constructor() {
    this.recruiterRepository = new RecruiterRepository();
  }

  searchMatchingJobProfile(candidate:CandidateModel, recruiterId:string, callback:(error:any, result:any) => void) {

    let currentDate = new Date();
    let data = {
      '_id': recruiterId,
      'postedJobs.industry.name': candidate.industry.name,
      'postedJobs.proficiencies': {$in: candidate.proficiencies},
      'postedJobs.expiringDate': {$gte: currentDate}
    };
    let excluded_fields = {
      'postedJobs.industry.roles': 0,
    };
    this.recruiterRepository.retrieveWithLean(data, excluded_fields, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        this.recruiterRepository.getJobProfileQCard(res, candidate, undefined, callback);
      }
    });
  }

}

Object.seal(CandidateSearchService);
export = CandidateSearchService;
