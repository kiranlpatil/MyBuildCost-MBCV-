import ThumbRuleReport = require('./ThumbRuleReport');
import EstimateReport = require('./EstimateReport');

class BuildingReport {
  name: string;
  area: number;
  thumbRuleReport: Map<string, ThumbRuleReport>;
  estimatedCost: Map<string, EstimateReport>;
  /*costHead: Array<any>;*/

  constructor() {
    /*this.costHead = [];*/
    this.thumbRuleReport = new Map<string, ThumbRuleReport>();
    this.estimatedCost = new Map<string, EstimateReport>();
  }
}
export = BuildingReport;
