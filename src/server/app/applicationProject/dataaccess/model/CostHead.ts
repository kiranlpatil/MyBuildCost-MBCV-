import WorkItem = require('./WorkItem');

class CostHead {
  name: string;
  workitem: Map<string, WorkItem>;
}

export = CostHead;
