
import express = require('express');
import UserController = require('./../controllers/UserController');
import AuthInterceptor = require('./../interceptor/auth.interceptor');
import LoggerInterceptor = require('../interceptor/LoggerInterceptor');
import UserInterceptor = require('../interceptor/UserInterceptor');
import sharedService = require('./../shared/logger/shared.service');

var router = express.Router();

class ProjectRoutes {
  private _userController: UserController;
  private _authInterceptor: AuthInterceptor;
  private _loggerInterceptor : LoggerInterceptor;
  private _userInterceptor : UserInterceptor;

  constructor () {
    this._userController = new UserController();
    this._authInterceptor = new AuthInterceptor();
    this._loggerInterceptor = new LoggerInterceptor();
    this._userInterceptor = new UserInterceptor();
  }
  get routes () : express.Router {

    var controller = this._userController;
    var logger = this._loggerInterceptor;
    var userInterceptor = this._userInterceptor;
    var authInterceptor = this._authInterceptor;


    //User CRUD operations
    router.post('/', logger.logDetail, controller.create);

    return router;
  }
}

Object.seal(ProjectRoutes);
export = ProjectRoutes;
