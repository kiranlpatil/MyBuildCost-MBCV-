import {Component, Input} from "@angular/core";
import {Candidate} from "../../../model/candidate";

@Component({
  moduleId: module.id,
  selector: 'cn-value-portrait-header',
  templateUrl: 'value-portrait-header.component.html',
  styleUrls: ['value-portrait-header.component.css'],
})

export class ValuePortraitHeader {

  @Input() private candidate: Candidate;

}
