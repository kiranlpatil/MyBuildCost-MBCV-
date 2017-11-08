import { SearchEngine } from './search';
import CandidateRepository = require('../../dataaccess/repository/candidate.repository');
export class CandidateSearchEngine extends SearchEngine {
  getMatchingObjects() : void {
    let candidateRepository : CandidateRepository = new CandidateRepository();
    /*candidateRepository.retrieveAndPopulate(criteria, {}, (err, res) => {
      if (err) {
        callback(err, null);
      } else {
        candidateRepository.getCandidateQCard();
      }
    });*/
  }
}
