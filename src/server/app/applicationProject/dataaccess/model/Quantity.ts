import QuantityItem = require('./QuantityItem');

class Quantity {
  total: number;
  items: Array<QuantityItem>;

  constructor() {
    this.total = 0;
    this.items = new Array<QuantityItem>();
  }
}
export = Quantity;
