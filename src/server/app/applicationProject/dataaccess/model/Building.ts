import Category = require('./Category');

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
  category: Array<Category>;
}
export = Building;
