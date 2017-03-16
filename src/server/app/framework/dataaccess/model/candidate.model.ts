import ICapability = require("../mongoose/capability");
import IAcademic = require("../mongoose/academics");
import ICertification = require("../mongoose/certification");
import IProficiency = require("../mongoose/proficiency");
import IProfessionalDetails = require("../mongoose/professional-details");
import IEmploymentHistory = require("../mongoose/employment-history");
import ILocation = require("../mongoose/location");
import User = require("../mongoose/user");
import * as mongoose from "mongoose";

interface CandidateModel {
  isVisibleProfile : boolean;
  isCandidate: boolean;
  userId :  {type:mongoose.Schema.Types.ObjectId, ref:'User'};
  location: {type:mongoose.Schema.Types.ObjectId, ref:'ILocation'}
  capabilities :  [{type:mongoose.Schema.Types.ObjectId, ref:'ICapability'}];
  academics :  [{type:mongoose.Schema.Types.ObjectId, ref:'IAcademic'}];
  certifications : [{type:mongoose.Schema.Types.ObjectId, ref:'ICertification'}];
  professionalDetails :  [{type:mongoose.Schema.Types.ObjectId, ref:'IProfessionalDetails'}];
  employmentHistory : [{type:mongoose.Schema.Types.ObjectId, ref:'IEmploymentHistory'}];
  proficiencies : [{type:mongoose.Schema.Types.ObjectId, ref:'IProficiency'}];
}
export = CandidateModel;
