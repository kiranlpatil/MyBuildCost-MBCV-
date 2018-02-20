import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationRoutes } from '../../../shared/constants';

@Component({
  moduleId: module.id,
  selector: 'bi-project',
  templateUrl: 'project.component.html'
})

export class ProjectComponent {

  constructor( private _router: Router) {

  }

  createProject() {
    this._router.navigate([NavigationRoutes.APP_CREATE_PROJECT]);
  }
}
