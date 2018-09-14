import Project = require("../project/Project");
import UserSubscriptionForRA = require("../project/Subscription/UserSubscriptionForRA");
import UserSubscription = require("../project/Subscription/UserSubscription");

class NewUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  typeOfApp: string;
  mobile_number: number;
  isCandidate: boolean;
  password: string;
  isActivated: boolean;
  opt: number;
  picture: string;
  social_profile_picture: string;
  current_theme: string;
  activation_date: Date;
  projects: Array<Project>;
  subscription: Array<UserSubscription>;
  subscriptionForRA: UserSubscriptionForRA;
  constructor() {}
}
export = NewUser;
