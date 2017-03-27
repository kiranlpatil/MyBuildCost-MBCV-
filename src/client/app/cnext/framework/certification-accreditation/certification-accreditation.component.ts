/**
 * Created by techprimelab on 3/9/2017.
 */
import {  Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {Http,Response} from "@angular/http";
import {LoaderService} from "../../../framework/shared/loader/loader.service";
import {certifications} from "../model/certification-accreditation";

@Component({
  moduleId: module.id,
  selector: 'cn-certification-accreditation',
  templateUrl: 'certification-accreditation.component.html',
  styleUrls: ['certification-accreditation.component.css']
})

export class CertificationAccreditationComponent {

  private tempfield: string[];
  private selectedcertificate=new certifications();
  private selectedcertificates:certifications[]=new Array();
  error_msg: string;
  certificate:string;



  constructor(private _router: Router, private http: Http,
              private formBuilder: FormBuilder, private loaderService: LoaderService) {

    this.tempfield = new Array(1);
  }


  addedCertification(certificate:any){
    this.selectedcertificate.certificationdetails=certificate;

  }





  addAnother() {
this.selectedcertificates.push(  this.selectedcertificate);
    console.log(this.selectedcertificates);
    this.tempfield.push("null");

  }
}
