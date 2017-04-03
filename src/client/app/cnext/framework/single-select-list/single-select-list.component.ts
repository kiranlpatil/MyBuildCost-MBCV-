import {Component, EventEmitter, Input, Output} from '@angular/core';
import {SingleSelectList} from "../model/single-select-list";

@Component({
  moduleId: module.id,
  selector: 'cn-single-select-list',
  templateUrl: 'single-select-list.component.html',
  styleUrls: ['single-select-list.component.css']
})

export class SingleSelectListComponent {
  @Input() radioData:SingleSelectList;
  @Output() selectedData = new EventEmitter<string>();
  
  constructor() {
  }
  selectOption(option:string){
    if(option !== undefined)
      this.selectedData.emit(option);
  }
}
