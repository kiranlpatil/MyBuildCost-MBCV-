import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialTakeoffService } from './material-takeoff.service';

@Component({
  moduleId: module.id,
  selector: 'bi-material-takeoff-report',
  templateUrl: 'material-takeoff.component.html'
})

export class MaterialTakeoffComponent implements OnInit {

  projectId : string = null;
  groupBy : string = 'Cost Head Wise';
  secondaryFilter : string = 'RCC';
  secondaryFilterHeading : string = null;
  secondaryFilterList : any[];
  building : string = 'Build1';
  selectedBuilding : string = null;

  flatReport : any[];
  materialReport : any[];

  public costHeadList: any[] = [
    'RCC', 'Plaster'
  ];

  public materialList: any[] = [
    'Cement', 'Sand'
  ];

  public buildingList: any[] = [
    'All Buildings', 'Build1', 'Build2'
  ];

  public groupByList: any[] = [
    'Cost Head Wise', 'Material Wise'
  ];

  //Material details send to material total component
  materialTakeOffDetails :any[];

  constructor( private activatedRoute:ActivatedRoute,  private _router : Router, private materialTakeoffService : MaterialTakeoffService) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      this.projectId = params['projectId'];
    });
    this.getList(this.projectId);
  }

  getList(projectId : string) {
/*    this.materialTakeoffService.getList(projectId).subscribe(
      flatReport => this.onGetListSuccess(flatReport),
      error => this.onGetListFailure(error)
    );*/
    this.flatReport = [
      {
        "building" : "Build1",
        "costHead" : "RCC",
        "workItem" : "Abc",
        'material' : "Cement",
        "label" : "Floor1",
        "quantity" : 12,
        "unit" : "sqm"
      },
      {
        "building" : "Build2",
        "costHead" : "RCC",
        "workItem" : "Abc",
        'material' : "Cement",
        "label" : "Floor1",
        "quantity" : 12,
        "unit" : "sqm"
      },
      {
        "building" : "Build3",
        "costHead" : "RCC",
        "workItem" : "Abc",
        'material' : "Cement",
        "label" : "Floor1",
        "quantity" : 12,
        "unit" : "sqm"
      }
    ];

    /*this.buildingList = this.materialTakeoffService.getDistinctBuildingList(this.flatReport);*/

    /*this.materialReport = this.materialTakeoffService.buildMaterialReport(this.building, this.secondaryFilter,
      this.groupBy, this.flatReport);*/

    this.selectedBuilding = 'Build1';
    this.building = 'Build1';
    this.secondaryFilterHeading = 'Cost Head';
    this.secondaryFilterList = this.costHeadList;
    this.materialTakeOffDetails = {
      "building": "Build1",
      "name": "RCC",
      "materialDetails": [
        {
          "name": "Cement",
          "itemDetails": [
            {
              "item": "Abc",
              "quantity": 12,
              "unit": "Bags"
            },
            {
              "item": "Efg",
              "quantity": 16,
              "unit": "Bags"
            },
            {
              "item": "Hij",
              "quantity": 18,
              "unit": "Bags"
            }
          ],
          "unit": "Bags",
          "total": 46
        },
        {
          "name": "Sand",
          "itemDetails": [
            {
              "item": "Xyz",
              "quantity": 34,
              "unit": "Bags"
            },
            {
              "item": "Pqr",
              "quantity": 19,
              "unit": "Bags"
            },
            {
              "item": "Stq",
              "quantity": 99,
              "unit": "Bags"
            }
          ],
          "unit": "Bags",
          "total": 152
        }
      ]
    };
  }

/*  onGetListSuccess(flatReport : any) {

  }

  onGetListFailure(error : any) {
    console.log(error);
  }*/

  onChangeGroupBy(groupBy : any) {
    this.groupBy = groupBy;
    console.log('Group By :'+this.groupBy);
    if(this.groupBy === 'Cost Head Wise') {
      this.secondaryFilterList = this.costHeadList;
      this.secondaryFilterHeading = 'Cost Head';
    } else {
      this.secondaryFilterList = this.materialList;
      this.secondaryFilterHeading = 'Material';
    }

    /*this.materialReport = this.materialTakeoffService.buildMaterialReport(this.building, this.secondaryFilter,
      this.groupBy, this.flatReport);*/
  }

  onChangeSecondFilter(secondFilter : any) {
    this.secondaryFilter = secondFilter;
    console.log('Second Filter :'+this.secondaryFilter);

    /*this.materialReport = this.materialTakeoffService.buildMaterialReport(this.building, this.secondaryFilter,
      this.groupBy, this.flatReport);*/
  }

  onChangeBuilding(building : any) {
    this.building = building;
    console.log('Building :'+this.building);

    /*this.materialReport = this.materialTakeoffService.buildMaterialReport(this.building, this.secondaryFilter,
      this.groupBy, this.flatReport);*/
  }
}
