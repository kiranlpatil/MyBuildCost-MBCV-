import IComplexity = require("../mongoose/complexity");
import * as mongoose from "mongoose";

interface CapabilityModel {
    complexities:  [{type:mongoose.Schema.Types.ObjectId, ref:'IComplexity'}];
    name : string;
}
export = CapabilityModel;
