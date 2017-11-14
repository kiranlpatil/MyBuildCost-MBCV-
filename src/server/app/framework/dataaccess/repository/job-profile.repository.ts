import User = require('../mongoose/user');
import JobProfileSchema = require('../schemas/job-profile.schema');
import RepositoryBase = require('./base/repository.base');
import IJobProfile = require('../mongoose/job-profile');

class JobProfileRepository extends RepositoryBase<IJobProfile> {
  constructor() {
    super(JobProfileSchema);
  }
}
Object.seal(JobProfileRepository);
export = JobProfileRepository;
