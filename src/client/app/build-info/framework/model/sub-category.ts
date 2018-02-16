import WorkItem = require('./work-item');

export class  SubCategory {
  name: String;
  rateAnalysisId: number;
  amount: number;
  workitem : Array<WorkItem>;
  constructor(name:String, rateAnalysisId: number) {
    this.name = name;
    this.rateAnalysisId = rateAnalysisId;
    this.amount = 0;
    this.workitem = new Array<WorkItem>();
  }
}

