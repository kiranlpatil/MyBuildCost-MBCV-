import { Injectable } from '@angular/core';
import { Http, } from '@angular/http';
import { BaseService, MessageService } from '../../../../shared/index';
import { HttpDelegateService } from '../../../../shared/services/http-delegate.service';
import { API } from '../../../../shared';
import alasql = require('alasql');
/*import * as alasql from 'alasql';*/


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

  getDistinctBuildingList(flatReport : any) {
    //let distinctBuildingSQL = 'SELECT * FROM ?';
    var buildingList; //= alasql(distinctBuildingSQL, [flatReport]);
    //buildingList = alasql(distinctBuildingSQL,[flatReport]);
    /*var data = [{a:1,b:10}, {a:2,b:20}, {a:1,b:30}];

    var res = alasql('SELECT a, SUM(b) AS b FROM ? GROUP BY a',[data]);

    console.log(res);*/ // [{"a":1,"b":40},{"a":2,"b":20}]
    /*return buildingList;*/
  }
}
