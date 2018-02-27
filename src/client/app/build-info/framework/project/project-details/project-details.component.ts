import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Messages, } from '../../../../shared/constants';
import { ProjectService } from '../project.service';
import { Project } from './../../model/project';
import { Message, MessageService } from '../../../../shared/index';
import { ValidationService } from '../../../../shared/customvalidations/validation.service';
import { SessionStorage, SessionStorageService } from '../../../../shared/index';

@Component({
  moduleId: module.id,
  selector: 'bi-edit-project',
  templateUrl: 'project-details.component.html'
})

export class ProjectDetailsComponent implements OnInit {

  viewProjectForm:  FormGroup;
  projectId : string;
  projectModel: Project = new Project();
  public isShowErrorMessage: boolean = true;
  public errorMessage: boolean = false;

  constructor(private projectService: ProjectService, private formBuilder: FormBuilder,
              private messageService: MessageService, private activatedRoute:ActivatedRoute) {

    this.viewProjectForm = this.formBuilder.group({
      name: ['', ValidationService.requiredProjectName],
      region: ['', ValidationService.requiredProjectAddress],
      plotArea: ['', ValidationService.requiredPlotArea],
      plotPeriphery: ['', ValidationService.requiredPlotPeriphery],
      podiumArea : ['',ValidationService.requiredPodiumArea],
      openSpace : ['', ValidationService.requiredOpenSpace],
      slabArea : ['',ValidationService.requiredSlabArea],
      poolCapacity : ['',ValidationService.requiredSwimmingPoolCapacity],
      projectDuration: ['', ValidationService.requiredProjectDuration],
      totalNumOfBuildings : ['', ValidationService.requiredNumOfBuildings]
    });

  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
     this.projectId = params['projectId'];
      if(this.projectId) {
        this.getProject();
      }
    });
  }

  getProject() {
    this.projectService.getProject(this.projectId).subscribe(
      project => this.onGetProjectSuccess(project),
      error => this.onGetProjectFailure(error)
    );
  }

  onGetProjectSuccess(project : any) {
    this.projectModel = project.data[0];
  }

  onGetProjectFailure(error : any) {
    console.log(error);
  }


  onSubmit() {
    if(this.viewProjectForm.valid) {
      this.projectModel = this.viewProjectForm.value;
      let projectId=SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT_ID);
      this.projectService.updateProject(projectId, this.projectModel)
        .subscribe(
          user => this.onUpdateProjectSuccess(user),
          error => this.onUpdateProjectFailure(error));
    }
  }

  onUpdateProjectSuccess(result: any) {

    if (result !== null) {
      var message = new Message();
      message.isError = false;
      message.custom_message = Messages.MSG_SUCCESS_UPDATE_PROJECT_DETAILS;
      this.messageService.message(message);
    }
  }

  onUpdateProjectFailure(error: any) {

    var message = new Message();

    if (error.err_code === 404 || error.err_code === 0) {
      message.error_msg = error.err_msg;
      message.isError = true;
      this.messageService.message(message);
    } else {
      this.isShowErrorMessage = false;
      this.errorMessage = error.err_msg;
      message.error_msg = error.err_msg;
      message.isError = true;
      this.messageService.message(message);
    }
  }
}
