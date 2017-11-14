import { BaseDetail } from './base-detail';
import { JobListModel } from '../../../dataaccess/model/candidate-list.model';
export class CandidateDetail extends BaseDetail {
  job_list : JobListModel[];
}
