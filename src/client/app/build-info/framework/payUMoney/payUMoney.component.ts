import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PayUMoneyModel } from '../model/PayUMoneyModel';
import { PayUMoneyService } from './payUMoney.service';
import { NavigationRoutes } from '../../../shared/constants';
import { CommonService } from '../../../shared/services/common.service';

@Component ({
  moduleId:module.id,
  selector:'pay-u-money-integration',
  templateUrl:'payUMoney.component.html'
})

export class PayUMoneyComponent implements OnInit {

  payUMoney : PayUMoneyModel = new PayUMoneyModel();
  subscription : any;

  constructor(private payUMoneyService : PayUMoneyService,  private _router : Router, private commonService : CommonService) {
  }

  ngOnInit() {
    this.subscription = this.commonService.updatepackageInfo$
      .subscribe(item => {
        if(item !== undefined || item !== null) {
          this.payUMoney.amount = item.amount;
          this.payUMoney.productinfo = item.name;
        }
      }
    );
  }


  submitPaymentForm() {
    this.callToPayUMoney();
  }

  callToPayUMoney() {
    console.log('payUMoney : '+JSON.stringify(this.payUMoney));
    this.payUMoneyService.goToPayment(this.payUMoney).subscribe(
      PayUMoneyModel => this.onGetHashSuccess(PayUMoneyModel),
      error => this.onGetHashFailure(error)
    );
  }

  onGetHashSuccess(PayUMoneyModel : any) {
    console.log('calling payment : '+JSON.stringify(PayUMoneyModel.data));
    window.location.href = PayUMoneyModel.data;
  }

  onGetHashFailure(error : Error) {
    console.log('PayUMoneyModel error : ' + JSON.stringify(error));
  }

  goToDashboard()  {
    this._router.navigate([NavigationRoutes.APP_DASHBOARD]);
  }
}
