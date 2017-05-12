import {Injectable} from "@angular/core";
import {BaseService} from "../../../framework/shared/httpservices/base.service";
import {Http, Headers, RequestOptions} from "@angular/http";
import {API} from "../../../framework/shared/constants";
import {JobPosterModel} from "../model/jobPoster";
import {Observable} from "rxjs";
@Injectable()
export class   QCardViewService extends BaseService{

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
  addCandidateLists(recruiterId:string, profileId:string,candidateId:string, listName:string, action:string):Observable<any> {
    let headers = new Headers({ 'Content-Type': 'application/json'});
    let options = new RequestOptions({ headers: headers });
    let url:string="recruiter/"+recruiterId+"/jobProfile/"+profileId+"/"+listName+"/"+candidateId+"/"+action;
    let body:any={};
    return this.http.put(url, body,options)
      .map(this.extractData)
      .catch(this.handleError);
  }
}
