import ThumbRuleReport = require('./ThumbRuleReport');

class BuildingReport {
  name: string;
  area: number;
  thumbRuleReport: {
    category: Array<ThumbRuleReport>;
  };
  category: Array<ThumbRuleReport>;
}
export = BuildingReport;
