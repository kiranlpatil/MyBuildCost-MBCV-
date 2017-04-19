import {Component,Input } from "@angular/core";

import {CandidateDetail} from "../../../../../framework/registration/candidate/candidate";
import {Candidate} from "../../../model/candidate";


@Component({
  moduleId: module.id,
  selector: 'cn-candidate-description',
  templateUrl: 'candidate-basic-information.component.html',
  styleUrls: ['candidate-basic-information.component.css']
})

export class CandidateBasicInformationComponent {
 
  @Input() candidateDetails:CandidateDetail=new CandidateDetail();
  @Input() candidate:Candidate=new Candidate();
  
}
