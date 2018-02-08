import { Component } from '@angular/core';
import { ImagePath, NavigationRoutes } from '../../../shared/index';
import { Messages } from '../../../shared/constants';
import { Router } from '@angular/router';

@Component({
  moduleId: module.id,
  selector: 'create-new-project',
  templateUrl: 'create-new-project.component.html',
  styleUrls: ['create-new-project.component.css'],
})
export class CreateNewProjectComponent {
  BODY_BACKGROUND: string;
  MY_LOGO: string;
  constructor(private _router: Router) {
    this.BODY_BACKGROUND = ImagePath.BODY_BACKGROUND;
    this.MY_LOGO = ImagePath.MY_WHITE_LOGO;
  }
  goToSignUp() {
    this._router.navigate( [NavigationRoutes. APP_REGISTRATION]);
  }
  goToSignIn() {
    this._router.navigate([NavigationRoutes.APP_LOGIN]);
  }
}
