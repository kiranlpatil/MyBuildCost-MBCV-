import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { SessionStorageService } from '../../../../../shared/services/session.service';
import { SessionStorage } from '../../../../../shared/constants';

@Component({
  moduleId: module.id,
  selector: 'cost-summary-report-pdf',
  templateUrl: 'cost-summary-report.component.html',
})

export class CostSummaryReportComponent {
  @ViewChild('content') content: ElementRef;
  @Input() buildingReport: any;
  @Input() costingByUnit: any;
  @Input() costingByArea: any;
  currentProjectName: string;

  constructor() {
    this.currentProjectName = SessionStorageService.getSessionValue(SessionStorage.CURRENT_PROJECT_NAME);
  }

  downloadToPdf() {
    console.log('download to pdf');
  }
}

