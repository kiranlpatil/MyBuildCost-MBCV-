import {  Component  } from '@angular/core';
import {JobListerService} from "./job-lister-service";
import {JobPosterModel} from "../model/jobPoster";
import {QCardsortBy} from "../model/q-cardview-sortby";
//import { JobListerService } from 'job-lister-service';
//import {JobPosterModel} from "../model/JobPosterModel";


@Component({
  moduleId: module.id,
  selector: 'cn-job-lister',
  templateUrl: 'job-lister.component.html',
  styleUrls: ['job-lister.component.css']
})

export class JobListerComponent {
  public jobList:JobPosterModel[] = new Array(0);
  public jobListToCheck:JobPosterModel[] = new Array(0);
  private toggle:boolean=false;
  private qCardModel:QCardsortBy=new QCardsortBy();

  constructor(private jobListerService:JobListerService) {
      jobListerService.getJobList().subscribe(
        data=> {
          this.jobList = data.data[0].postedJobs;});
          this.qCardModel.name='Date';
    }
  sortBy(){
    this.toggleFormat();
  }
  get format()   {
    return this.toggle ? this.qCardModel.name :"Date"; }
  toggleFormat() {
    this.toggle = true; }
  }
