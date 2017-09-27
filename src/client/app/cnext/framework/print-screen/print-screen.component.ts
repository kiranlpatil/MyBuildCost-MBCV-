import {Component, Input, ViewChild, ElementRef} from "@angular/core";
import * as html2canvas from "html2canvas";
import * as jsPDF from "jspdf";

@Component({
  moduleId: module.id,
  selector: 'cn-print-screen',
  templateUrl: 'print-screen.component.html',
  styleUrls: ['print-screen.component.css']
})

export class PrintScreenComponent {
  @ViewChild('fileToDownload') fileToDownload:ElementRef;
  @Input() screenIdForPrint:string;

  constructor() {

  }

  createFile() {
    if (this.screenIdForPrint !== '' && this.screenIdForPrint !== undefined) {
      //var a = document.getElementById(this.screenIdForPrint)
      html2canvas(document.getElementById(this.screenIdForPrint))
        .then((canvas:any) => {
          var dataURL = canvas.toDataURL("image/jpeg");
          this.fileToDownload.nativeElement.href = dataURL;
          this.fileToDownload.nativeElement.download = 'xyzabc.jpeg';
          //this.imageToDownload.nativeElement.click();
          //doc.setFontSize(40);
          //doc.text(35, 25, "Octonyan loves jsPDF");
          var doc = new jsPDF("p", "mm", "a4");
          var width = doc.internal.pageSize.width;
          var height = doc.internal.pageSize.height;
          doc.addImage(dataURL, 'JPEG', 0, 0, width, height);
          doc.save('two-by-four.pdf')

        })
        .catch((err:any) => {
          console.log("error canvas", err);
        });
    }
  }

}
