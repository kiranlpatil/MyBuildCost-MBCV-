import { Building } from './building';

export class Project {
  name: string = '';
  region: string = '';
  plotArea: number;
  slabArea:number;
  podiumArea:number;
  openSpace:number;
  poolCapacity:number;
  plotPeriphery: number;
  totalNumOfBuildings:number;
  projectDuration: number;
  buildings: Building[] = new Array(0);
}
