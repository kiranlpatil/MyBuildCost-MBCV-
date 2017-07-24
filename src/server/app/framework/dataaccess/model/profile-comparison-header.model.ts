import User = require("../mongoose/user");
import JobProfileModel = require("./jobprofile.model");

interface ProfileComparisonHeaderModel {
  id: any;
  isCandidate: boolean;
  first_name: string;
  last_name: string;
  birth_year: number;
  email: string;
  mobile_number: string;
  pin: string;
  picture: string;

  matchingPercentage: number;
  listStatus: string;
}

export = ProfileComparisonHeaderModel
