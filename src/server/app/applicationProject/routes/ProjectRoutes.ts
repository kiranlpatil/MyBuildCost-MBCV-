import express = require('express');
import ProjectController = require('./../controllers/ProjectController');

var router = express.Router();

class ProjectRoutes {
  private _projectController: ProjectController;

  constructor () {
    this._projectController = new ProjectController();
  }
  get routes () : express.Router {

    var controller = this._projectController;

    //User CRUD operations
    router.post('/', controller.create);

    return router;
  }
}

Object.seal(ProjectRoutes);
export = ProjectRoutes;
