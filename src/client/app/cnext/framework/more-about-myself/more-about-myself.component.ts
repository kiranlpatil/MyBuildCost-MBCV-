import { Component, OnInit } from '@angular/core';
import {AboutCandidateService} from "./more-about-myself.service";

@Component({
  moduleId: module.id,
  selector: 'cn-more-about-myself',
  templateUrl: 'more-about-myself.component.html',
  styleUrls: ['more-about-myself.component.css']
})

export class MoreAboutMyselfComponent implements OnInit {

  private  maxLength :number=250;
  private  reSize: string[];
  private aboutMyself:string;
  private newstringOne:string[];
  private newstringTwo:string[];
  private newstringThree:string[];
  private wordsTillNow:number;
  private remainingWords:number;
  private maxword:number;
  constructor(private aboutMyselfservice:AboutCandidateService) {
    this.reSize = new Array(1);
  }
  ngOnInit() {
    this.remainingWords=this.maxLength;
  }
  wordCount(event:any) {
   this.newstringOne= this. aboutMyself.split(' ');
    this.newstringTwo= this. aboutMyself.split('.');
    this.newstringThree= this. aboutMyself.split(',');
    this.wordsTillNow=this.newstringOne.length+this.newstringTwo.length+this.newstringThree.length;
    this.remainingWords=this.maxLength-(this.wordsTillNow-3);
    if (this.wordsTillNow-3>=this.maxLength) {
      this. maxword=this.aboutMyself.length;
    }
    this.aboutMyselfservice.addAboutCandidate(this.newstringOne)
      .subscribe(
        user => console.log(user),
        error => console.log(error))
  }
  addAnother() {
    this.reSize.push('null');
  }
}
