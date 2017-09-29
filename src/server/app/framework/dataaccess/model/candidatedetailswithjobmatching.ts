import CandidateModel = require("./candidate.model");
import {JobQCard} from "../../search/model/job-q-card";

export class CandidateDetailsWithJobMatching {
    candidateDetails:CandidateModel;
    isShowCandidateDetails:boolean;
    jobQCardMatching:JobQCard[]
}
