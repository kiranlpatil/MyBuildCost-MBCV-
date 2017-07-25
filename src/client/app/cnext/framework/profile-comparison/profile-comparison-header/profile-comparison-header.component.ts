import {Component, Input, Output} from "@angular/core";
import {EventEmitter} from "@angular/common/src/facade/async";
import {ProfileComparisonData} from "../../model/profile-comparison";

@Component({
  moduleId:module.id,
  selector:'cn-profile-comparison-header',
  templateUrl:'profile-comparison-header.component.html',
    styleUrls: ['profile-comparison-header.component.css']

})

export class ProfileComparisonHeaderComponent {

  @Input() profileComparisonResult: ProfileComparisonData[];
   @Output() actionOnComparisonList = new EventEmitter();
   constructor() {}

   actionToPerformOnCompare() {
     this.actionOnComparisonList.emit();
   }
}
