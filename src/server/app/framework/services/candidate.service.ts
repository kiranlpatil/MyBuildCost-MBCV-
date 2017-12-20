import * as mongoose from "mongoose";
import {UtilityFunction} from "../Old-uitility/utility-function";
import {SentMessageInfo} from "nodemailer";
import {RecruiterCandidatesService} from "./recruiter-candidates.service";
import {AppliedFilter} from "../search-engine/models/input-model/applied-filter";
import {SearchEngine} from "../search-engine/engines/search.engine";
import {JobSearchEngine} from "../search-engine/engines/job-search.engine";
import * as sharedService from "../shared/logger/shared.service";
import Messages = require('../shared/messages');
import CandidateRepository = require('../dataaccess/repository/candidate.repository');
import UserRepository = require('../dataaccess/repository/user.repository');
import User = require('../dataaccess/mongoose/user');
import SendMailService = require('./mailer.service');
import LoggerService = require("../shared/logger/LoggerService");
import UserService = require("./user.service");


let bcrypt = require('bcrypt');

class CandidateService {
  private candidateRepository: CandidateRepository;
  private userRepository: UserRepository;
  private loggerService: LoggerService;

  constructor() {
    this.loggerService = new LoggerService('CANDIDATE_SERVICE_ERROR_HANDLER');
    this.candidateRepository = new CandidateRepository();
    this.userRepository = new UserRepository();
  }

  createUser(item: any, callback: (error: any, result: any) => void) {
    this.userRepository.retrieve({$or: [{'email': item.email}, {'mobile_number': item.mobile_number}]}, (err, res) => {
      if (err) {
        callback(new Error(err), null);
      } else if (res.length > 0) {
        if (res[0].isActivated === true) {
          if (res[0].email === item.email) {
            callback(new Error(Messages.MSG_ERROR_REGISTRATION), null);
          }
          if (res[0].mobile_number === item.mobile_number) {
            callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
          }
        } else if (res[0].isActivated === false) {
          callback(new Error(Messages.MSG_ERROR_VERIFY_ACCOUNT), null);
        }
      } else {
        const saltRounds = 10;
        bcrypt.hash(item.password, saltRounds, (err: any, hash: any) => {
          // Store hash in your password DB.
          if (err) {
            callback(err, null);
          } else {
            item.password = hash;
            item.isCandidate = true;
            item.created_date = new Date();
            this.userRepository.create(item, (err, res) => {
              if (err) {
                callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
              } else {
                let userId1 = res._id;
                let newItem: any = {
                  userId: userId1,
                  location: item.location
                };
                this.candidateRepository.create(newItem, (err: any, res: any) => {
                  if (err) {
                    callback(err, null);
                  } else {
                    callback(err, res);
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  retrieve(field: any, callback: (error: any, result: any) => void) {
    this.candidateRepository.retrieve(field, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        if (result.length > 0) {
          result[0].academics = result[0].academics.sort(function (a: any, b: any) {
            return b.yearOfPassing - a.yearOfPassing;
          });
          result[0].awards = result[0].awards.sort(function (a: any, b: any) {
            return b.year - a.year;
          });
          result[0].certifications = result[0].certifications.sort(function (a: any, b: any) {
            return b.year - a.year;
          });

          callback(null, result);
        }
      }
    });
  }

  findById(id: any, callback: (error: any, result: any) => void) {
    this.candidateRepository.findById(id, callback);
  }

  sendMail(email: string, message: string, template: string, data: any) {
    let sendMailService = new SendMailService();
    sendMailService.send(email, message, template, data, (err: Error) => {
      if (err) {
        this.loggerService.logErrorObj(err);
        //sharedService.mailToAdmin(err);
        this.sendMailOnError(err);
      }
    });
  }

  sendMailOnError(errorInfo: any) {
    let userService = new UserService();
    userService.sendMailOnError(errorInfo, (error:any, result:any) => {
      if (error) {
        this.loggerService.logErrorObj(error);
      }
    });
  }
}

Object.seal(CandidateService);
export = CandidateService;
