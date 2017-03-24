import ILocation = require("../mongoose/location");
import * as mongoose from "mongoose";

interface ProfessionalDetailsModel {
  education : string;
  experience : string;
  currentSalary : string;
  noticePeriod : string;
  relocate : string;
}
export = ProfessionalDetailsModel;

