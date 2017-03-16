import * as mongoose from "mongoose";
import IProficiency = require("../mongoose/proficiency");
import IDomain = require("../mongoose/domain");
import ILocation = require("../mongoose/location");

interface JobProfileModel {
    profiences :  [{type:mongoose.Schema.Types.ObjectId, ref:'IProficiency'}];
    domain: {type:mongoose.Schema.Types.ObjectId, ref:'IDomain'};
    experience : number;
    location : {type:mongoose.Schema.Types.ObjectId, ref:'ILocation'};
    postingDate : Date;
    remark : string;

}
export = JobProfileModel;
