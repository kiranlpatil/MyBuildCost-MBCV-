import {Component, OnInit} from "@angular/core";
import {Router} from "@angular/router";
import {CandidateProfileService} from "../../candidate-profile/candidate-profile.service";
import {Message} from "../../../../framework/shared/message";
import {MessageService} from "../../../../framework/shared/message.service";
import {Candidate} from "../../model/candidate";
import {CandidateDetail} from "../../../../framework/registration/candidate/candidate";
import {NavigationRoutes} from "../../../../framework/shared/constants";


@Component({
  moduleId: module.id,
  selector: 'cn-candidate-summury',
  templateUrl: 'candidate-summury.component.html',
  styleUrls: ['candidate-summury.component.css']
})

export class CandidateSummuryComponent implements OnInit {
private candidateDetails:CandidateDetail=new CandidateDetail();
private candidate:Candidate=new Candidate();
  private secondaryCapabilities:string[]=new Array();

  constructor( private messageService:MessageService,
               private profileCreatorService:CandidateProfileService,
               private _router:Router) {
  }

  ngOnInit() {
    this.getCandidateProfile();
  }

  getCandidateProfile() {
    this.profileCreatorService.getCandidateDetails()
      .subscribe(
        candidateData => this.OnCandidateDataSuccess(candidateData),
        error => this.onError(error));
  }

  OnCandidateDataSuccess(candidateData:any) {
    this.candidate = candidateData.data[0];
    this.candidateDetails = candidateData.metadata;
    this.getSecondaryData();
  }

  onError(error:any) {
    var message = new Message();
    message.error_msg = error.err_msg;
    message.isError = true;
    this.messageService.message(message);
  }

  getSecondaryData(){
    for(let role of this.candidate.industry.roles){
      for(let capability of role.capabilities){
        if(capability.isSecondary){
          this.secondaryCapabilities.push(capability.name);
        }
      }
    }
  }

  logOut() {
    window.localStorage.clear();
    this._router.navigate([NavigationRoutes.APP_START]);
  }
}
