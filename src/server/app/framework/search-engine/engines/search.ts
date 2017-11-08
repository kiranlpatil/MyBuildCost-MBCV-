export abstract class  SearchEngine {
  search() {
    console.log('In Search');
  }
  buildCriteria(search : SearchEngine) {
    console.log('Object'+JSON.stringify(search));
  }
  computePercentage() {
    console.log('in Percentage');
  }
  abstract getMatchingObjects() : void;
}
