import {Component, OnInit} from "@angular/core";
import {Router, ActivatedRoute} from "@angular/router";


@Component({
  moduleId: module.id,
  selector: 'cn-value-portrait-container',
  templateUrl: 'value-portrait-container.component.html',
  styleUrls: ['value-portrait-container.component.css'],
})

export class ValuePortraitContainerComponent implements OnInit {
  _userId:string;

  constructor(private _router:Router, private activatedRoute:ActivatedRoute) {
  }

  navigateTo(nav: string) {
    if (nav !== undefined) {
      this._router.navigate([nav]);
    }
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      this._userId = params['id'];
    });
  }
}
