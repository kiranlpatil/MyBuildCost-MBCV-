import {Component, Input} from "@angular/core";
import {RecruiterDashboard} from "../model/recruiter-dashboard";

@Component({
  moduleId: module.id,
  selector: 'cn-recruiter-dashboard',
  templateUrl: 'recruiter-dashboard.component.html',
  styleUrls: ['recruiter-dashboard.component.css']
})

export class RecruiterDashboardComponent {
  company_name: string;
  recruiterDashboard: RecruiterDashboard = new RecruiterDashboard();// todo take this with jobs for meta data --abhijeet
  @Input() jobs: string[] = new Array(0);
  screenType: string='';

  constructor() {
  }
}
