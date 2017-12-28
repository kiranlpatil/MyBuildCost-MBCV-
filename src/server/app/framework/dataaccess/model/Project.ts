interface ProjectModel {
  user_id:string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: number;
  isCandidate: boolean;
  password: string;
  isActivated: boolean;
  opt: number;
  notifications: Array<any>;
}
export = ProjectModel;
