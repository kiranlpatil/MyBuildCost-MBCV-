import { Injectable } from '@angular/core';
import {Http,Headers, RequestOptions} from '@angular/http';
import { Observable } from 'rxjs/Observable';
import {BaseService} from "../../../framework/shared/httpservices/base.service";
import {API} from "../../../framework/shared/constants";




@Injectable()
export class proficiencyDomainService extends BaseService {

  constructor(private http: Http) {
    super()
  }

  // public getproficiency() {
  //   return this.http.get()
  //     .map(this.extractData)
  //     .catch(this.handleError);
  // }

  // addIndustryProfile(industryprofile:industryProfile):Observable<industryProfile>{
  //
  //   let headers = new Headers({ 'Content-Type': 'application/json'});
  //   let options = new RequestOptions({ headers: headers });
  //   let body = JSON.stringify(industryprofile);
  //   return this.http.post(API.INDUSTRY_PROFILE, body,options)
  //     .map(this.extractData)
  //     .catch(this.handleError);
  // }
}
