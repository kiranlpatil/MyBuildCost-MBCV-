import { Injectable } from '@angular/core';
import { Headers, Http, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Project } from './../../model/project';
import { API, BaseService, MessageService } from '../../../../shared/index';
import { HttpDelegateService } from '../../../../shared/services/http-delegate-service/http-delegate.service';

@Injectable()
export class CreateProjectService extends BaseService {

  constructor(protected http: Http, protected messageService: MessageService,
              protected httpDelegateService: HttpDelegateService) {
    super();
  }

  createProject(project : Project): Observable<Project> {
    let url = API.VIEW_PROJECT;
    return this.httpDelegateService.postAPI(url, project);
  }

}
