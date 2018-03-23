import QuantityItem = require('./QuantityItem');

class Quantity {
  total: number;
  isEstimated : boolean;
  quantityItems: Array<QuantityItem>;

  constructor() {
    this.total = 0;
    this.isEstimated = false;
    this.quantityItems = new Array<QuantityItem>();
  }
}
export = Quantity;
