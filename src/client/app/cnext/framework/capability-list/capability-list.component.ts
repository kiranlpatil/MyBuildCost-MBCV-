
import {Response, Http} from '@angular/http';
import {Component} from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs/Rx';



@Component({
  moduleId: module.id,
  selector: 'cn-capibility-list',
  templateUrl: 'capability-list.component.html',
  styleUrls: ['capability-list.component.css']
})

export class CapabilityListComponent {


  constructor(private _router:Router, private http:Http, private activatedRoute:ActivatedRoute) {

  }

 






  /*navigateTo(navigateTo: string, fileName: string, filepath : string) {
    if (navigateTo !== undefined && fileName !== undefined) {
      this._router.navigate([navigateTo + '/' + fileName]);
    }
    LocalStorageService.setLocalValue(QELocalStorage.FILE_PATH, filepath);
  }*/




}
