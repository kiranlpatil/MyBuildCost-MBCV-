import {  Injectable  } from '@angular/core';
import {  Subject  } from 'rxjs/Subject';
import {JobRequirement} from "./model/job-requirement";


@Injectable()
export class MYJobTitleService {

  // Observable string sources
  private _showJobTitle = new Subject<string>();

  // Observable string streams
  showTestTitle$ = this._showJobTitle.asObservable();

  // Service message commands
  change(value: string) {
    this._showJobTitle.next(value);
  }


}
