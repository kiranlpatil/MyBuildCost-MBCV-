import {Injectable} from "@angular/core";
import {BaseService} from "../../../framework/shared/httpservices/base.service";
import {Http, Headers, RequestOptions} from "@angular/http";
import {API, LocalStorage} from "../../../framework/shared/constants";
import {JobPosterModel} from "../model/jobPoster";
import {Observable} from "rxjs";
import {LocalStorageService} from "../../../framework/shared/localstorage.service";
@Injectable()
export class   RecruiteQCardView2Service extends BaseService{

  constructor(private http:Http) {
    super();
  }
  getSearchedcandidate(jobPosterModel:JobPosterModel)
  {
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    var body = JSON.stringify(jobPosterModel);
    return this.http.post(API.SEARCH_CANDIDATE,body,options)
      .map(this.extractData)
      .catch(this.handleError);
  }
  getCandidates(id:string):Observable<any> {
    let url:string=API.CANDIDATE_PROFILE+'/'+id;
    return this.http.get(url)
      .map(this.extractData)
      .catch(this.handleError);
  }
  getCandidatesdetails(ids:string[],model:JobPosterModel):Observable<any>{
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    var body = {
      "candidateIds" : ids
    };
    let url:string=API.CANDIDATE_DETAILS+'/'+model._id+'/'+'candidates'
    return this.http.post(url,body,options)
      .map(this.extractData)
      .catch(this.handleError);
  }
}
