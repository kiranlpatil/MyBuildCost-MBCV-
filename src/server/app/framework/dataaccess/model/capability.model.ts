import IComplexity = require("../mongoose/complexity");
import * as mongoose from "mongoose";
import ComplexityModel = require("./complexity.model");

interface CapabilityModel {
    complexities:  ComplexityModel[];
    name : string;
}
export = CapabilityModel;
