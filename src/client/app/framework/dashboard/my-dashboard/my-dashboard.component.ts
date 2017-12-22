import {Component, NgZone, OnDestroy, OnInit} from "@angular/core";
import {Router} from "@angular/router";


@Component({
  moduleId: module.id,
  selector: 'tpl-my-dashboard',
  templateUrl: 'my-dashboard.component.html',
  styleUrls: ['my-dashboard.component.css'],
})

export class MyDashboardComponent implements OnInit, OnDestroy {

  private username:string;
  constructor(private _router: Router) {
  }

  ngOnInit() {
    this.username = sessionStorage.getItem('first_name');
    console.log('Hello1');
  }

  ngOnDestroy() {
    // this.loaderService.stop();
    // this.loaderService.showLoading(false);
  }
}
