import {  Component, OnInit, OnDestroy  } from '@angular/core';
import {  Router  } from '@angular/router';
import {  NavigationRoutes, ImagePath, LoaderService  } from '../shared/index';

@Component({
    moduleId: module.id,
    selector: 'main-header',
    templateUrl: 'main-header.component.html',
    styleUrls: ['main-header.component.css'],
})
export class MainHeaderComponent {
    BODY_BACKGROUND:string;
    constructor(private loaderService:LoaderService,private _router:Router) {
        this.BODY_BACKGROUND = ImagePath.BODY_BACKGROUND;
    }

    onLogin() {
        this._router.navigate([NavigationRoutes.APP_LOGIN]);
    }

    onSignUp() {
        this._router.navigate([NavigationRoutes.APP_REGISTRATION]);
    }
}

