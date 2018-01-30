import Item = require('./Item');
import Quantity = require('./Quantity');
import Rate = require('./Rate');

class WorkItem {
  name: string;
  rateAnalysisId:number;
  quantity: Map<string, Quantity>;
  unit: string;
  rate: Map<string, Rate>;
  amount: number;
  constructor(name:string, rateAnalysisId:number) {
    this.name = name;
    this.rateAnalysisId = rateAnalysisId;
    this.quantity = new Map<string, Quantity>();
    this.rate = new Map<string, Rate>();
    this.amount = 0;
  }
}
export = WorkItem;

