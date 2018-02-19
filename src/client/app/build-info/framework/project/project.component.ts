import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationRoutes } from '../../../shared/constants';

@Component({
  moduleId: module.id,
  selector: 'bi-project',
  templateUrl: 'project.component.html'
})

export class ProjectComponent implements OnInit {

  constructor( private _router: Router) {

  }

  ngOnInit() {
    console.log('Inside Project Home Component');
  }

  createProject() {
    this._router.navigate([NavigationRoutes.APP_CREATE_PROJECT]);
  }

  navigateTo(nav:string) {
    this._router.navigate([nav]);
  }

}
