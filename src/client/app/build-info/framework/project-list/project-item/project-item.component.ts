import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationRoutes } from '../../../../shared/constants';
import { SessionStorage, SessionStorageService } from '../../../../shared/index';
import { Project } from '../../model/project';

@Component({
  moduleId: module.id,
  selector: 'bi-project-item',
  templateUrl: 'project-item.component.html',
 /* styleUrls: ['project-item.component.scss']*/
})

export class ProjectItemComponent {

  @Input() project :  Project;

  constructor(private _router: Router) {
  }

  navigateToSelectedProject(projectId:any) {
    SessionStorageService.setSessionValue(SessionStorage.CURRENT_PROJECT, projectId);
    this._router.navigate([NavigationRoutes.APP_PROJECT, projectId, NavigationRoutes.APP_COST_SUMMARY]);
  }
}
