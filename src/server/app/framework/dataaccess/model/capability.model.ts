import IComplexity = require("../mongoose/complexity");
import * as mongoose from "mongoose";

interface CapabilityModel {
    complexities:  any[];
    name : string;
}
export = CapabilityModel;
