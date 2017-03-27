/**
 * Created by techprimelab on 3/9/2017.
 */
import {  Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {Http,Response} from "@angular/http";
import {LoaderService} from "../../../framework/shared/loader/loader.service";
import {awards} from "../model/awards";

@Component({
  moduleId: module.id,
  selector: 'cn-awards',
  templateUrl: 'awards.component.html',
  styleUrls: ['awards.component.css']
})

export class AwardsComponent {

  error_msg: string;
  private tempfield: string[];
  private selectedaward=new awards();
  private selectedawards: awards[]=new Array();



  constructor(private _router: Router, private http: Http,
              private formBuilder: FormBuilder, private loaderService: LoaderService) {
    this.tempfield = new Array(1);



  }

  selectedAward(award:string){
    this.selectedaward.awardsdetails=award;


  }





  addAnother() {
    this.selectedawards.push(this.selectedaward);
    console.log(this.selectedawards);
    this.tempfield.push("null");

  }
}
