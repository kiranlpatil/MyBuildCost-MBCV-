import ICapability = require("../mongoose/capability");
import IAcademic = require("../mongoose/academics");
import IComplexity = require("../mongoose/complexity");
import IProficiency = require("../mongoose/proficiency");
import IProfessionalDetails = require("../mongoose/professional-details");
import IEmploymentHistory = require("../mongoose/employment-history");
import ILocation = require("../mongoose/location");
import User = require("../mongoose/user");
import * as mongoose from "mongoose";
import LocationModel = require("./location.model");
import AcademicModel = require("./academic.model");
import ProfessionalDetailsModel = require("./professional-details.model");
import EmployeeHistoryModel = require("./employee-history.model");
import ProficiencyModel = require("./proficiency.model");
import CapabilityModel = require("./capability.model");
import RoleModel = require("./role.model");

interface CandidateModel {
  isVisible : boolean;
  aboutMyself: string;
  certifications : string[];
  awards : string[];
  userId :  {type:mongoose.Schema.Types.ObjectId, ref:'User'};
  location: LocationModel;
  roles: RoleModel;
  academics :  AcademicModel[];
  professionalDetails :  ProfessionalDetailsModel[];
  employmentHistory : EmployeeHistoryModel[];
  proficiencies : ProficiencyModel[];
}
export = CandidateModel;
