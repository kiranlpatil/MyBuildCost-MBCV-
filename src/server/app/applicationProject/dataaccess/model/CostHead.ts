import WorkItem = require('./WorkItem');

class CostHead {
  name: string;
  rateAnalysisId:number;
  workitem: Map<string, WorkItem>;
}

export = CostHead;

