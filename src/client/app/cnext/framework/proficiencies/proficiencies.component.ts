import {Component, Input, EventEmitter, Output} from "@angular/core";
import {Section} from "../model/candidate";

@Component({
  moduleId: module.id,
  selector: 'cn-proficiencies',
  templateUrl: 'proficiencies.component.html',
  styleUrls: ['proficiencies.component.css']
})

export class ProficienciesComponent {
  @Input() choosedproficiencies:string[];
  @Input() highlightedSection:Section;
  @Input() proficiencies:string[];
  @Output() onComplete = new EventEmitter();
  @Output() onSelect = new EventEmitter();


  private disablebutton:boolean = true;

  onProficiencyComplete(proficiency:string[]) {
    if (proficiency.length > 0) {
      this.disablebutton = false;
    } else {
      this.disablebutton = true;
    }
    this.onSelect.emit(proficiency);
  }

  onNext() {
      this.onComplete.emit();
    this.highlightedSection.name = "IndustryExposure";
  }
}

















































































