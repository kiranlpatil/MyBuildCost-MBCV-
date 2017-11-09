import { SearchEngine } from './search.engine';
import {AppliedFilter} from '../models/input-model/applied-filter';
import {BaseDetail} from "../models/output-model/base-detail";
import {EList} from "../models/input-model/list-enum";
export class JobSearchEngine extends SearchEngine {

  buildBusinessCriteria(details : BaseDetail, listName : EList): any {

  }

  buildUserCriteria(filter : AppliedFilter, criteria : any) : any {
  console.log('hi');
  }

  getMatchingObjects(criteria : any, callback : (error : any, response : any) => void) : void {

  }

  buildQCards(objects : any[], jobDetails : BaseDetail) : any {

  }

  createQCard(): any {
    console.log('createQCard');
  }

}
