import {Injectable} from "@angular/core";

@Injectable()

export class SharedService {

  public isChrome: boolean;

  constructor() {
    this.isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  }

  public getUserBrowser():boolean {
    return this.isChrome;
  }
}