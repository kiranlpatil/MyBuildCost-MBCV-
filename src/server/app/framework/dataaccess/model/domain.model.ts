import * as mongoose from "mongoose";
import IRole = require("../mongoose/role");

interface DomainModel {
    names: string;
    roles : [{type:mongoose.Schema.Types.ObjectId, ref:'IRole'}];

}
export = DomainModel;
