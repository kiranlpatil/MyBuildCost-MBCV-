import {Component, Input, OnChanges} from "@angular/core";
import {ProfileComparisonData} from "../../model/profile-comparison";

@Component({
  moduleId:module.id,
  selector:'cn-profile-capability-comparison',
  templateUrl:'profile-capability-comparison.component.html',
    styleUrls: ['profile-capability-comparison.component.css']

})

export class ProfileCapabilityComparisonComponent implements OnChanges {
  //@Input() capabilityList: string[];
  @Input() profileComparisonResult: ProfileComparisonData[];
  constructor() {}

  ngOnChanges(changes: any) {
    /*if (changes.profileComparisonResult.currentValue != undefined) {
     //this.getCapabilityComparison(this.profileComparisonResult);
     }*/
  }

}
