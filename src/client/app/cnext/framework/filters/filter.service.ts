import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';
import {CandidateFilter} from "../model/candidate-filter";

@Injectable()
export class FilterService {

  // Observable string sources
  candidateFilter = new Subject<CandidateFilter>();
  subjClearFilter = new Subject<any>();
  aboveMatchFilter = new Subject<any>();

  // Observable string streams
  candidateFilterValue$ = this.candidateFilter.asObservable();
  clearFilter$ = this.subjClearFilter.asObservable();
  aboveMatch$ = this.aboveMatchFilter.asObservable();

  clearFilter() {
    this.subjClearFilter.next();
  }

  filterby(data: CandidateFilter) {
    this.candidateFilter.next(data);
  }

  setAboveMatch() {
    this.aboveMatchFilter.next();
  }
}
