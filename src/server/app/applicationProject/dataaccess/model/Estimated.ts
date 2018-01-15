import EstimateReport = require('./EstimateReport');

class Estimated {
  name: string;
  area: number;
  totalRate: number;
  totalEstimatedCost: number;
  estimatedCost: Array<EstimateReport>;
  constructor() {
    this.area = 0;
    this.totalRate = 0;
    this.totalEstimatedCost = 0;
    this.estimatedCost = new Array< EstimateReport>();
  }
}
export = Estimated;
