import * as mongoose from "mongoose";
import ICapability = require("../mongoose/capability");

interface RoleModel {
    name : string;
    capabilities :[{type: mongoose.Schema.Types.ObjectId, ref:'ICapability'}]
}
export = RoleModel;
