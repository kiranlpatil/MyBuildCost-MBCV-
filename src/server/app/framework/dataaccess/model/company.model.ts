import * as mongoose from "mongoose";
import ILocation = require("../mongoose/location");
interface CompanyModel {
    name: string;
    size  : number;
    logoUrl : string;
    location : [{type:mongoose.Schema.Types.ObjectId, ref:'ILocation'}];
}
export = CompanyModel;
