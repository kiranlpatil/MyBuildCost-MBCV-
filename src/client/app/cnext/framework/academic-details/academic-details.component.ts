import {   Component  } from '@angular/core';
import {  Academicdetails  } from '../model/academic-details';
import {ValueConstant, LocalStorage} from '../../../framework/shared/constants';
import {  EducationalService  } from '../educational-service';
import {CandidateAcadmyDetailService} from "./academic-details.service";
import {ProfileCreatorService} from "../profile-creator/profile-creator.service";
import {MessageService} from "../../../framework/shared/message.service";
import {Message} from "../../../framework/shared/message";
import {LocalStorageService} from "../../../framework/shared/localstorage.service";
import {Candidate} from "../model/candidate";

@Component({
  moduleId: module.id,
  selector: 'cn-academic-details',
  templateUrl: 'academic-details.component.html',
  styleUrls: ['academic-details.component.css']
})

export class AcademicDetailComponent {

  private  tempfield: string[];
  private year: any;
  private currentDate: any;
  private yearList = new Array();
  private selectedacademicsdeatils:Academicdetails=new Academicdetails() ;
  private disbleButton:boolean=false;
  private tempSchoolName:string='';
  private tempUnivercityName:string='';
  private tempPassingYear:string='';
  private  tempSpecialization:string='';
  private candidate:Candidate=new Candidate();


  private newAcademicDetails=new Academicdetails();
  constructor(private educationalService : EducationalService,
              private acadmicDetailsService:CandidateAcadmyDetailService,
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
  selectedSchoolName(schoolname:string) {
   this.tempSchoolName=schoolname;
    this.newAcademicDetails.schoolName=schoolname;
    this.postAcademicDetails();
  }

  selectedeUniversityName(board:string) {
    this.tempUnivercityName=board;
    this.newAcademicDetails.board=board;
    this.postAcademicDetails();
  };
  selectedPassingYear(yearOfPassing:string) {
    this.tempPassingYear=yearOfPassing;
    this.newAcademicDetails.yearOfPassing=yearOfPassing;
    this.postAcademicDetails();
  };

  selectedSpecialization(specialization:string) {
    this.tempSpecialization=specialization;
    this.newAcademicDetails.specialization=specialization;
    this.postAcademicDetails();
  };

  changeValue() {
    this.educationalService.change(true);   //to change the value of upper bubbles
  }


  addAnother() {
    if(this.tempSchoolName==='' || this.tempUnivercityName==='' ||
      this.tempPassingYear==='' || this.tempSpecialization==='' ) {
      this.disbleButton=true;
    } else {
      this.disbleButton = false;
      let temp=new Academicdetails();
      temp.schoolName=this.tempSchoolName;
      temp.board=this.tempUnivercityName;
      temp.yearOfPassing=this.tempPassingYear;
      temp.specialization=this.tempSpecialization;
      //this.selectedacademicsdeatils.push(temp);
      console.log(this.selectedacademicsdeatils);
     /* this.tempfield.push('null');*/
      this.tempSchoolName='';
      this.tempUnivercityName='';
      this.tempPassingYear='';
      this.tempSpecialization='';

    this.tempfield.push('null');
    this.newAcademicDetails=new Academicdetails();

  }}

  postAcademicDetails(){
    if(this.newAcademicDetails.board!=='' && this.newAcademicDetails.schoolName!=='' &&
        this.newAcademicDetails.yearOfPassing!=='' && this.newAcademicDetails.specialization!==''){
      this.candidate.academics.push(this.newAcademicDetails);
      this.profileCreatorService.addProfileDetail(this.candidate).subscribe(
      user => {
        console.log(user);
      },
      error => {
        console.log(error);
      });
  }
  }
}
