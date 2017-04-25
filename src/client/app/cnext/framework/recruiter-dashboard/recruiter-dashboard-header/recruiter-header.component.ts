import {  Component, OnInit } from '@angular/core';
import {  Router  } from '@angular/router';
import {MessageService} from "../../../../framework/shared/message.service";
import {LocalStorageService} from "../../../../framework/shared/localstorage.service";
import {NavigationRoutes, AppSettings, LocalStorage, ImagePath} from "../../../../framework/shared/constants";

@Component({
    moduleId: module.id,
    selector: 'cn-recruiter-header',
    templateUrl: 'recruiter-header.component.html',
    styleUrls: ['recruiter-header.component.css'],
})

export class RecruiterHeaderComponent implements OnInit {
    company_name:string;
    uploaded_image_path:string;

    constructor(private _router:Router,private messageService: MessageService) {

    }
    ngOnInit() {

        this.company_name = LocalStorageService.getLocalValue(LocalStorage.COMPANY_NAME);
        this.uploaded_image_path = LocalStorageService.getLocalValue(LocalStorage.PROFILE_PICTURE); //TODO:Get it from get user call.

        if ( this.uploaded_image_path === "undefined" || this.uploaded_image_path === null ) {
            this.uploaded_image_path = ImagePath.PROFILE_IMG_ICON;
        } else {
            this.uploaded_image_path = this.uploaded_image_path.substring(4,this.uploaded_image_path.length-1).replace('"','');
            this.uploaded_image_path = AppSettings.IP + this.uploaded_image_path;
        }
    }

    logOut() {
        window.localStorage.clear();
        this._router.navigate([NavigationRoutes.APP_START]);
    }
}

