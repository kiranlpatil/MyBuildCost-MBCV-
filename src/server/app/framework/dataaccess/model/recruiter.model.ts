import * as mongoose from "mongoose";
import User = require("../mongoose/user");
interface RecruiterModel {
    userId :  [{type:mongoose.Schema.Types.ObjectId, ref:'User'}];
}
export = RecruiterModel;
