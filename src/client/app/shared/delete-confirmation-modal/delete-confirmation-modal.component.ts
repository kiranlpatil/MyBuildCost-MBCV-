import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  moduleId: module.id,
  selector: 'bi-delete-confirmation-modal',
  templateUrl: 'delete-confirmation-modal.component.html'
})

export class DeleteConfirmationModalComponent {

  @Input() elementToBeDeleted: string;
  @Output() deleteElementEvent = new EventEmitter<string>();


  constructor() {
  }

  deleteElement() {
    this.deleteElementEvent.emit(this.elementToBeDeleted);
  }

}
