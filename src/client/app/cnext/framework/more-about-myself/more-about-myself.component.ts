
import {  Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder} from '@angular/forms';
import {Http} from "@angular/http";
import {LoaderService} from "../../../framework/shared/loader/loader.service";

@Component({
  moduleId: module.id,
  selector: 'cn-more-about-myself',
  templateUrl: 'more-about-myself.component.html',
  styleUrls: ['more-about-myself.component.css']
})

export class MoreAboutMyselfComponent {
  tempfield: string[];
  status:string;
  newstringOne:string[];
  newstringTwo:string[];
  newstringThree:string[];
  length:number;
  condition:number;
  maxword:number;
  
  constructor(private _router: Router, private http: Http,
              private formBuilder: FormBuilder, private loaderService: LoaderService) {
    this.tempfield = new Array(1);
  }


  wordcount(event:any){

    console.log(this.status,event);
  this.newstringOne= this.status.split(" ");
    this.newstringTwo= this.status.split(".");
    this.newstringThree= this.status.split(",");

  this.condition=this.newstringOne.length;
  this.condition+=this.newstringTwo.length;
  this.condition+=this.newstringThree.length;
  console.log(this.condition);
  if (this.condition-2>=250)
  {this. maxword=this.status.length;
    this.length=this. maxword;
  }
  }




  addAnother() {

    this.tempfield.push("null");

  }
}
