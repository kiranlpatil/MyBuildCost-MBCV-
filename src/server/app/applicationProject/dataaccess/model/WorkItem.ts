import Item = require('./Item');
import Quantity = require('./Quantity');
import Rate = require('./Rate');

class WorkItem {
  name: string;
  quantity: Map<string, Quantity>;
  unit: string;
  rate: Map<string, Rate>;
  amount: 0;
}
export = WorkItem;

