interface Window {
  FilePath:FilePath;
}
interface FilePath {
  resolveNativePath(path:any, successCallback ?:(toekn:any) => void, errorCallback ?:(errormsg:string) => any):void;
}


