import * as mongoose from "mongoose";
import IScenario = require("../mongoose/scenario");
interface ComplexityModel {
    name: string;
    industryCode : string;
    scenarios : any[];

}
export = ComplexityModel;
