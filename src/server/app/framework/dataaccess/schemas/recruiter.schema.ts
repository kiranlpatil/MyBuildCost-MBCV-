import DataAccess = require("../dataaccess");
import User = require("../mongoose/user");
import IRecruiter = require("../mongoose/recruiter");

var mongoose = DataAccess.mongooseInstance;
var mongooseConnection = DataAccess.mongooseConnection;

class RecruiterSchema {
    static get schema() {
        var schema = mongoose.Schema({
          userId : {
            type : mongoose.Schema.Types.ObjectId, ref :'User'
          }
        },{ versionKey: false });

        return schema;
    }
}
var schema = mongooseConnection.model<IRecruiter>("Role", RecruiterSchema.schema);
export = schema;
