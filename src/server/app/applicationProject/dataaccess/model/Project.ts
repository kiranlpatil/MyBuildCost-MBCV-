import Building = require('./Building');
import Category = require('./CostHead');
import Rate = require('./Rate');

class Project {
  name: string;
  region: string;
  plotPeriphery: number;
  projectDuration: number;
  plotArea: number;
  slabArea:number;
  podiumArea:number;
  openSpace:number;
  poolCapacity:number;
  totalNumOfBuildings:number;
  buildings: Array<Building>;
  costHead: Array<Category>;
  rate: Array<Rate>;
}
export = Project;
