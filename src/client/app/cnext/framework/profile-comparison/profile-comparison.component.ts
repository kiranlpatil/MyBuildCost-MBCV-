import {Component, Input, OnChanges, Output, EventEmitter} from "@angular/core";
import {ProfileComparisonService} from "./profile-comparison.service";
import {ProfileComparison, ProfileComparisonData, CompareEntityDetails} from "../model/profile-comparison";
//TODO Abhijeet import {EventEmitter} from "@angular/common/src/facade/async";


@Component({
  moduleId:module.id,
  selector:'cn-profile-comparison',
  templateUrl:'profile-comparison.component.html',
    styleUrls: ['profile-comparison.component.css']
})

export class ProfileComparisonComponent implements OnChanges {

  @Input() profileComparison:ProfileComparison;
  @Output() performActionOnComparisonList = new EventEmitter();
  private profileComparisonData: ProfileComparisonData[] = new Array(0);
  private profileComparisonJobData: CompareEntityDetails = new CompareEntityDetails();
  //@ViewChild('compareView') gk:ElementRef;
  //@ViewChild('baseImg') pk:ElementRef;
  public context:CanvasRenderingContext2D;
  //private imgGK:any;


  constructor(private profileComparisonService:ProfileComparisonService) {

  }


  ngOnChanges(changes: any) {
    if (changes.profileComparison.currentValue != undefined) {
      this.profileComparisonData = changes.profileComparison.currentValue.profileComparisonData;
      this.profileComparisonJobData = changes.profileComparison.currentValue.profileComparisonJobData;
    }
  }

  actionOnComparisonList(value:any) {
    this.performActionOnComparisonList.emit(value);
    /*if(data.action = 'Remove') {
     this.profileComparisonData.splice(data.value,1);
     }*/
  }

  /*createImg() {
   this.gk.nativeElement;
   //this.context = this.el.nativeElement.toDataURL("image/png");
   //console.log('-------img-----------------------',this.gk.nativeElement);
   //myClickFunction( event: any ){
   html2canvas(this.gk.nativeElement)
   .then((canvas:any) => {
   this.gk.nativeElement.appendChild(canvas);
   console.log('------------canvascanvascanvascanvas------', canvas );
   var dataURL = canvas.toDataURL("image/jpeg");
   var image = new Image();
   image.src = canvas.toDataURL("image/jpeg");
   this.imgGK = dataURL;
   console.log('---------------------------',image.src);
   var data = atob( dataURL.substring( "data:image/jpeg;base64,".length ) ),
   asArray = new Uint8Array(data.length);

   for( var i = 0, len = data.length; i < len; ++i ) {
   asArray[i] = data.charCodeAt(i);
   }

   var blob = new Blob( [ asArray.buffer ], {type: "image/jpeg"} );
   this.pk.nativeElement.href = dataURL;
   this.pk.nativeElement.download = 'krishna.jpeg';
   this.pk.nativeElement.click();
   })
   .catch((err:any) => {
   console.log("error canvas", err);
   });
   //}
   }*/

}
