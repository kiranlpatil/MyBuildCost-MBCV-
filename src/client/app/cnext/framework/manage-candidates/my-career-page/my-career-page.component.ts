import {Component} from "@angular/core";
import {Button, Messages, AppSettings} from "../../../../shared/constants";
import {ManageCandidatesService} from "../manage-candidates.service";
import {ErrorService} from "../../../../shared/services/error.service";
import {ManagedCandidatesSummary} from "../../model/managed-candidates-summary";
import {LoaderService} from "../../../../shared/loader/loaders.service";

@Component({
  moduleId: module.id,
  selector: 'cn-my-career-page',
  templateUrl: 'my-career-page.component.html',
  styleUrls: ['my-career-page.component.css']
})

export class MyCareerPageComponent {

  public fromDate: string = '';
  public toDate: string = '';
  public inValidDates: boolean = false;
  public summary: ManagedCandidatesSummary = new ManagedCandidatesSummary();
  public inValidDateErrorMessage: string = '';

  constructor(private manageCandidatesService: ManageCandidatesService, private errorService: ErrorService,
              private loaderService: LoaderService) {

  }

  loadSummary() {
    this.inValidDates = false;
    this.inValidDateErrorMessage = '';
    if (this.fromDate != '' && this.toDate != '') {
      if (this.validateDates()) {
        this.manageCandidatesService.getSummary("career plugin", this.fromDate, this.toDate)
          .subscribe(
            data => {
              this.summary = data.summary;
            },
            (error: Error) => {
              this.errorService.onError(error);
            }
          );
      }
    }
  }

  validateDates() {
    if (new Date(this.fromDate) > new Date() || new Date(this.toDate) > new Date()) {
      this.summary = new ManagedCandidatesSummary();
      this.inValidDates = true;
      this.inValidDateErrorMessage = this.getMessages().MSG_ERROR_VALIDATION_DATES_ON_EXCEEDING_DATE;
      return false;
    }
    if (new Date(this.fromDate) > new Date(this.toDate)) {
      this.summary = new ManagedCandidatesSummary();
      this.inValidDates = true;
      if(this.inValidDateErrorMessage !=
        this.getMessages().MSG_ERROR_VALIDATION_DATES_ON_EXCEEDING_DATE) {
        this.inValidDateErrorMessage = this.getMessages().MSG_ERROR_VALIDATION_DATES;
      }
      return false;
    }
    return true;
  }

  getButtons() {
    return Button;
  }

  getMessages() {
    return Messages;
  }

  exportSummary() {
    this.loaderService.start();
    this.manageCandidatesService.exportCandidatesDetails("career plugin", this.fromDate, this.toDate)
      .subscribe(
        data => {
          this.loaderService.stop();
          window.open(AppSettings.IP + data.filePath, '_self');
        },
        (error: Error) => {
          this.errorService.onError(error);
        }
      );
  }
}

