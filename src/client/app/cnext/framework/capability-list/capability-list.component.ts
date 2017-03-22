
import {Response, Http} from '@angular/http';
import {Component} from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs/Rx';
import {VALUE_CONSTANT} from "../../../framework/shared/constants";
import {TestService} from "../test.service";
import {ComplexityService} from "../complexity.service";



@Component({
  moduleId: module.id,
  selector: 'cn-capibility-list',
  templateUrl: 'capability-list.component.html',
  styleUrls: ['capability-list.component.css']
})

export class CapabilityListComponent {
  private capabilities : string[];
  private primaryCapabilities=new Array();
  private secondaryCapabilities=new Array();
  private isShowCapability :boolean=false;
  private isSelected: boolean = false ;
  private isPrimary: boolean = false ;

  constructor(private _router:Router, private http:Http,
              private activatedRoute:ActivatedRoute,
              private testService : TestService,
              private complexityService : ComplexityService) {
    testService.showTest$.subscribe(
      data=>{
        this.isShowCapability=true;
      }
    );
    this.http.get("capability")
      .map((res: Response) => res.json())
      .subscribe(
        data => {
          this.capabilities = data.capability;
        },
        err => console.error(err),
        () => console.log()
      );

  }


  selectOption(newVal:any){
    if (newVal.target.checked) {
      this.isSelected=true;
      if(this.primaryCapabilities.length < VALUE_CONSTANT.MAX_CAPABILITIES) {
        this.isPrimary=true;
        this.primaryCapabilities.push(newVal.target.value);
        console.log("added to primary");
      }
      else{
        this.isPrimary=false;
        this.secondaryCapabilities.push(newVal.target.value);
      }
    }
    else{
      this.isSelected=false;
      for(let capability of this.primaryCapabilities){
        if(capability===newVal.target.value){
          this.isPrimary=false;
          this.primaryCapabilities.splice(this.primaryCapabilities.indexOf(capability), 1);
        }
      }

      for(let capability of this.secondaryCapabilities){
        if(capability===newVal.target.value){
          this.isPrimary=false;
          this.secondaryCapabilities.splice(this.secondaryCapabilities.indexOf(capability), 1);
        }
      }
    }

    if(this.primaryCapabilities.length>1){
      this.complexityService.change(true);
    }

    console.log("primaryCapabilities",this.primaryCapabilities);
    console.log("secondaryCapabilities",this.secondaryCapabilities);


  }





}
