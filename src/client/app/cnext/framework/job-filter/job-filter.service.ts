import {Injectable} from "@angular/core";
import {BaseService} from "../../../framework/shared/httpservices/base.service";
import {Http, Headers, RequestOptions} from "@angular/http";
import {API} from "../../../framework/shared/constants";

@Injectable()
export class   JobFilterService extends BaseService{

  constructor(private http:Http) {
    super();
  }
  getListForFilter() {
    let headers = new Headers({ 'Content-Type': 'application/json'});
    let options = new RequestOptions({ headers: headers });
    let url:string='filterlist';
    return this.http.get(url,options)
      .map(this.extractData)
      .catch(this.handleError);
  }
}
