import {Component,Input,EventEmitter,Output} from "@angular/core";
import {JobQcard} from "../../model/JobQcard";
import {CandidateFilter} from "../../model/candidate-filter";
import {QCardFilterService} from "../../filters/q-card-filter.service";
import {QCardsortBy} from "../../model/q-cardview-sortby";

@Component({
  moduleId: module.id,
  selector: 'cn-q-card-list',
  templateUrl: 'q-card-list.component.html',
  styleUrls: ['q-card-list.component.css'],

})
export class QcardListComponent  {
  @Input() listOfJobs:JobQcard[];
  @Input() type:string;
  @Input() joblistCount:any;
  @Output() onAction=new EventEmitter();
  private filterMeta : CandidateFilter;
  private qCardModel: QCardsortBy = new QCardsortBy();

  constructor(private qCardFilterService:QCardFilterService) {
    this.qCardFilterService.candidateFilterValue$.subscribe(
      (data: CandidateFilter) => {
        this.filterMeta = data;
      }
    );
  }

  onActionPerform(action:string){
    this.onAction.emit(action);
  }
  clearFilter() {
    this.qCardFilterService.clearFilter();
  }
}
