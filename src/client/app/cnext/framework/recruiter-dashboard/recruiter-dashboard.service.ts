import {   Injectable  } from '@angular/core';
import {  Http } from '@angular/http';
import {  Observable  } from 'rxjs/Observable';
import {LocalStorage, API} from "../../../framework/shared/constants";
import {BaseService} from "../../../framework/shared/httpservices/base.service";
import {LocalStorageService} from "../../../framework/shared/localstorage.service";

@Injectable()
export class RecruiterDashboardService extends BaseService {

  constructor(private http: Http) {
    super();
  }

  getJobList():Observable<any> {
    let url:string=API.JOB_LIST+'/'+LocalStorageService.getLocalValue(LocalStorage.USER_ID);
    return this.http.get(url)
      .map(this.extractData)
      .catch(this.handleError);
  }

  getPostedJobDetails():Observable<any> {
    //let url:string=API.JOB_DETAILS+'/'+LocalStorageService.getLocalValue(LocalStorage.CURRENT_JOB_POSTED_ID);
    let url:string=API.JOB_DETAILS+'/'+"590c3ee91c665aa348c4abd3";
    return this.http.get(url)
      .map(this.extractData)
      .catch(this.handleError);
  }

}
