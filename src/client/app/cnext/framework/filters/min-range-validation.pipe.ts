
import {Pipe, PipeTransform} from "@angular/core";
import {ArrayRangeValidation} from "../model/array-range-validation";

@Pipe({name:'minrange','pure':false})

export class MinRangeValidation implements PipeTransform {

  transform(array:Array<any>,args:ArrayRangeValidation) {

    if(args) {
      return array.filter(item => (Number(item) < Number(args)));
    }

    return array;
  }
   //return array;
}
