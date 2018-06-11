import {Component, OnInit} from '@angular/core';
import { Headings, Button, Label,Messages } from '../../../../shared/constants';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationRoutes } from '../../../../shared/index';
import { Message, MessageService, SessionStorage, SessionStorageService } from '../../../../shared/index';
import { Project } from '../../model/project';
import { ProjectService } from '../../project/project.service';
import { ProjectNameChangeService } from '../../../../shared/services/project-name-change.service';
import {ProjectSubscriptionDetails} from "../../model/projectSubscriptionDetails";
import {PackageDetailsService} from "../../package-details/package-details.service";

@Component({
  moduleId: module.id,
  selector: 'bi-payment-success',
  templateUrl: 'payment-successful.component.html',
  styleUrls: ['payment-successful.component.css']
})

export class PaymentSuccessfulComponent implements OnInit{

  projectId: string;
  packageName: string;
  projects:any;
  projectModel:  Project = new Project();
  public isShowErrorMessage: boolean = true;
  public errorMessage: boolean = false;
  constructor(private activatedRoute:ActivatedRoute, private _router: Router, private projectService: ProjectService,
              private projectNameChangeService : ProjectNameChangeService, private packageDetails : PackageDetailsService) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      this.packageName = params['packageName'];
      if (this.packageName === 'Retain') {
        this.getProject();
      }
    });
  }

  getProject() {
    this.projectId=SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT_ID);
    this.projectService.getProject(this.projectId).subscribe(
      project => this.onGetProjectSuccess(project),
      error => this.onGetProjectFailure(error)
    );
  }

  onGetProjectSuccess(project : any) {
    this.projectModel = project.data[0];
    this.projectModel.name = project.data[0].name.substring(14);
  }

  onGetProjectFailure(error : any) {
    console.log(error);
  }

  updateProject(projectModel : Project) {
    this.projectService.updateProject(this.projectId, projectModel)
      .subscribe(
        user => this.onUpdateProjectSuccess(user),
        error => this.onUpdateProjectFailure(error));
  }
  onRetainProject() {
    let body = { basePackageName :'Premium'};
    this.packageDetails.getRetainProject(this.projectId,body)
      .subscribe(project=>this.onRetainProjectSuccess(project),
        error => this.onRetainProjectFailure(error));
  }


  onRetainProjectSuccess(project:any) {
    this.projects=project.data;
   this.updateProject(this.projectModel);
   this._router.navigate([NavigationRoutes.APP_DASHBOARD]);

  }
  onRetainProjectFailure(error:any) {

  }
  onUpdateProjectSuccess(result: any) {
    if (result !== null) {
      this.projectNameChangeService.change(result.data.name);
      SessionStorageService.setSessionValue(SessionStorage.CURRENT_PROJECT_NAME, result.data.name);
      //SessionStorageService.setSessionValue(SessionStorage.CURRENT_PROJECT_ID,this.projects[0].projectId);

    }
    this._router.navigate([NavigationRoutes.APP_DASHBOARD]);
  }

  onUpdateProjectFailure(error: any) {
    console.log(error);
  }

  onContinue() {
    if (this.packageName === 'Retain') {
      this.onRetainProject();
    } else if (this.packageName !== 'Retain') {
      this._router.navigate([NavigationRoutes.APP_DASHBOARD]);
    }else if (this.packageName === 'Add_building') {
      this._router.navigate([NavigationRoutes.APP_CREATE_BUILDING]);
    }
  }
}
