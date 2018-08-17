import Rate = require('../project/building/Rate');
import ContractingAddOn = require('../project/building/ContractingAddOn');


class RAWorkItem {
  name: string;
  unit: string;
  rateAnalysisId: number;
  rate: Rate;
  regionName: string;
  contractorAddOns :Array<ContractingAddOn> = new Array<ContractingAddOn>();

  constructor() {
  }
}
export = RAWorkItem;

