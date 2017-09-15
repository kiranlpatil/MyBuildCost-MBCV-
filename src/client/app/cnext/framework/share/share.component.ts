import {Component, OnInit} from "@angular/core";
import {ShareService} from "./share.service";
import {SeoService} from "./seo.service";
import {ErrorService} from "../error.service";
import {Share} from "../model/share";

@Component({
  moduleId: module.id,
  selector: 'cn-share',
  templateUrl: 'share.component.html',
  styleUrls: ['share.component.css'],
})

export class ShareComponent implements OnInit {

  public repoUrlFacebook:string;
  public repoUrlLinkedin:string;
  public repoUrlTwitter:string;

  constructor(private shareService:ShareService, private seoService:SeoService, private errorService:ErrorService) {
  }

  ngOnInit() {
    this.buildValuePortraitUrl();
  }

  buildValuePortraitUrl() {
    this.shareService.buildValuePortraitUrl()
      .subscribe(
        (data:Share) => {
          //console.log('------', user);
          //this.changeMeta(data);
          this.repoUrlFacebook = 'http://www.facebook.com/sharer.php?u=' + data.shareUrl;
          this.repoUrlLinkedin = 'https://www.linkedin.com/cws/share?url=' + data.shareUrl;
          this.repoUrlTwitter = 'https://twitter.com/share?url=' + data.shareUrl;
          //this.isShareProfile = data.isVisible;
        },
        error=> {
          this.errorService.onError(error);
        }
      );
  }

  changeMeta(user:any) {
    this.seoService.setTitle('Check out value portrait of ' + user.first_name);
    this.seoService.setMetaDescription('My Description');
    this.seoService.setMetaRobots('Index, Follow');
    this.seoService.setMetaOgDescription('This is value portrait of ' + user.first_name);
    this.seoService.setMetaOgTitle(user.first_name);
    this.seoService.setMetaOgImage('https://media.licdn.com/mpr/mpr/shrink_200_200/AAEAAQAAAAAAAAv4AAAAJDQwZGMxZjdhLTkwYWUtNDEzNS04Y2NlLTE0OWU0NDZkODQ4MQ.png');
  }


}
