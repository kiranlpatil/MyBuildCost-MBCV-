import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';
import { SessionStorage, SessionStorageService,  Message, Messages, MessageService } from '../../../../../../shared/index';
import { QuantityItem } from '../../../../model/quantity-item';
import { CostSummaryService } from '../../cost-summary.service';
import {
  ProjectElements, Button, TableHeadings, Label, Headings,
  ValueConstant
} from '../../../../../../shared/constants';
import { LoaderService } from '../../../../../../shared/loader/loaders.service';
import { Category } from '../../../../model/category';
import { WorkItem } from '../../../../model/work-item';
import { Router } from '@angular/router';
import { CommonService } from '../../../../../../../app/shared/services/common.service';
import { QuantityDetails } from '../../../../model/quantity-details';
import {SteelQuantityItem} from "../../../../model/steelQuantityItem";


@Component({
  moduleId: module.id,
  selector: 'bi-get-quantity-steel',
  templateUrl: 'get-quantity-steel.component.html',
  styleUrls: ['get-quantity-steel.component.scss'],
})

export class GetSteelQuantityComponent implements OnInit {
  diameterValuesArray:any[] =ValueConstant.STEEL_DIAMETER_VALUES.slice();
  steelQuantityItems: Array<SteelQuantityItem>;
  selectedDiameterValue:number;

  ngOnInit() {
    if(this.steelQuantityItems.length === 0) {
      this.addQuantityItem();
    }
    }
  addQuantityItem() {
    let quantity = new SteelQuantityItem();
    quantity.item = '';
    quantity.diameter = 0;
    quantity.nos = 0;
    quantity.length = 0;
    quantity.six = 0;
    quantity.eight = 0;
    quantity.ten = 0;
    quantity.sixteen =0;
    quantity.twenty =0;
    quantity.twentyFive =0;
    quantity.thirty =0;
    this.steelQuantityItems.push(quantity);
  }
  onDiameterSelect(diameterValue:number) {
   this.selectedDiameterValue=diameterValue;
  }
  getButton() {
    return Button;
  }

  getTableHeadings() {
    return TableHeadings;
  }

  getLabel() {
    return Label;
  }

  getHeadings() {
    return Headings;
  }
}
