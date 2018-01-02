import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AppSettings, Messages, Label, Button, Headings, NavigationRoutes } from '../../../shared/constants';
import { ProjectService } from './project.service';

@Component({
  moduleId: module.id,
  selector: 'bi-project-list-entity',
  templateUrl: 'project.component.html'
})

export class ProjectComponent implements OnInit, OnDestroy {

  projectForm:  FormGroup;
  projects : any;

  constructor(private projectService: ProjectService, private formBuilder: FormBuilder) {

    this.projectForm = this.formBuilder.group({
      'current_password': ''
    });

  }

  ngOnInit() {
      this.getProjects();
  }

  onSubmit() {
      //this.projectService
  }


  getProjects() {
    this.projectService.getProject().subscribe(
      projects => this.onGetProjecteSuccess(projects),
      error => this.onGetProjecteFail(error) );
  }

  onGetProjecteSuccess(projects: any) {
    console.log(projects);
    this.projects = projects.data;
    /*for (let entry of this.projects) {
      console.log(entry); // 1, "string", false
    }*/
  }

  onGetProjecteFail(error : any) {
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
}
