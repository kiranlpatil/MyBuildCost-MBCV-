import { RateItem } from './rate-item';

export class Rate {
  rateFromRateAnalysis: number;
  total: number;
  quantity: number;
  unit :string;
  items: RateItem[] = new Array(0);
}
