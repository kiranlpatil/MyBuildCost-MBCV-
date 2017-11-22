import LoggerService = require('../shared/logger/LoggerService');
import {MailChimpMailerService} from './mailchimp-mailer.service';
import {CandidateProfileCompletionInPercentage, CandidateProfileUpdateTrackServerSide} from '../shared/sharedconstants';

let CronJob = require('cron').CronJob;
let config = require('config');

export class CronJobService {

  OnCronJobStart() {
    let toDate = new Date();
    let fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - 1);

    let mailChimpMailerService = new MailChimpMailerService();

    let sendingMailOnProfileUpdate = new CronJob('00 30 23 * * 0-6', function () {
      mailChimpMailerService.sendNotificationToCandidateForIncompleteProfile(
        CandidateProfileCompletionInPercentage.COMPLETED_25_PERCENT,
        config.get('TplSeed.mail.MAILCHIMP_CANDIDATE_PROFILE_SUBMIT_25%_LISTID'), fromDate, toDate);
      mailChimpMailerService.sendNotificationToCandidateForIncompleteProfile(
        CandidateProfileCompletionInPercentage.COMPLETED_50_PERCENT,
        config.get('TplSeed.mail.MAILCHIMP_CANDIDATE_PROFILE_SUBMIT_50%_LISTID'), fromDate, toDate);
      mailChimpMailerService.sendNotificationToCandidateForIncompleteProfile(
        CandidateProfileCompletionInPercentage.COMPLETED_75_PERCENT,
        config.get('TplSeed.mail.MAILCHIMP_CANDIDATE_PROFILE_SUBMIT_75%_LISTID'), fromDate, toDate);
      mailChimpMailerService.sendNotificationToCandidateForIncompleteProfile(
        CandidateProfileCompletionInPercentage.COMPLETED_95_PERCENT,
        config.get('TplSeed.mail.MAILCHIMP_CANDIDATE_PROFILE_SUBMIT_95%_LISTID'), fromDate, toDate);
    }, null, false, 'Asia/Kolkata');
    sendingMailOnProfileUpdate.start();
  }
}
