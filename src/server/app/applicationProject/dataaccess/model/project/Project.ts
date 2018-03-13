import Building = require('./building/Building');
import Category = require('./building/CostHead');
import Rate = require('./building/Rate');
import CostHead = require('./building/CostHead');

class Project {
  _id?:string;
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
  rates: Array<Rate>;
  projectCostHeads : Array<CostHead>;
}
export = Project;
