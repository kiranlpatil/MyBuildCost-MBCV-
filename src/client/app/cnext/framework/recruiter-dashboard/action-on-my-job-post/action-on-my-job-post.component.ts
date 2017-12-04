import {Component, OnInit, OnChanges, Output, EventEmitter, Input} from '@angular/core';
import {Label} from "../../../../shared/constants";
import {Router} from '@angular/router';

@Component({
  moduleId: module.id,
  selector: 'cn-action-on-my-job-post',
  templateUrl: 'action-on-my-job-post.component.html',
  styleUrls: ['action-on-my-job-post.component.css']

 })

export class ActionOnMyJobPostComponent implements OnInit, OnChanges {

  @Input() jobProfile: any;
  @Output() selectedJobProfileEmitterForRenewJob: EventEmitter<string> = new EventEmitter();
  @Output() selectedJobProfileEmitterForCloneJob: EventEmitter<string> = new EventEmitter();
  @Output() selectedJobProfileEmitterForCloseJob: EventEmitter<string> = new EventEmitter();

  constructor(private _router: Router) {

  }

  ngOnInit() {

  }

  ngOnChanges(changes: any) {
  }

  renewJobPost() {
    this.selectedJobProfileEmitterForRenewJob.emit(this.jobProfile);
  }

  raiseCloneEvent() {
    this.selectedJobProfileEmitterForCloneJob.emit(this.jobProfile);
  }

  closeJobPost() {
    this.selectedJobProfileEmitterForCloseJob.emit(this.jobProfile);
  }

  onJobClicked(item: any,isJobSubmit:boolean) {
    if (isJobSubmit) {
      this._router.navigate(['recruiter/job/', item]);
    } else {
      this._router.navigate(['recruiter/jobpost/', item]);
    }
  }

  getLabel() {
    return Label;
  }

}
