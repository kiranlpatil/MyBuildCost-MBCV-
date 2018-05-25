import QuantityDetails = require('./QuantityDetails');
import SteelQuantityDetails = require('./SteelQuantityDetails');

class Quantity {
  total: number;
  isEstimated : boolean;
  isDirectQuantity : boolean;
  quantityItemDetails: Array<QuantityDetails>;
  steelQuantityDetails ?: Array<SteelQuantityDetails>;

  constructor() {
    this.total = 0;
    this.isEstimated =false;
    this.isDirectQuantity = false;
    this.quantityItemDetails = new Array<QuantityDetails>();
    this.steelQuantityDetails = new  Array<SteelQuantityDetails>();
  }
}
export = Quantity;
