import {Component, Input, OnChanges} from '@angular/core';
import {JobPosterService} from "../job-poster/job-poster.service";
import {MessageService} from "../../../shared/services/message.service";
import {Message} from "../../../shared/models/message";
import {Headings, Label, Button} from "../../../shared/constants";
import {ErrorService} from "../../../shared/services/error.service";

@Component ({

  moduleId: module.id,
  selector: 'cn-job-close',
  templateUrl: 'job-close.component.html',
  styleUrls: ['job-close.component.scss']
})

export class JobCloseComponent implements OnChanges {

 /* @Input() selectedJobIdForClose: string;
  @Input() selectedJobTitleForClose: string;*/
  @Input() selectedJobProfile: any;
  @Input() isJobCloseButtonClicked:boolean;


  private showCloseDialogue:boolean = false;
  private isShowNoSelectionError: boolean = false;

  constructor(private errorService: ErrorService, private jobPosterService: JobPosterService, private messageService: MessageService) {
  }

  ngOnChanges(changes:any) {
    /*if (changes.selectedJobIdForClose!== undefined
      && changes.selectedJobIdForClose.currentValue !== undefined) {
      this.showCloseDialogue=true;
    }*/
    if(changes.isJobCloseButtonClicked !== undefined && changes.isJobCloseButtonClicked.currentValue !== undefined) {
      this.showCloseDialogue = true;
    }
  }


  onCloseJob() { debugger
    this.showCloseDialogue = false;
    this.selectedJobProfile.isJobPostClosed = true;
    this.jobPosterService.postJob(this.selectedJobProfile).subscribe(
      data => {
        this.selectedJobProfile = data.data.postedJobs[0];
      }, error => this.errorService.onError(error))
  }

  setStyleForDialogueBox() {
    if (this.showCloseDialogue) {
      return 'block';
    } else {
      return 'none';
    }
  }

  onCancel() {
    this.showCloseDialogue = false;
  }

  getHeading() {
    return Headings;
  }

  getLabel() {
    return Label;
  }

  getButtonLabel() {
    return Button;
  }

}