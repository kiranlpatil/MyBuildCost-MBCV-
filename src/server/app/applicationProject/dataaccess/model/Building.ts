import CostHead = require('./CostHead');

class Building {
  name: string;
  totalSlabArea: number;
  totalCarperAreaOfUnit: number;
  totalSaleableAreaOfUnit: number;
  totalParkingAreaOfUnit: number;
  noOfOneBHK: number;
  noOfTwoBHK: number;
  noOfThreeBHK: number;
  noOfSlab: number;
  noOfLift: number;
  costHead: Array<CostHead>;
}
export = Building;
