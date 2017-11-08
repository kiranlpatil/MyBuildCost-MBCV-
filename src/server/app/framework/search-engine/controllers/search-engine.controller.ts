import * as express from 'express';
import {SearchEngine} from '../engines/search';
import {JobSearchEngine} from '../engines/job-search';

export class SearchEngineController {
    getMatchingProfile(req: express.Request, res: express.Response, next: any) : void {
      //let searchEngine : SearchEngine = new CandidateSearchEngine();
      let searchEngine : SearchEngine = new JobSearchEngine();
      //searchEngine.getMatchingObjects();
      searchEngine.buildCriteria(searchEngine);
      searchEngine.computePercentage();
    }
}
