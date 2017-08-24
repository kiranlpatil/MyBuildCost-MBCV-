import {Component} from "@angular/core";

@Component({
  moduleId: module.id,
  selector: 'cn-candidate-search',
  templateUrl: 'candidate-search.component.html',
  styleUrls: ['candidate-search.component.css']
})

export class CandidateSearchComponent {

  private searchValue:string;
  private candidateList = ['krishna', 'ghatul', 'shubham'];

  constructor() {

  }

  searchCandidate() {
    debugger


  }

}
