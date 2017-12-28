import ProjectRepository = require('../dataaccess/repository/ProjectRepository');
import Messages = require('../shared/messages');
import ProjectAsset = require('../../framework/shared/projectasset');
class ProjectService {
  APP_NAME: string;
  company_name: string;
  private projectRepository: ProjectRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.APP_NAME = ProjectAsset.APP_NAME;
  }

  create(item: any, callback: (error: any, result: any) => void) {
    this.projectRepository.create(item, (err, res) => {
      if (err) {
        callback(new Error(Messages.MSG_ERROR_CREATE_PROJECT), null);
      } else {
        callback(null, res);
      }
    });
  }
}

Object.seal(ProjectService);
export = ProjectService;
