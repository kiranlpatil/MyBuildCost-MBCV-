import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'dashboardfilter', pure: false})

export class RecruiterDashboardFilterPipe implements  PipeTransform{


  transform(array: Array<any>, args: Array<string>): Array<any> {
   /* if (array == null ) {
      return null;
    }
    if(args==='Date' && args!==""){

      array.sort((a: JobPosterModel, b: JobPosterModel) => {
        if (a.postingDate > b.postingDate ){
          return -1;
        }else if( a.postingDate < b.postingDate ){
          return 1;
        }else{
          return 0;
        }
      });}*/
    return array;
  }
}
