interface gapi {
  auth2:auth2;
  load(object: string, fn: any) : any;
}
interface auth2 {
  init(params: {
    client_id: string;
    cookiepolicy: string;
    scope: string;
  }): any;
}
declare var gapi: gapi;
