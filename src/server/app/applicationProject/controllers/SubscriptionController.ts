import SubscriptionService = require('../services/SubscriptionService');
import Response = require('../interceptor/response/Response');
import * as express from "express";
let config = require('config');
var hashKey = require('js-sha512');
let payumoney = require('payumoney-node');
payumoney.setKeys('sa9GClLw', '8LfwUPzxya', 'WY4YNJEYPrAbCEUyoCoNDEcJxSvk/8glz7QaUsFqzRQ=');
payumoney.isProdMode(false);
var log4js = require('log4js');
var logger=log4js.getLogger('Subscription Controller');
import CostControllException = require('../exception/CostControllException');
import { PayUMoneyModel } from '../../framework/dataaccess/model/PayUMoneyModel';

class SubscriptionController {
  private  _subscriptionService : SubscriptionService;

  constructor() {
    this._subscriptionService = new SubscriptionService();
  }

  addSubscriptionPackage(req: express.Request, res: express.Response, next: any): void {
    try {
      logger.info('Subscription Controller, addSubscriptionPackage has been hit');
      let subscriptionPackage = req.body.package;
      let user = req.user;
      let subscriptionService: SubscriptionService = new SubscriptionService();
      subscriptionService.addSubscriptionPackage( subscriptionPackage,(error, result) => {
        if(error) {
          next(error);
        } else {
          logger.info('Create Subscription  success');
          next(new Response(200,result));
        }
      });
    } catch(e) {
      next(new CostControllException(e.message,e.stack));
    }
  }

  getBaseSubscriptionPackageList(req: express.Request, res: express.Response, next: any): void {
    try {
      logger.info('Subscription Controller, getSubscriptionPackageList has been hit');
      let subscriptionService: SubscriptionService = new SubscriptionService();
      subscriptionService.getBaseSubscriptionPackageList( (error, result) => {
        if(error) {
          next(error);
        } else {
          logger.info('Get base Subscription package list success');
          next(new Response(200,result));
        }
      });
    } catch(e) {
      next(new CostControllException(e.message,e.stack));
    }
  }

  getSubscriptionPackageByName(req: express.Request, res: express.Response, next: any): void {
    try {
      logger.info('Subscription  Controller, getSubscriptionPackageByName has been hit');
      let packageName: any;
      let packageType : any;
      if(req.body.basePackageName !== undefined) {
        packageName = req.body.basePackageName;
        packageType = 'BasePackage';
      } else {
        packageName = req.body.addOnPackageName;
        packageType = 'AddOnPackage';
      }
      let subscriptionService: SubscriptionService = new SubscriptionService();
      subscriptionService.getSubscriptionPackageByName( packageName, packageType, (error, result) => {
        if(error) {
          next(error);
        } else {
          logger.info('Get Subscription success');
          next(new Response(200,result));
        }
      });
    } catch(e) {
      next(new CostControllException(e.message,e.stack));
    }
  }

  generateHash(req: express.Request, res: express.Response, next: any): void {
    try {

      let paymentData = {
        productinfo: 'Hi',
        txnid: 'oT6SGlPBuL5iQXxcrrCwPef5QWpr6v',
        amount: 1,
        email: 'swapnil.nakhate1010@gmail.com',
        phone: 7588676542,
        lastname: 'Nakhate',
        firstname: 'Swapnil',
        surl: 'http://localhost:8080/api/subscription/payment/success',
        furl: 'http://localhost:8080/api/subscription/payment/failure'
      };


      /*
      surl: 'http://localhost:5555/package-details/payment/success',
      furl: 'http://localhost:5555/package-details/payment/failure'

      surl: 'http://localhost:8080/api/subscription/payment/success',
      furl: 'http://localhost:8080/api/subscription/payment/failure'
      */

      payumoney.makePayment(paymentData, function(error:any, response:any) {
        if (error) {
          // Some error
          console.log(response);
          res.send(error);
        } else {
          // Payment redirection link
          console.log(response);
          res.send({ data : response });
        }
      });
    } catch(e) {
      next(new CostControllException(e.message,e.stack));
    }
  }

  successPayment(req: express.Request, res: express.Response, next: any): void {
    try {
      let body = req.body;
      console.log('payment success : '+ JSON.stringify(body));
      res.redirect('http://localhost:5555/package-details/payment/success');
    } catch(e) {
      next(new CostControllException(e.message,e.stack));
    }
  }

  failurePayment(req: express.Request, res: express.Response, next: any): void {
    try {
      let body = req.body;
      console.log('payment failed : '+ JSON.stringify(body));
      res.redirect('http://localhost:5555/package-details/payment/failure');
    } catch(e) {
      next(new CostControllException(e.message,e.stack));
    }
  }

}

export = SubscriptionController;
