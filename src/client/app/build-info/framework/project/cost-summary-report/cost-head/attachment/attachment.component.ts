import {Component, Input, OnInit} from '@angular/core';
import {MessageService, SessionStorage, SessionStorageService} from "../../../../../../shared/index";
import {CostSummaryService} from "../../cost-summary.service";
import {AttachmentDetailsModel} from "../../../../model/attachment-details";

@Component({
  moduleId: module.id,
  selector: 'bi-attachment',
  templateUrl: 'attachment.component.html',
  styleUrls: ['attachment.component.css']
})

export class AttachmentComponent implements OnInit{
  @Input() costHeadId: number;
  @Input() categoryId: number;
  @Input() baseUrl: any;
  @Input() workItem: any;
  workItemId :number;
  private filesToUpload: Array<File>;
  private fileExtension: string;
  private errorMessage: string = '';
  private fileName: string;
  private enableUploadOption: boolean = false;
  private validFileExtension = new Array('txt', 'pdf', 'doc','docx','text/plain');

  constructor( private costSummaryService: CostSummaryService, private messageService : MessageService) { }

  /*onFileSelect(event: any) {
    let fileNamePath = event.target.value;
    this.fileName =  fileNamePath.substring(fileNamePath.lastIndexOf('\\')+1);
    console.log( this.fileName);
  }*/

  onFileSelect(fileInput: any) {
    this.filesToUpload = <Array<File>> fileInput.target.files;
    if (this.filesToUpload.length === 0) {
      return;
    }
    this.fileExtension = this.filesToUpload[0].name.substring(this.filesToUpload[0].name.lastIndexOf('.') + 1).toLowerCase();
    if (this.validFileExtension.indexOf(this.fileExtension) >= 0) {
      if (this.filesToUpload[0].size <= 500000000000) {
        this.errorMessage = '';
        this.fileName = this.filesToUpload[0].name;
        this.enableUploadOption = true;
      } else {
        this.errorMessage = 'Please check the file size';
      }
    } else {
      this.errorMessage = 'The file you are tryig to attach is not supported by this application';
    }
  }

  ngOnInit() {
     this.workItemId = this.workItem.rateAnalysisId;
    console.log(this.baseUrl,this.costHeadId,this.workItemId,this.categoryId,this.workItem);
  }

  addAttachment() {
    this.costSummaryService.addAttachment(this.baseUrl, this.costHeadId,this.categoryId,this.workItemId, this.filesToUpload).then(
      success => this.onAddAttachmentSuccess(success),
      error => this.onAddAttachmentFailure(error)
    );
  }
  onAddAttachmentSuccess(success: any) {
  }
  onAddAttachmentFailure(error: any) {
    console.log(error);
  }
}
