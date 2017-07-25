import {Component, Input} from "@angular/core";
import {ProfileComparisonData} from "../../../model/profile-comparison";

@Component({

  moduleId:module.id,
  selector:'cn-profile-capability-comparison-meta',
  templateUrl:'profile-capability-comparison-meta.component.html',
  styleUrls: ['profile-capability-comparison-meta.component.css']

})

export class ProfileCapabilityComparisonMetaComponent {

  @Input() profileComparisonResult: ProfileComparisonData[];
  constructor() {}
}
