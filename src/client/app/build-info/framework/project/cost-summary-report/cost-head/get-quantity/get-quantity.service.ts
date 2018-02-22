import { Injectable } from '@angular/core';
import { Headers, Http, RequestOptions } from '@angular/http';
import { API, BaseService, SessionStorage, SessionStorageService, MessageService } from '../../../../../../shared/index';


@Injectable()
export class GetQuantityService extends BaseService {

  constructor(protected http: Http, protected messageService: MessageService) {
    super();
  }

  updateQuantityItems(costHeadId:number, subCategoryId : number, workItemId:number, quantityItemsArray:any) {
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    let projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT);
    let buildingId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_BUILDING);
    var body= { 'item' : quantityItemsArray };
    var url = API.VIEW_PROJECT + '/' + projectId + '/'+ API.VIEW_BUILDING + '/' + buildingId
      + '/costhead/' + costHeadId + '/subcategory/'+ subCategoryId +'/workitem/' + workItemId + '/quantity';
    return this.http.put(url,body,options)
      .map(this.extractData)
      .catch(this.handleError);
  }

  deleteQuantityItem(costHeadId:number, subCategoryId : number, workItemId:number, itemName: string) {
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    let projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT);
    let body = { item : itemName };
    let buildingId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_BUILDING);
    var url = API.VIEW_PROJECT + '/' +  projectId + '/'+ API.VIEW_BUILDING + '/' + buildingId + '/'
      + 'costhead' + '/' + costHeadId + '/' + 'subcategory'+ '/' + subCategoryId + '/'+ 'workitem/' + workItemId + '/quantity' + '/item';
    return this.http.post(url, body, options)
      .map(this.extractData)
      .catch(this.handleError);
  }

}
