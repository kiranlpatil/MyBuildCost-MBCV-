import Quantity = require('./Quantity');
import Rate = require('./Rate');

class ClonedWorkItem {
  name: string;
  rateAnalysisId:number;
  active:boolean;
  quantity: Map<string, Quantity>;
  unit: string;
  rate: Map<any, Rate>;
  amount: 0;
  constructor() {
    this.active = true;
  }
}
export = ClonedWorkItem;

