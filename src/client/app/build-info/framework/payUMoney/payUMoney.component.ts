import { Component , OnInit } from '@angular/core';
import { Router , ActivatedRoute } from '@angular/router';
import { PayUMoneyModel } from '../model/PayUMoneyModel';
import { PayUMoneyService } from './payUMoney.service';

@Component ({
  moduleId:module.id,
  selector:'pay-u-money-integration',
  templateUrl:'payUMoney.component.html'
})

export class PayUMoneyComponent {

  payUMoney : PayUMoneyModel = new PayUMoneyModel();

  constructor(private payUMoneyService : PayUMoneyService,  private _router : Router) {
  }

  submitPaymentForm() {
    this.callToPayUMoney();
  }

  callToPayUMoney() {
    console.log('payUMoney : '+JSON.stringify(this.payUMoney));
    this.payUMoneyService.getHash(this.payUMoney).subscribe(
      PayUMoneyModel => this.onGetHashSuccess(PayUMoneyModel),
      error => this.onGetHashFailure(error)
    );
  }

  onGetHashSuccess(PayUMoneyModel : any) {
    console.log('calling payment : '+JSON.stringify(PayUMoneyModel.data));
    window.location.href = PayUMoneyModel.data;
    //this._router.navigate([PayUMoneyModel.data]);
  }

  onPaymentSuccess(payUMoneyRes : any) {
    console.log('onPaymentSuccess  : '+JSON.stringify(payUMoneyRes));
  }

  onPaymentFailure(error : Error) {
    console.log('onPaymentFailure : '+JSON.stringify(error));
  }

  onGetHashFailure(error : Error) {
    console.log('PayUMoneyModel error : ' + JSON.stringify(error));
  }
}
