import * as express from 'express';
import ProjectService = require('./../services/ProjectService');
import UserService = require('./../../framework/services/UserService');
let config = require('config');

class ProjectController {
  private _projectService : ProjectService;
  private _userService : UserService;

  constructor() {
    this._projectService = new ProjectService();
    this._userService = new UserService();
  }

  create(req: express.Request, res: express.Response, next: any): void {
    try {

      let data = req.body;
      let projectService = new ProjectService();
      let userService = new UserService();
      let userId = data.userId;
      console.log('User Id : '+userId);
      projectService.create(data, (error, result) => {
        if(error) {
          res.send({'error': error.message});
        } else {
          console.log('data : '+JSON.stringify(data));
          console.log('result : '+JSON.stringify(result));
          let projectId = result._id;
          console.log('Project ID : '+projectId);
          let newData =  {$push: { projects: projectId }};
          console.log('newData : '+JSON.stringify(newData));

          userService.findOneAndUpdate(userId, newData, (err, resp) => {
            if(err) {
              console.log('err : '+err);
              res.send({'error': err});
            } else {
              console.log('resp : '+resp);
              res.send({'data': resp});
            }
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
