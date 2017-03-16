import CandidateSchema = require("../schemas/candidate.schema");
import RepositoryBase = require("./base/repository.base");
import ICandidate = require("../mongoose/candidate");

class CandidateRepository extends RepositoryBase<ICandidate> {
  constructor () {
    super(CandidateSchema);
  }
}
Object.seal(CandidateRepository);
export = CandidateRepository;
