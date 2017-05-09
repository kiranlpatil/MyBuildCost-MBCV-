import {Component,  Input} from "@angular/core";
import {JobSummary} from "../../../model/jobSummary";
import {ImagePath} from "../../../../../framework/shared/constants";




@Component({
  moduleId: module.id,
  selector: 'cn-recruiter-job-information',
  templateUrl: 'recruiter-job-information.component.html',
  styleUrls: ['recruiter-job-information.component.css']
})

export class RecruiterJobInformation  {
  @Input() recruiter: any ;
  private image_path:string=ImagePath.COMPANY_LOGO_IMG_ICON;
  private postedjob:any=new Array(0);

  ngOnChanges(changes:any) {debugger
    if(changes.recruiter.currentValue != undefined){
      this.recruiter=changes.recruiter.currentValue;
      this.recruiterData(this.recruiter);
    }
    if(this.recruiter != undefined && this.recruiter.company_logo != undefined){
      this.image_path=this.recruiter.company_logo;
    }
  }

  recruiterData(rec:any){
    console.log(rec);
if(rec != undefined){
  console.log(rec.postedJobs);
this.postedjob=rec.postedJobs;
}
  }
}
