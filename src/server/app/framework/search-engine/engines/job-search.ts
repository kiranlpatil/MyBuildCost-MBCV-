import { SearchEngine } from './search';
export class JobSearchEngine extends SearchEngine {
  getMatchingObjects() : void {
    console.log('In JobSearchEngine');
  }
}
