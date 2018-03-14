import { BuildingReport } from './building-report';

class ProjectReport {
  buildings : Array<BuildingReport>;
  commonAmenities : BuildingReport;

  constructor(buildings:Array<BuildingReport>, commonAmenities: BuildingReport) {
    this.buildings = buildings;
    this.commonAmenities = commonAmenities;
  }

}
export = ProjectReport;
