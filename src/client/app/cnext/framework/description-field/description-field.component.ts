import {Component, Input} from '@angular/core';


@Component({
  moduleId: module.id,
  selector: 'cn-description-field',
  templateUrl: 'description-field.component.html',
  styleUrls: ['description-field.component.css']
})

export class DescriptionFieldComponent {
  @Input('type') type : string;
  @Input('maxLength') maxLength :number;

 private description:string;
 private newstringOne:string[];
 private newstringTwo:string[];
 private newstringThree:string[];
 private condition:number;
 private maxword:number;
 private remainingWords:number;

  constructor() {

  }

  ngOnInit(){
    this.remainingWords=this.maxLength;
  }

  wordCount(event:any){
    this.newstringOne= this.description.split(" ");
    this.newstringTwo= this.description.split(".");
    this.newstringThree= this.description.split(",");
    this.condition=this.newstringOne.length+this.newstringTwo.length+this.newstringThree.length;
    this.remainingWords=this.maxLength-(this.condition-3);
      if (this.condition-3>=this.maxLength) {
        this. maxword=this.description.length;
      }
  }
}
