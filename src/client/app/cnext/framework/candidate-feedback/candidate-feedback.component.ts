import {Component} from '@angular/core';
import {Candidate} from "../../../user/models/candidate";

@Component({
  moduleId: module.id,
  selector: 'cn-candidate-feedback',
  templateUrl: 'candidate-feedback.component.html',
  styleUrls: ['candidate-feedback.component.css']
})

export class CandidateFeedbackComponent {
  candidate: Candidate = new Candidate();

}
