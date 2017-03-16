import * as mongoose from "mongoose";
import User = require("../mongoose/user");
interface AdminModel {
    userId :  [{type:mongoose.Schema.Types.ObjectId, ref:'User'}];
}
export = AdminModel;
