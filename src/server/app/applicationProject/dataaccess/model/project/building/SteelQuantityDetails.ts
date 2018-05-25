import SteelQuantityItems = require('./SteelQuantityItems');

class SteelQuantityDetails {
  id : number;
  name:string;
  totalWeight: number;
  isDirectQuantity : boolean;
  total: number;
  steelQuantityItems: SteelQuantityItems;
  constructor() {
    this.id = 0;
    this.totalWeight = 0;
    this.isDirectQuantity = false;
    this.total = 0;
  }
}
export = SteelQuantityDetails;
