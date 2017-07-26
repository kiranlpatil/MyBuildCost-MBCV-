import {Component, OnInit} from "@angular/core";
import {Candidate} from "../../model/candidate";

@Component({
  moduleId: module.id,
  selector: 'cn-value-portrait',
  templateUrl: 'value-portrait.component.html',
  styleUrls: ['value-portrait.component.scss']
})

export class ValuePortraitComponent implements OnInit {

  private candidate: Candidate = new Candidate();

  constructor() {

  }

  ngOnInit(): void {

  }

}
