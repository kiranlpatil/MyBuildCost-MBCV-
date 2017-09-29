"use strict";
var UserRepository = require("../dataaccess/repository/user.repository");
var SendMailService = require("./sendmail.service");
var mongoose = require("mongoose");
var sharedconstants_1 = require("../shared/sharedconstants");
var config = require('config');
var json2csv = require('json2csv');
var fs = require('fs');
var Messages = require("../shared/messages");
var MailAttachments = require("../shared/sharedarray");
var RecruiterRepository = require("../dataaccess/repository/recruiter.repository");
var UsersClassModel = require("../dataaccess/model/users");
var CandidateService = require("./candidate.service");
var RecruiterService = require("./recruiter.service");
var IndustryRepository = require("../dataaccess/repository/industry.repository");
var UserService = require("./user.service");
var usestracking = require('uses-tracking');
var AdminService = (function () {
    function AdminService() {
        this.userRepository = new UserRepository();
        this.industryRepositiry = new IndustryRepository();
        this.recruiterRepository = new RecruiterRepository();
        var obj = new usestracking.MyController();
        this.usesTrackingController = obj._controller;
    }
    AdminService.prototype.getUserDetails = function (userType, callback) {
        try {
            var userService = new UserService();
            var candidateService_1 = new CandidateService();
            var recruiterService_1 = new RecruiterService();
            var users_1 = new UsersClassModel();
            var findQuery = new Object();
            if (userType == 'candidate') {
                findQuery = { 'isCandidate': true };
            }
            else {
                findQuery = { 'isCandidate': false };
            }
            var included_fields = {
                '_id': 1,
                'first_name': 1,
                'last_name': 1,
                'mobile_number': 1,
                'email': 1,
                'isCandidate': 1,
                'isAdmin': 1,
                'isActivated': 1
            };
            var sortingQuery = { 'first_name': 1, 'last_name': 1 };
            userService.retrieveBySortedOrder(findQuery, included_fields, sortingQuery, function (error, result) {
                if (error) {
                    callback(error, null);
                }
                else {
                    if (result.length == 0) {
                        callback(null, users_1);
                    }
                    else {
                        var value_1 = 0;
                        if (userType == 'candidate') {
                            var candidates_1 = new Array(0);
                            var candidateFields = {
                                '_id': 1,
                                'jobTitle': 1,
                                'isCompleted': 1,
                                'isSubmitted': 1,
                                'location': 1,
                                'proficiencies': 1,
                                'professionalDetails': 1,
                                'capability_matrix': 1,
                                'isVisible': 1,
                                'industry.name': 1
                            };
                            var _loop_1 = function (i) {
                                if (result[i].isCandidate) {
                                    candidateService_1.retrieveWithLean({ 'userId': new mongoose.Types.ObjectId(result[i]._id) }, candidateFields, function (error, resu) {
                                        if (error) {
                                            callback(error, null);
                                        }
                                        else {
                                            value_1++;
                                            if (!result[i].isAdmin) {
                                                resu[0].keySkills = resu[0].proficiencies.toString().replace(/,/g, ' $');
                                                resu[0].capabilityMatrix = candidateService_1.loadCapabilitiDetails(resu[0].capability_matrix);
                                                result[i].data = resu[0];
                                                candidates_1.push(result[i]);
                                                if (value_1 && result.length === value_1) {
                                                    users_1.candidate = candidates_1;
                                                    console.log("fetch all records" + value_1);
                                                    callback(null, users_1);
                                                }
                                            }
                                        }
                                    });
                                }
                            };
                            for (var i = 0; i < result.length; i++) {
                                _loop_1(i);
                            }
                        }
                        else {
                            console.log("inside recruiter fetch");
                            var recruiters_1 = new Array(0);
                            var findQuery_1 = {};
                            var recruiterFields = {
                                '_id': 1,
                                'company_name': 1,
                                'company_size': 1,
                                'isRecruitingForself': 1,
                                'postedJobs': 1
                            };
                            var sortingQuery_1 = { 'company_name': 1, 'company_size': 1 };
                            var _loop_2 = function (i) {
                                if (!result[i].isCandidate) {
                                    recruiterService_1.retrieveWithLean({ 'userId': new mongoose.Types.ObjectId(result[i]._id) }, recruiterFields, function (error, resu) {
                                        if (error) {
                                            callback(error, null);
                                        }
                                        else {
                                            value_1++;
                                            if (!result[i].isAdmin) {
                                                resu[0].numberOfJobsPosted = resu[0].postedJobs.length;
                                                recruiterService_1.loadCapbilityAndKeySkills(resu[0].postedJobs);
                                                result[i].data = resu[0];
                                                recruiters_1.push(result[i]);
                                                if (value_1 && result.length === value_1) {
                                                    users_1.recruiter = recruiters_1;
                                                    console.log("fetch all records" + value_1);
                                                    callback(null, users_1);
                                                }
                                            }
                                        }
                                    });
                                }
                            };
                            for (var i = 0; i < result.length; i++) {
                                _loop_2(i);
                            }
                        }
                    }
                }
            });
        }
        catch (e) {
            callback(e, null);
        }
    };
    ;
    AdminService.prototype.getRecruiterDetails = function (initial, callback) {
        try {
            var userService_1 = new UserService();
            var recruiterService = new RecruiterService();
            var users_2 = new UsersClassModel();
            var recruiters_2 = new Array(0);
            var regEx = new RegExp('^[' + initial.toLowerCase() + initial.toUpperCase() + ']');
            var findQuery = {
                'company_name': {
                    $regex: regEx
                }
            };
            var sortingQuery = { 'company_name': 1, 'company_size': 1 };
            var recruiterFields = {
                '_id': 1,
                'userId': 1,
                'company_name': 1,
                'company_size': 1,
                'isRecruitingForself': 1,
                'postedJobs': 1
            };
            recruiterService.retrieveBySortedOrder(findQuery, recruiterFields, sortingQuery, function (error, result) {
                if (error) {
                    callback(error, null);
                }
                else {
                    if (result.length == 0) {
                        callback(null, users_2);
                    }
                    else {
                        var value_2 = 0;
                        var _loop_3 = function (i) {
                            userService_1.retrieveWithLean({ '_id': new mongoose.Types.ObjectId(result[i].userId) }, function (error, resu) {
                                if (error) {
                                    callback(error, null);
                                }
                                else {
                                    console.log("inside else");
                                    value_2++;
                                    resu[0].data = result[i];
                                    recruiters_2.push(resu[0]);
                                    if (value_2 && result.length == value_2) {
                                        users_2.recruiter = recruiters_2;
                                        callback(null, users_2);
                                    }
                                }
                            });
                        };
                        for (var i = 0; i < result.length; i++) {
                            _loop_3(i);
                        }
                    }
                }
            });
        }
        catch (e) {
            callback(e, null);
        }
    };
    AdminService.prototype.getCandidateDetails = function (initial, callback) {
        try {
            var userService = new UserService();
            var candidateService_2 = new CandidateService();
            var users_3 = new UsersClassModel();
            var candidates_2 = new Array(0);
            var regEx = new RegExp('^' + initial);
            var findQuery = {
                'first_name': {
                    $regex: regEx
                }
            };
            var included_fields = {
                '_id': 1,
                'first_name': 1,
                'last_name': 1,
                'mobile_number': 1,
                'email': 1,
                'isCandidate': 1,
                'isAdmin': 1,
                'isActivated': 1
            };
            var sortingQuery = { 'first_name': 1, 'last_name': 1 };
            userService.retrieveBySortedOrder(findQuery, included_fields, sortingQuery, function (error, result) {
                if (error) {
                    callback(error, null);
                }
                else {
                    if (result.length == 0) {
                        callback(null, users_3);
                    }
                    else {
                        var value_3 = 0;
                        var candidateFields = {
                            '_id': 1,
                            'jobTitle': 1,
                            'isCompleted': 1,
                            'isSubmitted': 1,
                            'location': 1
                        };
                        var _loop_4 = function (i) {
                            if (result[i].isCandidate) {
                                candidateService_2.retrieveWithLean({ 'userId': new mongoose.Types.ObjectId(result[i]._id) }, candidateFields, function (error, resu) {
                                    if (error) {
                                        callback(error, null);
                                    }
                                    else {
                                        value_3++;
                                        if (!result[i].isAdmin) {
                                            result[i].data = resu[0];
                                            candidates_2.push(result[i]);
                                            if (value_3 && result.length === value_3) {
                                                users_3.candidate = candidates_2;
                                                callback(null, users_3);
                                            }
                                        }
                                    }
                                });
                            }
                        };
                        for (var i = 0; i < result.length; i++) {
                            _loop_4(i);
                        }
                    }
                }
            });
        }
        catch (e) {
            callback(e, null);
        }
    };
    AdminService.prototype.addUsageDetailsValue = function (item, callback) {
        try {
            var value = 0;
            for (var i = 0; i < item.length; i++) {
                value++;
                item[i].action = sharedconstants_1.ConstVariables.ActionsArray[item[i].action];
                if (item.length === value) {
                    callback(null, item);
                }
            }
        }
        catch (e) {
            callback(e, null);
        }
    };
    ;
    AdminService.prototype.generateUsageDetailFile = function (result, callback) {
        if (result && result.length > 0) {
            var fields = ['candidateId', 'recruiterId', 'jobProfileId', 'action', 'timestamp'];
            var fieldNames = ['Candidate Id', 'RecruiterId', 'Job Profile Id', 'Action', 'TimeStamp'];
            var csv = json2csv({ data: result, fields: fields, fieldNames: fieldNames });
            fs.writeFile('/home/bitnami/apps/jobmosis-staging/c-next/dist/prod/server/public/usagedetail.csv', csv, function (err) {
                if (err)
                    throw err;
                callback(null, result);
            });
        }
        else {
            callback(null, result);
        }
    };
    ;
    AdminService.prototype.generateCandidateDetailFile = function (result, callback) {
        console.log("inside generate file");
        if (result.candidate && result.candidate.length > 0) {
            var fields = ['first_name', 'last_name', 'mobile_number', 'email', 'isActivated', 'data.location.city',
                'data.professionalDetails.education', 'data.professionalDetails.experience',
                'data.professionalDetails.currentSalary', 'data.professionalDetails.noticePeriod',
                'data.professionalDetails.relocate', 'data.professionalDetails.industryExposure',
                'data.professionalDetails.currentCompany', 'data.isCompleted', 'data.isSubmitted', 'data.isVisible',
                'data.industry.name', 'data.keySkills', 'data.capabilityMatrix.capabilityCode',
                'data.capabilityMatrix.complexityCode', 'data.capabilityMatrix.scenerioCode'];
            var fieldNames = ['First Name', 'Last Name', 'Mobile Number', 'Email', 'Is Activated', 'City', 'Education',
                'Experience', 'Current Salary', 'Notice Period', 'Ready To Relocate', 'Industry Exposure', 'Current Company',
                'Is Completed', 'Is Submitted', 'Is Visible', 'Industry Name', 'Key Skills', 'Capability Code',
                'Complexity Code', 'Scenario Code'];
            var csv = json2csv({
                data: result.candidate, fields: fields, fieldNames: fieldNames,
                unwindPath: ['data.capabilityMatrix']
            });
            console.log("writing into file file");
            fs.writeFile('/home/bitnami/apps/jobmosis-staging/c-next/dist/prod/server/public/candidate.csv', csv, function (err) {
                if (err)
                    throw err;
                callback(null, result);
            });
        }
        else {
            callback(null, result);
        }
    };
    ;
    AdminService.prototype.generateRecruiterDetailFile = function (result, callback) {
        console.log("inside generate file");
        if (result.recruiter && result.recruiter.length > 0) {
            var fields = ['data.company_name', 'data.company_size', 'data.isRecruitingForself',
                'data.numberOfJobsPosted', 'mobile_number', 'email', 'isActivated', 'data.postedJobs.isJobPosted',
                'data.postedJobs.jobTitle', 'data.postedJobs.hiringManager', 'data.postedJobs.department',
                'data.postedJobs.education', 'data.postedJobs.experienceMinValue', 'data.postedJobs.experienceMaxValue',
                'data.postedJobs.salaryMinValue', 'data.postedJobs.salaryMaxValue', 'data.postedJobs.joiningPeriod',
                'data.postedJobs.keySkills', 'data.postedJobs.additionalKeySkills', 'data.postedJobs.capabilityMatrix.capabilityCode',
                'data.postedJobs.capabilityMatrix.complexityCode', 'data.postedJobs.capabilityMatrix.scenerioCode',
                'data.postedJobs.postingDate', 'data.postedJobs.expiringDate'];
            var fieldNames = ['Company Name', 'company size', 'Recruiting For Self', 'Number of Job Posted', 'Mobile Number',
                'Email', 'Is Activated', 'Is Job Posted', 'Job Title', 'Hiring Manager', 'Department', 'Education',
                'Experience MinValue', 'Experience MaxValue', 'Salary MinValue', 'Salary MaxValue', 'Joining Period',
                'Key Skills', 'Additional Key Skills', 'Capability Code',
                'Complexity Code', 'Scenario Code', 'Posting Date', 'Expiring Date'];
            var csv = json2csv({
                data: result.recruiter,
                fields: fields,
                fieldNames: fieldNames,
                unwindPath: ['data.postedJobs', 'data.postedJobs.capabilityMatrix']
            });
            fs.writeFile('/home/bitnami/apps/jobmosis-staging/c-next/dist/prod/server/public/recruiter.csv', csv, function (err) {
                if (err)
                    throw err;
                callback(null, result);
            });
        }
        else {
            callback(null, result);
        }
    };
    ;
    AdminService.prototype.sendAdminLoginInfoMail = function (field, callback) {
        var header1 = fs.readFileSync('./src/server/app/framework/public/header1.html').toString();
        var content = fs.readFileSync('./src/server/app/framework/public/adminlogininfo.mail.html').toString();
        var footer1 = fs.readFileSync('./src/server/app/framework/public/footer1.html').toString();
        var mid_content = content.replace('$email$', field.email).replace('$address$', (field.location === undefined) ? 'Not Found' : field.location)
            .replace('$ip$', field.ip).replace('$host$', config.get('TplSeed.mail.host'));
        var mailOptions = {
            from: config.get('TplSeed.mail.MAIL_SENDER'),
            to: config.get('TplSeed.mail.ADMIN_MAIL'),
            cc: config.get('TplSeed.mail.TPLGROUP_MAIL'),
            subject: Messages.EMAIL_SUBJECT_ADMIN_LOGGED_ON + " " + config.get('TplSeed.mail.host'),
            html: header1 + mid_content + footer1,
            attachments: MailAttachments.AttachmentArray
        };
        var sendMailService = new SendMailService();
        sendMailService.sendMail(mailOptions, callback);
    };
    ;
    AdminService.prototype.updateUser = function (_id, item, callback) {
        var _this = this;
        this.userRepository.findById(_id, function (err, res) {
            if (err) {
                callback(err, res);
            }
            else {
                _this.userRepository.update(res._id, item, callback);
            }
        });
    };
    ;
    AdminService.prototype.getUsageDetails = function (field, callback) {
        this.usesTrackingController.retrieveAll(function (err, res) {
            if (err) {
                callback(err, null);
            }
            else {
                callback(null, res);
            }
        });
    };
    return AdminService;
}());
Object.seal(AdminService);
module.exports = AdminService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvc2VydmljZXMvYWRtaW4uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBR0EseUVBQTRFO0FBQzVFLG9EQUF1RDtBQUN2RCxtQ0FBcUM7QUFDckMsNkRBQXlEO0FBQ3pELElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkMsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZCLDZDQUFnRDtBQUNoRCx1REFBMEQ7QUFDMUQsbUZBQXNGO0FBQ3RGLDJEQUE4RDtBQUM5RCxzREFBeUQ7QUFDekQsc0RBQXlEO0FBRXpELGlGQUFvRjtBQUlwRiw0Q0FBK0M7QUFDL0MsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRTVDO0lBUUU7UUFDRSxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztRQUNuRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQ3JELElBQUksR0FBRyxHQUFRLElBQUksWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQy9DLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDO0lBQ2hELENBQUM7SUFFRCxxQ0FBYyxHQUFkLFVBQWUsUUFBZ0IsRUFBRSxRQUF1RDtRQUN0RixJQUFJLENBQUM7WUFDSCxJQUFJLFdBQVcsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLElBQUksa0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlDLElBQUksa0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlDLElBQUksT0FBSyxHQUFv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RUwsQ0FBQztJQUNILG1CQUFDO0FBQUQsQ0FyWkEsQUFxWkMsSUFBQTtBQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDMUIsaUJBQVMsWUFBWSxDQUFDIiwiZmlsZSI6ImFwcC9mcmFtZXdvcmsvc2VydmljZXMvYWRtaW4uc2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ3JlYXRlZCBieSB0ZWNocHJpbWUwMDIgb24gOC8yOC8yMDE3LlxuICovXG5pbXBvcnQgVXNlclJlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvdXNlci5yZXBvc2l0b3J5Jyk7XG5pbXBvcnQgU2VuZE1haWxTZXJ2aWNlID0gcmVxdWlyZSgnLi9zZW5kbWFpbC5zZXJ2aWNlJyk7XG5pbXBvcnQgKiBhcyBtb25nb29zZSBmcm9tIFwibW9uZ29vc2VcIjtcbmltcG9ydCB7Q29uc3RWYXJpYWJsZXN9IGZyb20gXCIuLi9zaGFyZWQvc2hhcmVkY29uc3RhbnRzXCI7XG5sZXQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XG5sZXQganNvbjJjc3YgPSByZXF1aXJlKCdqc29uMmNzdicpO1xubGV0IGZzID0gcmVxdWlyZSgnZnMnKTtcbmltcG9ydCBNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL3NoYXJlZC9tZXNzYWdlcycpO1xuaW1wb3J0IE1haWxBdHRhY2htZW50cyA9IHJlcXVpcmUoJy4uL3NoYXJlZC9zaGFyZWRhcnJheScpO1xuaW1wb3J0IFJlY3J1aXRlclJlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvcmVjcnVpdGVyLnJlcG9zaXRvcnknKTtcbmltcG9ydCBVc2Vyc0NsYXNzTW9kZWwgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3VzZXJzJyk7XG5pbXBvcnQgQ2FuZGlkYXRlU2VydmljZSA9IHJlcXVpcmUoJy4vY2FuZGlkYXRlLnNlcnZpY2UnKTtcbmltcG9ydCBSZWNydWl0ZXJTZXJ2aWNlID0gcmVxdWlyZSgnLi9yZWNydWl0ZXIuc2VydmljZScpO1xuaW1wb3J0IEluZHVzdHJ5TW9kZWwgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL2luZHVzdHJ5Lm1vZGVsJyk7XG5pbXBvcnQgSW5kdXN0cnlSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L2luZHVzdHJ5LnJlcG9zaXRvcnknKTtcbmltcG9ydCBDYW5kaWRhdGVNb2RlbENsYXNzID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9jYW5kaWRhdGVDbGFzcy5tb2RlbCcpO1xuaW1wb3J0IFJlY3J1aXRlckNsYXNzTW9kZWwgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3JlY3J1aXRlckNsYXNzLm1vZGVsJyk7XG5pbXBvcnQgQ2FuZGlkYXRlQ2xhc3NNb2RlbCA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvY2FuZGlkYXRlLWNsYXNzLm1vZGVsJyk7XG5pbXBvcnQgVXNlclNlcnZpY2UgPSByZXF1aXJlKFwiLi91c2VyLnNlcnZpY2VcIik7XG5sZXQgdXNlc3RyYWNraW5nID0gcmVxdWlyZSgndXNlcy10cmFja2luZycpO1xuXG5jbGFzcyBBZG1pblNlcnZpY2Uge1xuICBjb21wYW55X25hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSB1c2VyUmVwb3NpdG9yeTogVXNlclJlcG9zaXRvcnk7XG4gIHByaXZhdGUgaW5kdXN0cnlSZXBvc2l0aXJ5OiBJbmR1c3RyeVJlcG9zaXRvcnk7XG4gIHByaXZhdGUgcmVjcnVpdGVyUmVwb3NpdG9yeTogUmVjcnVpdGVyUmVwb3NpdG9yeTtcbiAgcHJpdmF0ZSB1c2VzVHJhY2tpbmdDb250cm9sbGVyOiBhbnk7XG5cblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5ID0gbmV3IFVzZXJSZXBvc2l0b3J5KCk7XG4gICAgdGhpcy5pbmR1c3RyeVJlcG9zaXRpcnkgPSBuZXcgSW5kdXN0cnlSZXBvc2l0b3J5KCk7XG4gICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5ID0gbmV3IFJlY3J1aXRlclJlcG9zaXRvcnkoKTtcbiAgICBsZXQgb2JqOiBhbnkgPSBuZXcgdXNlc3RyYWNraW5nLk15Q29udHJvbGxlcigpO1xuICAgIHRoaXMudXNlc1RyYWNraW5nQ29udHJvbGxlciA9IG9iai5fY29udHJvbGxlcjtcbiAgfVxuXG4gIGdldFVzZXJEZXRhaWxzKHVzZXJUeXBlOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBVc2Vyc0NsYXNzTW9kZWwpID0+IHZvaWQpIHtcbiAgICB0cnkge1xuICAgICAgbGV0IHVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XG4gICAgICBsZXQgY2FuZGlkYXRlU2VydmljZSA9IG5ldyBDYW5kaWRhdGVTZXJ2aWNlKCk7XG4gICAgICBsZXQgcmVjcnVpdGVyU2VydmljZSA9IG5ldyBSZWNydWl0ZXJTZXJ2aWNlKCk7XG4gICAgICBsZXQgdXNlcnM6IFVzZXJzQ2xhc3NNb2RlbCA9IG5ldyBVc2Vyc0NsYXNzTW9kZWwoKTtcbiAgICAgIGxldCBmaW5kUXVlcnkgPSBuZXcgT2JqZWN0KCk7XG5cbiAgICAgIGlmICh1c2VyVHlwZSA9PSAnY2FuZGlkYXRlJykge1xuICAgICAgICBmaW5kUXVlcnkgPSB7J2lzQ2FuZGlkYXRlJzogdHJ1ZX07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmaW5kUXVlcnkgPSB7J2lzQ2FuZGlkYXRlJzogZmFsc2V9O1xuICAgICAgfVxuXG4gICAgICBsZXQgaW5jbHVkZWRfZmllbGRzID0ge1xuICAgICAgICAnX2lkJzogMSxcbiAgICAgICAgJ2ZpcnN0X25hbWUnOiAxLFxuICAgICAgICAnbGFzdF9uYW1lJzogMSxcbiAgICAgICAgJ21vYmlsZV9udW1iZXInOiAxLFxuICAgICAgICAnZW1haWwnOiAxLFxuICAgICAgICAnaXNDYW5kaWRhdGUnOiAxLFxuICAgICAgICAnaXNBZG1pbic6IDEsXG4gICAgICAgICdpc0FjdGl2YXRlZCc6IDFcbiAgICAgIH07XG4gICAgICBsZXQgc29ydGluZ1F1ZXJ5ID0geydmaXJzdF9uYW1lJzogMSwgJ2xhc3RfbmFtZSc6IDF9O1xuXG4gICAgICB1c2VyU2VydmljZS5yZXRyaWV2ZUJ5U29ydGVkT3JkZXIoZmluZFF1ZXJ5LCBpbmNsdWRlZF9maWVsZHMsIHNvcnRpbmdRdWVyeSwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHVzZXJzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBsZXQgdmFsdWUgPSAwO1xuICAgICAgICAgICAgaWYgKHVzZXJUeXBlID09ICdjYW5kaWRhdGUnKSB7XG4gICAgICAgICAgICAgIGxldCBjYW5kaWRhdGVzOiBDYW5kaWRhdGVNb2RlbENsYXNzW10gPSBuZXcgQXJyYXkoMCk7XG4gICAgICAgICAgICAgIGxldCBjYW5kaWRhdGVGaWVsZHMgPSB7XG4gICAgICAgICAgICAgICAgJ19pZCc6IDEsXG4gICAgICAgICAgICAgICAgJ2pvYlRpdGxlJzogMSxcbiAgICAgICAgICAgICAgICAnaXNDb21wbGV0ZWQnOiAxLFxuICAgICAgICAgICAgICAgICdpc1N1Ym1pdHRlZCc6IDEsXG4gICAgICAgICAgICAgICAgJ2xvY2F0aW9uJzogMSxcbiAgICAgICAgICAgICAgICAncHJvZmljaWVuY2llcyc6IDEsXG4gICAgICAgICAgICAgICAgJ3Byb2Zlc3Npb25hbERldGFpbHMnOiAxLFxuICAgICAgICAgICAgICAgICdjYXBhYmlsaXR5X21hdHJpeCc6IDEsXG4gICAgICAgICAgICAgICAgJ2lzVmlzaWJsZSc6IDEsXG4gICAgICAgICAgICAgICAgJ2luZHVzdHJ5Lm5hbWUnOiAxXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVzdWx0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdFtpXS5pc0NhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlU2VydmljZS5yZXRyaWV2ZVdpdGhMZWFuKHsndXNlcklkJzogbmV3IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkKHJlc3VsdFtpXS5faWQpfSwgY2FuZGlkYXRlRmllbGRzLCAoZXJyb3IsIHJlc3UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlKys7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHRbaV0uaXNBZG1pbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdVswXS5rZXlTa2lsbHMgPSByZXN1WzBdLnByb2ZpY2llbmNpZXMudG9TdHJpbmcoKS5yZXBsYWNlKC8sL2csICcgJCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdVswXS5jYXBhYmlsaXR5TWF0cml4ID0gY2FuZGlkYXRlU2VydmljZS5sb2FkQ2FwYWJpbGl0aURldGFpbHMocmVzdVswXS5jYXBhYmlsaXR5X21hdHJpeCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbaV0uZGF0YSA9IHJlc3VbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVzLnB1c2gocmVzdWx0W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAmJiByZXN1bHQubGVuZ3RoID09PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB1c2Vycy5jYW5kaWRhdGUgPSBjYW5kaWRhdGVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImZldGNoIGFsbCByZWNvcmRzXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHVzZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJpbnNpZGUgcmVjcnVpdGVyIGZldGNoXCIpO1xuICAgICAgICAgICAgICBsZXQgcmVjcnVpdGVyczogUmVjcnVpdGVyQ2xhc3NNb2RlbFtdID0gbmV3IEFycmF5KDApO1xuICAgICAgICAgICAgICBsZXQgZmluZFF1ZXJ5ID0ge307XG4gICAgICAgICAgICAgIGxldCByZWNydWl0ZXJGaWVsZHMgPSB7XG4gICAgICAgICAgICAgICAgJ19pZCc6IDEsXG4gICAgICAgICAgICAgICAgJ2NvbXBhbnlfbmFtZSc6IDEsXG4gICAgICAgICAgICAgICAgJ2NvbXBhbnlfc2l6ZSc6IDEsXG4gICAgICAgICAgICAgICAgJ2lzUmVjcnVpdGluZ0ZvcnNlbGYnOiAxLFxuICAgICAgICAgICAgICAgICdwb3N0ZWRKb2JzJzogMVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBsZXQgc29ydGluZ1F1ZXJ5ID0geydjb21wYW55X25hbWUnOiAxLCAnY29tcGFueV9zaXplJzogMX07XG5cbiAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZXN1bHQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdFtpXS5pc0NhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgcmVjcnVpdGVyU2VydmljZS5yZXRyaWV2ZVdpdGhMZWFuKHsndXNlcklkJzogbmV3IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkKHJlc3VsdFtpXS5faWQpfSwgcmVjcnVpdGVyRmllbGRzLCAoZXJyb3IsIHJlc3UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlKys7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHRbaV0uaXNBZG1pbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdVswXS5udW1iZXJPZkpvYnNQb3N0ZWQgPSByZXN1WzBdLnBvc3RlZEpvYnMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9yZXN1WzBdLnBvc3RlZF9qb2JzID0gcmVjcnVpdGVyU2VydmljZS5sb2FkQ2FwYmlsaXR5QW5kS2V5U2tpbGxzKHJlc3VbMF0ucG9zdGVkSm9icyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWNydWl0ZXJTZXJ2aWNlLmxvYWRDYXBiaWxpdHlBbmRLZXlTa2lsbHMocmVzdVswXS5wb3N0ZWRKb2JzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtpXS5kYXRhID0gcmVzdVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY3J1aXRlcnMucHVzaChyZXN1bHRbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlICYmIHJlc3VsdC5sZW5ndGggPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJzLnJlY3J1aXRlciA9IHJlY3J1aXRlcnM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZmV0Y2ggYWxsIHJlY29yZHNcIiArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgdXNlcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gY2F0Y2hcbiAgICAgIChlKSB7XG4gICAgICBjYWxsYmFjayhlLCBudWxsKTtcbiAgICB9XG4gIH07XG5cbiAgZ2V0UmVjcnVpdGVyRGV0YWlscyhpbml0aWFsOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0cnkge1xuICAgICAgbGV0IHVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XG4gICAgICBsZXQgcmVjcnVpdGVyU2VydmljZSA9IG5ldyBSZWNydWl0ZXJTZXJ2aWNlKCk7XG4gICAgICBsZXQgdXNlcnM6IFVzZXJzQ2xhc3NNb2RlbCA9IG5ldyBVc2Vyc0NsYXNzTW9kZWwoKTtcbiAgICAgIGxldCByZWNydWl0ZXJzOiBSZWNydWl0ZXJDbGFzc01vZGVsW10gPSBuZXcgQXJyYXkoMCk7XG5cbiAgICAgIGxldCByZWdFeCA9IG5ldyBSZWdFeHAoJ15bJyArIGluaXRpYWwudG9Mb3dlckNhc2UoKSArIGluaXRpYWwudG9VcHBlckNhc2UoKSArICddJyk7XG4gICAgICBsZXQgZmluZFF1ZXJ5ID0ge1xuICAgICAgICAnY29tcGFueV9uYW1lJzoge1xuICAgICAgICAgICRyZWdleDogcmVnRXhcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGV0IHNvcnRpbmdRdWVyeSA9IHsnY29tcGFueV9uYW1lJzogMSwgJ2NvbXBhbnlfc2l6ZSc6IDF9O1xuXG4gICAgICBsZXQgcmVjcnVpdGVyRmllbGRzID0ge1xuICAgICAgICAnX2lkJzogMSxcbiAgICAgICAgJ3VzZXJJZCc6IDEsXG4gICAgICAgICdjb21wYW55X25hbWUnOiAxLFxuICAgICAgICAnY29tcGFueV9zaXplJzogMSxcbiAgICAgICAgJ2lzUmVjcnVpdGluZ0ZvcnNlbGYnOiAxLFxuICAgICAgICAncG9zdGVkSm9icyc6IDFcbiAgICAgIH07XG5cbiAgICAgIHJlY3J1aXRlclNlcnZpY2UucmV0cmlldmVCeVNvcnRlZE9yZGVyKGZpbmRRdWVyeSwgcmVjcnVpdGVyRmllbGRzLCBzb3J0aW5nUXVlcnksIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB1c2Vycyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IHZhbHVlID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVzdWx0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgIHVzZXJTZXJ2aWNlLnJldHJpZXZlV2l0aExlYW4oeydfaWQnOiBuZXcgbW9uZ29vc2UuVHlwZXMuT2JqZWN0SWQocmVzdWx0W2ldLnVzZXJJZCl9LCAoZXJyb3IsIHJlc3UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJpbnNpZGUgZWxzZVwiKTtcbiAgICAgICAgICAgICAgICAgIHZhbHVlKys7XG4gICAgICAgICAgICAgICAgICByZXN1WzBdLmRhdGEgPSByZXN1bHRbaV07XG4gICAgICAgICAgICAgICAgICByZWNydWl0ZXJzLnB1c2gocmVzdVswXSk7XG4gICAgICAgICAgICAgICAgICBpZiAodmFsdWUgJiYgcmVzdWx0Lmxlbmd0aCA9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB1c2Vycy5yZWNydWl0ZXIgPSByZWNydWl0ZXJzO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB1c2Vycyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBjYXRjaFxuICAgICAgKGUpIHtcbiAgICAgIGNhbGxiYWNrKGUsIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIC8qcHJpdmF0ZSBnZXRSZWNydWl0ZXJEZXRhaWxzKHJlc3VsdDogUmVjcnVpdGVyW10sIGluZHVzdHJpZXM6IEluZHVzdHJ5TW9kZWxbXSwgaXRlbTogYW55LCBpOiBudW1iZXIsIHJlY3J1aXRlcnM6IFJlY3J1aXRlckNsYXNzTW9kZWxbXSkge1xuICAgbGV0IHJlY3J1aXRlclNlcnZpY2UgPSBuZXcgUmVjcnVpdGVyU2VydmljZSgpO1xuICAgcmVjcnVpdGVyU2VydmljZS5sb2FkQ2FwYmlsaXR5QW5kS2V5U2tpbGxzKHJlc3VsdFswXS5wb3N0ZWRKb2JzLCBpbmR1c3RyaWVzKTtcbiAgIGl0ZW1baV0uZGF0YSA9IHJlc3VsdFswXTtcbiAgIGl0ZW1baV0uZGF0YS5qb2JDb3VudE1vZGVsID0gcmVzdWx0WzBdLmpvYkNvdW50TW9kZWw7XG4gICByZWNydWl0ZXJzLnB1c2goaXRlbVtpXSk7XG4gICB9Ki9cblxuICBnZXRDYW5kaWRhdGVEZXRhaWxzKGluaXRpYWw6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRyeSB7XG4gICAgICBsZXQgdXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcbiAgICAgIGxldCBjYW5kaWRhdGVTZXJ2aWNlID0gbmV3IENhbmRpZGF0ZVNlcnZpY2UoKTtcbiAgICAgIGxldCB1c2VyczogVXNlcnNDbGFzc01vZGVsID0gbmV3IFVzZXJzQ2xhc3NNb2RlbCgpO1xuICAgICAgbGV0IGNhbmRpZGF0ZXM6IENhbmRpZGF0ZU1vZGVsQ2xhc3NbXSA9IG5ldyBBcnJheSgwKTtcblxuICAgICAgbGV0IHJlZ0V4ID0gbmV3IFJlZ0V4cCgnXicgKyBpbml0aWFsKTtcbiAgICAgIGxldCBmaW5kUXVlcnkgPSB7XG4gICAgICAgICdmaXJzdF9uYW1lJzoge1xuICAgICAgICAgICRyZWdleDogcmVnRXhcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgbGV0IGluY2x1ZGVkX2ZpZWxkcyA9IHtcbiAgICAgICAgJ19pZCc6IDEsXG4gICAgICAgICdmaXJzdF9uYW1lJzogMSxcbiAgICAgICAgJ2xhc3RfbmFtZSc6IDEsXG4gICAgICAgICdtb2JpbGVfbnVtYmVyJzogMSxcbiAgICAgICAgJ2VtYWlsJzogMSxcbiAgICAgICAgJ2lzQ2FuZGlkYXRlJzogMSxcbiAgICAgICAgJ2lzQWRtaW4nOiAxLFxuICAgICAgICAnaXNBY3RpdmF0ZWQnOiAxXG4gICAgICB9O1xuICAgICAgbGV0IHNvcnRpbmdRdWVyeSA9IHsnZmlyc3RfbmFtZSc6IDEsICdsYXN0X25hbWUnOiAxfTtcblxuICAgICAgdXNlclNlcnZpY2UucmV0cmlldmVCeVNvcnRlZE9yZGVyKGZpbmRRdWVyeSwgaW5jbHVkZWRfZmllbGRzLCBzb3J0aW5nUXVlcnksIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB1c2Vycyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IHZhbHVlID0gMDtcbiAgICAgICAgICAgIGxldCBjYW5kaWRhdGVGaWVsZHMgPSB7XG4gICAgICAgICAgICAgICdfaWQnOiAxLFxuICAgICAgICAgICAgICAnam9iVGl0bGUnOiAxLFxuICAgICAgICAgICAgICAnaXNDb21wbGV0ZWQnOiAxLFxuICAgICAgICAgICAgICAnaXNTdWJtaXR0ZWQnOiAxLFxuICAgICAgICAgICAgICAnbG9jYXRpb24nOiAxXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZXN1bHQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdFtpXS5pc0NhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgIGNhbmRpZGF0ZVNlcnZpY2UucmV0cmlldmVXaXRoTGVhbih7J3VzZXJJZCc6IG5ldyBtb25nb29zZS5UeXBlcy5PYmplY3RJZChyZXN1bHRbaV0uX2lkKX0sIGNhbmRpZGF0ZUZpZWxkcywgKGVycm9yLCByZXN1KSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUrKztcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHRbaV0uaXNBZG1pbikge1xuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtpXS5kYXRhID0gcmVzdVswXTtcbiAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVzLnB1c2gocmVzdWx0W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgJiYgcmVzdWx0Lmxlbmd0aCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJzLmNhbmRpZGF0ZSA9IGNhbmRpZGF0ZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB1c2Vycyk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY2FsbGJhY2soZSwgbnVsbCk7XG4gICAgfVxuICB9XG5cbiAgYWRkVXNhZ2VEZXRhaWxzVmFsdWUoaXRlbTogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XG4gICAgdHJ5IHtcbiAgICAgIGxldCB2YWx1ZTogbnVtYmVyID0gMDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YWx1ZSsrO1xuICAgICAgICBpdGVtW2ldLmFjdGlvbiA9IENvbnN0VmFyaWFibGVzLkFjdGlvbnNBcnJheVtpdGVtW2ldLmFjdGlvbl07XG4gICAgICAgIGlmIChpdGVtLmxlbmd0aCA9PT0gdmFsdWUpIHtcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCBpdGVtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNhbGxiYWNrKGUsIG51bGwpO1xuICAgIH1cbiAgfTtcblxuICBnZW5lcmF0ZVVzYWdlRGV0YWlsRmlsZShyZXN1bHQ6IGFueSwgY2FsbGJhY2s6IChlcnI6IGFueSwgcmVzOiBhbnkpID0+IHZvaWQpIHtcbiAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5sZW5ndGggPiAwKSB7XG4gICAgICBsZXQgZmllbGRzID0gWydjYW5kaWRhdGVJZCcsICdyZWNydWl0ZXJJZCcsICdqb2JQcm9maWxlSWQnLCAnYWN0aW9uJywgJ3RpbWVzdGFtcCddO1xuICAgICAgbGV0IGZpZWxkTmFtZXMgPSBbJ0NhbmRpZGF0ZSBJZCcsICdSZWNydWl0ZXJJZCcsICdKb2IgUHJvZmlsZSBJZCcsICdBY3Rpb24nLCAnVGltZVN0YW1wJ107XG4gICAgICBsZXQgY3N2ID0ganNvbjJjc3Yoe2RhdGE6IHJlc3VsdCwgZmllbGRzOiBmaWVsZHMsIGZpZWxkTmFtZXM6IGZpZWxkTmFtZXN9KTtcbiAgICAgIC8vZnMud3JpdGVGaWxlKCcuL3NyYy9zZXJ2ZXIvcHVibGljL3VzYWdlZGV0YWlsLmNzdicsIGNzdiwgZnVuY3Rpb24gKGVycjogYW55KSB7XG4gICAgICBmcy53cml0ZUZpbGUoJy9ob21lL2JpdG5hbWkvYXBwcy9qb2Jtb3Npcy1zdGFnaW5nL2MtbmV4dC9kaXN0L3Byb2Qvc2VydmVyL3B1YmxpYy91c2FnZWRldGFpbC5jc3YnLCBjc3YsIGZ1bmN0aW9uIChlcnI6IGFueSkge1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICB9XG4gIH07XG5cbiAgZ2VuZXJhdGVDYW5kaWRhdGVEZXRhaWxGaWxlKHJlc3VsdDogYW55LCBjYWxsYmFjazogKGVycjogYW55LCByZXM6IGFueSkgPT4gdm9pZCkge1xuICAgIGNvbnNvbGUubG9nKFwiaW5zaWRlIGdlbmVyYXRlIGZpbGVcIik7XG4gICAgaWYgKHJlc3VsdC5jYW5kaWRhdGUgJiYgcmVzdWx0LmNhbmRpZGF0ZS5sZW5ndGggPiAwKSB7XG4gICAgICBsZXQgZmllbGRzID0gWydmaXJzdF9uYW1lJywgJ2xhc3RfbmFtZScsICdtb2JpbGVfbnVtYmVyJywgJ2VtYWlsJywgJ2lzQWN0aXZhdGVkJywgJ2RhdGEubG9jYXRpb24uY2l0eScsXG4gICAgICAgICdkYXRhLnByb2Zlc3Npb25hbERldGFpbHMuZWR1Y2F0aW9uJywgJ2RhdGEucHJvZmVzc2lvbmFsRGV0YWlscy5leHBlcmllbmNlJyxcbiAgICAgICAgJ2RhdGEucHJvZmVzc2lvbmFsRGV0YWlscy5jdXJyZW50U2FsYXJ5JywgJ2RhdGEucHJvZmVzc2lvbmFsRGV0YWlscy5ub3RpY2VQZXJpb2QnLFxuICAgICAgICAnZGF0YS5wcm9mZXNzaW9uYWxEZXRhaWxzLnJlbG9jYXRlJywgJ2RhdGEucHJvZmVzc2lvbmFsRGV0YWlscy5pbmR1c3RyeUV4cG9zdXJlJyxcbiAgICAgICAgJ2RhdGEucHJvZmVzc2lvbmFsRGV0YWlscy5jdXJyZW50Q29tcGFueScsICdkYXRhLmlzQ29tcGxldGVkJywgJ2RhdGEuaXNTdWJtaXR0ZWQnLCAnZGF0YS5pc1Zpc2libGUnLFxuICAgICAgICAnZGF0YS5pbmR1c3RyeS5uYW1lJywgJ2RhdGEua2V5U2tpbGxzJywgJ2RhdGEuY2FwYWJpbGl0eU1hdHJpeC5jYXBhYmlsaXR5Q29kZScsXG4gICAgICAgICdkYXRhLmNhcGFiaWxpdHlNYXRyaXguY29tcGxleGl0eUNvZGUnLCAnZGF0YS5jYXBhYmlsaXR5TWF0cml4LnNjZW5lcmlvQ29kZSddO1xuICAgICAgbGV0IGZpZWxkTmFtZXMgPSBbJ0ZpcnN0IE5hbWUnLCAnTGFzdCBOYW1lJywgJ01vYmlsZSBOdW1iZXInLCAnRW1haWwnLCAnSXMgQWN0aXZhdGVkJywgJ0NpdHknLCAnRWR1Y2F0aW9uJyxcbiAgICAgICAgJ0V4cGVyaWVuY2UnLCAnQ3VycmVudCBTYWxhcnknLCAnTm90aWNlIFBlcmlvZCcsICdSZWFkeSBUbyBSZWxvY2F0ZScsICdJbmR1c3RyeSBFeHBvc3VyZScsICdDdXJyZW50IENvbXBhbnknLFxuICAgICAgICAnSXMgQ29tcGxldGVkJywgJ0lzIFN1Ym1pdHRlZCcsICdJcyBWaXNpYmxlJywgJ0luZHVzdHJ5IE5hbWUnLCAnS2V5IFNraWxscycsICdDYXBhYmlsaXR5IENvZGUnLFxuICAgICAgICAnQ29tcGxleGl0eSBDb2RlJywgJ1NjZW5hcmlvIENvZGUnXTsvL1xuXG4gICAgICBsZXQgY3N2ID0ganNvbjJjc3Yoe1xuICAgICAgICBkYXRhOiByZXN1bHQuY2FuZGlkYXRlLCBmaWVsZHM6IGZpZWxkcywgZmllbGROYW1lczogZmllbGROYW1lcyxcbiAgICAgICAgdW53aW5kUGF0aDogWydkYXRhLmNhcGFiaWxpdHlNYXRyaXgnXVxuICAgICAgfSk7XG4gICAgICBjb25zb2xlLmxvZyhcIndyaXRpbmcgaW50byBmaWxlIGZpbGVcIik7XG4gICAgICAvL2ZzLndyaXRlRmlsZSgnLi9zcmMvc2VydmVyL3B1YmxpYy9jYW5kaWRhdGUuY3N2JywgY3N2LCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcbiAgICAgICBmcy53cml0ZUZpbGUoJy9ob21lL2JpdG5hbWkvYXBwcy9qb2Jtb3Npcy1zdGFnaW5nL2MtbmV4dC9kaXN0L3Byb2Qvc2VydmVyL3B1YmxpYy9jYW5kaWRhdGUuY3N2JywgY3N2LCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgfVxuICB9O1xuXG4gIGdlbmVyYXRlUmVjcnVpdGVyRGV0YWlsRmlsZShyZXN1bHQ6IGFueSwgY2FsbGJhY2s6IChlcnI6IGFueSwgcmVzOiBhbnkpID0+IHZvaWQpIHtcbiAgICBjb25zb2xlLmxvZyhcImluc2lkZSBnZW5lcmF0ZSBmaWxlXCIpO1xuICAgIGlmIChyZXN1bHQucmVjcnVpdGVyICYmIHJlc3VsdC5yZWNydWl0ZXIubGVuZ3RoID4gMCkge1xuICAgICAgbGV0IGZpZWxkcyA9IFsnZGF0YS5jb21wYW55X25hbWUnLCAnZGF0YS5jb21wYW55X3NpemUnLCAnZGF0YS5pc1JlY3J1aXRpbmdGb3JzZWxmJyxcbiAgICAgICAgJ2RhdGEubnVtYmVyT2ZKb2JzUG9zdGVkJywgJ21vYmlsZV9udW1iZXInLCAnZW1haWwnLCAnaXNBY3RpdmF0ZWQnLCAnZGF0YS5wb3N0ZWRKb2JzLmlzSm9iUG9zdGVkJyxcbiAgICAgICAgJ2RhdGEucG9zdGVkSm9icy5qb2JUaXRsZScsICdkYXRhLnBvc3RlZEpvYnMuaGlyaW5nTWFuYWdlcicsICdkYXRhLnBvc3RlZEpvYnMuZGVwYXJ0bWVudCcsXG4gICAgICAgICdkYXRhLnBvc3RlZEpvYnMuZWR1Y2F0aW9uJywgJ2RhdGEucG9zdGVkSm9icy5leHBlcmllbmNlTWluVmFsdWUnLCAnZGF0YS5wb3N0ZWRKb2JzLmV4cGVyaWVuY2VNYXhWYWx1ZScsXG4gICAgICAgICdkYXRhLnBvc3RlZEpvYnMuc2FsYXJ5TWluVmFsdWUnLCAnZGF0YS5wb3N0ZWRKb2JzLnNhbGFyeU1heFZhbHVlJywgJ2RhdGEucG9zdGVkSm9icy5qb2luaW5nUGVyaW9kJyxcbiAgICAgICAgJ2RhdGEucG9zdGVkSm9icy5rZXlTa2lsbHMnLCAnZGF0YS5wb3N0ZWRKb2JzLmFkZGl0aW9uYWxLZXlTa2lsbHMnLCAnZGF0YS5wb3N0ZWRKb2JzLmNhcGFiaWxpdHlNYXRyaXguY2FwYWJpbGl0eUNvZGUnLFxuICAgICAgICAnZGF0YS5wb3N0ZWRKb2JzLmNhcGFiaWxpdHlNYXRyaXguY29tcGxleGl0eUNvZGUnLCAnZGF0YS5wb3N0ZWRKb2JzLmNhcGFiaWxpdHlNYXRyaXguc2NlbmVyaW9Db2RlJyxcbiAgICAgICAgJ2RhdGEucG9zdGVkSm9icy5wb3N0aW5nRGF0ZScsICdkYXRhLnBvc3RlZEpvYnMuZXhwaXJpbmdEYXRlJ107XG5cbiAgICAgIGxldCBmaWVsZE5hbWVzID0gWydDb21wYW55IE5hbWUnLCAnY29tcGFueSBzaXplJywgJ1JlY3J1aXRpbmcgRm9yIFNlbGYnLCAnTnVtYmVyIG9mIEpvYiBQb3N0ZWQnLCAnTW9iaWxlIE51bWJlcicsXG4gICAgICAgICdFbWFpbCcsICdJcyBBY3RpdmF0ZWQnLCAnSXMgSm9iIFBvc3RlZCcsICdKb2IgVGl0bGUnLCAnSGlyaW5nIE1hbmFnZXInLCAnRGVwYXJ0bWVudCcsICdFZHVjYXRpb24nLFxuICAgICAgICAnRXhwZXJpZW5jZSBNaW5WYWx1ZScsICdFeHBlcmllbmNlIE1heFZhbHVlJywgJ1NhbGFyeSBNaW5WYWx1ZScsICdTYWxhcnkgTWF4VmFsdWUnLCAnSm9pbmluZyBQZXJpb2QnLFxuICAgICAgICAnS2V5IFNraWxscycsICdBZGRpdGlvbmFsIEtleSBTa2lsbHMnLCAnQ2FwYWJpbGl0eSBDb2RlJyxcbiAgICAgICAgJ0NvbXBsZXhpdHkgQ29kZScsICdTY2VuYXJpbyBDb2RlJywgJ1Bvc3RpbmcgRGF0ZScsICdFeHBpcmluZyBEYXRlJ107XG4gICAgICBsZXQgY3N2ID0ganNvbjJjc3Yoe1xuICAgICAgICBkYXRhOiByZXN1bHQucmVjcnVpdGVyLFxuICAgICAgICBmaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgZmllbGROYW1lczogZmllbGROYW1lcyxcbiAgICAgICAgdW53aW5kUGF0aDogWydkYXRhLnBvc3RlZEpvYnMnLCAnZGF0YS5wb3N0ZWRKb2JzLmNhcGFiaWxpdHlNYXRyaXgnXVxuICAgICAgfSk7XG4gICAgICAvL2ZzLndyaXRlRmlsZSgnLi9zcmMvc2VydmVyL3B1YmxpYy9yZWNydWl0ZXIuY3N2JywgY3N2LCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcbiAgICAgICAgZnMud3JpdGVGaWxlKCcvaG9tZS9iaXRuYW1pL2FwcHMvam9ibW9zaXMtc3RhZ2luZy9jLW5leHQvZGlzdC9wcm9kL3NlcnZlci9wdWJsaWMvcmVjcnVpdGVyLmNzdicsIGNzdiwgZnVuY3Rpb24gKGVycjogYW55KSB7XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgIH1cbiAgfTtcblxuICBzZW5kQWRtaW5Mb2dpbkluZm9NYWlsKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICBsZXQgaGVhZGVyMSA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL2hlYWRlcjEuaHRtbCcpLnRvU3RyaW5nKCk7XG4gICAgbGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoJy4vc3JjL3NlcnZlci9hcHAvZnJhbWV3b3JrL3B1YmxpYy9hZG1pbmxvZ2luaW5mby5tYWlsLmh0bWwnKS50b1N0cmluZygpO1xuICAgIGxldCBmb290ZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvZm9vdGVyMS5odG1sJykudG9TdHJpbmcoKTtcbiAgICBsZXQgbWlkX2NvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoJyRlbWFpbCQnLCBmaWVsZC5lbWFpbCkucmVwbGFjZSgnJGFkZHJlc3MkJywgKGZpZWxkLmxvY2F0aW9uID09PSB1bmRlZmluZWQpID8gJ05vdCBGb3VuZCcgOiBmaWVsZC5sb2NhdGlvbilcbiAgICAgIC5yZXBsYWNlKCckaXAkJywgZmllbGQuaXApLnJlcGxhY2UoJyRob3N0JCcsIGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5ob3N0JykpO1xuXG5cbiAgICBsZXQgbWFpbE9wdGlvbnMgPSB7XG4gICAgICBmcm9tOiBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuTUFJTF9TRU5ERVInKSxcbiAgICAgIHRvOiBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuQURNSU5fTUFJTCcpLFxuICAgICAgY2M6IGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5UUExHUk9VUF9NQUlMJyksXG4gICAgICBzdWJqZWN0OiBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX0FETUlOX0xPR0dFRF9PTiArIFwiIFwiICsgY29uZmlnLmdldCgnVHBsU2VlZC5tYWlsLmhvc3QnKSxcbiAgICAgIGh0bWw6IGhlYWRlcjEgKyBtaWRfY29udGVudCArIGZvb3RlcjFcbiAgICAgICwgYXR0YWNobWVudHM6IE1haWxBdHRhY2htZW50cy5BdHRhY2htZW50QXJyYXlcbiAgICB9XG4gICAgbGV0IHNlbmRNYWlsU2VydmljZSA9IG5ldyBTZW5kTWFpbFNlcnZpY2UoKTtcbiAgICBzZW5kTWFpbFNlcnZpY2Uuc2VuZE1haWwobWFpbE9wdGlvbnMsIGNhbGxiYWNrKTtcblxuICB9O1xuXG4gIHVwZGF0ZVVzZXIoX2lkOiBzdHJpbmcsIGl0ZW06IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZEJ5SWQoX2lkLCAoZXJyOiBhbnksIHJlczogYW55KSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKGVyciwgcmVzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudXNlclJlcG9zaXRvcnkudXBkYXRlKHJlcy5faWQsIGl0ZW0sIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBnZXRVc2FnZURldGFpbHMoZmllbGQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMudXNlc1RyYWNraW5nQ29udHJvbGxlci5yZXRyaWV2ZUFsbCgoZXJyOiBhbnksIHJlczogYW55KSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIH1cbn1cblxuT2JqZWN0LnNlYWwoQWRtaW5TZXJ2aWNlKTtcbmV4cG9ydCA9IEFkbWluU2VydmljZTtcbiJdfQ==
