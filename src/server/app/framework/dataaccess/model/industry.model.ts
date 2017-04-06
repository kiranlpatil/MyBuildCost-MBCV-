import * as mongoose from "mongoose";
import IRole = require("../mongoose/role");
import RoleModel = require("./role.model");
interface IndustryModel {
    code_name: string;
    name : string;
    roles : RoleModel[];


}
export = IndustryModel;
