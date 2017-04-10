
import {   Component  } from '@angular/core';
import { Certifications } from '../model/certification-accreditation';
import {ValueConstant, LocalStorage} from '../../../framework/shared/constants';
import {MessageService} from "../../../framework/shared/message.service";
import {ProfileCreatorService} from "../profile-creator/profile-creator.service";
import {LocalStorageService} from "../../../framework/shared/localstorage.service";
import {Message} from "../../../framework/shared/message";
import {Candidate} from "../model/candidate";

@Component({
  moduleId: module.id,
  selector: 'cn-certification-accreditation',
  templateUrl: 'certification-accreditation.component.html',
  styleUrls: ['certification-accreditation.component.css']
})

export class CertificationAccreditationComponent {

  private tempfield: string[];
  private tempCertificateName:string='';
  private tempCompanyName:string='';
  private tempYear:string='';
  private tempdetails:string='';
  private selectedcertificates:Certifications[]=new Array();
  private newCertificate=new Certifications();
  private disbleButton:boolean=false;
  private year: any;
  private currentDate: any;
  private yearList = new Array();
  private candidate:Candidate=new Candidate();


  constructor(private messageService:MessageService,
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

  selectedCertificate(certificatename:string) {
this.tempCertificateName=certificatename;
    this.newCertificate.name=certificatename;
    this. postCertificates();

  }
  selectedCompanyName(companyname:string) {
this.tempCompanyName=companyname;
    this.newCertificate.issuedby=companyname;
   this.postCertificates();
  }


  selectedYearModel(year:string) {
    this.tempYear=year;
    this.newCertificate.year=year;
    this.postCertificates();

  }

  addedCertification(certificate:any) {
    this.tempdetails=certificate;
    this.newCertificate.remark=certificate;
    this.postCertificates();
  }





  addAnother() {
    if(this.tempCertificateName==='' || this.tempCompanyName==='' ||
      this.tempYear===''|| this.tempdetails==='') {
      this.disbleButton=true;
    } else {
      this.disbleButton = false;
    /*  this.tempfield.push('null');*/
      this.tempCertificateName='';
      this.tempCompanyName='' ;
      this.tempYear='';
      this.tempdetails='';
    }
    this.tempfield.push('null');
    this.newCertificate=new Certifications();
  }
  postCertificates(){
    if(this.newCertificate.remark!=='' && this.newCertificate.year!=='' &&
      this.newCertificate.issuedby!=='' &&  this.newCertificate.name!==''){
      this.candidate.certifications.push(this.newCertificate);
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
