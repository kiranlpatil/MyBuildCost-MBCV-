import {Component, OnInit} from '@angular/core';
import { ImagePath, NavigationRoutes } from '../../shared/index';
import { Router } from '@angular/router';

declare let $: any;

@Component({
  moduleId: module.id,
  selector: 'home-page',
  templateUrl: 'home-page.component.html',
  styleUrls: ['home-page.component.css'],
})

export class HomePageComponent implements OnInit {

  constructor(private _router: Router) {
  }

  scrollToSection($element: any) {
    $('#navbar').collapse('hide');

    $element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  }

  ngOnInit() {
    $('#video-modal').on('hidden.bs.modal',() => {
      $('video').trigger('pause');
    });
    $('#video-modal').on('show.bs.modal',() => {
      $('video').trigger('play');
    });
  }

  addClick() {
    this._router.navigate([NavigationRoutes.APP_LOGIN]);
  }

  onSignUp() {
    this._router.navigate([NavigationRoutes.APP_REGISTRATION]);
  }

}
