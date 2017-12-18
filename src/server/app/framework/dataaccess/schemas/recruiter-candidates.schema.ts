import DataAccess = require("../dataaccess");
import RecruiterCandidates = require("../mongoose/recruiter-candidates");
let mongoose = DataAccess.mongooseInstance;
let mongooseConnection = DataAccess.mongooseConnection;

class RecruiterCandidatesSchema {
  static get schema() {
    let schema = mongoose.Schema({
      recruiterId: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter',
        required: true
      },
      source: {
        type: String,
        required: true
      },
      candidateId: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Candidate'
      },
      name: {
        type: String
      },
      mobileNumber: {
        type: Number
      },
      email: {
        type: String
      },
      status: {
        type: String
      },
      noOfMatchingJobs: {
        type: Number
      },
      jobId: {
        type: mongoose.Schema.Types.ObjectId, ref: 'JobProfile'
      },
      highestMatchingJob: {
        type: String
      },
      highestMatchingJobPercentage: {
        type: Number
      },
      viewOtherMatchingJobs: {
        type: String
      },
      statusUpdatedOn: {
        type: Date
      }
    }, {versionKey: false});
    return schema;
  }
}

let schema = mongooseConnection.model<RecruiterCandidates>('recruiter-candidates', RecruiterCandidatesSchema.schema);
export = schema;
