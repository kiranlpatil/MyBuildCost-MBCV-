import { QCard } from './q-card';
import CandidateListModel = require('../../../dataaccess/model/candidate-list.model');

export class JobCard extends QCard {
  company_name: string;
  salaryMinValue: string;
  salaryMaxValue: string;
  experienceMinValue: string;
  experienceMaxValue: string;
  education: string;
  company_size: string;
  company_logo: string;
  postingDate: Date;
  industry: string;
  jobTitle: string;
  hideCompanyName: boolean;
  candidate_list: CandidateListModel[];
  isJobPostClosed: boolean;  // todo rahul discuss with sudhakar and lucky to remove this field
}
