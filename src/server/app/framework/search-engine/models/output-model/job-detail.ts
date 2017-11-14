import { BaseDetail } from './base-detail';
import {CandidateListModel} from '../../../dataaccess/model/candidate-list.model';
export class JobDetail extends BaseDetail {
  city: string;
  relevantIndustries : string[];
  candidateList : CandidateListModel[];
  complexity_must_have_matrix : any;
}
