import * as mongoose from "mongoose";
import ICapability = require("../mongoose/capability");
import CapabilityModel = require("./capability.model");

interface RoleModel {
    name : string;
    capabilities :CapabilityModel[];
}
export = RoleModel;
