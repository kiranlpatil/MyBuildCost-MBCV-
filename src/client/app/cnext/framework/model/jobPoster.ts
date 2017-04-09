import {Industry} from "./industry";
import {JobLocation} from "./job-location";
export class JobPosterModel {
  jobTitle : string;
  hiringManager : string;
  department : string;
  education : string;
  experience : string;
  salary : string;
  joiningPeriod :string;
  profiences :  string[];
  industry : Industry;
  location : JobLocation;
  competencies : string;
  responsibility : string;
  postingDate : Date;
  remark : string;

}
