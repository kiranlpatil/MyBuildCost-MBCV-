import IndustrySchema = require("../schemas/industry.schema");
import RepositoryBase = require("./base/repository.base");
import IIndustry = require("../mongoose/industry");

class IndustryRepository extends RepositoryBase<IIndustry> {
  constructor () {
    super(IndustrySchema);
  }
}
Object.seal(IndustryRepository);
export = IndustryRepository;
