import {Component, Input, ViewChild, ElementRef} from "@angular/core";
import * as html2canvas from "html2canvas";

@Component({
    moduleId: module.id,
    selector: 'cn-print-screen',
    templateUrl: 'print-screen.component.html',
    styleUrls: ['print-screen.component.css']
})

export class PrintScreenComponent {
    //@ViewChild('compareView') gk:ElementRef;
    @ViewChild('baseImg') imageToDownload:ElementRef;
    private imgGK:any;
    @Input() screenIdForPrint:string;

    constructor() {

    }

    createImg() {
        //this.gk.nativeElement;
        if (this.screenIdForPrint !== '' && this.screenIdForPrint !== undefined) {
            //document.getElementById(this.screenIdForPrint);
            //this.context = this.el.nativeElement.toDataURL("image/png");
            //console.log('-------img-----------------------',this.gk.nativeElement);
            //myClickFunction( event: any ){
            var a = document.getElementById(this.screenIdForPrint)
            html2canvas(document.getElementById(this.screenIdForPrint))
                .then((canvas:any) => {
                    //document.getElementById(this.screenIdForPrint).appendChild(canvas);
                    var dataURL = canvas.toDataURL("image/jpeg");
                    //var image = new Image();
                    //image.src = canvas.toDataURL("image/jpeg");
                    //this.imgGK = dataURL;
                    //console.log('---------------------------', image.src);
                    var data = atob(dataURL.substring("data:image/jpeg;base64,".length)),
                        asArray = new Uint8Array(data.length);
                    for (var i = 0, len = data.length; i < len; ++i) {
                        asArray[i] = data.charCodeAt(i);
                    }
                    var blob = new Blob([asArray.buffer], {type: "image/jpeg"});
                    this.imageToDownload.nativeElement.href = dataURL;
                    this.imageToDownload.nativeElement.download = 'krishdsna.jpeg';
                    this.imageToDownload.nativeElement.click();
                })
                .catch((err:any) => {
                    console.log("error canvas", err);
                });
        }
        //}
    }

}
