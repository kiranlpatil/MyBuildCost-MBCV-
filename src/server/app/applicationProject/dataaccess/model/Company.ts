import User = require('../../../framework/dataaccess/mongoose/user');
import Project = require('../mongoose/Project');
import Subscription = require('../mongoose/Subscription');

class Company {
  name: string;
  address: string;
  subscription: Subscription;
  dateOfSubscription: Date;
  user: Array<User>;
  project: Array<Project>;
}
export = Company;
