import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import { Industry } from '../model/industry';
import { Section } from '../model/candidate';
import { JobPosterModel } from '../model/jobPoster';
import { ProfessionalDataService } from '../professional-data/professional-data.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JobLocation } from '../model/job-location';
import { MyGoogleAddress } from '../../../framework/registration/candidate/google-our-place/my-google-address';

@Component({
  moduleId: module.id,
  selector: 'cn-basic-job-information',
  templateUrl: 'basic-job-information.component.html',
  styleUrls: ['basic-job-information.component.css']
})

export class BasicJobInformationComponent implements OnInit,OnChanges {
  @Input() jobPosterModel: JobPosterModel = new JobPosterModel();
  @Input() highlightedSection: Section;
  @Output() onComplete = new EventEmitter();
  private savedjobPosterModel: JobPosterModel = new JobPosterModel();
  private jobPostForm: FormGroup;
  private educationList = new Array();
  private experienceList = new Array();
  private salaryList = new Array();
  private noticePeriodList = new Array();
  private address: string;
  private showButton: boolean = true;
  private storedIndustry: Industry;
  private storedLocation: JobLocation = new JobLocation();
  tooltipMessage: string = "<ul>" +
    "<li><h5>Job description</h5>" +
    "<p class='info'>Enter all key words that describe the required area of expertise or specialization.</p>" +
    "</li>" +
    "</ul>";

  constructor(private professionalDataService: ProfessionalDataService,
              private formBuilder: FormBuilder) {

    this.jobPostForm = this.formBuilder.group({
      'jobTitle': ['', Validators.required],
      'hiringManager': ['', Validators.required],
      'department': ['', Validators.required],
      'education': ['', Validators.required],
      'experience': ['', Validators.required],
      'salary': ['', Validators.required],
      'joiningPeriod': ['', Validators.required],
      'location': ['', Validators.required],
    });
  }

  ngOnInit() {
    this.professionalDataService.getEducationList()
      .subscribe(
        data => {
          this.educationList = data.educated;
        });
    this.professionalDataService.getExperienceList()
      .subscribe(
        data => {
          this.experienceList = data.experience;
        });
    this.professionalDataService.getCurrentSalaryList()
      .subscribe(
        data => {
          this.salaryList = data.salary;
        });
    this.professionalDataService.getNoticePeriodList()
      .subscribe(
        data => {
          this.noticePeriodList = data.noticeperiod;
        });
  }

  ngOnChanges(changes:any) {
    if(changes.jobPosterModel !== undefined && changes.jobPosterModel.currentValue !== undefined){
      this.jobPosterModel=changes.jobPosterModel.currentValue;
      this.savedjobPosterModel=Object.assign({},this.jobPosterModel);
    }
  }
  getAddress(address: MyGoogleAddress) {
    this.storedLocation.city = address.city;
    this.storedLocation.state = address.state;
    this.storedLocation.country = address.country;
  }

  selectIndustry(industry: Industry) {
    this.storedIndustry = industry;
  }

  onNext() {
    this.jobPosterModel = this.jobPostForm.value;
    if (this.storedIndustry) {
      this.jobPosterModel.industry = this.storedIndustry;
    }
    this.jobPosterModel.location = this.storedLocation;
    if (this.jobPosterModel.industry) {
      this.savedjobPosterModel=Object.assign({},this.jobPosterModel);
      this.onComplete.emit(this.jobPosterModel);
    } else {
      this.jobPosterModel.industry = new Industry();
    }
  }
  onCancel() {
    this.jobPosterModel=Object.assign({},this.savedjobPosterModel);
    this.highlightedSection.name='none';
    //this.highlightedSection.name='none';
  }
}


/*
 this.username = new FormControl(this.login.username, [Validators.required, Validators.minLength(3), Validators.maxLength(40)]);*/
