import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {SessionStorage, SessionStorageService,MessageService} from "../../../../shared/index";
@Component({
  moduleId: module.id,
  selector: 'bi-project-header',
  templateUrl: 'project-header.component.html'
})

export class ProjectHeaderComponent {

  constructor(private _router: Router) {
  }

  navigateTo(nav:string) {
    this._router.navigate([nav]);
  }

  navigateToWithId(nav:string) {
    var projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT);
    this._router.navigate([nav, projectId]);
  }
}
