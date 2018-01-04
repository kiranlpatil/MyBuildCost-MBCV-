import * as mongoose from 'mongoose';
import CompanyModel = require('../model/Company');
interface Company extends CompanyModel, mongoose.Document {
}
export = Company;
