import RecruiterSchema = require("../schemas/recruiter.schema");
import RepositoryBase = require("./base/repository.base");
import IRecruiter = require("../mongoose/recruiter");

class RecruiterRepository extends RepositoryBase<IRecruiter> {
  constructor () {
    super(RecruiterSchema);
  }
}
Object.seal(RecruiterRepository);
export = RecruiterRepository;
