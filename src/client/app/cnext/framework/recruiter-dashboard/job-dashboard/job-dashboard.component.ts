
import {Component, OnInit} from "@angular/core";
import {Router, ActivatedRoute, Params} from '@angular/router';

@Component({
  moduleId: module.id,
  selector:'cn-job-dashboard',
  templateUrl:'job-dashboard.component.html',
  styleUrls:['job-dashboard.component.css']

})

export class JobDashboardComponent implements OnInit {

  userId:any;
  constructor(private activatedRoute:ActivatedRoute) {

  }
  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      this.userId = params['jobId'];
    });
  }

}
