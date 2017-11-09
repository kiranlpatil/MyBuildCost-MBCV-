import { AppliedFilter } from '../models/input-model/applied-filter';
import { BaseDetail } from '../models/output-model/base-detail';
import { EList } from '../models/input-model/list-enum';
import { ConstVariables } from '../../shared/sharedconstants';
import { QCard } from '../models/output-model/q-card';
export abstract class SearchEngine {

  search() {
    console.log('In Search');
  }

  abstract buildUserCriteria(filter : AppliedFilter, criteria : any) : any;

  abstract buildBusinessCriteria(details : BaseDetail, listName : EList): any;

  computePercentage(candidate_capability_matrix : any , job_capability_matrix :any) : QCard {
    let q_card = new QCard();
    let count =0;
    for (let cap in job_capability_matrix) {
      if (job_capability_matrix[cap] === -1 || job_capability_matrix[cap] === 0 ||
        job_capability_matrix[cap] === undefined) {
      } else if (Number(job_capability_matrix[cap].toString()) === Number(candidate_capability_matrix[cap].toString())) {
        q_card.exact_matching += 1;
        count++;
      } else if (Number(job_capability_matrix[cap].toString()) === (Number(candidate_capability_matrix[cap].toString()) -
        ConstVariables.DIFFERENCE_IN_COMPLEXITY_SCENARIO)) {
        q_card.above_one_step_matching += 1;
        count++;
      } else if (Number(job_capability_matrix[cap].toString()) === (Number(candidate_capability_matrix[cap].toString()) +
        ConstVariables.DIFFERENCE_IN_COMPLEXITY_SCENARIO)) {
        count++;
      } else {
        count++;
      }
    }
    q_card.above_one_step_matching = (q_card.above_one_step_matching / count) * 100;
    q_card.exact_matching = (q_card.exact_matching / count) * 100;
    return q_card;
  }

  abstract buildQCards(objects : any[], jobDetails : BaseDetail) : any ;

  abstract getMatchingObjects(criteria : any, callback : (error : any, response : any) => void) : void;

  abstract createQCard(q_card : QCard, user : any): void;
}
