import * as express from "express";
import * as userController from "./app/framework/controllers/user.controller";
import * as candidateController from "./app/framework/controllers/candidate.controller";
import * as userInterceptor from "./app/framework/interceptor/user.interceptor";
import * as sharedService from "./app/framework/shared/logger/shared.service";
import * as loggerInterceptor from "./app/framework/interceptor/logger.interceptor";
let AuthInterceptor = require('./app/framework/interceptor/auth.interceptor');
this.authInterceptor = new AuthInterceptor();


export function cnextInit(app: express.Application) {
  try {
    //todo add interceptor to authenticate

    app.post('/api/candidate', loggerInterceptor.logDetail, this.authInterceptor.requiresAuth, userInterceptor.create,
      this.authInterceptor.secureApiCheck, candidateController.create);
    app.put('/api/candidate/:id', loggerInterceptor.logDetail, this.authInterceptor.requiresAuth,
      this.authInterceptor.secureApiCheck, candidateController.updateDetails);
    app.get('/api/candidate/:id', loggerInterceptor.logDetail, this.authInterceptor.requiresAuth,
      this.authInterceptor.secureApiCheck, candidateController.retrieve);
    app.get('/api/userData', loggerInterceptor.logDetail, this.authInterceptor.requiresAuth,
      this.authInterceptor.secureApiCheck, userController.getUserDetails);


    app.use(sharedService.errorHandler);
  } catch (e) {
    console.log('exception', e);
    //sharedService.errorHandler(e);
  }
}
