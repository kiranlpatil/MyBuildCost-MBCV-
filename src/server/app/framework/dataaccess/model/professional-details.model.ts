import ILocation = require("../mongoose/location");
import * as mongoose from "mongoose";

interface ProfessionalDetailsModel {
  education : string;
  experience : number;
  currentSalary : number;
  remark : string;
  location : {type : mongoose.Schema.Types.ObjectId, ref :'ILocation'};
}
export = ProfessionalDetailsModel;

