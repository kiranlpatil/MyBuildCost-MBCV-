import * as express from 'express';
import ProjectService = require('./../services/ProjectService');
import ResponseService = require('./../../framework/shared/response.service');
import SendMailService = require('./../../framework/services/mailer.service');
let config = require('config');

class ProjectController {
  private _authInterceptor : AuthInterceptor;
  //private _sendMailService : SendMailService;
  private _projectService : ProjectService;
  private _responseService : ResponseService;

  constructor() {
    this._authInterceptor = new AuthInterceptor();
    this._projectService = new ProjectService();
    this._responseService = new ResponseService();
  }

  create(req: express.Request, res: express.Response, next: any): void {
    try {

      let data = req.body;
      let projectService = new ProjectService();
      let auth: AuthInterceptor = new AuthInterceptor();
      projectService.create(data, (error, result) => {
        if(error) {
          res.send({'error': error.message});
        } else {
          let token = auth.issueTokenWithUid(result);
          res.send({
            'data': result,
            access_token: token
          });
        }
      });
    } catch (e)  {
      console.log(e);
      res.send({'error': 'error in your request'});
    }
  }

}
export  = ProjectController;
