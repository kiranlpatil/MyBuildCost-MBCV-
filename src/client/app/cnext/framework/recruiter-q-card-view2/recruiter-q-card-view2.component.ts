import {Component,Input} from "@angular/core";
import {CandidateQCard} from "../model/candidateQcard";
import {ShowQcardviewService} from "../showQCard.service";
import {JobPosterModel} from "../model/jobPoster";
import {QCardsortBy} from "../model/q-cardview-sortby";
import {RecruiteQCardView2Service} from "./recruiter-q-card-view2.service";
import {ImagePath} from "../../../framework/shared/constants";
import {RecruitercandidatesListsService} from "../candidate-lists.service";

@Component({
  moduleId: module.id,
  selector: 'cn-recruiter-dashboard-qcard-view',
  templateUrl: 'recruiter-q-card-view2.component.html',
  styleUrls: ['recruiter-q-card-view2.component.css'],

})
export class RecruiterQCardview2Component  {
  @Input() candidates:CandidateQCard[];

  private selectedPerson:CandidateQCard = new CandidateQCard();
  private image_path:string=ImagePath.PROFILE_IMG_ICON;
 /* private candidateIDS = new Array();
  private candidateInCartIDS = new Array();
  private rejectedCandidatesIDS = new Array();
  private appliedCandidatesIDS = new Array();
  private qCardModel:QCardsortBy = new QCardsortBy();*/

 /* @Input() private jobPosterModel :JobPosterModel;*/
  constructor(private qCardViewService:RecruiteQCardView2Service,private candidateLists:RecruitercandidatesListsService) {
   /* this.candidateLists.showTest$.subscribe(
      data => {
        this.candidates = data;

      }
    );*/

  }

  ngOnChanges(changes :any){
   /* this.candidateLists.showTest$.subscribe(
      data => {
        this.candidates = data;

      }
    );*/
   /* if(changes.jobPosterModel.currentValue){
      for(let item of changes.jobPosterModel.currentValue.candidate_list[1].ids){
        this.candidateIDS.push(item);
      }
      for(let item of changes.jobPosterModel.currentValue.candidate_list[2].ids){
        this.candidateInCartIDS.push(item);
      }
      for(let item of changes.jobPosterModel.currentValue.candidate_list[3].ids){
        this.rejectedCandidatesIDS.push(item);
      } for(let item of changes.jobPosterModel.currentValue.candidate_list[4].ids){
        this.appliedCandidatesIDS.push(item);
      }
    }*/
  }
/*rejectedCandidates() {
  if(this.rejectedCandidatesIDS.length!==0){
      this.qCardViewService.getCandidatesdetails(this.rejectedCandidatesIDS,this.jobPosterModel)
        .subscribe(
          data => {
            this.candidates=data;
          });
  }
}
appliedCandidates(){
  if(this.appliedCandidatesIDS.length!==0){
    this.qCardViewService.getCandidatesdetails(this.appliedCandidatesIDS,this.jobPosterModel)
      .subscribe(
        data => {
            this.candidates=data;
        });

  }

}

  showShortlistedCandidate() {
    if(this.candidateIDS.length!==0){
      this.qCardViewService.getCandidatesdetails(this.candidateIDS,this.jobPosterModel)
        .subscribe(
          data => {
              this.candidates=data;
          });

    }
  }
  candidateInCart() {
    if(this.candidateInCartIDS.length!==0){
      this.qCardViewService.getCandidatesdetails(this.candidateInCartIDS,this.jobPosterModel)
        .subscribe(
          data => {
              this.candidates=data;
          });

    }
  }*/


  onClick(item:any){

    this.selectedPerson = item;
    console.log(this.selectedPerson);

  }

}
