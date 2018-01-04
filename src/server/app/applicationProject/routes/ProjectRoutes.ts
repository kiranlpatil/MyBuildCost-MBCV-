import express = require('express');
import ProjectController = require('./../controllers/ProjectController');
import AuthInterceptor = require('./../../framework/interceptor/auth.interceptor');
import LoggerInterceptor = require('./../../framework/interceptor/LoggerInterceptor');
import { Inject } from 'typescript-ioc';
import RequestInterceptor = require('../interceptor/request/RequestInterceptor');
import ResponseInterceptor = require('../interceptor/response/ResponseInterceptor');

var router = express.Router();

class ProjectRoutes {
  private _projectController: ProjectController;
  private authInterceptor: AuthInterceptor;
  private loggerInterceptor: LoggerInterceptor;
  @Inject
  private _requestInterceptor: RequestInterceptor;
  @Inject
  private _responseInterceptor: ResponseInterceptor;

  constructor () {
    this._projectController = new ProjectController();
    this.authInterceptor = new AuthInterceptor();
  }
  get routes () : express.Router {

    var controller = this._projectController;
    router.post('/',this.authInterceptor.requiresAuth, this._requestInterceptor.intercept, controller.create,
      this._responseInterceptor.exit);
    router.get('/:id', this.authInterceptor.requiresAuth, controller.getProject);
    router.put('/:id', this.authInterceptor.requiresAuth, controller.updateProjectDetails);
    router.post('/:id/building', this.authInterceptor.requiresAuth, controller.addBuilding);
    router.put('/:id/building', this.authInterceptor.requiresAuth, controller.updateBuilding);
    router.get('/:id/building/:buildingid', this.authInterceptor.requiresAuth, controller.getBuilding);
    router.delete('/:id/building/:buildingid', this.authInterceptor.requiresAuth, controller.deleteBuilding)

    return router;
  }
}

Object.seal(ProjectRoutes);
export = ProjectRoutes;
