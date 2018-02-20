import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Messages, Label, Button, Headings } from '../../../../shared/constants';

@Component({
  moduleId: module.id,
  selector: 'bi-project-content',
  templateUrl: 'project-content.component.html'
})

export class ProjectContentComponent {


  constructor(private _router: Router ) {

  }

  navigateTo(nav:string) {
    this._router.navigate([nav]);
  }

  getMessages() {
    return Messages;
  }

  getLabels() {
    return Label;
  }

  getButtons() {
    return Button;
  }

  getHeadings() {
    return Headings;
  }
}
