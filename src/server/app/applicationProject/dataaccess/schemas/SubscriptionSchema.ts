import DataAccess = require('../../../framework/dataaccess/dataaccess');
import Subscription = require('../mongoose/Subscription');

let mongoose = DataAccess.mongooseInstance;
let mongooseConnection = DataAccess.mongooseConnection;

class SubscriptionSchema {
  static get schema() {

    let schema = mongoose.Schema({

      price: {
        type: Number
      },
      days: {
        type: Number
      },
      project: {
        type: Number
      }
    },
      {
        versionKey: false,
        timestamps:true
      });
    return schema;
  }
}
let schema = mongooseConnection.model<Subscription>('Subscription', SubscriptionSchema.schema);
export = schema;
