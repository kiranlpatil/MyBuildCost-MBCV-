export class QCardFilter {
  salaryMaxValue: number;
  salaryMinValue: number;
  experienceMaxValue: number;
  experienceMinValue: number;
  proficiencyDataForFilter: string[] = new Array(0);
  educationDataForFilter: string[] = new Array(0);
  industryExposureDataForFilter: string[] = new Array(0);
  filterByJoinTime: string;
  filterByLocation: string;
  filterByCompanySize: string;
  filterByMustHaveComplexity: boolean = false;
  query: any;
  sortBy : string= 'Best match';
}
