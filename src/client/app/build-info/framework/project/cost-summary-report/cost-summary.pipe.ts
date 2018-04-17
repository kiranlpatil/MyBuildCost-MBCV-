import { Pipe, PipeTransform } from '@angular/core';
import { MaterialTakeOffElements } from '../../../../shared/constants';
@Pipe({name: 'keys', pure: false})

export class CostSummaryPipe implements PipeTransform {
  transform(value: any, sort : string,args: any[] = null): any {
    if(value !== undefined) {
      if(sort === MaterialTakeOffElements.SORT) {
        return Object.keys(value).sort(function (a, b) {
          return a.toLowerCase().localeCompare(b.toLowerCase());
        });
      } else {
        return Object.keys(value);
      }
    }
  }
}
