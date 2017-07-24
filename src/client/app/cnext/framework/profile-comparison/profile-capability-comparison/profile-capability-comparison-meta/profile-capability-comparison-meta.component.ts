import {Component, Input} from "@angular/core";
import {ProfileComparisonData} from "../../../model/profile-comparison";

@Component({

  moduleId:module.id,
  selector:'cn-profile-capability-comparison-meta',
  templateUrl:'profile-capability-comparison-meta.component.html',
  styleUrls:['app/cnext/framework/model/profile-capability-comparison-meta.component.scss']

})

export class ProfileCapabilityComparisonMetaComponent {

  @Input() profileComparisonResult: ProfileComparisonData[];
  constructor() {}
}
