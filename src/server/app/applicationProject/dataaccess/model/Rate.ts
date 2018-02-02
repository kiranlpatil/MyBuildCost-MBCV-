import RateItem = require('./RateItem');

class Rate {
  total : number;
  quantity: number;
  unit:string;
  item: Array<RateItem>;
  constructor() {
    this.total = 0;
    this.quantity = 0;
    this.item = new Array<RateItem>();
    this.unit = 'sqft';
  }
}
export = Rate;
