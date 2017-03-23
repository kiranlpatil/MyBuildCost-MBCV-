import {Component} from '@angular/core';
import { Router } from '@angular/router';

@Component({
    moduleId: module.id,
    selector: 'cn-job-filter',
    templateUrl: 'job-filter.component.html',
    styleUrls: ['job-filter.component.css']
})

export class JobFilterComponent {

    constructor(private _router: Router) {

    }

    ngOnInit(){


    }
}
