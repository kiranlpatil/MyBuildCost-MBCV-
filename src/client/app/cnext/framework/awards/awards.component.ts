
import {Component, Input} from '@angular/core';
import {  Award  } from '../model/award';
import { AwardService } from '../award-service';
import {ValueConstant, LocalStorage} from '../../../framework/shared/constants';
import {CandidateAwardService} from "./awards.service";
import {ProfileCreatorService} from "../profile-creator/profile-creator.service";
import {MessageService} from "../../../framework/shared/message.service";
import {LocalStorageService} from "../../../framework/shared/localstorage.service";
import {Message} from "../../../framework/shared/message";
import {Candidate} from "../model/candidate";
import {ProfessionalData} from "../model/professional-data";


@Component({
  moduleId: module.id,
  selector: 'cn-awards',
  templateUrl: 'awards.component.html',
  styleUrls: ['awards.component.css']
})

export class AwardsComponent {
  @Input() candidate:Candidate;
  public monthList = new Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');
  private tempfield: string[];
  private temptitle:string='';
  private tempmonth:string='';
  private tempyear:string='';
  private tempremark:string='';
  private selectedawards: Award[]=new Array();
  private disbleButton:boolean=false;
  private year: any;
  private currentDate: any;
  private yearList = new Array();


  constructor( private awardService:AwardService ,
               private candidateAward:CandidateAwardService,
               private messageService:MessageService,
               private profileCreatorService:ProfileCreatorService) {
    this.tempfield = new Array(1);
    this.currentDate = new Date();
    this.year = this.currentDate.getUTCFullYear();
    this.createYearList(this.year);
  }

  ngOnInit(){
    if(LocalStorageService.getLocalValue(LocalStorage.IS_CANDIDATE)==="true"){
      this.profileCreatorService.getCandidateDetails()
        .subscribe(
          candidateData => this.OnCandidateDataSuccess(candidateData),
          error => this.onError(error));

    }
  }

  OnCandidateDataSuccess(candidateData:any){}

  onError(error: any) {
    var message = new Message();
    message.error_msg = error.err_msg;
    message.isError = true;
    this.messageService.message(message);
  }
  createYearList(year: number) {
    for (let i = 0; i < ValueConstant.MAX_ACADEMIC_YEAR_LIST; i++) {
      this.yearList.push(year--);
    }
  }
  changeValue() {
    this.awardService.change(true);
  }
  ngOnChanges(changes :any){
  if(this.candidate.awards.length===0){
    this.candidate.awards.push(new Award());
  }
}




  addAnother() {
    /*if (this.temptitle!=='' && this.tempmonth!=='' &&
      this.tempyear!=='' && this.tempremark!=='') {
      console.log(this.selectedawards);

      this.disbleButton = false;
      this.tempfield.push('null');
      this.temptitle='' ;
      this.tempmonth ='' ;
      this.tempremark ='' ;this.tempyear='';
      this.candidateAward.addCandidateAward(this.selectedawards)
        .subscribe(
          user => console.log(user),
          error => console.log(error))

    } else {
      this.disbleButton = true;
    }*/

/*
    this.newAward=new Award();
*/

this.candidate.awards.push(new  Award());
  }
  postAwardDetails(){
 /*  if(this.newAward.remark!=='' &&this.newAward.issuedBy!=='' &&
      this.newAward.names!=='' &&this.newAward.year!==''){
      this.candidate.awards.push(this.newAward);*!/*/
      this.profileCreatorService.addProfileDetail(this.candidate).subscribe(
        user => {
          console.log(user);
        },
        error => {
          console.log(error);
        });
/*
    }
*/
  }
}
