import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSettings, Messages, Label, Button, Headings, NavigationRoutes } from '../../../../shared/constants';
import { ListBuildingService } from './listBuilding.service';
import { Building } from './../../model/building';

@Component({
  moduleId: module.id,
  selector: 'bi-list-building',
  templateUrl: 'listBuilding.component.html'
})

export class ListBuildingComponent implements OnInit {

  buildings : any;
  model: Building = new Building();

  constructor(private listBuildingService: ListBuildingService, private _router: Router) {

  }

  ngOnInit() {
    this.getProjects();
  }
  addNewBuilding() {
    this._router.navigate([NavigationRoutes.APP_CREATE_BUILDING]);
  }

  getProjects() {
    this.listBuildingService.getProject().subscribe(
      projects => this.onGetProjectSuccess(projects),
      error => this.onGetProjectFail(error)
    );
  }

  onGetProjectSuccess(projects : any) {
    console.log(projects);
    this.buildings = projects.data[0].building;
  }

  onGetProjectFail(error : any) {
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
