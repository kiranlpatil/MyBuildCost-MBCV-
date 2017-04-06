import * as mongoose from "mongoose";
import IRole = require("../mongoose/role");
import RoleModel = require("./role.model");
import ProficiencyModel = require("./proficiency.model");
interface IndustryModel {
    code_name: string;
    name : string;
    roles : RoleModel[];
    proficiencies : ProficiencyModel
}
export = IndustryModel;
