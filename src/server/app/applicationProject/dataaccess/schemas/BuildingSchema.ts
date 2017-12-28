import DataAccess = require('../../../framework/dataaccess/dataaccess');
import Project = require('./../mongoose/Project');

let mongoose = DataAccess.mongooseInstance;
let mongooseConnection = DataAccess.mongooseConnection;

class BuildingSchema {
  static get schema() {

    let schema = mongoose.Schema({

      name: {
        type: String
      },
      region: {
        type: String
      },
      buildings: [{type: String}],
      address: {
        city: String,
        state: String,
        country: String,
        pin: String
      },
      plotArea: {
        quantity: Number,
        unit: String
      },
      plotPeriphery: {
        type: String
      },
      projectDuration: {
        type: Number
      },
      activation_date: {
        type: Date,
      }
    }, {versionKey: false});
    return schema;
  }
}
let schema = mongooseConnection.model<Building>('Building', BuildingSchema.schema);
export = schema;
