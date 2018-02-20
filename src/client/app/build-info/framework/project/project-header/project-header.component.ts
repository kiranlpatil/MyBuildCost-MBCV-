import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStorage, SessionStorageService } from '../../../../shared/index';
@Component({
  moduleId: module.id,
  selector: 'bi-project-header',
  templateUrl: 'project-header.component.html',
  styleUrls:['./project-header.component.css']
})

export class ProjectHeaderComponent implements OnInit {

  projectId: string;

  constructor(private _router: Router) {
  }

  ngOnInit() {
    this.getCurrentProjectId();
  }

  getCurrentProjectId() {
    return this.projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT);
  }
}
