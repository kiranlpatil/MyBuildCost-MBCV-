import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSettings, Messages, Label, Button, Headings, NavigationRoutes } from '../../../../shared/constants';
import { ProjectListService } from './project-list.service';
import { SessionStorage, SessionStorageService } from '../../../../shared/index';

@Component({
  moduleId: module.id,
  selector: 'bi-list-project',
  templateUrl: 'project-list.component.html',
  styleUrls: ['project-list.component.css']
})

export class ProjectListComponent implements OnInit {

  projects : any;

  constructor(private listProjectService: ProjectListService, private _router: Router) {

  }

  ngOnInit() {
    this.getProjects();
  }
  createProject() {
    this._router.navigate([NavigationRoutes.APP_CREATE_PROJECT]);
  }

  getProjects() {
    this.listProjectService.getProject().subscribe(
      projects => this.onGetProjectSuccess(projects),
      error => this.onGetProjectFail(error)
    );
  }

  getProjectDetails() {
      this.listProjectService.getProject().subscribe(
        project => this.onGetProjectDetailsSuccess(project),
        error => this.onGetProjectDetailsFail(error)
      );
  }


  onGetProjectSuccess(projects : any) {
    console.log(projects);
    this.projects = projects.data;
  }

  onGetProjectFail(error : any) {
    console.log(error);
  }

  onGetProjectDetailsSuccess(projects : any) {
    this.projects = projects.data[0];
  }

  onGetProjectDetailsFail(error : any) {
    console.log(error);
  }

  getMessages() {
    return Messages;
  }

  getLabels() {
    return Label;
  }

  getButtons() {
    return Button;
  }

  getHeadings() {
    return Headings;
  }

  setCurrentProjectId(projectId:any) {
   SessionStorageService.setSessionValue(SessionStorage.CURRENT_PROJECT, projectId);
   this._router.navigate([NavigationRoutes.APP_COST_SUMMARY, projectId]);
  }
}
