import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Messages, NavigationRoutes, ImagePath } from '../../../../../shared/constants';
import { SessionStorage, SessionStorageService,  Message,
  MessageService } from '../../../../../shared/index';
import { Building } from '../../../model/building';
import { BuildingService } from './../building.service';
import { ValidationService } from '../../../../../shared/customvalidations/validation.service';


@Component({
  moduleId: module.id,
  selector: 'bi-create-building',
  templateUrl: 'create-building.component.html',
  styleUrls: ['create-building.component.css'],
})

export class CreateBuildingComponent {

  addBuildingForm:  FormGroup;
  public isShowErrorMessage: boolean = true;
  public errorMessage: boolean = false;
  buildingModel: Building = new Building();
  BODY_BACKGROUND_TRANSPARENT: string;

  constructor(private buildingService: BuildingService, private formBuilder: FormBuilder,
              private _router: Router, private messageService: MessageService) {
    this.BODY_BACKGROUND_TRANSPARENT = ImagePath.BODY_BACKGROUND_TRANSPARENT;
    this.addBuildingForm = this.formBuilder.group({
      name : ['', ValidationService.requiredBuildingName],
      totalSlabArea :['', ValidationService.requiredSlabArea],
      totalCarpetAreaOfUnit :['', ValidationService.requiredCarpetArea],
      totalSaleableAreaOfUnit :['', ValidationService.requiredSalebleArea],
      plinthArea :['', ValidationService.requiredPlinthArea],
      totalNumOfFloors :['', ValidationService.requiredTotalNumOfFloors],
      numOfParkingFloors :['', ValidationService.requiredNumOfParkingFloors],
      carpetAreaOfParking :['', ValidationService.requiredCarpetAreaOfParking],
      numOfOneBHK : [''],
      numOfTwoBHK :[''],
      numOfThreeBHK :[''],
      numOfFourBHK :[''],
      numOfFiveBHK :[''],
      numOfLifts :['']
   });

  }

  goBack() {
    let projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT_ID);
    this._router.navigate([NavigationRoutes.APP_PROJECT,projectId,NavigationRoutes.APP_COST_SUMMARY]);
  }
  onSubmit() {
    if(this.addBuildingForm.valid) {
      this.buildingModel = this.addBuildingForm.value;
      if(this.buildingModel.numOfOneBHK !== undefined || this.buildingModel.numOfTwoBHK !== undefined
        || this.buildingModel.numOfThreeBHK !== undefined ||
        this.buildingModel.numOfFourBHK !== undefined || this.buildingModel.numOfFiveBHK !== undefined ) {

        if(this.buildingModel.numOfOneBHK === undefined) {
          this.buildingModel.numOfOneBHK=0;
        }

        if(this.buildingModel.numOfTwoBHK === undefined) {
          this.buildingModel.numOfTwoBHK=0;
        }

        if(this.buildingModel.numOfThreeBHK === undefined) {
          this.buildingModel.numOfThreeBHK=0;
        }

        if(this.buildingModel.numOfFourBHK === undefined) {
          this.buildingModel.numOfFourBHK=0;
        }

        if(this.buildingModel.numOfFiveBHK === undefined) {
          this.buildingModel.numOfFiveBHK=0;
        }

        if(this.buildingModel.numOfLifts === undefined) {
          this.buildingModel.numOfLifts=0;
        }

      let projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT_ID);
      this.buildingService.createBuilding(projectId, this.buildingModel)
        .subscribe(
          building => this.onCreateBuildingSuccess(building),
          error => this.onCreateBuildingFailure(error));
      } else {
        var message = new Message();
        message.isError = false;
        message.custom_message = 'Add at least one Apartment Configuration';
        this.messageService.message(message);
      }
    }
  }

  onCreateBuildingSuccess(building : any) {
    var message = new Message();
    message.isError = false;
    message.custom_message = Messages.MSG_SUCCESS_ADD_BUILDING_PROJECT;
    this.messageService.message(message);
    let projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT_ID);
    this._router.navigate([NavigationRoutes.APP_PROJECT, projectId, NavigationRoutes.APP_COST_SUMMARY]);
  }

  onCreateBuildingFailure(error : any) {
    console.log(error);
  }

}
