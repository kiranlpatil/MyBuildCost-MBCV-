import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from "@angular/core";
import {UserFeedback} from "./userFeedback";

@Component({
  moduleId: module.id,
  selector: 'cn-user-feedback',
  templateUrl: 'user-feedback.component.html',
  styleUrls: ['user-feedback.component.css']
})

export class UserFeedbackComponent implements  OnChanges {
  @Input() currentFeedbackQuestion: UserFeedback;
  @Output() onFeedbackAnswer: EventEmitter<number> = new EventEmitter<number>();
  isOpen: boolean = false;

  constructor() {
  }
  ngOnChanges(changes: any) {
    if (changes.currentFeedbackQuestion && changes.currentFeedbackQuestion.currentValue) {
      this.currentFeedbackQuestion = changes.currentFeedbackQuestion.currentValue;
      this.isOpen = true;
    }
  }

  onSelect(answer: number) {
    this.onFeedbackAnswer.emit(answer);
    this.isOpen = false;
  }
}
