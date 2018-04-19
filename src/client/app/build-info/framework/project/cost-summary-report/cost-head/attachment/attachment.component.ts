import {Component, Input} from '@angular/core';

@Component({
  moduleId: module.id,
  selector: 'bi-attachment',
  templateUrl: 'attachment.component.html',
  styleUrls: ['attachment.component.css']
})

export class Attachment {
  @Input() projectId: number;
  @Input() workItemId: number;
  @Input() categoryId: number;
  @Input() buildingId: number;

  constructor(){}

  onFileSelect(event: any) {
    console.log(event);
  }
  addAttachment() {

  }
}
