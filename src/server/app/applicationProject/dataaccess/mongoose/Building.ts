import * as mongoose from 'mongoose';
import BuildingsModel = require('../model/Building');
interface Building extends BuildingsModel, mongoose.Document {
}
export = Building;
