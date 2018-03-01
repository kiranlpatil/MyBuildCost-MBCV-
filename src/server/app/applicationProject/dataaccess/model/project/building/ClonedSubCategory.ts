import ClonedWorkItem = require('./ClonedWorkItem');

class ClonedSubCategory {
  name: String;
  rateAnalysisId:number;
  active:boolean;
  amount:number;
  workItems: Array<ClonedWorkItem>;
}

export = ClonedSubCategory;

