import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MessageService, SessionStorage, SessionStorageService } from '../../../../../../shared/index';
import { CostSummaryService } from '../../cost-summary.service';
import { Button, FileAttachment, ValueConstant } from '../../../../../../shared/constants';
import { AttachmentDetailsModel } from '../../../../model/attachment-details';

@Component({
  moduleId: module.id,
  selector: 'bi-attachment',
  templateUrl: 'attachment.component.html',
  styleUrls: ['attachment.component.css']
})

export class AttachmentComponent implements OnInit {
  @Input() costHeadId: number;
  @Input() categoryId: number;
  @Input() baseUrl: any;
  @Input() workItem: any;

  @Output() showAttachmentView = new EventEmitter();

  workItemId :number;
  private filesToUpload: Array<File>;
  private fileExtension: string;
  private errorMessage: string = '';
  private fileName: string;
  private fileNamesList: Array<AttachmentDetailsModel>;
  private enableUploadOption: boolean = false;
  private validFileExtension = FileAttachment.EXTENSIONS_FOR_FILE;

  constructor( private costSummaryService: CostSummaryService, private messageService : MessageService) { }

  onFileSelect(fileInput: any) {
    this.filesToUpload = <Array<File>> fileInput.target.files;
    if (this.filesToUpload.length === 0) {
      return;
    }
    this.fileExtension = this.filesToUpload[0].name.substring(this.filesToUpload[0].name.lastIndexOf('.') + 1).toLowerCase();
    if (this.validFileExtension.indexOf(this.fileExtension) >= 0) {
      if (this.filesToUpload[0].size <= ValueConstant.FILE_SIZE) {
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
     this.getPresentFilesForWorkItem();
  }

  getPresentFilesForWorkItem() {
    this.costSummaryService.getPresentFilesForWorkItem(this.baseUrl,this.costHeadId,this.categoryId,this.workItemId).subscribe(
      fileNamesList => this.onGetPresentFilesForWorkItemSuccess(fileNamesList),
      error => this.onGetPresentFilesForWorkItemFailure(error)
    );
}
  onGetPresentFilesForWorkItemSuccess(fileNamesList : any) {
  this.fileNamesList = fileNamesList.response.data;
  }
  onGetPresentFilesForWorkItemFailure(error: any) {
    console.log(error);
  }

  addAttachment() {
    this.costSummaryService.addAttachment(this.baseUrl, this.costHeadId,this.categoryId,this.workItemId, this.filesToUpload).then(
      success => this.onAddAttachmentSuccess(success),
      error => this.onAddAttachmentFailure(error)
    );
  }
  onAddAttachmentSuccess(success: any) {
    console.log('onAddAttachmentSuccess');
  }
  onAddAttachmentFailure(error: any) {
    console.log(error);
  }

  deleteAttachment(assignedFileName: any) {
    this.costSummaryService.deleteAttachment(this.baseUrl, this.costHeadId,this.categoryId,this.workItemId, assignedFileName).subscribe(
      success => this.onDeleteAttachmentSuccess(success,assignedFileName),
      error => this.onDeleteAttachmentFailure(error)
    );
  }
  onDeleteAttachmentSuccess(success: any, assignedFileName:any) {
    console.log('onAddAttachmentSuccess');
    for(let fileIndex in this.fileNamesList) {
      if(this.fileNamesList[fileIndex].assignedFileName === assignedFileName) {
        this.fileNamesList.splice(parseInt(fileIndex),1);
        break;
      }
    }
  }
  onDeleteAttachmentFailure(error: any) {
    console.log(error);
  }
  closeAttachmentView() {
   this.showAttachmentView.emit();
  }
  getButton() {
    return Button;
  }
}
