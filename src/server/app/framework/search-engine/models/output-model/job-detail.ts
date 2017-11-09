import { BaseDetail } from './base-detail';
export class JobDetail extends BaseDetail {
  interestedIndustries : string[];
  relevantIndustries : string[];
  city: string;
  candidateList : any;
}
