"use strict";
var mongoose = require("mongoose");
var sharedconstants_1 = require("../shared/sharedconstants");
var job_count_model_1 = require("../dataaccess/model/job-count.model");
var Messages = require("../shared/messages");
var UserRepository = require("../dataaccess/repository/user.repository");
var RecruiterRepository = require("../dataaccess/repository/recruiter.repository");
var CandidateRepository = require("../dataaccess/repository/candidate.repository");
var fs = require("fs");
var CapabilityMatrixService = require("./capbility-matrix.builder");
var IndustryRepository = require("../dataaccess/repository/industry.repository");
var MailAttachments = require("../shared/sharedarray");
var SendMailService = require("./sendmail.service");
var CandidateService = require("./candidate.service");
var bcrypt = require('bcrypt');
var RecruiterService = (function () {
    function RecruiterService() {
        this.recruiterRepository = new RecruiterRepository();
        this.userRepository = new UserRepository();
        this.industryRepository = new IndustryRepository();
        this.candidateRepository = new CandidateRepository();
    }
    RecruiterService.prototype.createUser = function (item, callback) {
        var _this = this;
        this.userRepository.retrieve({ 'email': item.email }, function (err, res) {
            if (err) {
                callback(new Error(err), null);
            }
            else if (res.length > 0) {
                if (res[0].isActivated === true) {
                    callback(new Error(Messages.MSG_ERROR_REGISTRATION), null);
                }
                else if (res[0].isActivated === false) {
                    callback(new Error(Messages.MSG_ERROR_VERIFY_ACCOUNT), null);
                }
            }
            else {
                item.isActivated = false;
                item.isCandidate = false;
                var saltRounds = 10;
                bcrypt.hash(item.password, saltRounds, function (err, hash) {
                    if (err) {
                        callback(new Error(Messages.MSG_ERROR_BCRYPT_CREATION), null);
                    }
                    else {
                        item.password = hash;
                        _this.userRepository.create(item, function (err, res) {
                            if (err) {
                                callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
                            }
                            else {
                                var userId1 = res._id;
                                var newItem = {
                                    isRecruitingForself: item.isRecruitingForself,
                                    company_name: item.company_name,
                                    company_size: item.company_size,
                                    company_logo: item.company_logo,
                                    company_website: item.company_website,
                                    userId: userId1
                                };
                                _this.recruiterRepository.create(newItem, function (err, res) {
                                    if (err) {
                                        callback(err, null);
                                    }
                                    else {
                                        callback(null, res);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    };
    RecruiterService.prototype.findOneAndUpdate = function (query, newData, options, callback) {
        this.recruiterRepository.findOneAndUpdate(query, newData, options, callback);
    };
    RecruiterService.prototype.retrieve = function (field, callback) {
        this.recruiterRepository.retrieve(field, function (err, res) {
            if (err) {
                var er = new Error('Unable to retrieve recruiter details.');
                callback(er, null);
            }
            else {
                var recruiter = void 0;
                recruiter = res[0];
                if (recruiter) {
                    recruiter.jobCountModel = new job_count_model_1.JobCountModel();
                    recruiter.jobCountModel.numberOfJobposted = recruiter.postedJobs.length;
                }
                if (res.length > 0) {
                    if (recruiter.postedJobs) {
                        for (var _i = 0, _a = recruiter.postedJobs; _i < _a.length; _i++) {
                            var job = _a[_i];
                            for (var _b = 0, _c = job.candidate_list; _b < _c.length; _b++) {
                                var list = _c[_b];
                                switch (list.name) {
                                    case sharedconstants_1.ConstVariables.APPLIED_CANDIDATE:
                                        recruiter.jobCountModel.totalNumberOfCandidatesApplied += list.ids.length;
                                        break;
                                    case sharedconstants_1.ConstVariables.CART_LISTED_CANDIDATE:
                                        recruiter.jobCountModel.totalNumberOfCandidateInCart += list.ids.length;
                                        break;
                                    case sharedconstants_1.ConstVariables.REJECTED_LISTED_CANDIDATE:
                                        recruiter.jobCountModel.totalNumberOfCandidatesRejected += list.ids.length;
                                        break;
                                    default:
                                        break;
                                }
                            }
                        }
                    }
                }
                callback(null, [recruiter]);
            }
        });
    };
    RecruiterService.prototype.addJob = function (_id, item, callback) {
        this.recruiterRepository.findOneAndUpdate({ 'userId': new mongoose.Types.ObjectId(_id) }, { $push: { postedJobs: item.postedJobs } }, {
            'new': true, select: {
                postedJobs: {
                    $elemMatch: { 'postingDate': item.postedJobs.postingDate }
                }
            }
        }, function (err, record) {
            if (record) {
                callback(null, record);
            }
            else {
                var error = void 0;
                if (record === null) {
                    error = new Error('Unable to update posted job maybe recruiter not found. ');
                    callback(error, null);
                }
                else {
                    callback(err, null);
                }
            }
        });
    };
    RecruiterService.prototype.addCloneJob = function (_id, item, callback) {
        this.recruiterRepository.findOneAndUpdate({ 'userId': new mongoose.Types.ObjectId(_id) }, { $push: { postedJobs: item } }, {
            'new': true, select: {
                postedJobs: {
                    $elemMatch: { 'postingDate': item.postingDate }
                }
            }
        }, function (err, record) {
            if (record) {
                callback(null, record);
            }
            else {
                var error = void 0;
                if (record === null) {
                    error = new Error('Job cloning is failed');
                    callback(error, null);
                }
                else {
                    callback(err, null);
                }
            }
        });
    };
    RecruiterService.prototype.updateJob = function (_id, item, callback) {
        var _this = this;
        var capabilityMatrixService = new CapabilityMatrixService();
        this.industryRepository.retrieve({ 'name': item.postedJobs.industry.name }, function (error, industries) {
            if (error) {
                callback(error, null);
            }
            else {
                if (item.postedJobs.capability_matrix === undefined) {
                    item.postedJobs.capability_matrix = {};
                }
                var new_capability_matrix = {};
                item.postedJobs.capability_matrix = capabilityMatrixService.getCapabilityMatrix(item.postedJobs, industries, new_capability_matrix);
                _this.recruiterRepository.findOneAndUpdate({
                    'userId': new mongoose.Types.ObjectId(_id),
                    'postedJobs._id': new mongoose.Types.ObjectId(item.postedJobs._id)
                }, { $set: { 'postedJobs.$': item.postedJobs } }, {
                    'new': true, select: {
                        postedJobs: {
                            $elemMatch: { 'postingDate': item.postedJobs.postingDate }
                        }
                    }
                }, function (err, record) {
                    if (record) {
                        callback(null, record);
                    }
                    else {
                        var error_1;
                        if (record === null) {
                            error_1 = new Error('Unable to update posted job maybe recruiter & job post not found. ');
                            callback(error_1, null);
                        }
                        else {
                            callback(err, null);
                        }
                    }
                });
            }
        });
    };
    RecruiterService.prototype.findById = function (id, callback) {
        this.recruiterRepository.findById(id, callback);
    };
    RecruiterService.prototype.getList = function (item, callback) {
        var _this = this;
        var query = {
            'postedJobs._id': { $in: item.ids },
        };
        this.recruiterRepository.retrieve(query, function (err, res) {
            if (err) {
                callback(err, null);
            }
            else {
                _this.recruiterRepository.getJobProfileQCard(res, item.candidate, item.ids, 'none', function (canError, canResult) {
                    if (canError) {
                        callback(canError, null);
                    }
                    else {
                        callback(null, canResult);
                    }
                });
            }
        });
    };
    RecruiterService.prototype.updateDetails = function (_id, item, callback) {
        var _this = this;
        this.recruiterRepository.retrieve({ 'userId': new mongoose.Types.ObjectId(_id) }, function (err, res) {
            if (err) {
                callback(err, res);
            }
            else {
                _this.recruiterRepository.findOneAndUpdate({ '_id': res[0]._id }, item, { 'new': true }, callback);
            }
        });
    };
    RecruiterService.prototype.getCandidateList = function (item, callback) {
        var _this = this;
        var query = {
            'postedJobs': { $elemMatch: { '_id': new mongoose.Types.ObjectId(item.jobProfileId) } }
        };
        this.recruiterRepository.retrieve(query, function (err, res) {
            if (err) {
                callback(new Error('Not Found Any Job posted'), null);
            }
            else {
                if (res.length > 0) {
                    var candidateIds_1 = new Array(0);
                    var jobProfile_1;
                    for (var _i = 0, _a = res[0].postedJobs; _i < _a.length; _i++) {
                        var job = _a[_i];
                        if (job._id.toString() === item.jobProfileId) {
                            jobProfile_1 = job;
                            for (var _b = 0, _c = job.candidate_list; _b < _c.length; _b++) {
                                var list = _c[_b];
                                if (list.name.toString() === item.listName.toString()) {
                                    candidateIds_1 = list.ids;
                                }
                            }
                        }
                    }
                    _this.candidateRepository.retrieveByMultiIds(candidateIds_1, {}, function (err, res) {
                        if (err) {
                            callback(new Error('Candidates are not founds'), null);
                        }
                        else {
                            _this.candidateRepository.getCandidateQCard(res, jobProfile_1, candidateIds_1, callback);
                        }
                    });
                }
            }
        });
    };
    RecruiterService.prototype.getJobById = function (id, callback) {
        var query = {
            'postedJobs': { $elemMatch: { '_id': new mongoose.Types.ObjectId(id) } }
        };
        this.recruiterRepository.retrieve(query, function (err, res) {
            if (err) {
                callback(new Error('Problem in Job Retrieve'), null);
            }
            else {
                var jobProfile = void 0;
                if (res.length > 0) {
                    for (var _i = 0, _a = res[0].postedJobs; _i < _a.length; _i++) {
                        var job = _a[_i];
                        if (job._id.toString() === id) {
                            jobProfile = job;
                        }
                    }
                }
                callback(null, jobProfile);
            }
        });
    };
    RecruiterService.prototype.loadCapbilityAndKeySkills = function (postedJob) {
        var candidateService = new CandidateService();
        for (var i = 0; i < postedJob.length; i++) {
            postedJob[i].keySkills = postedJob[i].proficiencies.toString().replace(/,/g, ' $');
            postedJob[i].additionalKeySkills = postedJob[i].additionalProficiencies.toString().replace(/,/g, ' $');
            postedJob[i].capabilityMatrix = candidateService.loadCapabilitiDetails(postedJob[i].capability_matrix);
        }
        return postedJob;
    };
    RecruiterService.prototype.retrieveBySortedOrder = function (query, projection, sortingQuery, callback) {
        this.recruiterRepository.retrieveBySortedOrder(query, projection, sortingQuery, callback);
    };
    RecruiterService.prototype.retrieveWithLean = function (field, projection, callback) {
        console.log("inside recruiter service");
        this.recruiterRepository.retrieveWithLean(field, projection, callback);
    };
    RecruiterService.prototype.sendMailToAdvisor = function (field, callback) {
        var header1 = fs.readFileSync('./src/server/public/header1.html').toString();
        var footer1 = fs.readFileSync('./src/server/public/footer1.html').toString();
        var mailOptions = {
            to: field.email_id,
            subject: Messages.EMAIL_SUBJECT_RECRUITER_CONTACTED_YOU,
            html: header1 + footer1, attachments: MailAttachments.AttachmentArray
        };
        var sendMailService = new SendMailService();
        sendMailService.sendMail(mailOptions, callback);
    };
    RecruiterService.prototype.sendMailToRecruiter = function (user, field, callback) {
        var header1 = fs.readFileSync('./src/server/app/framework/public/header1.html').toString();
        var content = fs.readFileSync('./src/server/app/framework/public/confirmation.mail.html').toString();
        var footer1 = fs.readFileSync('./src/server/app/framework/public/footer1.html').toString();
        content = content.replace('$job_title$', field.jobTitle);
        var mailOptions = {
            to: user.email,
            subject: Messages.EMAIL_SUBJECT_RECRUITER_CONTACTED_YOU + field.jobTitle,
            html: header1 + content + footer1, attachments: MailAttachments.AttachmentArray
        };
        var sendMailService = new SendMailService();
        sendMailService.sendMail(mailOptions, callback);
    };
    return RecruiterService;
}());
Object.seal(RecruiterService);
module.exports = RecruiterService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvc2VydmljZXMvcmVjcnVpdGVyLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG1DQUFxQztBQUVyQyw2REFBeUQ7QUFDekQsdUVBQWtFO0FBQ2xFLDZDQUFnRDtBQUNoRCx5RUFBNEU7QUFDNUUsbUZBQXNGO0FBRXRGLG1GQUFzRjtBQUN0Rix1QkFBeUI7QUFDekIsb0VBQXVFO0FBRXZFLGlGQUFvRjtBQUNwRix1REFBMEQ7QUFDMUQsb0RBQXVEO0FBR3ZELHNEQUF5RDtBQUN6RCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFL0I7SUFPRTtRQUNFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFDckQsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDbkQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztJQUN2RCxDQUFDO0lBRUQscUNBQVUsR0FBVixVQUFXLElBQVMsRUFBRSxRQUEyQztRQUFqRSxpQkE2Q0M7UUE1Q0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBQyxFQUFFLFVBQUMsR0FBRyxFQUFFLEdBQUc7WUFDM0QsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDUixRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakMsQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FB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b250ZW50IjpbImltcG9ydCAqIGFzIG1vbmdvb3NlIGZyb20gXCJtb25nb29zZVwiO1xuaW1wb3J0IHtSZWNydWl0ZXJ9IGZyb20gXCIuLi9kYXRhYWNjZXNzL21vZGVsL3JlY3J1aXRlci1maW5hbC5tb2RlbFwiO1xuaW1wb3J0IHtDb25zdFZhcmlhYmxlc30gZnJvbSBcIi4uL3NoYXJlZC9zaGFyZWRjb25zdGFudHNcIjtcbmltcG9ydCB7Sm9iQ291bnRNb2RlbH0gZnJvbSBcIi4uL2RhdGFhY2Nlc3MvbW9kZWwvam9iLWNvdW50Lm1vZGVsXCI7XG5pbXBvcnQgTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9zaGFyZWQvbWVzc2FnZXMnKTtcbmltcG9ydCBVc2VyUmVwb3NpdG9yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvcmVwb3NpdG9yeS91c2VyLnJlcG9zaXRvcnknKTtcbmltcG9ydCBSZWNydWl0ZXJSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L3JlY3J1aXRlci5yZXBvc2l0b3J5Jyk7XG5pbXBvcnQgSm9iUHJvZmlsZU1vZGVsID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9qb2Jwcm9maWxlLm1vZGVsJyk7XG5pbXBvcnQgQ2FuZGlkYXRlUmVwb3NpdG9yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvcmVwb3NpdG9yeS9jYW5kaWRhdGUucmVwb3NpdG9yeScpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IENhcGFiaWxpdHlNYXRyaXhTZXJ2aWNlID0gcmVxdWlyZSgnLi9jYXBiaWxpdHktbWF0cml4LmJ1aWxkZXInKTtcbmltcG9ydCBJbmR1c3RyeU1vZGVsID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9pbmR1c3RyeS5tb2RlbCcpO1xuaW1wb3J0IEluZHVzdHJ5UmVwb3NpdG9yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvcmVwb3NpdG9yeS9pbmR1c3RyeS5yZXBvc2l0b3J5Jyk7XG5pbXBvcnQgTWFpbEF0dGFjaG1lbnRzID0gcmVxdWlyZShcIi4uL3NoYXJlZC9zaGFyZWRhcnJheVwiKTtcbmltcG9ydCBTZW5kTWFpbFNlcnZpY2UgPSByZXF1aXJlKFwiLi9zZW5kbWFpbC5zZXJ2aWNlXCIpO1xuaW1wb3J0IFJlY3J1aXRlck1vZGVsID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9yZWNydWl0ZXIubW9kZWwnKTtcbmltcG9ydCBSZWNydWl0ZXJDbGFzc01vZGVsID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9yZWNydWl0ZXJDbGFzcy5tb2RlbCcpO1xuaW1wb3J0IENhbmRpZGF0ZVNlcnZpY2UgPSByZXF1aXJlKCcuL2NhbmRpZGF0ZS5zZXJ2aWNlJyk7XG52YXIgYmNyeXB0ID0gcmVxdWlyZSgnYmNyeXB0Jyk7XG5cbmNsYXNzIFJlY3J1aXRlclNlcnZpY2Uge1xuICBBUFBfTkFNRTogc3RyaW5nO1xuICBwcml2YXRlIHJlY3J1aXRlclJlcG9zaXRvcnk6IFJlY3J1aXRlclJlcG9zaXRvcnk7XG4gIHByaXZhdGUgY2FuZGlkYXRlUmVwb3NpdG9yeTogQ2FuZGlkYXRlUmVwb3NpdG9yeTtcbiAgcHJpdmF0ZSB1c2VyUmVwb3NpdG9yeTogVXNlclJlcG9zaXRvcnk7XG4gIHByaXZhdGUgaW5kdXN0cnlSZXBvc2l0b3J5OiBJbmR1c3RyeVJlcG9zaXRvcnk7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5ID0gbmV3IFJlY3J1aXRlclJlcG9zaXRvcnkoKTtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5ID0gbmV3IFVzZXJSZXBvc2l0b3J5KCk7XG4gICAgdGhpcy5pbmR1c3RyeVJlcG9zaXRvcnkgPSBuZXcgSW5kdXN0cnlSZXBvc2l0b3J5KCk7XG4gICAgdGhpcy5jYW5kaWRhdGVSZXBvc2l0b3J5ID0gbmV3IENhbmRpZGF0ZVJlcG9zaXRvcnkoKTtcbiAgfVxuXG4gIGNyZWF0ZVVzZXIoaXRlbTogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5yZXRyaWV2ZSh7J2VtYWlsJzogaXRlbS5lbWFpbH0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoZXJyKSwgbnVsbCk7XG4gICAgICB9IGVsc2UgaWYgKHJlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGlmIChyZXNbMF0uaXNBY3RpdmF0ZWQgPT09IHRydWUpIHtcbiAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTiksIG51bGwpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc1swXS5pc0FjdGl2YXRlZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1ZFUklGWV9BQ0NPVU5UKSwgbnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGl0ZW0uaXNBY3RpdmF0ZWQgPSBmYWxzZTtcbiAgICAgICAgaXRlbS5pc0NhbmRpZGF0ZSA9IGZhbHNlO1xuICAgICAgICBjb25zdCBzYWx0Um91bmRzID0gMTA7XG4gICAgICAgIGJjcnlwdC5oYXNoKGl0ZW0ucGFzc3dvcmQsIHNhbHRSb3VuZHMsIChlcnI6IGFueSwgaGFzaDogYW55KSA9PiB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9CQ1JZUFRfQ1JFQVRJT04pLCBudWxsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXRlbS5wYXNzd29yZCA9IGhhc2g7XG4gICAgICAgICAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmNyZWF0ZShpdGVtLCAoZXJyLCByZXMpID0+IHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfUkVHSVNUUkFUSU9OX01PQklMRV9OVU1CRVIpLCBudWxsKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsZXQgdXNlcklkMSA9IHJlcy5faWQ7XG4gICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IGFueSA9IHtcbiAgICAgICAgICAgICAgICAgIGlzUmVjcnVpdGluZ0ZvcnNlbGY6IGl0ZW0uaXNSZWNydWl0aW5nRm9yc2VsZixcbiAgICAgICAgICAgICAgICAgIGNvbXBhbnlfbmFtZTogaXRlbS5jb21wYW55X25hbWUsXG4gICAgICAgICAgICAgICAgICBjb21wYW55X3NpemU6IGl0ZW0uY29tcGFueV9zaXplLFxuICAgICAgICAgICAgICAgICAgY29tcGFueV9sb2dvOiBpdGVtLmNvbXBhbnlfbG9nbyxcbiAgICAgICAgICAgICAgICAgIGNvbXBhbnlfd2Vic2l0ZTogaXRlbS5jb21wYW55X3dlYnNpdGUsXG4gICAgICAgICAgICAgICAgICB1c2VySWQ6IHVzZXJJZDFcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRoaXMucmVjcnVpdGVyUmVwb3NpdG9yeS5jcmVhdGUobmV3SXRlbSwgKGVycjogYW55LCByZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGZpbmRPbmVBbmRVcGRhdGUocXVlcnk6IGFueSwgbmV3RGF0YTogYW55LCBvcHRpb25zOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnJlY3J1aXRlclJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSwgb3B0aW9ucywgY2FsbGJhY2spO1xuICB9XG5cbiAgcmV0cmlldmUoZmllbGQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMucmVjcnVpdGVyUmVwb3NpdG9yeS5yZXRyaWV2ZShmaWVsZCwgKGVyciwgcmVzKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGxldCBlciA9IG5ldyBFcnJvcignVW5hYmxlIHRvIHJldHJpZXZlIHJlY3J1aXRlciBkZXRhaWxzLicpO1xuICAgICAgICBjYWxsYmFjayhlciwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgcmVjcnVpdGVyOiBSZWNydWl0ZXI7XG4gICAgICAgIHJlY3J1aXRlciA9IHJlc1swXTtcbiAgICAgICAgaWYgKHJlY3J1aXRlcikge1xuICAgICAgICAgIHJlY3J1aXRlci5qb2JDb3VudE1vZGVsID0gbmV3IEpvYkNvdW50TW9kZWwoKTtcbiAgICAgICAgICByZWNydWl0ZXIuam9iQ291bnRNb2RlbC5udW1iZXJPZkpvYnBvc3RlZCA9IHJlY3J1aXRlci5wb3N0ZWRKb2JzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBpZiAocmVjcnVpdGVyLnBvc3RlZEpvYnMpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGpvYiBvZiByZWNydWl0ZXIucG9zdGVkSm9icykge1xuICAgICAgICAgICAgICBmb3IgKGxldCBsaXN0IG9mIGpvYi5jYW5kaWRhdGVfbGlzdCkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobGlzdC5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICBjYXNlIENvbnN0VmFyaWFibGVzLkFQUExJRURfQ0FORElEQVRFIDpcbiAgICAgICAgICAgICAgICAgICAgcmVjcnVpdGVyLmpvYkNvdW50TW9kZWwudG90YWxOdW1iZXJPZkNhbmRpZGF0ZXNBcHBsaWVkICs9IGxpc3QuaWRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICBjYXNlIENvbnN0VmFyaWFibGVzLkNBUlRfTElTVEVEX0NBTkRJREFURSA6XG4gICAgICAgICAgICAgICAgICAgIHJlY3J1aXRlci5qb2JDb3VudE1vZGVsLnRvdGFsTnVtYmVyT2ZDYW5kaWRhdGVJbkNhcnQgKz0gbGlzdC5pZHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIGNhc2UgQ29uc3RWYXJpYWJsZXMuUkVKRUNURURfTElTVEVEX0NBTkRJREFURSA6XG4gICAgICAgICAgICAgICAgICAgIHJlY3J1aXRlci5qb2JDb3VudE1vZGVsLnRvdGFsTnVtYmVyT2ZDYW5kaWRhdGVzUmVqZWN0ZWQgKz0gbGlzdC5pZHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sobnVsbCwgW3JlY3J1aXRlcl0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgYWRkSm9iKF9pZDogc3RyaW5nLCBpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHsgLy9Ub2RvIGNoYW5nZSB3aXRoIGNhbmRpZGF0ZV9pZCBub3cgaXQgaXMgYSB1c2VyX2lkIG9wZXJhdGlvblxuICAgIHRoaXMucmVjcnVpdGVyUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHsndXNlcklkJzogbmV3IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkKF9pZCl9LFxuICAgICAgeyRwdXNoOiB7cG9zdGVkSm9iczogaXRlbS5wb3N0ZWRKb2JzfX0sXG4gICAgICB7XG4gICAgICAgICduZXcnOiB0cnVlLCBzZWxlY3Q6IHtcbiAgICAgICAgcG9zdGVkSm9iczoge1xuICAgICAgICAgICRlbGVtTWF0Y2g6IHsncG9zdGluZ0RhdGUnOiBpdGVtLnBvc3RlZEpvYnMucG9zdGluZ0RhdGV9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbiAoZXJyLCByZWNvcmQpIHtcbiAgICAgICAgaWYgKHJlY29yZCkge1xuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlY29yZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGVycm9yOiBhbnk7XG4gICAgICAgICAgaWYgKHJlY29yZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ1VuYWJsZSB0byB1cGRhdGUgcG9zdGVkIGpvYiBtYXliZSByZWNydWl0ZXIgbm90IGZvdW5kLiAnKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgYWRkQ2xvbmVKb2IoX2lkOiBzdHJpbmcsIGl0ZW06IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkgeyAvL1RvZG8gY2hhbmdlIHdpdGggY2FuZGlkYXRlX2lkIG5vdyBpdCBpcyBhIHVzZXJfaWQgb3BlcmF0aW9uXG4gICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUoeyd1c2VySWQnOiBuZXcgbW9uZ29vc2UuVHlwZXMuT2JqZWN0SWQoX2lkKX0sXG4gICAgICB7JHB1c2g6IHtwb3N0ZWRKb2JzOiBpdGVtfX0sXG4gICAgICB7XG4gICAgICAgICduZXcnOiB0cnVlLCBzZWxlY3Q6IHtcbiAgICAgICAgcG9zdGVkSm9iczoge1xuICAgICAgICAgICRlbGVtTWF0Y2g6IHsncG9zdGluZ0RhdGUnOiBpdGVtLnBvc3RpbmdEYXRlfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICB9LFxuICAgICAgZnVuY3Rpb24gKGVyciwgcmVjb3JkKSB7XG4gICAgICAgIGlmIChyZWNvcmQpIHtcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCByZWNvcmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxldCBlcnJvcjogYW55O1xuICAgICAgICAgIGlmIChyZWNvcmQgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKCdKb2IgY2xvbmluZyBpcyBmYWlsZWQnKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlSm9iKF9pZDogc3RyaW5nLCBpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHsgLy9Ub2RvIGNoYW5nZSB3aXRoIGNhbmRpZGF0ZV9pZCBub3cgaXQgaXMgYSB1c2VyX2lkIG9wZXJhdGlvblxuXG4gICAgbGV0IGNhcGFiaWxpdHlNYXRyaXhTZXJ2aWNlOiBDYXBhYmlsaXR5TWF0cml4U2VydmljZSA9IG5ldyBDYXBhYmlsaXR5TWF0cml4U2VydmljZSgpO1xuICAgIHRoaXMuaW5kdXN0cnlSZXBvc2l0b3J5LnJldHJpZXZlKHsnbmFtZSc6IGl0ZW0ucG9zdGVkSm9icy5pbmR1c3RyeS5uYW1lfSwgKGVycm9yOiBhbnksIGluZHVzdHJpZXM6IEluZHVzdHJ5TW9kZWxbXSkgPT4ge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpdGVtLnBvc3RlZEpvYnMuY2FwYWJpbGl0eV9tYXRyaXggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGl0ZW0ucG9zdGVkSm9icy5jYXBhYmlsaXR5X21hdHJpeCA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGxldCBuZXdfY2FwYWJpbGl0eV9tYXRyaXg6IGFueSA9IHt9O1xuICAgICAgICBpdGVtLnBvc3RlZEpvYnMuY2FwYWJpbGl0eV9tYXRyaXggPSBjYXBhYmlsaXR5TWF0cml4U2VydmljZS5nZXRDYXBhYmlsaXR5TWF0cml4KGl0ZW0ucG9zdGVkSm9icywgaW5kdXN0cmllcywgbmV3X2NhcGFiaWxpdHlfbWF0cml4KTtcbiAgICAgICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUoXG4gICAgICAgICAge1xuICAgICAgICAgICAgJ3VzZXJJZCc6IG5ldyBtb25nb29zZS5UeXBlcy5PYmplY3RJZChfaWQpLFxuICAgICAgICAgICAgJ3Bvc3RlZEpvYnMuX2lkJzogbmV3IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkKGl0ZW0ucG9zdGVkSm9icy5faWQpXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7JHNldDogeydwb3N0ZWRKb2JzLiQnOiBpdGVtLnBvc3RlZEpvYnN9fSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICAnbmV3JzogdHJ1ZSwgc2VsZWN0OiB7XG4gICAgICAgICAgICBwb3N0ZWRKb2JzOiB7XG4gICAgICAgICAgICAgICRlbGVtTWF0Y2g6IHsncG9zdGluZ0RhdGUnOiBpdGVtLnBvc3RlZEpvYnMucG9zdGluZ0RhdGV9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgZnVuY3Rpb24gKGVyciwgcmVjb3JkKSB7XG4gICAgICAgICAgICBpZiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlY29yZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBsZXQgZXJyb3I6IGFueTtcbiAgICAgICAgICAgICAgaWYgKHJlY29yZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKCdVbmFibGUgdG8gdXBkYXRlIHBvc3RlZCBqb2IgbWF5YmUgcmVjcnVpdGVyICYgam9iIHBvc3Qgbm90IGZvdW5kLiAnKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZmluZEJ5SWQoaWQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMucmVjcnVpdGVyUmVwb3NpdG9yeS5maW5kQnlJZChpZCwgY2FsbGJhY2spO1xuICB9XG5cbiAgZ2V0TGlzdChpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICBsZXQgcXVlcnkgPSB7XG4gICAgICAncG9zdGVkSm9icy5faWQnOiB7JGluOiBpdGVtLmlkc30sXG4gICAgfTtcbiAgICB0aGlzLnJlY3J1aXRlclJlcG9zaXRvcnkucmV0cmlldmUocXVlcnksIChlcnIsIHJlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5LmdldEpvYlByb2ZpbGVRQ2FyZChyZXMsIGl0ZW0uY2FuZGlkYXRlLCBpdGVtLmlkcywgJ25vbmUnLCAoY2FuRXJyb3IsIGNhblJlc3VsdCkgPT4ge1xuICAgICAgICAgIGlmIChjYW5FcnJvcikge1xuICAgICAgICAgICAgY2FsbGJhY2soY2FuRXJyb3IsIG51bGwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCBjYW5SZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB1cGRhdGVEZXRhaWxzKF9pZDogc3RyaW5nLCBpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcblxuICAgIHRoaXMucmVjcnVpdGVyUmVwb3NpdG9yeS5yZXRyaWV2ZSh7J3VzZXJJZCc6IG5ldyBtb25nb29zZS5UeXBlcy5PYmplY3RJZChfaWQpfSwgKGVyciwgcmVzKSA9PiB7XG5cbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyLCByZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUoeydfaWQnOiByZXNbMF0uX2lkfSwgaXRlbSwgeyduZXcnOiB0cnVlfSwgY2FsbGJhY2spO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZ2V0Q2FuZGlkYXRlTGlzdChpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICBsZXQgcXVlcnkgPSB7XG4gICAgICAncG9zdGVkSm9icyc6IHskZWxlbU1hdGNoOiB7J19pZCc6IG5ldyBtb25nb29zZS5UeXBlcy5PYmplY3RJZChpdGVtLmpvYlByb2ZpbGVJZCl9fVxuICAgIH07XG4gICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5LnJldHJpZXZlKHF1ZXJ5LCAoZXJyLCByZXMpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKCdOb3QgRm91bmQgQW55IEpvYiBwb3N0ZWQnKSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBsZXQgY2FuZGlkYXRlSWRzOiBzdHJpbmdbXSA9IG5ldyBBcnJheSgwKTtcbiAgICAgICAgICBsZXQgam9iUHJvZmlsZTogSm9iUHJvZmlsZU1vZGVsO1xuICAgICAgICAgIGZvciAobGV0IGpvYiBvZiByZXNbMF0ucG9zdGVkSm9icykge1xuICAgICAgICAgICAgaWYgKGpvYi5faWQudG9TdHJpbmcoKSA9PT0gaXRlbS5qb2JQcm9maWxlSWQpIHtcbiAgICAgICAgICAgICAgam9iUHJvZmlsZSA9IGpvYjtcbiAgICAgICAgICAgICAgZm9yIChsZXQgbGlzdCBvZiBqb2IuY2FuZGlkYXRlX2xpc3QpIHtcbiAgICAgICAgICAgICAgICBpZiAobGlzdC5uYW1lLnRvU3RyaW5nKCkgPT09IGl0ZW0ubGlzdE5hbWUudG9TdHJpbmcoKSkge1xuICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlSWRzID0gbGlzdC5pZHM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuY2FuZGlkYXRlUmVwb3NpdG9yeS5yZXRyaWV2ZUJ5TXVsdGlJZHMoY2FuZGlkYXRlSWRzLCB7fSwgKGVycjogYW55LCByZXM6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoJ0NhbmRpZGF0ZXMgYXJlIG5vdCBmb3VuZHMnKSwgbnVsbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLmNhbmRpZGF0ZVJlcG9zaXRvcnkuZ2V0Q2FuZGlkYXRlUUNhcmQocmVzLCBqb2JQcm9maWxlLCBjYW5kaWRhdGVJZHMsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZ2V0Sm9iQnlJZChpZDogc3RyaW5nLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogSm9iUHJvZmlsZU1vZGVsKSA9PiB2b2lkKSB7XG4gICAgbGV0IHF1ZXJ5ID0ge1xuICAgICAgJ3Bvc3RlZEpvYnMnOiB7JGVsZW1NYXRjaDogeydfaWQnOiBuZXcgbW9uZ29vc2UuVHlwZXMuT2JqZWN0SWQoaWQpfX1cbiAgICB9O1xuICAgIHRoaXMucmVjcnVpdGVyUmVwb3NpdG9yeS5yZXRyaWV2ZShxdWVyeSwgKGVycjogYW55LCByZXM6IFJlY3J1aXRlck1vZGVsW10pID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKCdQcm9ibGVtIGluIEpvYiBSZXRyaWV2ZScpLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldCBqb2JQcm9maWxlOiBKb2JQcm9maWxlTW9kZWw7XG4gICAgICAgIGlmIChyZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZvciAobGV0IGpvYiBvZiByZXNbMF0ucG9zdGVkSm9icykge1xuICAgICAgICAgICAgaWYgKGpvYi5faWQudG9TdHJpbmcoKSA9PT0gaWQpIHtcbiAgICAgICAgICAgICAgam9iUHJvZmlsZSA9IGpvYjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sobnVsbCwgam9iUHJvZmlsZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBsb2FkQ2FwYmlsaXR5QW5kS2V5U2tpbGxzKHBvc3RlZEpvYjogSm9iUHJvZmlsZU1vZGVsW10pIHtcbiAgICBsZXQgY2FuZGlkYXRlU2VydmljZSA9IG5ldyBDYW5kaWRhdGVTZXJ2aWNlKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb3N0ZWRKb2IubGVuZ3RoOyBpKyspIHtcbiAgICAgIHBvc3RlZEpvYltpXS5rZXlTa2lsbHMgPSBwb3N0ZWRKb2JbaV0ucHJvZmljaWVuY2llcy50b1N0cmluZygpLnJlcGxhY2UoLywvZywgJyAkJyk7XG4gICAgICBwb3N0ZWRKb2JbaV0uYWRkaXRpb25hbEtleVNraWxscyA9IHBvc3RlZEpvYltpXS5hZGRpdGlvbmFsUHJvZmljaWVuY2llcy50b1N0cmluZygpLnJlcGxhY2UoLywvZywgJyAkJyk7XG4gICAgICBwb3N0ZWRKb2JbaV0uY2FwYWJpbGl0eU1hdHJpeCA9IGNhbmRpZGF0ZVNlcnZpY2UubG9hZENhcGFiaWxpdGlEZXRhaWxzKHBvc3RlZEpvYltpXS5jYXBhYmlsaXR5X21hdHJpeCk7XG4gICAgfVxuICAgIHJldHVybiBwb3N0ZWRKb2I7XG4gIH1cblxuICByZXRyaWV2ZUJ5U29ydGVkT3JkZXIocXVlcnk6IGFueSwgcHJvamVjdGlvbjogYW55LCBzb3J0aW5nUXVlcnk6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMucmVjcnVpdGVyUmVwb3NpdG9yeS5yZXRyaWV2ZUJ5U29ydGVkT3JkZXIocXVlcnksIHByb2plY3Rpb24sIHNvcnRpbmdRdWVyeSwgY2FsbGJhY2spO1xuICB9XG5cbiAgcmV0cmlldmVXaXRoTGVhbihmaWVsZDogYW55LCBwcm9qZWN0aW9uOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICBjb25zb2xlLmxvZyhcImluc2lkZSByZWNydWl0ZXIgc2VydmljZVwiKTtcbiAgICB0aGlzLnJlY3J1aXRlclJlcG9zaXRvcnkucmV0cmlldmVXaXRoTGVhbihmaWVsZCwgcHJvamVjdGlvbiwgY2FsbGJhY2spO1xuICB9XG4gIHNlbmRNYWlsVG9BZHZpc29yKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB2YXIgaGVhZGVyMSA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL3B1YmxpYy9oZWFkZXIxLmh0bWwnKS50b1N0cmluZygpO1xuICAgIHZhciBmb290ZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvcHVibGljL2Zvb3RlcjEuaHRtbCcpLnRvU3RyaW5nKCk7XG4gICAgdmFyIG1haWxPcHRpb25zID0ge1xuICAgICAgdG86IGZpZWxkLmVtYWlsX2lkLFxuICAgICAgc3ViamVjdDogTWVzc2FnZXMuRU1BSUxfU1VCSkVDVF9SRUNSVUlURVJfQ09OVEFDVEVEX1lPVSxcbiAgICAgIGh0bWw6IGhlYWRlcjHigILigIIrIGZvb3RlcjEsIGF0dGFjaG1lbnRzOiBNYWlsQXR0YWNobWVudHMuQXR0YWNobWVudEFycmF5XG4gICAgfVxuICAgIHZhciBzZW5kTWFpbFNlcnZpY2UgPSBuZXcgU2VuZE1haWxTZXJ2aWNlKCk7XG4gICAgc2VuZE1haWxTZXJ2aWNlLnNlbmRNYWlsKG1haWxPcHRpb25zLCBjYWxsYmFjayk7XG5cbiAgfVxuXG4gIHNlbmRNYWlsVG9SZWNydWl0ZXIodXNlcjphbnksZmllbGQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHZhciBoZWFkZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvaGVhZGVyMS5odG1sJykudG9TdHJpbmcoKTtcbiAgICB2YXIgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL2NvbmZpcm1hdGlvbi5tYWlsLmh0bWwnKS50b1N0cmluZygpO1xuICAgIHZhciBmb290ZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvZm9vdGVyMS5odG1sJykudG9TdHJpbmcoKTtcbiAgICBjb250ZW50PWNvbnRlbnQucmVwbGFjZSgnJGpvYl90aXRsZSQnLCBmaWVsZC5qb2JUaXRsZSk7XG4gICAgdmFyIG1haWxPcHRpb25zID0ge1xuICAgICAgdG86IHVzZXIuZW1haWwsXG4gICAgICBzdWJqZWN0OiBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX1JFQ1JVSVRFUl9DT05UQUNURURfWU9VK2ZpZWxkLmpvYlRpdGxlLFxuICAgICAgaHRtbDogaGVhZGVyMStjb250ZW50KyBmb290ZXIxLCBhdHRhY2htZW50czogTWFpbEF0dGFjaG1lbnRzLkF0dGFjaG1lbnRBcnJheVxuICAgIH1cbiAgICB2YXIgc2VuZE1haWxTZXJ2aWNlID0gbmV3IFNlbmRNYWlsU2VydmljZSgpO1xuICAgIHNlbmRNYWlsU2VydmljZS5zZW5kTWFpbChtYWlsT3B0aW9ucywgY2FsbGJhY2spO1xuICB9XG5cbn1cblxuT2JqZWN0LnNlYWwoUmVjcnVpdGVyU2VydmljZSk7XG5leHBvcnQgPSBSZWNydWl0ZXJTZXJ2aWNlO1xuIl19
