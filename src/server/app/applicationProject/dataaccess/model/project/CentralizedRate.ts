class CentralizedRate {
  item: string;
  originalName: string;
  rate: number;

  constructor(itemName : string, originalItemName:string, rate:number) {
    this.item = itemName;
    this.originalName = originalItemName;
    this.rate = rate;
  }
}
export = CentralizedRate;
