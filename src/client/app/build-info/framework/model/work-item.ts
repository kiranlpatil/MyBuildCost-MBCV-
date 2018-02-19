import { Units } from '../../../shared/constants';
export class WorkItem {

  name: string;
  rateAnalysisId: number;
  unit: string;
  amount: number;
  remarks: string;

  constructor(name: string, rateAnalysisId: number) {
    this.name = name;
    this.rateAnalysisId = rateAnalysisId;
    this.amount = 0;
    this.unit = Units.UNIT;
    this.remarks = '';
  }
}

