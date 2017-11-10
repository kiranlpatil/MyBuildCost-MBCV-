import { BaseDetail } from './base-detail';
import CandidateListModel = require('../../../dataaccess/model/candidate-list.model');
export class JobDetail extends BaseDetail {
  city: string;
  relevantIndustries : string[];
  candidateList : CandidateListModel[];
}
