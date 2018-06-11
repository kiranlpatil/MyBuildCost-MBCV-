import { Component, OnInit } from '@angular/core';
import { Headings, Button, Label,Messages } from '../../../../shared/constants';
import { ActivatedRoute, Router } from '@angular/router';
import { NavigationRoutes } from '../../../../shared/index';
import { SessionStorage, SessionStorageService } from '../../../../shared/index';
import { ProjectService } from '../../project/project.service';

@Component({
  moduleId: module.id,
  selector: 'bi-retain-project',
  templateUrl: 'retain-project.component.html',
  styleUrls: ['retain-project.component.css']
})

export class RetainProjectComponent implements OnInit {
 projectName:string;
  constructor(private activatedRoute:ActivatedRoute, private _router: Router, private projectService: ProjectService) {
  }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      this.projectName = params['projectName'];
    });
  }

   getMessage() {
    return Messages;
    }

    getButton() {
    return Button;
    }

    onCreateNewProject() {
      let projectId = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT_ID);
      this.projectService.updateProjectStatus(projectId).subscribe(
        success => this.onUpdateProjectStatusSuccess(success),
        error => this.onUpdateProjectStatusFailure(error)
      );
    }

  onUpdateProjectStatusSuccess(success : any) {
    this._router.navigate([NavigationRoutes.APP_CREATE_PROJECT]);
    console.log(success);
  }

  onUpdateProjectStatusFailure(error : any) {
    console.log(error);
  }

  onContinueWithExixtingProject() {
    this._router.navigate([NavigationRoutes.APP_PACKAGE_SUMMARY,'Retain',false]);

  }
  onCreateProjectClick() {
  /*  if(this.isSubscriptionAvailable) {
      this._router.navigate([NavigationRoutes.APP_CREATE_PROJECT]);
    }else if(!this.isSubscriptionAvailable) {
      this._router.navigate([NavigationRoutes.APP_PACKAGE_SUMMARY,this.packageName,this.premiumPackageAvailable]);

    }*/
  }

  goToDashboard() {
    this._router.navigate([NavigationRoutes.APP_DASHBOARD]);
  }
}
