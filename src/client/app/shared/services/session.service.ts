import { SessionStorage } from "../../shared/constants";

export class SessionStorageService {

  public static getRecruiterReferenceId() {
    return sessionStorage.getItem(SessionStorage.RECRUITER_REFERENCE_ID);
  }

  public static removeRecruiterReferenceId() {
    sessionStorage.removeItem(SessionStorage.RECRUITER_REFERENCE_ID);
  }

  public static setRecruiterReferenceId(id: string) {
    sessionStorage.setItem(SessionStorage.RECRUITER_REFERENCE_ID, id);
  }

}
