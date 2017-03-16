import * as mongoose from "mongoose";
import IScenario = require("../mongoose/scenario");
interface ComplexityModel {
    names: string;
    industryCode : string;
    scenarios : [{type:mongoose.Schema.Types.ObjectId, ref:'IScenario'}];

}
export = ComplexityModel;
