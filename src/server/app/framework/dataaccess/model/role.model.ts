import * as mongoose from "mongoose";
import ICapability = require("../mongoose/capability");

interface RoleModel {
    name : string;
    capabilities :any[]
}
export = RoleModel;
