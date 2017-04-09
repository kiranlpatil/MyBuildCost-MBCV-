import {    Injectable  } from '@angular/core';
import {  Observable  } from 'rxjs/Observable';
import {  Http,Headers, RequestOptions  } from '@angular/http';
import { BaseService } from '../../../framework/shared/httpservices/base.service';
import {  API, LocalStorage  } from '../../../framework/shared/constants';
import {  LocalStorageService  } from '../../../framework/shared/localstorage.service';
import { EmployementHistory } from '../model/employment-history';
import {Award} from "../model/award";

@Injectable()
export class CandidateAwardService extends BaseService {
  constructor(private http:Http) {
    super();
  }



  addCandidateAward(candidateaward:Award[] ):Observable<any> {
    let headers = new Headers({ 'Content-Type': 'application/json'});
    let options = new RequestOptions({ headers: headers });
    let body = JSON.stringify({"awards":candidateaward});
    let url:string=API.CANDIDATE_PROFILE+'/'+LocalStorageService.getLocalValue(LocalStorage.USER_ID);
    return this.http.put(url, body,options)
      .map(this.extractData)
      .catch(this.handleError);
  }
}
