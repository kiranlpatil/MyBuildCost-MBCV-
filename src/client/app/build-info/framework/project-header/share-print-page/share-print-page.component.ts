import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectService } from '../../project/project.service';

@Component({
  moduleId: module.id,
  selector: 'bi-share-print-page',
  templateUrl: 'share-print-page.component.html',
  styleUrls:['./share-print-page.component.css']
})

export class SharePrintPageComponent {

   constructor(private projectService: ProjectService, private _router: Router) {
  }
}
