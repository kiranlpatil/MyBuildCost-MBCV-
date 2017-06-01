import {Component, Input, EventEmitter, Output} from "@angular/core";
import {CandidateProfileService} from "../candidate-profile/candidate-profile.service";
import {Candidate, Section} from "../model/candidate";
import {FormGroup, FormArray, FormBuilder, Validators} from "@angular/forms";


@Component({
  moduleId: module.id,
  selector: 'cn-awards',
  templateUrl: 'awards.component.html',
  styleUrls: ['awards.component.css']
})

export class AwardsComponent {
  /* @Input() candidate:Candidate;
   @Input() highlightedSection:Section;
   @Output() onComplete = new EventEmitter();

   public monthList = new Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');
   private tempfield:string[];
   private year:any;
   private currentDate:any;
   private yearList = new Array();
   private disableAddAnother:boolean = true;
   private sendPostCall:boolean = false;
   private isShowError:boolean = false;
   private chkAwards:boolean = false;
   private isHiddenAwrard:boolean = false;
   private hideDiv:boolean[] = new Array();
   private showButton:boolean = true;

   constructor(private profileCreatorService:CandidateProfileService) {
   this.tempfield = new Array(1);
   this.currentDate = new Date();
   this.year = this.currentDate.getUTCFullYear();
   this.createYearList(this.year);
   }

   createYearList(year:number) {
   for (let i = 0; i < ValueConstant.MAX_ACADEMIC_YEAR_LIST; i++) {
   this.yearList.push(year--);
   }
   }


   ngOnChanges(changes:any) {
   if (this.candidate.awards.length === 0) {
   this.candidate.awards.push(new Award());
   }
   else {
   this.isHiddenAwrard = true;
   }
   }


   addAnother() {


   for (let item of this.candidate.awards) {
   if (item.name === "" || item.issuedBy === "" || item.year === "") {
   this.disableAddAnother = false;
   this.isShowError = true;

   }
   }
   if (this.disableAddAnother === true) {

   this.candidate.awards.push(new Award());
   }
   this.disableAddAnother = true;

   }

   postAwardDetails() {
   this.isShowError = false;
   for (let item of this.candidate.awards) {
   if (item.name !== "" || item.issuedBy !== "" || item.year !== "") {
   this.isHiddenAwrard = true;
   }
   }
   for (let item of this.candidate.awards) {
   if (item.name === "" || item.issuedBy === "" || item.year === "") {
   this.sendPostCall = false;

   }
   }
   if (this.sendPostCall === true) {
   this.postData();
   }
   this.sendPostCall = true;


   }

   deleteItem(i:number) {
   this.hideDiv[i] = true;
   this.candidate.awards.splice(i, 1);
   this.postData();
   this.hideDiv[i] = false;
   }

   postData() {
   this.profileCreatorService.addProfileDetail(this.candidate).subscribe(
   user => {
   console.log(user);
   });
   }
   hideAwards(){
   this.chkAwards=true;
   this.onNext();

   }
   onNext() {
   this.onComplete.emit();
   this.highlightedSection.name = "AboutMySelf";
   this.highlightedSection.isDisable=false;
   }
   onSave() {
   this.onComplete.emit();
   this.highlightedSection.name = "none";
   this.highlightedSection.isDisable=false;
   }*/

  @Input() candidate:Candidate;
  @Input() highlightedSection:Section;
  @Output() onComplete = new EventEmitter();

  public awardDetail:FormGroup;


  private isButtonShow:boolean = false;
  private showButton:boolean = true;

  constructor(private _fb:FormBuilder, private profileCreatorService:CandidateProfileService) {
  }

  ngOnInit() {
    this.awardDetail = this._fb.group({
      awards: this._fb.array([])
    });

    //subscribe to addresses value changes
    this.awardDetail.controls['awards'].valueChanges.subscribe(x => {
      this.isButtonShow = true;
    })
  }

  ngOnChanges(changes:any) {
    if (changes.candidate.currentValue != undefined) {
      this.candidate = changes.candidate.currentValue;
      if (this.candidate.awards != undefined && this.candidate.awards.length > 0) {

        let controlArray = <FormArray>this.awardDetail.controls['awards'];
        this.candidate.awards.forEach(item => {
          const fb = this.initAwardDetails();
          fb.patchValue(item);
          controlArray.push(fb);
        });
        if (!this.candidate.awards) {
          this.addAward();
        }
      }
    }
  }

  initAwardDetails() {
    return this._fb.group({
      remark: [''],
      name: ['', Validators.required],
      issuedBy: ['', Validators.required],
      year: ['', Validators.required]
    });
  }

  addAward() {
    const control = <FormArray>this.awardDetail.controls['awards'];
    const addrCtrl = this.initAwardDetails();
    control.push(addrCtrl);
  }

  removeAward(i:number) {
    const control = <FormArray>this.awardDetail.controls['awards'];
    control.removeAt(i);
  }

  postData(type:string) {
    this.candidate.awards = this.awardDetail.value.awards;
    this.profileCreatorService.addProfileDetail(this.candidate).subscribe(
        user => {
          if (type == 'next') {
            this.onNext();
          }
          else if (type == 'save') {
            this.onSave()
          }
        });
  }

  onNext() {
    this.onComplete.emit();
    this.highlightedSection.name = "none";
    this.highlightedSection.isDisable = false;
  }

  onSave() {
    this.onComplete.emit();
    this.highlightedSection.name = "none";
    this.highlightedSection.isDisable = false;
  }
}
