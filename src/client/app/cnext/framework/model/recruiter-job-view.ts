import { JobPosterModel } from './jobPoster';
export  class RecruiterJobView {
  public jobProfileModel:JobPosterModel=new JobPosterModel();
  public numberOfMatchedCandidates:number;
  public numberOfCandidatesInCart:number;
  public numberOfCandidatesApplied:number;
  public numberOfCandidatesrejected:number;
}
