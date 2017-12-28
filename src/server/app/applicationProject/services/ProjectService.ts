import ProjectRepository = require('../dataaccess/repository/ProjectRepository');
import * as fs from 'fs';
import * as mongoose from 'mongoose';
import { SentMessageInfo } from 'nodemailer';
let config = require('config');
import Messages = require('../shared/messages');
import ProjectAsset = require('../shared/projectasset');
import ProjectModel = require('../dataaccess/model/Project');

class ProjectService {
  APP_NAME: string;
  company_name: string;
  mid_content: any;
  private projectRepository: ProjectRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.APP_NAME = ProjectAsset.APP_NAME;
  }

  create(item: any, callback: (error: any, result: any) => void) {
        this.projectRepository.create(item, (err, res) => {
          if (err) {
            callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
          } else {
            callback(null, res);
          }
        });
    });
}

Object.seal(ProjectService);
export = ProjectService;
