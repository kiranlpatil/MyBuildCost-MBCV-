import {Component, OnInit} from "@angular/core";
import {Router} from "@angular/router";
import {NavigationRoutes, LocalStorage} from "../../../../framework/shared/constants";
import {LocalStorageService} from "../../../../framework/shared/localstorage.service";


@Component({
  moduleId: module.id,
  selector: 'cn-candidate-summury',
  templateUrl: 'candidate-summury.component.html',
  styleUrls: ['candidate-summury.component.css']
})

export class CandidateSummuryComponent implements OnInit {

  private candidateId:string;

  constructor(private _router:Router) {
  }

  ngOnInit() {
    this.candidateId = LocalStorageService.getLocalValue(LocalStorage.END_USER_ID);
  }

  logOut() {
    window.localStorage.clear();
    this._router.navigate([NavigationRoutes.APP_START]);
  }
}
