import { Component, OnInit } from '@angular/core';
import { Router , ActivatedRoute } from '@angular/router';
import {
  AppSettings,
  Label,
  Button,
  Headings,
  NavigationRoutes
} from '../../../../shared/constants';
import { API, BaseService, SessionStorage, SessionStorageService,  Message,
  Messages } from '../../../../shared/index';
import { CostSummaryService } from './cost-summary.service';

@Component({
  moduleId: module.id,
  selector: 'bi-cost-summary-project-report',
  templateUrl: 'cost-summary.component.html'
})

export class CostSummaryComponent implements OnInit {

  projectBuildings: any;
  projectId: string;
  buildingsDetails: any;
  estimatedCost : any;

  public costIn: any[] = [
    { 'costInId': 'Rs/Sqft'},
    { 'costInId': 'Rs/Sqm',}
  ];

  public costPer: any[] = [
    { 'costPerId': 'SlabArea',},
    { 'costPerId': 'SellableArea',}
  ];

  defaultCostIn:string='Rs/Sqft';

  defaultCostPer:string='SellableArea';



  constructor(private costSummaryService : CostSummaryService, private activatedRoute : ActivatedRoute,
              private _router : Router) {
  }

  ngOnInit() {
    console.log('Inside Project Cost Sumamry Project');
    this.estimatedCost = 1650000;
    this.activatedRoute.params.subscribe(params => {
      this.projectId = params['projectId'];
      if(this.projectId) {
        this.getProjects();
      }
    });
  }

  onSubmit() {
    console.log('Insdide');
  }

  getAmount() {
    this.projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT);
    this._router.navigate([NavigationRoutes.APP_COST_HEAD, this.projectId]);
  }

  getProjects() {
    this.costSummaryService.getProjectDetails(this.projectId).subscribe(
      projectCostSummary => this.onGetProjectCostSummarySuccess(projectCostSummary),
      error => this.onGetProjectCostSummaryFail(error)
    );
  }

  getBuildingDetails() {
    this.costSummaryService.getBuildingDetails(this.projectId).subscribe(
      buildingDetails => this.onGetbuildingDetailsCostSummarySuccess(buildingDetails),
      error => this.onGetbuildingDetailsCostSummaryFail(error)
    );
  }

  onGetbuildingDetailsCostSummarySuccess(buildingDetails : any) {
    this.buildingsDetails = buildingDetails.data;
  }

  onGetbuildingDetailsCostSummaryFail(error : any) {
    console.log(error);
  }

  onGetProjectCostSummarySuccess(projects : any) {
    this.projectBuildings = projects.data[0].building;
  }

  onGetProjectCostSummaryFail(error : any) {
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
