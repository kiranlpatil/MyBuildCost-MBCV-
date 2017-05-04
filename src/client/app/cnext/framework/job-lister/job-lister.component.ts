import {Component, Input} from "@angular/core";


@Component({
  moduleId: module.id,
  selector: 'cn-job-lister',
  templateUrl: 'job-lister.component.html',
  styleUrls: ['job-lister.component.css']
})

export class JobListerComponent {
  @Input() jobListInput: any[] = new Array(0);

  ngOnChanges(changes: any) {
    if (changes.jobListInput != undefined && changes.jobListInput.length > 0) {
      this.jobListInput = changes.jobListInput;
    }

  }

}
