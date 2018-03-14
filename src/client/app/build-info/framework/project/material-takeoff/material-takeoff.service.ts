import { Injectable } from '@angular/core';
import { Http, } from '@angular/http';
import { BaseService, MessageService } from '../../../../shared/index';


@Injectable()
export class MaterialTakeoffService extends BaseService {

  constructor(protected http: Http, protected messageService: MessageService) {
    super();
  }

}
