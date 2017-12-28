import * as express from 'express';
import ProjectService = require('./../services/ProjectService');
let config = require('config');

class ProjectController {
  private _projectService : ProjectService;

  constructor() {
    this._projectService = new ProjectService();
  }

  create(req: express.Request, res: express.Response, next: any): void {
    try {

      let data = req.body;
      let projectService = new ProjectService();
      projectService.create(data, (error, result) => {
        if(error) {
          res.send({'error': error.message});
        } else {
          res.send({
            'data': result
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
