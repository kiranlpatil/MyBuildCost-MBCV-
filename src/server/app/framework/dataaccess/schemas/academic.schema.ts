import DataAccess = require("../dataaccess");
import IAcademic = require("../mongoose/academics");

var mongoose = DataAccess.mongooseInstance;
var mongooseConnection = DataAccess.mongooseConnection;

class AcademicSchema {
    static get schema() {
        var schema = mongoose.Schema({
          schoolName : {
            type : String
          },
          board : {
            type : String
          },
          yearOfPassing : {
            type : Number
          },
          specialization : {
            type : String
          }

        },{ versionKey: false });

        return schema;
    }
}
var schema = mongooseConnection.model<IAcademic>("Location", AcademicSchema.schema);
export = schema;
