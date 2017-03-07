interface Navigator {
  Backbutton: Backbutton;
}

interface Backbutton {
  goBack(successCallback: any , errorCallback: any):void;
  goHome(successCallback: any , errorCallback: any):void;
}






