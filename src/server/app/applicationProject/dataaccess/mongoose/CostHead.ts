import * as mongoose from 'mongoose';
import CostHeadModel = require('../model/CostHead');
interface CostHead extends CostHeadModel, mongoose.Document {
}
export = CostHead;
