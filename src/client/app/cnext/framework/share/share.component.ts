import {Component} from "@angular/core";
import {CeiboShare} from "ng2-social-share/src/ng2-social-share";

@Component({
  moduleId:module.id,
  selector: 'cn-share',
  templateUrl: 'share.component.html',
  styleUrls: ['share.component.css'],
  directives: [CeiboShare]
})

export class ShareComponent {

  public repoUrl = 'https://github.com/Epotignano/ng2-social-share';

  constructor() {

  }

}