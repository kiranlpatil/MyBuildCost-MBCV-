import { Injectable } from '@angular/core';
import { Headers, Http, RequestOptions } from '@angular/http';
import { API, BaseService, SessionStorage, SessionStorageService, MessageService } from '../../../../shared/index';


@Injectable()
export class CostSummaryService extends BaseService {

  constructor(protected http: Http, protected messageService: MessageService) {
    super();
  }

  getProjectDetails(projectId: string) {
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    var url = API.VIEW_PROJECT + '/'+ projectId;
    return this.http.get(url, options)
      .map(this.extractData)
      .catch(this.handleError);
  }

  getBuildingDetails(projectId: string) {
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    var url = API.VIEW_PROJECT + '/'+ projectId +'/'+ API.ADD_BUILDING +
      '/'+SessionStorageService.getSessionValue(SessionStorage.CURRENT_BUILDING);
    return this.http.get(url, options)
      .map(this.extractData)
      .catch(this.handleError);
  }

  getCost(projectId: string,defaultCostIn:string,defaultCostPer:string) {
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});

    var url = API.THUMBRULE_RULE_RATE + '/'+ API.VIEW_PROJECT +'/'+projectId+'/';

    if(defaultCostIn==='Rs/Sqft') {
      url=url + 'rate/' + API.SQFT;
    }    else {
      url=url + 'rate/' + API.SQM;
    }


    if(defaultCostPer==='SlabArea') {
      url=url + '/area/' + API.SLAB_AREA;
    }    else {
      url=url + '/area/' + API.SALEABLE_AREA;
    }


    return this.http.get(url, options)
      .map(this.extractData)
      .catch(this.handleError);
  }

  deleteCostHead(buildingId:string, costHeadId:number) {
    let projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT);
    var url = 'project/'+projectId+'/'+API.VIEW_BUILDING+'/'+buildingId+'/'+'costHead/'+costHeadId+'/false';
    let body = {};
    return this.http.put(url, body)
      .map(this.extractData)
      .catch(this.handleError);
  }


  getInactiveCostHeads(projectId: string,buildingId: string) {
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    var url = API.VIEW_PROJECT + '/'+ projectId +'/'+ API.VIEW_BUILDING + '/' +buildingId + '/costhead';
    return this.http.get(url, options)
      .map(this.extractData)
      .catch(this.handleError);
  }

  addInactiveCostHead(selectedInactiveCostHeadId:number,projectId:string,buildingId:string) {
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    var url = API.VIEW_PROJECT + '/'+ projectId +'/'+ API.VIEW_BUILDING + '/'
      +buildingId + '/costHead/' +selectedInactiveCostHeadId+'/true';
    return this.http.put(url,options)
      .map(this.extractData)
      .catch(this.handleError);
  }

  updateBudgetCostAmountForCostHead(buildingId : string, costHeadName : string,
                                    costIn : string, costPer : string, buildingArea : number, amount:number) {
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    var url = API.VIEW_PROJECT + '/' + SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT)+
      '/'+ API.VIEW_BUILDING + '/' +buildingId+ '/costhead';
    var totalAmount = amount;
    var body = {
      'budgetedCostAmount' : totalAmount,
      'costIn' : costIn,
      'costPer' : costPer,
      'costHead' : costHeadName,
      'buildingArea' : buildingArea
    };
    return this.http.put(url, body,options)
      .map(this.extractData)
      .catch(this.handleError);
  }

  }
