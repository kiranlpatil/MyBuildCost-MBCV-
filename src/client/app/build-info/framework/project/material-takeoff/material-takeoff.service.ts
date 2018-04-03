import { Injectable } from '@angular/core';
import { Http, } from '@angular/http';
import { BaseService, MessageService } from '../../../../shared/index';
import { HttpDelegateService } from '../../../../shared/services/http-delegate.service';
import { API } from '../../../../shared';


@Injectable()
export class MaterialTakeoffService extends BaseService {

  constructor(protected http: Http, protected messageService: MessageService, protected httpDelegateService : HttpDelegateService) {
    super();
  }

  getList(projectId: string) {
/*    var url = API.PROJECT + '/' +projectId+ '/' + 'materialtakeoff';
    return this.httpDelegateService.getAPI(url);*/
  }

  buildMaterialReport(building : string, secondaryFilter : string, groupBy : string, flatReport : any) {
    /*let materialReport : any[];
    return materialReport;*/
  }
}
