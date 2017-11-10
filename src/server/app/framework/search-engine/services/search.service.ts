import { BaseDetail } from '../models/output-model/base-detail';
import { EList } from '../models/input-model/list-enum';
import * as mongoose from 'mongoose';

export abstract class SearchService {
  abstract getUserDetails(id: string,callback : (err : Error, res : BaseDetail)=> void) : void;
  abstract getIdsByList(detail : BaseDetail, listName : EList) : mongoose.Types.ObjectId[] ;
}
