import { ESort } from './sort-enum';
import { EList } from './list-enum';
export class AppliedFilter {
  maxalary : string;
  minSalary : string;
  minExperience : string;
  maxExperience : string;
  proficiencies: string[] = new Array(0);
  education : string[] = new Array(0);
  industry : string[] = new Array(0);
  joinTime: string;
  location: string;
  companySize: string;
  mustHaveComplexity: boolean = false;
  sortBy : ESort = ESort.BEST_MATCH;
  listName : EList;
}
