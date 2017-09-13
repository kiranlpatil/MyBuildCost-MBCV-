import { Injectable } from '@angular/core';
import { Headers, Http, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';

@Injectable()

export class ShareService {

  constructor(private http: Http) {
  }
}