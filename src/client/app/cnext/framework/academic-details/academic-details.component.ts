import {   Component  } from '@angular/core';
import {  Academicdetails  } from '../model/academic-details';
import {  ValueConstant  } from '../../../framework/shared/constants';
import {  EducationalService  } from '../educational-service';
import {CandidateAcadmyDetailService} from "./academic-details.service";

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
  private selectedacademicsdeatils:Academicdetails[]=new Array();
  private disbleButton:boolean=false;
  private tempSchoolName:string='';
  private tempUnivercityName:string='';
  private tempPassingYear:string='';
  private  tempSpecialization:string='';
  private newAcademicDetails=new Academicdetails();
  constructor(private educationalService : EducationalService,private acadmicDetailsService:CandidateAcadmyDetailService) {

    this.tempfield = new Array(1);
    this.currentDate = new Date();
    this.year = this.currentDate.getUTCFullYear();
    this.createYearList(this.year);


  }

  createYearList(year: number) {
    for (let i = 0; i < ValueConstant.MAX_ACADEMIC_YEAR_LIST; i++) {
      this.yearList.push(year--);
    }
  }
  selectedSchoolName(schoolname:string) {
   /* this.tempSchoolName=schoolname;*/
    this.newAcademicDetails.schoolName=schoolname;
    this.selectedacademicsdeatils.push(this.newAcademicDetails);
    this.postAcademicDetails();
  }

  selectedeUniversityName(board:string) {
    /*this.tempUnivercityName=board;*/
    this.newAcademicDetails.board=board;
    this.selectedacademicsdeatils.push(this.newAcademicDetails);
    this.postAcademicDetails();
  };
  selectedPassingYear(yearOfPassing:string) {
    this.newAcademicDetails.yearOfPassing=yearOfPassing;
    this.selectedacademicsdeatils.push(this.newAcademicDetails);
    this.postAcademicDetails();
  };

  selectedSpecialization(specialization:string) {
    this.newAcademicDetails.specialization=specialization;
    this.selectedacademicsdeatils.push(this.newAcademicDetails);
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
      this.selectedacademicsdeatils.push(temp);
      console.log(this.selectedacademicsdeatils);
      this.tempfield.push('null');
      this.tempSchoolName='';
      this.tempUnivercityName='';
      this.tempPassingYear='';
      this.tempSpecialization='';

    }
  }

  postAcademicDetails(){
    this.acadmicDetailsService.addCandidateAcademyDetails(this.selectedacademicsdeatils)
      .subscribe(
        user => console.log(user),
        error => console.log(error));
  }
}
