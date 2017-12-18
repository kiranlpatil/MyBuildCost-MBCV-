class RecruiterCandidatesModel {
  recruiterId: string;
  source: string;
  candidateId: string;
  name: string;
  mobileNumber: number;
  email: string;
  status: string;
  noOfMatchingJobs: number;
  jobId: string;
  highestMatchingJob: string;
  highestMatchingJobPercentage: number;
  viewOtherMatchingJobs: string;
  statusUpdatedOn: Date;
  fromDate: Date;
  toDate: Date;
}
export = RecruiterCandidatesModel;
