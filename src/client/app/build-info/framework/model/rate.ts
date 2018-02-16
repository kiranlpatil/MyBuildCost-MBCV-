import { RateItem } from './rate-item';

export class Rate {
  rateFromRateAnalysis: number;
  total: any;
  quantity: number;
  unit :string;
  item: RateItem[] = new Array(0);
}
