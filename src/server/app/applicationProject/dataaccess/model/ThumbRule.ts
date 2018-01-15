import ThumbRuleReport = require('./ThumbRuleReport');

class  ThumbRule {
  name: string;
  area: number;
  totalRate: number;
  totalBudgetedCost: number;
  thumbRuleReport: Array<ThumbRuleReport>;
  constructor() {
    this.totalRate = 0;
    this.totalBudgetedCost = 0;
    this.thumbRuleReport = new Array<ThumbRuleReport>(0);
  }
}
export = ThumbRule;
