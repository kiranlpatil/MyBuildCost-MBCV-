import * as express from 'express';
import ProjectService = require('./../services/ProjectService');
import UserService = require('./../../framework/services/UserService');
import Project = require("../dataaccess/mongoose/Project");
import Building = require("../dataaccess/mongoose/Building");
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
      let userId = req.user.userId;
      console.log('User Id : '+userId);
      projectService.create(data, (error, result) => {
        if(error) {
          res.send({'error': error.message});
        } else {
          console.log('data : '+JSON.stringify(data));
          console.log('result : '+JSON.stringify(result));
          let projectId = result._id;
          console.log('Project ID : '+projectId);
          let newData =  {$push: { project: projectId }};
          console.log('newData : '+JSON.stringify(newData));

          userService.findOneAndUpdate(userId, newData, {new :true},(err, resp) => {
            if(err) {
              console.log('err : '+err);
              res.send({'error': err});
            } else {
              console.log('resp : '+resp);
              res.send({'data': result});
            }
          });
        }
      });
    } catch (e)  {
      console.log(e);
      res.send({'error': 'error in your request'});
    }
  }


  getProject(req: express.Request, res: express.Response, next: any): void {
    try {
      let projectService = new ProjectService();
      let user = req.user;
      let projectId =  req.params.id;
      projectService.getProject(projectId, user, (error, result) =>{
          if(error) {
            next(error);
          } else {
            res.send(result);
          }
      });
    } catch(e) {
      console.log(e);
      res.send({'error': 'error in your request'});
    }
  }

  updateProjectDetails(req: express.Request, res: express.Response, next: any): void{
    try {
      let projectDetail = <Project>req.body;
      projectDetail['_id'] = req.params.id;
      let user = req.user;
      let projectService = new ProjectService();
      projectService.updateProjectDetails(projectDetail, user, (error, result)=>{
        if(error) {
          next(error);
        } else {
          res.send(result);
        }
      });
    } catch(e) {
      console.log(e);
      res.send({'error': 'error in your request'});
    }
  }

  addBuilding(req: express.Request, res: express.Response, next: any): void{
    try {
      let user = req.user;
      let projectId = req.params.id;
      let buildingDetails = <Building> req.body;
      let projectService = new ProjectService();
      projectService.addBuilding(projectId, buildingDetails, user, (error, result) => {
        if(error) {
          next(error);
        } else {
          res.send(result);
        }
      });
    } catch(e) {
      console.log(e);
      res.send({'error': 'error in your request'});
    }
  }

  updateBuilding(req: express.Request, res: express.Response, next: any): void{
    try {
      let user = req.user;
      let projectId = req.params.id;
      let buildingDetails = <Building> req.body;
      let projectService = new ProjectService();
      projectService.updateBuilding(projectId, buildingDetails, user, (error, result) => {
        if(error) {
          next(error);
        } else {
          res.send(result);
        }
      });
    } catch(e) {
      console.log(e);
      res.send({'error': 'error in your request'});
    }
  }

  getBuilding(req: express.Request, res: express.Response, next: any): void{
    try {
      let user = req.user;
      let projectId = req.params.id;
      let buildingId = req.params.buildingid;
      let projectService = new ProjectService();
      projectService.getBuilding(projectId, buildingId, user, (error, result) => {
        if(error) {
          next(error);
        } else {
          res.send(result);
        }
      });
    } catch(e) {
      console.log(e);
      res.send({'error': 'error in your request'});
    }
  }

  deleteBuilding(req: express.Request, res: express.Response, next: any): void{
    try {
      let user = req.user;
      let projectId = req.params.id;
      let buildingId = req.params.buildingid;
      let projectService = new ProjectService();
      projectService.deleteBuilding(projectId, buildingId, user, (error, result) => {
        if(error) {
          next(error);
        } else {
          res.send(result);
        }
      });
    } catch(e) {
      console.log(e);
      res.send({'error': 'error in your request'});
    }
  }
}
export  = ProjectController;
