import { SubCategory } from './sub-category';

export class CostHead {
  name: string;
  rateAnalysisId:number;
  budgetedCostAmount:number;
  active: boolean;
  thumbRuleRate: any;
  subCategories: Array<SubCategory>;
}
