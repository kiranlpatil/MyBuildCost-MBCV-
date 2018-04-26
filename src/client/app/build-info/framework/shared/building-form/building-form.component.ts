import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {Label, NavigationRoutes, ValueConstant} from '../../../../shared/constants';
import {ValidationService} from '../../../../shared/customvalidations/validation.service';
import {Building} from '../../model/building';
import {SessionStorage, SessionStorageService} from '../../../../shared/index';
import {Router} from "@angular/router";

@Component({
  moduleId: module.id,
  selector: 'bi-building-form',
  templateUrl: 'building-form.component.html',
  styleUrls: ['building-form.component.css']
})

export class BuildingFormComponent {

  @Input() submitActionLabel: string;
  @Input() buildingModel?: Building = new Building();
  @Output() onSubmitEvent = new EventEmitter<Building>();

  buildingForm: FormGroup;
  public isShowErrorMessage: boolean = false;
  public errorMessage: boolean = false;
  cloneItems: string[] = new Array(0);
  cloneItemsArray: string[] = ValueConstant.CLONE_ITEMS.slice();

  private view: string | '';

  constructor(private formBuilder: FormBuilder, private _router: Router) {
    //this.actionItems=ValueConstant.ACTION_ITEMS.slice();
    this.view = SessionStorageService.getSessionValue(SessionStorage.CURRENT_VIEW);
    this.buildingForm = this.formBuilder.group({
      name: ['', ValidationService.requiredBuildingName],
      totalSlabArea: ['', ValidationService.requiredSlabArea],
      totalCarpetAreaOfUnit: ['', ValidationService.requiredCarpetArea],
      totalSaleableAreaOfUnit: ['', ValidationService.requiredSalebleArea],
      plinthArea: ['', ValidationService.requiredPlinthArea],
      totalNumOfFloors: ['', ValidationService.requiredTotalNumOfFloors],
      numOfParkingFloors: ['', ValidationService.requiredNumOfParkingFloors],
      carpetAreaOfParking: ['', ValidationService.requiredCarpetAreaOfParking],
      numOfOneBHK: [''],
      numOfTwoBHK: [''],
      numOfThreeBHK: [''],
      numOfFourBHK: [''],
      numOfFiveBHK: [''],
      numOfLifts: ['']
    });
  }

  submitForm() {
    if (this.buildingForm.valid) {
      this.buildingModel = this.buildingForm.value;
      this.view === 'cloneBuilding' ? this.buildingModel.cloneItems = this.cloneItems : console.log();
      this.onSubmitEvent.emit(this.buildingModel);
    } else {
      this.isShowErrorMessage = true;
    }
  }

  getLabels() {
    return Label;
  }

  selectItem(event: any) {
    if (event.target.checked) {
      this.cloneItems.push(event.target.value);
    } else {
      this.cloneItems.splice(this.cloneItems.indexOf(event.target.value));
    }
  }
  onCancel() {
    window.history.back();  }
}
