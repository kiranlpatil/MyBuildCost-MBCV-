import Category = require('./Category');

class CostHead {
  name: string;
  rateAnalysisId:number;
  budgetedCostAmount:number;
  active: boolean;
  thumbRuleRate: any;
  categories: Array<Category>;
}

export = CostHead;

