import ClonedSubCategory = require('./ClonedSubCategory');

class ClonedCostHead {
  name: string;
  rateAnalysisId:number;
  budgetedCostAmount:number;
  active:boolean;
  thumbRuleRate: any;
  subCategories: Array<ClonedSubCategory>;
}

export = ClonedCostHead;

