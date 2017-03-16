import DataAccess = require("../dataaccess");
import User = require("../mongoose/user");
import ICandidate = require("../mongoose/candidate");
import ICapability = require("../mongoose/capability");
import IAcademic = require("../mongoose/academics");
import ICertification = require("../mongoose/certification");
import IProficiency = require("../mongoose/proficiency");
import IProfessionalDetails = require("../mongoose/professional-details");
import IEmploymentHistory = require("../mongoose/employment-history");
import IJobProfile = require("../mongoose/job-profile");
import ILocation = require("../mongoose/location");
import IDomain = require("../mongoose/domain");
var mongoose = DataAccess.mongooseInstance;
var mongooseConnection = DataAccess.mongooseConnection;

class JobProfileSchema {
  static get schema() {
    var schema = mongoose.Schema({
      proficiences :[{type : mongoose.Schema.Types.ObjectId, ref :'IProficiency'}],
      domain :[{type : mongoose.Schema.Types.ObjectId, ref :'IDomain'}],
      location : [{type : mongoose.Schema.Types.ObjectId, ref :'ILocation'}],
      experience :{
        type : Number
      },
      postingDate :{
        type : Date
      },

    },{ versionKey: false });

    return schema;
  }
}
var schema = mongooseConnection.model<IJobProfile>("JobProfile", JobProfileSchema.schema);
export = schema;
