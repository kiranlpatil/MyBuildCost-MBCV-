import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Button, NavigationRoutes } from '../../../../shared/constants';
import { Messages, SessionStorage, SessionStorageService } from '../../../../shared/index';
import { Project } from '../../model/project';

@Component({
  moduleId: module.id,
  selector: 'bi-project-item',
  templateUrl: 'project-item.component.html',
  styleUrls: ['project-item.component.css']
})

export class ProjectItemComponent implements OnInit {

  @Input() project :  Project;
  activeStatus:boolean;
  constructor(private _router: Router) {
  }
  ngOnInit() {
   sessionStorage.removeItem(SessionStorage.CURRENT_VIEW);
   this.activeStatus = this.project.activeStatus;
  }
  getMessage() {
    return Messages;
  }
  getButton() {
    return Button;
  }

  navigateToSelectedProject(projectId:string,projectName:string, numberOfDaysToExpire : number) {
    if(this.activeStatus) {
      SessionStorageService.setSessionValue(SessionStorage.CURRENT_PROJECT_ID, projectId);
      SessionStorageService.setSessionValue(SessionStorage.CURRENT_PROJECT_NAME, projectName);
      this._router.navigate([NavigationRoutes.APP_PROJECT, projectId, NavigationRoutes.APP_COST_SUMMARY])
    }
  }

  goToRenew(projectId:string, projectName:string, numOfDaysToExpire : number) {
    this._router.navigate([NavigationRoutes.APP_RENEW_PACKAGE, projectId, projectName, numOfDaysToExpire]);
  }
}
