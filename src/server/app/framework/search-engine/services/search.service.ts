import { BaseDetail } from '../models/output-model/base-detail';
export abstract class SearchService {
  abstract getUserDetails(id: string,callback : (err : Error, res : BaseDetail)=> void) : void;

}
