import ICapability = require("../mongoose/capability");
import IAcademic = require("../mongoose/academics");
import IComplexity = require("../mongoose/complexity");
import IProficiency = require("../mongoose/proficiency");
import IProfessionalDetails = require("../mongoose/professional-details");
import IEmploymentHistory = require("../mongoose/employment-history");
import ILocation = require("../mongoose/location");
import User = require("../mongoose/user");
import * as mongoose from "mongoose";

interface CandidateModel {
  isVisible : boolean;
  aboutMyself: string;
  certifications : string[];
  awards : string[];
  userId :  any;
  location: any;
  capabilities :  any[];
  complexities :  any[];
  academics :  any[];
  professionalDetails :  any[];
  employmentHistory : any[];
  proficiencies : any[];
}
export = CandidateModel;
