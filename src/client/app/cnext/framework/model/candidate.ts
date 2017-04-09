import {Industry} from "./industry";
import {Award} from "./award";
import {Academicdetails} from "./academic-details";
import {Certifications} from "./certification-accreditation";
import {ProfessionalData} from "./professional-data";
import {EmployementHistory} from "./employment-history";
export class Candidate {
  jobTitle : string;
  isVisible : boolean;
  aboutMyself: string;
  certifications : Certifications[];
  awards : Award;
  industry : Industry;
  intrestedIndustries : string[];
  roleType: string;
  academics :  Academicdetails[];
  professionalDetails :  ProfessionalData[];
  employmentHistory : EmployementHistory[];
  proficiencies : string[];
}
