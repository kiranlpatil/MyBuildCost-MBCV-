import {Component, OnInit} from '@angular/core';
import { ShowQcardviewService } from '../showQCard.service';
import {QCardViewService} from "../q-card-view/q-card-view.service";
import {JobFilterService} from "./job-filter.service";
import {CandidateFilter} from "../model/candidate-filter";


@Component({
    moduleId: module.id,
    selector: 'cn-job-filter',
    templateUrl: 'job-filter.component.html',
    styleUrls: ['job-filter.component.css']
})

export class JobFilterComponent implements OnInit{
  private isShowJobFilter:boolean=false;
  private proficiencyList : string[] = new Array(0);
  private locationList : string[] = new Array(0);
  private experienceList : string[] = new Array(0);
  private educationList : string[] = new Array(0);
  private jointimeList : string[] = new Array(0);
  private industryList : string[] = new Array(0);
  private candidateFilter :  CandidateFilter=new CandidateFilter();

  constructor(private showQCardview:ShowQcardviewService,private jobFilterService:JobFilterService) {
    this.showQCardview.showJobQCardView$.subscribe(
      data=> {
        this.isShowJobFilter=true;
      }
    );
  }

  ngOnInit() {
    this.jobFilterService.getListForFilter()
      .subscribe(
        list => {

          this.proficiencyList = list.proficiency;
          this.locationList = list.current_location;
          this.experienceList = list.experience;
          this.educationList = list.education;
          this.jointimeList = list.joining_period;
          this.industryList = list.industry_exposure;

        },
        error => this.onError(error));
  }
  onError(err:any) {

  }
  selectRolesModel(event:any) {
 console.log('data---',event);
  }
}
