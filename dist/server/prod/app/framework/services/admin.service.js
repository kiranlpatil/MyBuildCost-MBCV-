"use strict";
var UserRepository = require("../dataaccess/repository/user.repository");
var SendMailService = require("./sendmail.service");
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
            var users_1 = new UsersClassModel();
            var usersMap_1 = new Map();
            var findQuery = new Object();
            if (userType == 'candidate') {
                findQuery = { 'isCandidate': true, 'isAdmin': false };
            }
            else {
                findQuery = { 'isCandidate': false, 'isAdmin': false };
            }
            var included_fields = {
                '_id': 1,
                'first_name': 1,
                'last_name': 1,
                'mobile_number': 1,
                'email': 1,
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
                        if (userType == 'candidate') {
                            var candidateService_1 = new CandidateService();
                            var candidates_1 = new Array(0);
                            var candidateFields = {
                                'userId': 1,
                                'jobTitle': 1,
                                'isCompleted': 1,
                                'isSubmitted': 1,
                                'location.city': 1,
                                'proficiencies': 1,
                                'professionalDetails': 1,
                                'capability_matrix': 1,
                                'isVisible': 1,
                                'industry.roles.name': 1
                            };
                            candidateService_1.retrieveWithLean({}, candidateFields, function (error, candidatesResult) {
                                if (error) {
                                    callback(error, null);
                                }
                                else {
                                    console.log("Fetched all candidates:" + candidatesResult.length);
                                    for (var _i = 0, candidatesResult_1 = candidatesResult; _i < candidatesResult_1.length; _i++) {
                                        var candidate = candidatesResult_1[_i];
                                        if (candidate.proficiencies.length > 0) {
                                            candidate.keySkills = candidate.proficiencies.toString().replace(/,/g, ' $');
                                        }
                                        if (candidate.industry) {
                                            candidate.roles = candidateService_1.loadRoles(candidate.industry.roles);
                                        }
                                        if (candidate.capability_matrix) {
                                            candidate.capabilityMatrix = candidateService_1.loadCapabilitiDetails(candidate.capability_matrix);
                                        }
                                        usersMap_1.set(candidate.userId.toString(), candidate);
                                    }
                                    for (var _a = 0, result_1 = result; _a < result_1.length; _a++) {
                                        var user = result_1[_a];
                                        user.data = usersMap_1.get(user._id.toString());
                                        candidates_1.push(user);
                                    }
                                    users_1.candidate = candidates_1;
                                    callback(null, users_1);
                                }
                            });
                        }
                        else {
                            console.log("inside recruiter fetch");
                            var recruiterService_1 = new RecruiterService();
                            var recruiters_1 = new Array(0);
                            var recruiterFields = {
                                'userId': 1,
                                'company_name': 1,
                                'company_size': 1,
                                'isRecruitingForself': 1,
                                'postedJobs.isJobPosted': 1,
                                'postedJobs.capability_matrix': 1,
                                'postedJobs.expiringDate': 1,
                                'postedJobs.postingDate': 1,
                                'postedJobs.jobTitle': 1,
                                'postedJobs.hiringManager': 1,
                                'postedJobs.department': 1,
                                'postedJobs.education': 1,
                                'postedJobs.experienceMinValue': 1,
                                'postedJobs.experienceMaxValue': 1,
                                'postedJobs.salaryMinValue': 1,
                                'postedJobs.salaryMaxValue': 1,
                                'postedJobs.joiningPeriod': 1,
                                'postedJobs.proficiencies': 1,
                                'postedJobs.additionalProficiencies': 1,
                                'postedJobs.industry.name': 1,
                                'postedJobs.industry.roles.name': 1,
                            };
                            recruiterService_1.retrieveWithLean({}, recruiterFields, function (error, recruiterResult) {
                                if (error) {
                                    callback(error, null);
                                }
                                else {
                                    console.log("Fetched all recruiters:" + recruiterResult.length);
                                    for (var _i = 0, recruiterResult_1 = recruiterResult; _i < recruiterResult_1.length; _i++) {
                                        var recruiter = recruiterResult_1[_i];
                                        recruiter.numberOfJobsPosted = recruiter.postedJobs.length;
                                        recruiterService_1.loadCapbilityAndKeySkills(recruiter.postedJobs);
                                        usersMap_1.set(recruiter.userId.toString(), recruiter);
                                    }
                                    for (var _a = 0, result_2 = result; _a < result_2.length; _a++) {
                                        var user = result_2[_a];
                                        user.data = usersMap_1.get(user._id.toString());
                                        recruiters_1.push(user);
                                    }
                                    users_1.recruiter = recruiters_1;
                                    callback(null, users_1);
                                }
                            });
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
    AdminService.prototype.getCountOfUsers = function (item, callback) {
        try {
            var candidateService = new CandidateService();
            var recruiterService_2 = new RecruiterService();
            var users_2 = new UsersClassModel();
            var findQuery = new Object();
            candidateService.getTotalCandidateCount(function (error, candidateCount) {
                if (error) {
                    callback(error, null);
                }
                else {
                    users_2.totalNumberOfCandidates = candidateCount;
                    recruiterService_2.getTotalRecruiterCount(function (error, recruiterCount) {
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            users_2.totalNumberOfRecruiters = recruiterCount;
                            callback(null, users_2);
                        }
                    });
                }
            });
        }
        catch (e) {
            callback(e, null);
        }
    };
    AdminService.prototype.getRecruiterDetails = function (initial, callback) {
        try {
            var userService_1 = new UserService();
            var users_3 = new UsersClassModel();
            var usersMap_2 = new Map();
            var recruiterService = new RecruiterService();
            var recruiters_2 = new Array(0);
            var regEx = new RegExp('^[' + initial.toLowerCase() + initial.toUpperCase() + ']');
            var findQuery = {
                'company_name': {
                    $regex: regEx
                }
            };
            var sortingQuery = { 'company_name': 1, 'company_size': 1 };
            var recruiterFields = {
                'userId': 1,
                'company_name': 1,
                'company_size': 1,
                'postedJobs.isJobPosted': 1
            };
            recruiterService.retrieveBySortedOrder(findQuery, recruiterFields, sortingQuery, function (error, recruiterResult) {
                if (error) {
                    callback(error, null);
                }
                else {
                    users_3.totalNumberOfRecruiters = recruiterResult.length;
                    if (recruiterResult.length == 0) {
                        callback(null, users_3);
                    }
                    else {
                        var userFields = {
                            '_id': 1,
                            'mobile_number': 1,
                            'email': 1,
                            'isActivated': 1
                        };
                        for (var _i = 0, recruiterResult_2 = recruiterResult; _i < recruiterResult_2.length; _i++) {
                            var recruiter = recruiterResult_2[_i];
                            usersMap_2.set(recruiter.userId.toString(), recruiter);
                        }
                        userService_1.retrieveWithLean({ 'isCandidate': false }, function (error, result) {
                            if (error) {
                                callback(error, null);
                            }
                            else {
                                console.log("Fetched all recruiters from users:" + recruiterResult.length);
                                for (var _i = 0, result_3 = result; _i < result_3.length; _i++) {
                                    var user = result_3[_i];
                                    if (usersMap_2.get(user._id.toString())) {
                                        user.data = usersMap_2.get(user._id.toString());
                                        recruiters_2.push(user);
                                    }
                                }
                                users_3.recruiter = recruiters_2;
                                callback(null, users_3);
                            }
                        });
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
            var users_4 = new UsersClassModel();
            var usersMap_3 = new Map();
            var candidates_2 = new Array(0);
            var candidateService_2 = new CandidateService();
            var regEx = new RegExp('^[' + initial.toLowerCase() + initial.toUpperCase() + ']');
            var findQuery = {
                'first_name': {
                    $regex: regEx
                },
                'isAdmin': false,
                'isCandidate': true
            };
            var included_fields = {
                '_id': 1,
                'first_name': 1,
                'last_name': 1,
                'mobile_number': 1,
                'email': 1,
                'isActivated': 1
            };
            var sortingQuery = { 'first_name': 1, 'last_name': 1 };
            userService.retrieveBySortedOrder(findQuery, included_fields, sortingQuery, function (error, result) {
                if (error) {
                    callback(error, null);
                }
                else {
                    users_4.totalNumberOfCandidates = result.length;
                    if (result.length == 0) {
                        callback(null, users_4);
                    }
                    else {
                        var value = 0;
                        var candidateFields = {
                            'userId': 1,
                            'jobTitle': 1,
                            'isCompleted': 1,
                            'isSubmitted': 1,
                            'isVisible': 1,
                            'location.city': 1
                        };
                        candidateService_2.retrieveWithLean({}, candidateFields, function (error, candidatesResult) {
                            if (error) {
                                callback(error, null);
                            }
                            else {
                                console.log("Fetched all candidates:" + candidatesResult.length);
                                for (var _i = 0, candidatesResult_2 = candidatesResult; _i < candidatesResult_2.length; _i++) {
                                    var candidate = candidatesResult_2[_i];
                                    usersMap_3.set(candidate.userId.toString(), candidate);
                                }
                                for (var _a = 0, result_4 = result; _a < result_4.length; _a++) {
                                    var user = result_4[_a];
                                    user.data = usersMap_3.get(user._id.toString());
                                    candidates_2.push(user);
                                }
                                users_4.candidate = candidates_2;
                                callback(null, users_4);
                            }
                        });
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
            fs.writeFile('/home/bitnami/apps/jobmosis-staging/c-next/dist/server/prod/public/usagedetail.csv', csv, function (err) {
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
                'data.keySkills', 'data.industry.name', 'data.roles', 'data.capabilityMatrix.capabilityCode',
                'data.capabilityMatrix.complexityCode', 'data.capabilityMatrix.scenerioCode'];
            var fieldNames = ['First Name', 'Last Name', 'Mobile Number', 'Email', 'Is Activated', 'City', 'Education',
                'Experience', 'Current Salary', 'Notice Period', 'Ready To Relocate', 'Industry Exposure', 'Current Company',
                'Is Completed', 'Is Submitted', 'Is Visible', 'Key Skills', 'Industry', 'Role', 'Capability Code',
                'Complexity Code', 'Scenario Code'];
            var tempString_1 = '';
            var count_1 = 0;
            var candidateLength_1 = result.candidate.length;
            for (var _i = 0, _a = result.candidate; _i < _a.length; _i++) {
                var candidate = _a[_i];
                tempString_1 = json2csv({
                    data: candidate, fields: fields, fieldNames: fieldNames,
                    unwindPath: ['data.capabilityMatrix']
                }, function (err, result) {
                    count_1++;
                    tempString_1 += result;
                    if (count_1 == candidateLength_1) {
                        console.log("writing into file file");
                        fs.writeFile('/home/bitnami/apps/jobmosis-staging/c-next/dist/server/prod/public/candidate.csv', tempString_1, function (err) {
                            if (err)
                                throw err;
                            callback(null, result);
                        });
                    }
                });
            }
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
                'data.postedJobs.keySkills', 'data.postedJobs.additionalKeySkills', 'data.postedJobs.industry.name',
                'data.postedJobs.roles', 'data.postedJobs.capabilityMatrix.capabilityCode',
                'data.postedJobs.capabilityMatrix.complexityCode', 'data.postedJobs.capabilityMatrix.scenerioCode',
                'data.postedJobs.postingDate', 'data.postedJobs.expiringDate'];
            var fieldNames = ['Company Name', 'company size', 'Recruiting For Self', 'Number of Job Posted', 'Mobile Number',
                'Email', 'Is Activated', 'Is Job Posted', 'Job Title', 'Hiring Manager', 'Department', 'Education',
                'Experience MinValue', 'Experience MaxValue', 'Salary MinValue', 'Salary MaxValue', 'Joining Period',
                'Key Skills', 'Additional Key Skills', 'Industry', 'Role', 'Capability Code',
                'Complexity Code', 'Scenario Code', 'Posting Date', 'Expiring Date'];
            var tempString_2 = '';
            var count_2 = 0;
            var recruiterLength_1 = result.recruiter.length;
            for (var _i = 0, _a = result.recruiter; _i < _a.length; _i++) {
                var recruiter = _a[_i];
                tempString_2 = json2csv({
                    data: recruiter, fields: fields, fieldNames: fieldNames,
                    unwindPath: ['data.postedJobs', 'data.postedJobs.capabilityMatrix']
                }, function (err, result) {
                    count_2++;
                    tempString_2 += result;
                    if (count_2 == recruiterLength_1) {
                        console.log("writing into file file");
                        fs.writeFile('/home/bitnami/apps/jobmosis-staging/c-next/dist/server/prod/public/recruiter.csv', tempString_2, function (err) {
                            if (err)
                                throw err;
                            callback(null, result);
                        });
                    }
                });
            }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvc2VydmljZXMvYWRtaW4uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBR0EseUVBQTRFO0FBQzVFLG9EQUF1RDtBQUN2RCw2REFBeUQ7QUFDekQsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNuQyxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdkIsNkNBQWdEO0FBQ2hELHVEQUEwRDtBQUMxRCxtRkFBc0Y7QUFDdEYsMkRBQThEO0FBQzlELHNEQUF5RDtBQUN6RCxzREFBeUQ7QUFFekQsaUZBQW9GO0FBSXBGLDRDQUErQztBQUMvQyxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFNUM7SUFRRTtRQUNFLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQ25ELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFDckQsSUFBSSxHQUFHLEdBQVEsSUFBSSxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDL0MsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUM7SUFDaEQsQ0FBQztJQUVELHFDQUFjLEdBQWQsVUFBZSxRQUFnQixFQUFFLFFBQXVEO1FBQ3RGLElBQUksQ0FBQztZQUNILElBQUksV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7WUFDcEMsSUFBSSxPQUFLLEdBQW9CLElBQUksZUFBZSxFQUFFLENBQUM7WUFDbkQsSUFBSSxVQUFRLEdBQWtCLElBQUksR0FBRyxFQUFFLENBQUM7WUFDeEMsSUFBSSxTQUFTLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FB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UTtZQUN6RCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNSLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDdEIsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDdEIsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQztJQUNILG1CQUFDO0FBQUQsQ0FyaEJBLEFBcWhCQyxJQUFBO0FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUMxQixpQkFBUyxZQUFZLENBQUMiLCJmaWxlIjoiYXBwL2ZyYW1ld29yay9zZXJ2aWNlcy9hZG1pbi5zZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENyZWF0ZWQgYnkgdGVjaHByaW1lMDAyIG9uIDgvMjgvMjAxNy5cclxuICovXHJcbmltcG9ydCBVc2VyUmVwb3NpdG9yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvcmVwb3NpdG9yeS91c2VyLnJlcG9zaXRvcnknKTtcclxuaW1wb3J0IFNlbmRNYWlsU2VydmljZSA9IHJlcXVpcmUoJy4vc2VuZG1haWwuc2VydmljZScpO1xyXG5pbXBvcnQge0NvbnN0VmFyaWFibGVzfSBmcm9tIFwiLi4vc2hhcmVkL3NoYXJlZGNvbnN0YW50c1wiO1xyXG5sZXQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XHJcbmxldCBqc29uMmNzdiA9IHJlcXVpcmUoJ2pzb24yY3N2Jyk7XHJcbmxldCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcbmltcG9ydCBNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL3NoYXJlZC9tZXNzYWdlcycpO1xyXG5pbXBvcnQgTWFpbEF0dGFjaG1lbnRzID0gcmVxdWlyZSgnLi4vc2hhcmVkL3NoYXJlZGFycmF5Jyk7XHJcbmltcG9ydCBSZWNydWl0ZXJSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L3JlY3J1aXRlci5yZXBvc2l0b3J5Jyk7XHJcbmltcG9ydCBVc2Vyc0NsYXNzTW9kZWwgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3VzZXJzJyk7XHJcbmltcG9ydCBDYW5kaWRhdGVTZXJ2aWNlID0gcmVxdWlyZSgnLi9jYW5kaWRhdGUuc2VydmljZScpO1xyXG5pbXBvcnQgUmVjcnVpdGVyU2VydmljZSA9IHJlcXVpcmUoJy4vcmVjcnVpdGVyLnNlcnZpY2UnKTtcclxuaW1wb3J0IEluZHVzdHJ5TW9kZWwgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL2luZHVzdHJ5Lm1vZGVsJyk7XHJcbmltcG9ydCBJbmR1c3RyeVJlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvaW5kdXN0cnkucmVwb3NpdG9yeScpO1xyXG5pbXBvcnQgQ2FuZGlkYXRlTW9kZWxDbGFzcyA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9kZWwvY2FuZGlkYXRlQ2xhc3MubW9kZWwnKTtcclxuaW1wb3J0IFJlY3J1aXRlckNsYXNzTW9kZWwgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL3JlY3J1aXRlckNsYXNzLm1vZGVsJyk7XHJcbmltcG9ydCBDYW5kaWRhdGVDbGFzc01vZGVsID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9jYW5kaWRhdGUtY2xhc3MubW9kZWwnKTtcclxuaW1wb3J0IFVzZXJTZXJ2aWNlID0gcmVxdWlyZShcIi4vdXNlci5zZXJ2aWNlXCIpO1xyXG5sZXQgdXNlc3RyYWNraW5nID0gcmVxdWlyZSgndXNlcy10cmFja2luZycpO1xyXG5cclxuY2xhc3MgQWRtaW5TZXJ2aWNlIHtcclxuICBjb21wYW55X25hbWU6IHN0cmluZztcclxuICBwcml2YXRlIHVzZXJSZXBvc2l0b3J5OiBVc2VyUmVwb3NpdG9yeTtcclxuICBwcml2YXRlIGluZHVzdHJ5UmVwb3NpdGlyeTogSW5kdXN0cnlSZXBvc2l0b3J5O1xyXG4gIHByaXZhdGUgcmVjcnVpdGVyUmVwb3NpdG9yeTogUmVjcnVpdGVyUmVwb3NpdG9yeTtcclxuICBwcml2YXRlIHVzZXNUcmFja2luZ0NvbnRyb2xsZXI6IGFueTtcclxuXHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeSA9IG5ldyBVc2VyUmVwb3NpdG9yeSgpO1xyXG4gICAgdGhpcy5pbmR1c3RyeVJlcG9zaXRpcnkgPSBuZXcgSW5kdXN0cnlSZXBvc2l0b3J5KCk7XHJcbiAgICB0aGlzLnJlY3J1aXRlclJlcG9zaXRvcnkgPSBuZXcgUmVjcnVpdGVyUmVwb3NpdG9yeSgpO1xyXG4gICAgbGV0IG9iajogYW55ID0gbmV3IHVzZXN0cmFja2luZy5NeUNvbnRyb2xsZXIoKTtcclxuICAgIHRoaXMudXNlc1RyYWNraW5nQ29udHJvbGxlciA9IG9iai5fY29udHJvbGxlcjtcclxuICB9XHJcblxyXG4gIGdldFVzZXJEZXRhaWxzKHVzZXJUeXBlOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBVc2Vyc0NsYXNzTW9kZWwpID0+IHZvaWQpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGxldCB1c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xyXG4gICAgICBsZXQgdXNlcnM6IFVzZXJzQ2xhc3NNb2RlbCA9IG5ldyBVc2Vyc0NsYXNzTW9kZWwoKTtcclxuICAgICAgbGV0IHVzZXJzTWFwOiBNYXA8YW55LCBhbnk+ID0gbmV3IE1hcCgpO1xyXG4gICAgICBsZXQgZmluZFF1ZXJ5ID0gbmV3IE9iamVjdCgpO1xyXG5cclxuICAgICAgaWYgKHVzZXJUeXBlID09ICdjYW5kaWRhdGUnKSB7XHJcbiAgICAgICAgZmluZFF1ZXJ5ID0geydpc0NhbmRpZGF0ZSc6IHRydWUsICdpc0FkbWluJzogZmFsc2V9O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZpbmRRdWVyeSA9IHsnaXNDYW5kaWRhdGUnOiBmYWxzZSwgJ2lzQWRtaW4nOiBmYWxzZX07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxldCBpbmNsdWRlZF9maWVsZHMgPSB7XHJcbiAgICAgICAgJ19pZCc6IDEsXHJcbiAgICAgICAgJ2ZpcnN0X25hbWUnOiAxLFxyXG4gICAgICAgICdsYXN0X25hbWUnOiAxLFxyXG4gICAgICAgICdtb2JpbGVfbnVtYmVyJzogMSxcclxuICAgICAgICAnZW1haWwnOiAxLFxyXG4gICAgICAgICdpc0FjdGl2YXRlZCc6IDFcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGxldCBzb3J0aW5nUXVlcnkgPSB7J2ZpcnN0X25hbWUnOiAxLCAnbGFzdF9uYW1lJzogMX07XHJcblxyXG4gICAgICB1c2VyU2VydmljZS5yZXRyaWV2ZUJ5U29ydGVkT3JkZXIoZmluZFF1ZXJ5LCBpbmNsdWRlZF9maWVsZHMsIHNvcnRpbmdRdWVyeSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaWYgKHJlc3VsdC5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB1c2Vycyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHVzZXJUeXBlID09ICdjYW5kaWRhdGUnKSB7XHJcbiAgICAgICAgICAgICAgbGV0IGNhbmRpZGF0ZVNlcnZpY2UgPSBuZXcgQ2FuZGlkYXRlU2VydmljZSgpO1xyXG4gICAgICAgICAgICAgIGxldCBjYW5kaWRhdGVzOiBDYW5kaWRhdGVNb2RlbENsYXNzW10gPSBuZXcgQXJyYXkoMCk7XHJcbiAgICAgICAgICAgICAgbGV0IGNhbmRpZGF0ZUZpZWxkcyA9IHtcclxuICAgICAgICAgICAgICAgICd1c2VySWQnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ2pvYlRpdGxlJzogMSxcclxuICAgICAgICAgICAgICAgICdpc0NvbXBsZXRlZCc6IDEsXHJcbiAgICAgICAgICAgICAgICAnaXNTdWJtaXR0ZWQnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ2xvY2F0aW9uLmNpdHknOiAxLFxyXG4gICAgICAgICAgICAgICAgJ3Byb2ZpY2llbmNpZXMnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ3Byb2Zlc3Npb25hbERldGFpbHMnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ2NhcGFiaWxpdHlfbWF0cml4JzogMSxcclxuICAgICAgICAgICAgICAgICdpc1Zpc2libGUnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ2luZHVzdHJ5LnJvbGVzLm5hbWUnOiAxXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBjYW5kaWRhdGVTZXJ2aWNlLnJldHJpZXZlV2l0aExlYW4oe30sIGNhbmRpZGF0ZUZpZWxkcywgKGVycm9yLCBjYW5kaWRhdGVzUmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGZXRjaGVkIGFsbCBjYW5kaWRhdGVzOlwiICsgY2FuZGlkYXRlc1Jlc3VsdC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICBmb3IgKGxldCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlc1Jlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUucHJvZmljaWVuY2llcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUua2V5U2tpbGxzID0gY2FuZGlkYXRlLnByb2ZpY2llbmNpZXMudG9TdHJpbmcoKS5yZXBsYWNlKC8sL2csICcgJCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZS5pbmR1c3RyeSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlLnJvbGVzID0gY2FuZGlkYXRlU2VydmljZS5sb2FkUm9sZXMoY2FuZGlkYXRlLmluZHVzdHJ5LnJvbGVzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUuY2FwYWJpbGl0eV9tYXRyaXgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZS5jYXBhYmlsaXR5TWF0cml4ID0gY2FuZGlkYXRlU2VydmljZS5sb2FkQ2FwYWJpbGl0aURldGFpbHMoY2FuZGlkYXRlLmNhcGFiaWxpdHlfbWF0cml4KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdXNlcnNNYXAuc2V0KGNhbmRpZGF0ZS51c2VySWQudG9TdHJpbmcoKSwgY2FuZGlkYXRlKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgZm9yIChsZXQgdXNlciBvZiByZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICB1c2VyLmRhdGEgPSB1c2Vyc01hcC5nZXQodXNlci5faWQudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlcy5wdXNoKHVzZXIpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICB1c2Vycy5jYW5kaWRhdGUgPSBjYW5kaWRhdGVzO1xyXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB1c2Vycyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJpbnNpZGUgcmVjcnVpdGVyIGZldGNoXCIpO1xyXG4gICAgICAgICAgICAgIGxldCByZWNydWl0ZXJTZXJ2aWNlID0gbmV3IFJlY3J1aXRlclNlcnZpY2UoKTtcclxuICAgICAgICAgICAgICBsZXQgcmVjcnVpdGVyczogUmVjcnVpdGVyQ2xhc3NNb2RlbFtdID0gbmV3IEFycmF5KDApO1xyXG4gICAgICAgICAgICAgIGxldCByZWNydWl0ZXJGaWVsZHMgPSB7XHJcbiAgICAgICAgICAgICAgICAndXNlcklkJzogMSxcclxuICAgICAgICAgICAgICAgICdjb21wYW55X25hbWUnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ2NvbXBhbnlfc2l6ZSc6IDEsXHJcbiAgICAgICAgICAgICAgICAnaXNSZWNydWl0aW5nRm9yc2VsZic6IDEsXHJcbiAgICAgICAgICAgICAgICAncG9zdGVkSm9icy5pc0pvYlBvc3RlZCc6IDEsXHJcbiAgICAgICAgICAgICAgICAncG9zdGVkSm9icy5jYXBhYmlsaXR5X21hdHJpeCc6IDEsXHJcbiAgICAgICAgICAgICAgICAncG9zdGVkSm9icy5leHBpcmluZ0RhdGUnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ3Bvc3RlZEpvYnMucG9zdGluZ0RhdGUnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ3Bvc3RlZEpvYnMuam9iVGl0bGUnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ3Bvc3RlZEpvYnMuaGlyaW5nTWFuYWdlcic6IDEsXHJcbiAgICAgICAgICAgICAgICAncG9zdGVkSm9icy5kZXBhcnRtZW50JzogMSxcclxuICAgICAgICAgICAgICAgICdwb3N0ZWRKb2JzLmVkdWNhdGlvbic6IDEsXHJcbiAgICAgICAgICAgICAgICAncG9zdGVkSm9icy5leHBlcmllbmNlTWluVmFsdWUnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ3Bvc3RlZEpvYnMuZXhwZXJpZW5jZU1heFZhbHVlJzogMSxcclxuICAgICAgICAgICAgICAgICdwb3N0ZWRKb2JzLnNhbGFyeU1pblZhbHVlJzogMSxcclxuICAgICAgICAgICAgICAgICdwb3N0ZWRKb2JzLnNhbGFyeU1heFZhbHVlJzogMSxcclxuICAgICAgICAgICAgICAgICdwb3N0ZWRKb2JzLmpvaW5pbmdQZXJpb2QnOiAxLFxyXG4gICAgICAgICAgICAgICAgJ3Bvc3RlZEpvYnMucHJvZmljaWVuY2llcyc6IDEsXHJcbiAgICAgICAgICAgICAgICAncG9zdGVkSm9icy5hZGRpdGlvbmFsUHJvZmljaWVuY2llcyc6IDEsXHJcbiAgICAgICAgICAgICAgICAncG9zdGVkSm9icy5pbmR1c3RyeS5uYW1lJzogMSxcclxuICAgICAgICAgICAgICAgICdwb3N0ZWRKb2JzLmluZHVzdHJ5LnJvbGVzLm5hbWUnOiAxLFxyXG4gICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgIHJlY3J1aXRlclNlcnZpY2UucmV0cmlldmVXaXRoTGVhbih7fSwgcmVjcnVpdGVyRmllbGRzLCAoZXJyb3IsIHJlY3J1aXRlclJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmV0Y2hlZCBhbGwgcmVjcnVpdGVyczpcIiArIHJlY3J1aXRlclJlc3VsdC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICBmb3IgKGxldCByZWNydWl0ZXIgb2YgcmVjcnVpdGVyUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVjcnVpdGVyLm51bWJlck9mSm9ic1Bvc3RlZCA9IHJlY3J1aXRlci5wb3N0ZWRKb2JzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICByZWNydWl0ZXJTZXJ2aWNlLmxvYWRDYXBiaWxpdHlBbmRLZXlTa2lsbHMocmVjcnVpdGVyLnBvc3RlZEpvYnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXJzTWFwLnNldChyZWNydWl0ZXIudXNlcklkLnRvU3RyaW5nKCksIHJlY3J1aXRlcik7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIGZvciAobGV0IHVzZXIgb2YgcmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXNlci5kYXRhID0gdXNlcnNNYXAuZ2V0KHVzZXIuX2lkLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlY3J1aXRlcnMucHVzaCh1c2VyKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgdXNlcnMucmVjcnVpdGVyID0gcmVjcnVpdGVycztcclxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgdXNlcnMpO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaFxyXG4gICAgICAoZSkge1xyXG4gICAgICBjYWxsYmFjayhlLCBudWxsKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBnZXRDb3VudE9mVXNlcnMoaXRlbTogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBsZXQgY2FuZGlkYXRlU2VydmljZSA9IG5ldyBDYW5kaWRhdGVTZXJ2aWNlKCk7XHJcbiAgICAgIGxldCByZWNydWl0ZXJTZXJ2aWNlID0gbmV3IFJlY3J1aXRlclNlcnZpY2UoKTtcclxuICAgICAgbGV0IHVzZXJzOiBVc2Vyc0NsYXNzTW9kZWwgPSBuZXcgVXNlcnNDbGFzc01vZGVsKCk7XHJcbiAgICAgIGxldCBmaW5kUXVlcnkgPSBuZXcgT2JqZWN0KCk7XHJcblxyXG4gICAgICBjYW5kaWRhdGVTZXJ2aWNlLmdldFRvdGFsQ2FuZGlkYXRlQ291bnQoKGVycm9yLCBjYW5kaWRhdGVDb3VudCkgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB1c2Vycy50b3RhbE51bWJlck9mQ2FuZGlkYXRlcyA9IGNhbmRpZGF0ZUNvdW50O1xyXG4gICAgICAgICAgcmVjcnVpdGVyU2VydmljZS5nZXRUb3RhbFJlY3J1aXRlckNvdW50KChlcnJvciwgcmVjcnVpdGVyQ291bnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHVzZXJzLnRvdGFsTnVtYmVyT2ZSZWNydWl0ZXJzID0gcmVjcnVpdGVyQ291bnQ7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgdXNlcnMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgY2F0Y2hcclxuICAgICAgKGUpIHtcclxuICAgICAgY2FsbGJhY2soZSwgbnVsbCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRSZWNydWl0ZXJEZXRhaWxzKGluaXRpYWw6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgbGV0IHVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XHJcbiAgICAgIGxldCB1c2VyczogVXNlcnNDbGFzc01vZGVsID0gbmV3IFVzZXJzQ2xhc3NNb2RlbCgpO1xyXG4gICAgICBsZXQgdXNlcnNNYXA6IE1hcDxhbnksIGFueT4gPSBuZXcgTWFwKCk7XHJcblxyXG4gICAgICBsZXQgcmVjcnVpdGVyU2VydmljZSA9IG5ldyBSZWNydWl0ZXJTZXJ2aWNlKCk7XHJcbiAgICAgIGxldCByZWNydWl0ZXJzOiBSZWNydWl0ZXJDbGFzc01vZGVsW10gPSBuZXcgQXJyYXkoMCk7XHJcblxyXG4gICAgICBsZXQgcmVnRXggPSBuZXcgUmVnRXhwKCdeWycgKyBpbml0aWFsLnRvTG93ZXJDYXNlKCkgKyBpbml0aWFsLnRvVXBwZXJDYXNlKCkgKyAnXScpO1xyXG4gICAgICBsZXQgZmluZFF1ZXJ5ID0ge1xyXG4gICAgICAgICdjb21wYW55X25hbWUnOiB7XHJcbiAgICAgICAgICAkcmVnZXg6IHJlZ0V4XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGxldCBzb3J0aW5nUXVlcnkgPSB7J2NvbXBhbnlfbmFtZSc6IDEsICdjb21wYW55X3NpemUnOiAxfTtcclxuXHJcbiAgICAgIGxldCByZWNydWl0ZXJGaWVsZHMgPSB7XHJcbiAgICAgICAgJ3VzZXJJZCc6IDEsXHJcbiAgICAgICAgJ2NvbXBhbnlfbmFtZSc6IDEsXHJcbiAgICAgICAgJ2NvbXBhbnlfc2l6ZSc6IDEsXHJcbiAgICAgICAgJ3Bvc3RlZEpvYnMuaXNKb2JQb3N0ZWQnOiAxXHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZWNydWl0ZXJTZXJ2aWNlLnJldHJpZXZlQnlTb3J0ZWRPcmRlcihmaW5kUXVlcnksIHJlY3J1aXRlckZpZWxkcywgc29ydGluZ1F1ZXJ5LCAoZXJyb3IsIHJlY3J1aXRlclJlc3VsdCkgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB1c2Vycy50b3RhbE51bWJlck9mUmVjcnVpdGVycyA9IHJlY3J1aXRlclJlc3VsdC5sZW5ndGg7XHJcbiAgICAgICAgICBpZiAocmVjcnVpdGVyUmVzdWx0Lmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHVzZXJzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgdXNlckZpZWxkcyA9IHtcclxuICAgICAgICAgICAgICAnX2lkJzogMSxcclxuICAgICAgICAgICAgICAnbW9iaWxlX251bWJlcic6IDEsXHJcbiAgICAgICAgICAgICAgJ2VtYWlsJzogMSxcclxuICAgICAgICAgICAgICAnaXNBY3RpdmF0ZWQnOiAxXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCByZWNydWl0ZXIgb2YgcmVjcnVpdGVyUmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgdXNlcnNNYXAuc2V0KHJlY3J1aXRlci51c2VySWQudG9TdHJpbmcoKSwgcmVjcnVpdGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB1c2VyU2VydmljZS5yZXRyaWV2ZVdpdGhMZWFuKHsnaXNDYW5kaWRhdGUnOiBmYWxzZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmV0Y2hlZCBhbGwgcmVjcnVpdGVycyBmcm9tIHVzZXJzOlwiICsgcmVjcnVpdGVyUmVzdWx0Lmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB1c2VyIG9mIHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICBpZih1c2Vyc01hcC5nZXQodXNlci5faWQudG9TdHJpbmcoKSkpe1xyXG4gICAgICAgICAgICAgICAgICAgIHVzZXIuZGF0YSA9IHVzZXJzTWFwLmdldCh1c2VyLl9pZC50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICByZWNydWl0ZXJzLnB1c2godXNlcik7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB1c2Vycy5yZWNydWl0ZXIgPSByZWNydWl0ZXJzO1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgdXNlcnMpO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaFxyXG4gICAgICAoZSkge1xyXG4gICAgICBjYWxsYmFjayhlLCBudWxsKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldENhbmRpZGF0ZURldGFpbHMoaW5pdGlhbDogc3RyaW5nLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBsZXQgdXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcclxuICAgICAgbGV0IHVzZXJzOiBVc2Vyc0NsYXNzTW9kZWwgPSBuZXcgVXNlcnNDbGFzc01vZGVsKCk7XHJcbiAgICAgIGxldCB1c2Vyc01hcDogTWFwPGFueSwgYW55PiA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICAgIGxldCBjYW5kaWRhdGVzOiBDYW5kaWRhdGVNb2RlbENsYXNzW10gPSBuZXcgQXJyYXkoMCk7XHJcbiAgICAgIGxldCBjYW5kaWRhdGVTZXJ2aWNlID0gbmV3IENhbmRpZGF0ZVNlcnZpY2UoKTtcclxuXHJcbiAgICAgIGxldCByZWdFeCA9IG5ldyBSZWdFeHAoJ15bJyArIGluaXRpYWwudG9Mb3dlckNhc2UoKSArIGluaXRpYWwudG9VcHBlckNhc2UoKSArICddJyk7XHJcbiAgICAgIGxldCBmaW5kUXVlcnkgPSB7XHJcbiAgICAgICAgJ2ZpcnN0X25hbWUnOiB7XHJcbiAgICAgICAgICAkcmVnZXg6IHJlZ0V4XHJcbiAgICAgICAgfSxcclxuICAgICAgICAnaXNBZG1pbic6IGZhbHNlLFxyXG4gICAgICAgICdpc0NhbmRpZGF0ZSc6IHRydWVcclxuICAgICAgfTtcclxuICAgICAgbGV0IGluY2x1ZGVkX2ZpZWxkcyA9IHtcclxuICAgICAgICAnX2lkJzogMSxcclxuICAgICAgICAnZmlyc3RfbmFtZSc6IDEsXHJcbiAgICAgICAgJ2xhc3RfbmFtZSc6IDEsXHJcbiAgICAgICAgJ21vYmlsZV9udW1iZXInOiAxLFxyXG4gICAgICAgICdlbWFpbCc6IDEsXHJcbiAgICAgICAgJ2lzQWN0aXZhdGVkJzogMVxyXG4gICAgICB9O1xyXG4gICAgICBsZXQgc29ydGluZ1F1ZXJ5ID0geydmaXJzdF9uYW1lJzogMSwgJ2xhc3RfbmFtZSc6IDF9O1xyXG5cclxuICAgICAgdXNlclNlcnZpY2UucmV0cmlldmVCeVNvcnRlZE9yZGVyKGZpbmRRdWVyeSwgaW5jbHVkZWRfZmllbGRzLCBzb3J0aW5nUXVlcnksIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHVzZXJzLnRvdGFsTnVtYmVyT2ZDYW5kaWRhdGVzID0gcmVzdWx0Lmxlbmd0aDtcclxuICAgICAgICAgIGlmIChyZXN1bHQubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgdXNlcnMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGxldCB2YWx1ZSA9IDA7XHJcbiAgICAgICAgICAgIGxldCBjYW5kaWRhdGVGaWVsZHMgPSB7XHJcbiAgICAgICAgICAgICAgJ3VzZXJJZCc6IDEsXHJcbiAgICAgICAgICAgICAgJ2pvYlRpdGxlJzogMSxcclxuICAgICAgICAgICAgICAnaXNDb21wbGV0ZWQnOiAxLFxyXG4gICAgICAgICAgICAgICdpc1N1Ym1pdHRlZCc6IDEsXHJcbiAgICAgICAgICAgICAgJ2lzVmlzaWJsZSc6IDEsXHJcbiAgICAgICAgICAgICAgJ2xvY2F0aW9uLmNpdHknOiAxXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNhbmRpZGF0ZVNlcnZpY2UucmV0cmlldmVXaXRoTGVhbih7fSwgY2FuZGlkYXRlRmllbGRzLCAoZXJyb3IsIGNhbmRpZGF0ZXNSZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGZXRjaGVkIGFsbCBjYW5kaWRhdGVzOlwiICsgY2FuZGlkYXRlc1Jlc3VsdC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXNSZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgdXNlcnNNYXAuc2V0KGNhbmRpZGF0ZS51c2VySWQudG9TdHJpbmcoKSwgY2FuZGlkYXRlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCB1c2VyIG9mIHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICB1c2VyLmRhdGEgPSB1c2Vyc01hcC5nZXQodXNlci5faWQudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZXMucHVzaCh1c2VyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB1c2Vycy5jYW5kaWRhdGUgPSBjYW5kaWRhdGVzO1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgdXNlcnMpO1xyXG5cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBjYWxsYmFjayhlLCBudWxsKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFkZFVzYWdlRGV0YWlsc1ZhbHVlKGl0ZW06IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgbGV0IHZhbHVlOiBudW1iZXIgPSAwO1xyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW0ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YWx1ZSsrO1xyXG4gICAgICAgIGl0ZW1baV0uYWN0aW9uID0gQ29uc3RWYXJpYWJsZXMuQWN0aW9uc0FycmF5W2l0ZW1baV0uYWN0aW9uXTtcclxuICAgICAgICBpZiAoaXRlbS5sZW5ndGggPT09IHZhbHVlKSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCBpdGVtKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgY2FsbGJhY2soZSwgbnVsbCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgZ2VuZXJhdGVVc2FnZURldGFpbEZpbGUocmVzdWx0OiBhbnksIGNhbGxiYWNrOiAoZXJyOiBhbnksIHJlczogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGxldCBmaWVsZHMgPSBbJ2NhbmRpZGF0ZUlkJywgJ3JlY3J1aXRlcklkJywgJ2pvYlByb2ZpbGVJZCcsICdhY3Rpb24nLCAndGltZXN0YW1wJ107XHJcbiAgICAgIGxldCBmaWVsZE5hbWVzID0gWydDYW5kaWRhdGUgSWQnLCAnUmVjcnVpdGVySWQnLCAnSm9iIFByb2ZpbGUgSWQnLCAnQWN0aW9uJywgJ1RpbWVTdGFtcCddO1xyXG4gICAgICBsZXQgY3N2ID0ganNvbjJjc3Yoe2RhdGE6IHJlc3VsdCwgZmllbGRzOiBmaWVsZHMsIGZpZWxkTmFtZXM6IGZpZWxkTmFtZXN9KTtcclxuICAgICAgLy9mcy53cml0ZUZpbGUoJy4vc3JjL3NlcnZlci9wdWJsaWMvdXNhZ2VkZXRhaWwuY3N2JywgY3N2LCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcclxuICAgICAgZnMud3JpdGVGaWxlKCcvaG9tZS9iaXRuYW1pL2FwcHMvam9ibW9zaXMtc3RhZ2luZy9jLW5leHQvZGlzdC9zZXJ2ZXIvcHJvZC9wdWJsaWMvdXNhZ2VkZXRhaWwuY3N2JywgY3N2LCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcclxuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGdlbmVyYXRlQ2FuZGlkYXRlRGV0YWlsRmlsZShyZXN1bHQ6IGFueSwgY2FsbGJhY2s6IChlcnI6IGFueSwgcmVzOiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiaW5zaWRlIGdlbmVyYXRlIGZpbGVcIik7XHJcbiAgICBpZiAocmVzdWx0LmNhbmRpZGF0ZSAmJiByZXN1bHQuY2FuZGlkYXRlLmxlbmd0aCA+IDApIHtcclxuICAgICAgbGV0IGZpZWxkcyA9IFsnZmlyc3RfbmFtZScsICdsYXN0X25hbWUnLCAnbW9iaWxlX251bWJlcicsICdlbWFpbCcsICdpc0FjdGl2YXRlZCcsICdkYXRhLmxvY2F0aW9uLmNpdHknLFxyXG4gICAgICAgICdkYXRhLnByb2Zlc3Npb25hbERldGFpbHMuZWR1Y2F0aW9uJywgJ2RhdGEucHJvZmVzc2lvbmFsRGV0YWlscy5leHBlcmllbmNlJyxcclxuICAgICAgICAnZGF0YS5wcm9mZXNzaW9uYWxEZXRhaWxzLmN1cnJlbnRTYWxhcnknLCAnZGF0YS5wcm9mZXNzaW9uYWxEZXRhaWxzLm5vdGljZVBlcmlvZCcsXHJcbiAgICAgICAgJ2RhdGEucHJvZmVzc2lvbmFsRGV0YWlscy5yZWxvY2F0ZScsICdkYXRhLnByb2Zlc3Npb25hbERldGFpbHMuaW5kdXN0cnlFeHBvc3VyZScsXHJcbiAgICAgICAgJ2RhdGEucHJvZmVzc2lvbmFsRGV0YWlscy5jdXJyZW50Q29tcGFueScsICdkYXRhLmlzQ29tcGxldGVkJywgJ2RhdGEuaXNTdWJtaXR0ZWQnLCAnZGF0YS5pc1Zpc2libGUnLFxyXG4gICAgICAgICdkYXRhLmtleVNraWxscycsICdkYXRhLmluZHVzdHJ5Lm5hbWUnLCAnZGF0YS5yb2xlcycsICdkYXRhLmNhcGFiaWxpdHlNYXRyaXguY2FwYWJpbGl0eUNvZGUnLFxyXG4gICAgICAgICdkYXRhLmNhcGFiaWxpdHlNYXRyaXguY29tcGxleGl0eUNvZGUnLCAnZGF0YS5jYXBhYmlsaXR5TWF0cml4LnNjZW5lcmlvQ29kZSddO1xyXG4gICAgICBsZXQgZmllbGROYW1lcyA9IFsnRmlyc3QgTmFtZScsICdMYXN0IE5hbWUnLCAnTW9iaWxlIE51bWJlcicsICdFbWFpbCcsICdJcyBBY3RpdmF0ZWQnLCAnQ2l0eScsICdFZHVjYXRpb24nLFxyXG4gICAgICAgICdFeHBlcmllbmNlJywgJ0N1cnJlbnQgU2FsYXJ5JywgJ05vdGljZSBQZXJpb2QnLCAnUmVhZHkgVG8gUmVsb2NhdGUnLCAnSW5kdXN0cnkgRXhwb3N1cmUnLCAnQ3VycmVudCBDb21wYW55JyxcclxuICAgICAgICAnSXMgQ29tcGxldGVkJywgJ0lzIFN1Ym1pdHRlZCcsICdJcyBWaXNpYmxlJywgJ0tleSBTa2lsbHMnLCAnSW5kdXN0cnknLCAnUm9sZScsICdDYXBhYmlsaXR5IENvZGUnLFxyXG4gICAgICAgICdDb21wbGV4aXR5IENvZGUnLCAnU2NlbmFyaW8gQ29kZSddO1xyXG5cclxuICAgICAgLypsZXQgY3N2ID0ganNvbjJjc3Yoe1xyXG4gICAgICAgZGF0YTogcmVzdWx0LmNhbmRpZGF0ZSwgZmllbGRzOiBmaWVsZHMsIGZpZWxkTmFtZXM6IGZpZWxkTmFtZXMsXHJcbiAgICAgICB1bndpbmRQYXRoOiBbJ2RhdGEuY2FwYWJpbGl0eU1hdHJpeCddXHJcbiAgICAgICB9KTtcclxuICAgICAgIGNvbnNvbGUubG9nKFwid3JpdGluZyBpbnRvIGZpbGUgZmlsZVwiKTtcclxuICAgICAgIC8vZnMud3JpdGVGaWxlKCcuL3NyYy9zZXJ2ZXIvcHVibGljL2NhbmRpZGF0ZS5jc3YnLCBjc3YsIGZ1bmN0aW9uIChlcnI6IGFueSkge1xyXG4gICAgICAgZnMud3JpdGVGaWxlKCcvaG9tZS9iaXRuYW1pL2FwcHMvam9ibW9zaXMtc3RhZ2luZy9jLW5leHQvZGlzdC9zZXJ2ZXIvcHJvZC9wdWJsaWMvY2FuZGlkYXRlLmNzdicsIGNzdiwgZnVuY3Rpb24gKGVycjogYW55KSB7XHJcbiAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XHJcbiAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xyXG4gICAgICAgfSk7Ki9cclxuXHJcbiAgICAgIGxldCB0ZW1wU3RyaW5nOiBzdHJpbmcgPSAnJztcclxuICAgICAgbGV0IGNvdW50ID0gMDtcclxuICAgICAgbGV0IGNhbmRpZGF0ZUxlbmd0aCA9IHJlc3VsdC5jYW5kaWRhdGUubGVuZ3RoO1xyXG4gICAgICBmb3IgKGxldCBjYW5kaWRhdGUgb2YgcmVzdWx0LmNhbmRpZGF0ZSkge1xyXG4gICAgICAgIHRlbXBTdHJpbmcgPSBqc29uMmNzdih7XHJcbiAgICAgICAgICBkYXRhOiBjYW5kaWRhdGUsIGZpZWxkczogZmllbGRzLCBmaWVsZE5hbWVzOiBmaWVsZE5hbWVzLFxyXG4gICAgICAgICAgdW53aW5kUGF0aDogWydkYXRhLmNhcGFiaWxpdHlNYXRyaXgnXVxyXG4gICAgICAgIH0sIChlcnI6IGFueSwgcmVzdWx0OiBhbnkpID0+IHtcclxuICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICB0ZW1wU3RyaW5nICs9IHJlc3VsdDtcclxuICAgICAgICAgIGlmIChjb3VudCA9PSBjYW5kaWRhdGVMZW5ndGgpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ3cml0aW5nIGludG8gZmlsZSBmaWxlXCIpO1xyXG4gICAgICAgICAgICAvL2ZzLndyaXRlRmlsZSgnLi9zcmMvc2VydmVyL3B1YmxpYy9jYW5kaWRhdGUuY3N2JywgdGVtcFN0cmluZywgKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgZnMud3JpdGVGaWxlKCcvaG9tZS9iaXRuYW1pL2FwcHMvam9ibW9zaXMtc3RhZ2luZy9jLW5leHQvZGlzdC9zZXJ2ZXIvcHJvZC9wdWJsaWMvY2FuZGlkYXRlLmNzdicsIHRlbXBTdHJpbmcsIGZ1bmN0aW9uIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG5cclxuICAgICAgLypsZXQgdGVtcFN0cmluZzogc3RyaW5nID0gJyc7XHJcbiAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgbGV0IGNhbmRpZGF0ZUxlbmd0aCA9IHJlc3VsdC5jYW5kaWRhdGUubGVuZ3RoO1xyXG4gICAgICAgZm9yKHZhciBpPTA7IGk8PWNhbmRpZGF0ZUxlbmd0aDspIHtcclxuICAgICAgIGNvbnNvbGUubG9nKFwiRW50ZXIgY291bnQ6XCIgKyBpKTtcclxuICAgICAgIGxldCB0ZW1wQ2FuZGlkYXRlID0gcmVzdWx0LmNhbmRpZGF0ZS5zcGxpY2UoaSwxMDApO1xyXG4gICAgICAgdGVtcFN0cmluZyA9IGpzb24yY3N2KHtcclxuICAgICAgIGRhdGE6IHRlbXBDYW5kaWRhdGUsIGZpZWxkczogZmllbGRzLCBmaWVsZE5hbWVzOiBmaWVsZE5hbWVzLFxyXG4gICAgICAgdW53aW5kUGF0aDogWydkYXRhLmNhcGFiaWxpdHlNYXRyaXgnXVxyXG4gICAgICAgfSwgKGVycjogYW55LHJlc3VsdDogYW55KSA9PiB7XHJcbiAgICAgICBjb25zb2xlLmxvZyhcIkNTViBjb3VudDpcIiArIGNvdW50KTtcclxuICAgICAgIGNvdW50ID0gY291bnQgKyAxMDA7XHJcbiAgICAgICB0ZW1wU3RyaW5nICs9IHJlc3VsdDtcclxuICAgICAgIGlmKGNvdW50ID09IGNhbmRpZGF0ZUxlbmd0aCkge1xyXG4gICAgICAgY29uc29sZS5sb2coXCJ3cml0aW5nIGludG8gZmlsZSBmaWxlXCIpO1xyXG4gICAgICAgZnMud3JpdGVGaWxlKCcuL3NyYy9zZXJ2ZXIvcHVibGljL2NhbmRpZGF0ZS5jc3YnLCB0ZW1wU3RyaW5nLCAoZXJyOiBhbnkpID0+IHtcclxuICAgICAgIC8vZnMud3JpdGVGaWxlKCcvaG9tZS9iaXRuYW1pL2FwcHMvam9ibW9zaXMtc3RhZ2luZy9jLW5leHQvZGlzdC9zZXJ2ZXIvcHJvZC9wdWJsaWMvY2FuZGlkYXRlLmNzdicsIGNzdiwgZnVuY3Rpb24gKGVycjogYW55KSB7XHJcbiAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XHJcbiAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xyXG4gICAgICAgfSk7XHJcbiAgICAgICB9XHJcbiAgICAgICB9KVxyXG4gICAgICAgaT1pKzEwMDtcclxuICAgICAgIH0qL1xyXG5cclxuXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGdlbmVyYXRlUmVjcnVpdGVyRGV0YWlsRmlsZShyZXN1bHQ6IGFueSwgY2FsbGJhY2s6IChlcnI6IGFueSwgcmVzOiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiaW5zaWRlIGdlbmVyYXRlIGZpbGVcIik7XHJcbiAgICBpZiAocmVzdWx0LnJlY3J1aXRlciAmJiByZXN1bHQucmVjcnVpdGVyLmxlbmd0aCA+IDApIHtcclxuICAgICAgbGV0IGZpZWxkcyA9IFsnZGF0YS5jb21wYW55X25hbWUnLCAnZGF0YS5jb21wYW55X3NpemUnLCAnZGF0YS5pc1JlY3J1aXRpbmdGb3JzZWxmJyxcclxuICAgICAgICAnZGF0YS5udW1iZXJPZkpvYnNQb3N0ZWQnLCAnbW9iaWxlX251bWJlcicsICdlbWFpbCcsICdpc0FjdGl2YXRlZCcsICdkYXRhLnBvc3RlZEpvYnMuaXNKb2JQb3N0ZWQnLFxyXG4gICAgICAgICdkYXRhLnBvc3RlZEpvYnMuam9iVGl0bGUnLCAnZGF0YS5wb3N0ZWRKb2JzLmhpcmluZ01hbmFnZXInLCAnZGF0YS5wb3N0ZWRKb2JzLmRlcGFydG1lbnQnLFxyXG4gICAgICAgICdkYXRhLnBvc3RlZEpvYnMuZWR1Y2F0aW9uJywgJ2RhdGEucG9zdGVkSm9icy5leHBlcmllbmNlTWluVmFsdWUnLCAnZGF0YS5wb3N0ZWRKb2JzLmV4cGVyaWVuY2VNYXhWYWx1ZScsXHJcbiAgICAgICAgJ2RhdGEucG9zdGVkSm9icy5zYWxhcnlNaW5WYWx1ZScsICdkYXRhLnBvc3RlZEpvYnMuc2FsYXJ5TWF4VmFsdWUnLCAnZGF0YS5wb3N0ZWRKb2JzLmpvaW5pbmdQZXJpb2QnLFxyXG4gICAgICAgICdkYXRhLnBvc3RlZEpvYnMua2V5U2tpbGxzJywgJ2RhdGEucG9zdGVkSm9icy5hZGRpdGlvbmFsS2V5U2tpbGxzJywgJ2RhdGEucG9zdGVkSm9icy5pbmR1c3RyeS5uYW1lJyxcclxuICAgICAgICAnZGF0YS5wb3N0ZWRKb2JzLnJvbGVzJywgJ2RhdGEucG9zdGVkSm9icy5jYXBhYmlsaXR5TWF0cml4LmNhcGFiaWxpdHlDb2RlJyxcclxuICAgICAgICAnZGF0YS5wb3N0ZWRKb2JzLmNhcGFiaWxpdHlNYXRyaXguY29tcGxleGl0eUNvZGUnLCAnZGF0YS5wb3N0ZWRKb2JzLmNhcGFiaWxpdHlNYXRyaXguc2NlbmVyaW9Db2RlJyxcclxuICAgICAgICAnZGF0YS5wb3N0ZWRKb2JzLnBvc3RpbmdEYXRlJywgJ2RhdGEucG9zdGVkSm9icy5leHBpcmluZ0RhdGUnXTtcclxuXHJcbiAgICAgIGxldCBmaWVsZE5hbWVzID0gWydDb21wYW55IE5hbWUnLCAnY29tcGFueSBzaXplJywgJ1JlY3J1aXRpbmcgRm9yIFNlbGYnLCAnTnVtYmVyIG9mIEpvYiBQb3N0ZWQnLCAnTW9iaWxlIE51bWJlcicsXHJcbiAgICAgICAgJ0VtYWlsJywgJ0lzIEFjdGl2YXRlZCcsICdJcyBKb2IgUG9zdGVkJywgJ0pvYiBUaXRsZScsICdIaXJpbmcgTWFuYWdlcicsICdEZXBhcnRtZW50JywgJ0VkdWNhdGlvbicsXHJcbiAgICAgICAgJ0V4cGVyaWVuY2UgTWluVmFsdWUnLCAnRXhwZXJpZW5jZSBNYXhWYWx1ZScsICdTYWxhcnkgTWluVmFsdWUnLCAnU2FsYXJ5IE1heFZhbHVlJywgJ0pvaW5pbmcgUGVyaW9kJyxcclxuICAgICAgICAnS2V5IFNraWxscycsICdBZGRpdGlvbmFsIEtleSBTa2lsbHMnLCAnSW5kdXN0cnknLCAnUm9sZScsICdDYXBhYmlsaXR5IENvZGUnLFxyXG4gICAgICAgICdDb21wbGV4aXR5IENvZGUnLCAnU2NlbmFyaW8gQ29kZScsICdQb3N0aW5nIERhdGUnLCAnRXhwaXJpbmcgRGF0ZSddO1xyXG4gICAgICAvKmxldCBjc3YgPSBqc29uMmNzdih7XHJcbiAgICAgICBkYXRhOiByZXN1bHQucmVjcnVpdGVyLFxyXG4gICAgICAgZmllbGRzOiBmaWVsZHMsXHJcbiAgICAgICBmaWVsZE5hbWVzOiBmaWVsZE5hbWVzLFxyXG4gICAgICAgdW53aW5kUGF0aDogWydkYXRhLnBvc3RlZEpvYnMnLCAnZGF0YS5wb3N0ZWRKb2JzLmNhcGFiaWxpdHlNYXRyaXgnXVxyXG4gICAgICAgfSk7XHJcbiAgICAgICBmcy53cml0ZUZpbGUoJy4vc3JjL3NlcnZlci9wdWJsaWMvcmVjcnVpdGVyLmNzdicsIGNzdiwgZnVuY3Rpb24gKGVycjogYW55KSB7XHJcbiAgICAgICAvL2ZzLndyaXRlRmlsZSgnL2hvbWUvYml0bmFtaS9hcHBzL2pvYm1vc2lzLXN0YWdpbmcvYy1uZXh0L2Rpc3Qvc2VydmVyL3Byb2QvcHVibGljL3JlY3J1aXRlci5jc3YnLCBjc3YsIGZ1bmN0aW9uIChlcnI6IGFueSkge1xyXG4gICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xyXG4gICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcclxuICAgICAgIH0pOyovXHJcblxyXG5cclxuICAgICAgbGV0IHRlbXBTdHJpbmc6IHN0cmluZyA9ICcnO1xyXG4gICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICBsZXQgcmVjcnVpdGVyTGVuZ3RoID0gcmVzdWx0LnJlY3J1aXRlci5sZW5ndGg7XHJcbiAgICAgIGZvciAobGV0IHJlY3J1aXRlciBvZiByZXN1bHQucmVjcnVpdGVyKSB7XHJcbiAgICAgICAgdGVtcFN0cmluZyA9IGpzb24yY3N2KHtcclxuICAgICAgICAgIGRhdGE6IHJlY3J1aXRlciwgZmllbGRzOiBmaWVsZHMsIGZpZWxkTmFtZXM6IGZpZWxkTmFtZXMsXHJcbiAgICAgICAgICB1bndpbmRQYXRoOiBbJ2RhdGEucG9zdGVkSm9icycsICdkYXRhLnBvc3RlZEpvYnMuY2FwYWJpbGl0eU1hdHJpeCddXHJcbiAgICAgICAgfSwgKGVycjogYW55LCByZXN1bHQ6IGFueSkgPT4ge1xyXG4gICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgIHRlbXBTdHJpbmcgKz0gcmVzdWx0O1xyXG4gICAgICAgICAgaWYgKGNvdW50ID09IHJlY3J1aXRlckxlbmd0aCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIndyaXRpbmcgaW50byBmaWxlIGZpbGVcIik7XHJcbiAgICAgICAgICAgIC8vZnMud3JpdGVGaWxlKCcuL3NyYy9zZXJ2ZXIvcHVibGljL3JlY3J1aXRlci5jc3YnLCB0ZW1wU3RyaW5nLCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICBmcy53cml0ZUZpbGUoJy9ob21lL2JpdG5hbWkvYXBwcy9qb2Jtb3Npcy1zdGFnaW5nL2MtbmV4dC9kaXN0L3NlcnZlci9wcm9kL3B1YmxpYy9yZWNydWl0ZXIuY3N2JywgdGVtcFN0cmluZywgZnVuY3Rpb24gKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xyXG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBzZW5kQWRtaW5Mb2dpbkluZm9NYWlsKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxldCBoZWFkZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvaGVhZGVyMS5odG1sJykudG9TdHJpbmcoKTtcclxuICAgIGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvYWRtaW5sb2dpbmluZm8ubWFpbC5odG1sJykudG9TdHJpbmcoKTtcclxuICAgIGxldCBmb290ZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvZm9vdGVyMS5odG1sJykudG9TdHJpbmcoKTtcclxuICAgIGxldCBtaWRfY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgnJGVtYWlsJCcsIGZpZWxkLmVtYWlsKS5yZXBsYWNlKCckYWRkcmVzcyQnLCAoZmllbGQubG9jYXRpb24gPT09IHVuZGVmaW5lZCkgPyAnTm90IEZvdW5kJyA6IGZpZWxkLmxvY2F0aW9uKVxyXG4gICAgICAucmVwbGFjZSgnJGlwJCcsIGZpZWxkLmlwKS5yZXBsYWNlKCckaG9zdCQnLCBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuaG9zdCcpKTtcclxuXHJcblxyXG4gICAgbGV0IG1haWxPcHRpb25zID0ge1xyXG4gICAgICBmcm9tOiBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuTUFJTF9TRU5ERVInKSxcclxuICAgICAgdG86IGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5BRE1JTl9NQUlMJyksXHJcbiAgICAgIGNjOiBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuVFBMR1JPVVBfTUFJTCcpLFxyXG4gICAgICBzdWJqZWN0OiBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX0FETUlOX0xPR0dFRF9PTiArIFwiIFwiICsgY29uZmlnLmdldCgnVHBsU2VlZC5tYWlsLmhvc3QnKSxcclxuICAgICAgaHRtbDogaGVhZGVyMSArIG1pZF9jb250ZW50ICsgZm9vdGVyMVxyXG4gICAgICAsIGF0dGFjaG1lbnRzOiBNYWlsQXR0YWNobWVudHMuQXR0YWNobWVudEFycmF5XHJcbiAgICB9XHJcbiAgICBsZXQgc2VuZE1haWxTZXJ2aWNlID0gbmV3IFNlbmRNYWlsU2VydmljZSgpO1xyXG4gICAgc2VuZE1haWxTZXJ2aWNlLnNlbmRNYWlsKG1haWxPcHRpb25zLCBjYWxsYmFjayk7XHJcblxyXG4gIH07XHJcblxyXG4gIHVwZGF0ZVVzZXIoX2lkOiBzdHJpbmcsIGl0ZW06IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kQnlJZChfaWQsIChlcnI6IGFueSwgcmVzOiBhbnkpID0+IHtcclxuICAgICAgaWYgKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgcmVzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnVwZGF0ZShyZXMuX2lkLCBpdGVtLCBjYWxsYmFjayk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIGdldFVzYWdlRGV0YWlscyhmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICB0aGlzLnVzZXNUcmFja2luZ0NvbnRyb2xsZXIucmV0cmlldmVBbGwoKGVycjogYW55LCByZXM6IGFueSkgPT4ge1xyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG59XHJcblxyXG5PYmplY3Quc2VhbChBZG1pblNlcnZpY2UpO1xyXG5leHBvcnQgPSBBZG1pblNlcnZpY2U7XHJcbiJdfQ==
