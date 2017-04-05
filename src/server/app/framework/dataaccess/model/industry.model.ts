import * as mongoose from "mongoose";
import IRole = require("../mongoose/role");
interface IndustryModel {
    code_name: string;
    name : string;
    roles : any[];


}
export = IndustryModel;
