interface facebookConnectPlugin {
  getAccessToken(successCallback?: (toekn: string) => void, errorCallback?: (errormsg: string) => void): void;
  getLoginStatus(successCallback?: (toekn: any) => void, errorCallback?: (errormsg: any) => void): void;
  login(permissions:any,successCallback?: (toekn: any) => void, errorCallback?: (errormsg: string) => any): void;
}

declare var facebookConnectPlugin: facebookConnectPlugin;


