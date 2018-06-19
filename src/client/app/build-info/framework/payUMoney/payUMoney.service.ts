import { Injectable } from '@angular/core';
import { HttpDelegateService } from '../../../shared/services/http-delegate.service';
import { API } from '../../../shared/constants';
import { BaseService } from '../../../shared/services/http/base.service';
import { PayUMoneyModel } from '../model/PayUMoneyModel';
import { Headers, Http, RequestOptions } from '@angular/http';

@Injectable()

export class PayUMoneyService extends BaseService {

  constructor(protected httpDelegateService : HttpDelegateService, protected http: Http) {
    super();
  }

  getHash(payUMoney : PayUMoneyModel) {
    let url = API.SUBSCRIPTION + '/' + API.GENERATE_HASH;
    let body = payUMoney;
    let headers = new Headers({'Content-Type': 'application/json'});
    let options = new RequestOptions({headers: headers});
    return this.httpDelegateService.postAPI(url,body);

    /*return this.http.post(url, JSON.stringify(body), options)
      .subscribe(data => {
        console.log('data' +JSON.stringify(data));
      }, error => {
        console.log('error : '+JSON.stringify(error));
      });*/

  }

  payUMoneyPayment(payUMoney : PayUMoneyModel) {
    let url = 'https://test.payu.in/_payment';
    let body = payUMoney;
    return this.httpDelegateService.postAPI(url,body);
  }

  getData(payUMoney : PayUMoneyModel) {
    let body = payUMoney;
    let url = 'https://test.payu.in/_payment';
    let headers = new Headers({'Content-Type': 'application/x-www-form-urlencoded'});
    headers.set('Access-Control-Allow-Origin','*');
    headers.set('Access-Control-Allow-Methods', 'POST');
    let options = new RequestOptions({headers: headers});
    //return this.httpDelegateService.postAPI(url,body);
    return this.http.post('https://test.payu.in/_payment', JSON.stringify(body), options)
      .subscribe(data => {
        console.log('data' +JSON.stringify(data));
      }, error => {
        console.log('error : '+JSON.stringify(error));
      });
  }
}
