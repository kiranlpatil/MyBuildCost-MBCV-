import QuantityItem = require('./QuantityItem');

class QuantityDetails {
  name:string;
  total: number;
  quantityItems: Array<QuantityItem>;

  constructor() {
    this.total = 0;
  }
}
export = QuantityDetails;
