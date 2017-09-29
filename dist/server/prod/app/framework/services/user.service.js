"use strict";
var UserRepository = require("../dataaccess/repository/user.repository");
var SendMailService = require("./sendmail.service");
var SendMessageService = require("./sendmessage.service");
var fs = require("fs");
var mongoose = require("mongoose");
var config = require('config');
var Messages = require("../shared/messages");
var AuthInterceptor = require("../../framework/interceptor/auth.interceptor");
var ProjectAsset = require("../shared/projectasset");
var MailAttachments = require("../shared/sharedarray");
var RecruiterRepository = require("../dataaccess/repository/recruiter.repository");
var UserService = (function () {
    function UserService() {
        this.userRepository = new UserRepository();
        this.recruiterRepository = new RecruiterRepository();
        this.APP_NAME = ProjectAsset.APP_NAME;
    }
    UserService.prototype.createUser = function (item, callback) {
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
                _this.userRepository.create(item, function (err, res) {
                    if (err) {
                        callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
                    }
                    else {
                        callback(null, res);
                    }
                });
            }
        });
    };
    ;
    UserService.prototype.generateOtp = function (field, callback) {
        var _this = this;
        this.userRepository.retrieve({ 'mobile_number': field.new_mobile_number, 'isActivated': true }, function (err, res) {
            if (err) {
                console.log('err genrtotp retriv', err);
            }
            else if (res.length > 0 && (res[0]._id) !== field._id) {
                callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
            }
            else if (res.length === 0) {
                var query = { '_id': field._id };
                var otp_1 = Math.floor((Math.random() * 99999) + 100000);
                var updateData = { 'mobile_number': field.new_mobile_number, 'otp': otp_1 };
                _this.userRepository.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
                    if (error) {
                        callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
                    }
                    else {
                        var Data = {
                            mobileNo: field.new_mobile_number,
                            otp: otp_1
                        };
                        var sendMessageService = new SendMessageService();
                        sendMessageService.sendMessageDirect(Data, callback);
                    }
                });
            }
            else {
                callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
            }
        });
    };
    UserService.prototype.changeMobileNumber = function (field, callback) {
        var query = { '_id': field._id };
        var otp = Math.floor((Math.random() * 99999) + 100000);
        var updateData = { 'otp': otp, 'temp_mobile': field.new_mobile_number };
        this.userRepository.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
            if (error) {
                callback(new Error(Messages.MSG_ERROR_REGISTRATION), null);
            }
            else {
                var Data = {
                    current_mobile_number: field.current_mobile_number,
                    mobileNo: field.new_mobile_number,
                    otp: otp
                };
                var sendMessageService = new SendMessageService();
                sendMessageService.sendChangeMobileMessage(Data, callback);
            }
        });
    };
    UserService.prototype.forgotPassword = function (field, callback) {
        var _this = this;
        this.userRepository.retrieve({ 'email': field.email }, function (err, res) {
            if (res.length > 0 && res[0].isActivated === true) {
                var header1_1 = fs.readFileSync('./src/server/app/framework/public/header1.html').toString();
                var content_1 = fs.readFileSync('./src/server/app/framework/public/forgotpassword.html').toString();
                var footer1_1 = fs.readFileSync('./src/server/app/framework/public/footer1.html').toString();
                var auth = new AuthInterceptor();
                var token = auth.issueTokenWithUid(res[0]);
                var host = config.get('TplSeed.mail.host');
                console.log('frgt pwd host', host);
                var link_1 = host + 'reset_password?access_token=' + token + '&_id=' + res[0]._id;
                if (res[0].isCandidate === true) {
                    _this.mid_content = content_1.replace('$link$', link_1).replace('$first_name$', res[0].first_name).replace('$app_name$', _this.APP_NAME);
                    var mailOptions = {
                        from: config.get('TplSeed.mail.MAIL_SENDER'),
                        to: field.email,
                        subject: Messages.EMAIL_SUBJECT_FORGOT_PASSWORD,
                        html: header1_1 + _this.mid_content + footer1_1,
                        attachments: MailAttachments.AttachmentArray
                    };
                    var sendMailService = new SendMailService();
                    sendMailService.sendMail(mailOptions, callback);
                }
                else {
                    _this.recruiterRepository.retrieve({ 'userId': new mongoose.Types.ObjectId(res[0]._id) }, function (err, recruiter) {
                        if (err) {
                            callback(err, null);
                        }
                        else {
                            _this.company_name = recruiter[0].company_name;
                            _this.mid_content = content_1.replace('$link$', link_1).replace('$first_name$', _this.company_name).replace('$app_name$', _this.APP_NAME);
                            var mailOptions = {
                                from: config.get('TplSeed.mail.MAIL_SENDER'),
                                to: field.email,
                                subject: Messages.EMAIL_SUBJECT_FORGOT_PASSWORD,
                                html: header1_1 + _this.mid_content + footer1_1,
                                attachments: MailAttachments.AttachmentArray
                            };
                            var sendMailService = new SendMailService();
                            sendMailService.sendMail(mailOptions, callback);
                        }
                    });
                }
            }
            else if (res.length > 0 && res[0].isActivated === false) {
                callback(new Error(Messages.MSG_ERROR_ACCOUNT_STATUS), res);
            }
            else {
                callback(new Error(Messages.MSG_ERROR_USER_NOT_FOUND), res);
            }
        });
    };
    UserService.prototype.SendChangeMailVerification = function (field, callback) {
        var query = { 'email': field.current_email, 'isActivated': true };
        var updateData = { 'temp_email': field.new_email };
        this.userRepository.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
            if (error) {
                callback(new Error(Messages.MSG_ERROR_EMAIL_ACTIVE_NOW), null);
            }
            else {
                var auth = new AuthInterceptor();
                var token = auth.issueTokenWithUid(result);
                var host = config.get('TplSeed.mail.host');
                var link = host + 'activate_user?access_token=' + token + '&_id=' + result._id;
                var header1 = fs.readFileSync('./src/server/app/framework/public/header1.html').toString();
                var content = fs.readFileSync('./src/server/app/framework/public/change.mail.html').toString();
                var footer1 = fs.readFileSync('./src/server/app/framework/public/footer1.html').toString();
                var mid_content = content.replace('$link$', link);
                var mailOptions = {
                    from: config.get('TplSeed.mail.MAIL_SENDER'),
                    to: field.new_email,
                    subject: Messages.EMAIL_SUBJECT_CHANGE_EMAILID,
                    html: header1 + mid_content + footer1,
                    attachments: MailAttachments.AttachmentArray
                };
                var sendMailService = new SendMailService();
                sendMailService.sendMail(mailOptions, callback);
            }
        });
    };
    UserService.prototype.sendVerificationMail = function (field, callback) {
        var _this = this;
        this.userRepository.retrieve({ 'email': field.email }, function (err, res) {
            if (res.length > 0) {
                _this.recruiterRepository.retrieve({ 'userId': new mongoose.Types.ObjectId(res[0]._id) }, function (err, recruiter) {
                    if (err) {
                        callback(err, null);
                    }
                    else {
                        _this.company_name = recruiter[0].company_name;
                        var auth = new AuthInterceptor();
                        var token = auth.issueTokenWithUid(recruiter[0]);
                        var host = config.get('TplSeed.mail.host');
                        var link = host + 'company_details?access_token=' + token + '&_id=' + res[0]._id + '&companyName=' + _this.company_name;
                        var header1 = fs.readFileSync('./src/server/app/framework/public/header1.html').toString();
                        var content = fs.readFileSync('./src/server/app/framework/public/recruiter.mail.html').toString();
                        var footer1 = fs.readFileSync('./src/server/app/framework/public/footer1.html').toString();
                        var mid_content = content.replace('$link$', link);
                        var mailOptions = {
                            from: config.get('TplSeed.mail.MAIL_SENDER'),
                            to: field.email,
                            subject: Messages.EMAIL_SUBJECT_REGISTRATION,
                            html: header1 + mid_content + footer1,
                            attachments: MailAttachments.AttachmentArray
                        };
                        var sendMailService = new SendMailService();
                        sendMailService.sendMail(mailOptions, callback);
                    }
                });
            }
            else {
                callback(new Error(Messages.MSG_ERROR_USER_NOT_FOUND), res);
            }
        });
    };
    UserService.prototype.sendRecruiterVerificationMail = function (field, callback) {
        this.userRepository.retrieve({ 'email': field.email }, function (err, res) {
            if (res.length > 0) {
                var auth = new AuthInterceptor();
                var token = auth.issueTokenWithUid(res[0]);
                var host = config.get('TplSeed.mail.host');
                var link = host + 'activate_user?access_token=' + token + '&_id=' + res[0]._id;
                var header1 = fs.readFileSync('./src/server/app/framework/public/header1.html').toString();
                var content = fs.readFileSync('./src/server/app/framework/public/recruiter.mail.html').toString();
                var footer1 = fs.readFileSync('./src/server/app/framework/public/footer1.html').toString();
                var mid_content = content.replace('$link$', link);
                var mailOptions = {
                    from: config.get('TplSeed.mail.MAIL_SENDER'),
                    to: field.email,
                    subject: Messages.EMAIL_SUBJECT_REGISTRATION,
                    html: header1 + mid_content + footer1,
                    attachments: MailAttachments.AttachmentArray
                };
                var sendMailService = new SendMailService();
                sendMailService.sendMail(mailOptions, callback);
            }
            else {
                callback(new Error(Messages.MSG_ERROR_USER_NOT_FOUND), res);
            }
        });
    };
    UserService.prototype.sendMail = function (field, callback) {
        var header1 = fs.readFileSync('./src/server/app/framework/public/header1.html').toString();
        var content = fs.readFileSync('./src/server/app/framework/public/contactus.mail.html').toString();
        var footer1 = fs.readFileSync('./src/server/app/framework/public/footer1.html').toString();
        var mid_content = content.replace('$first_name$', field.first_name).replace('$email$', field.email).replace('$message$', field.message);
        var to = config.get('TplSeed.mail.ADMIN_MAIL');
        var mailOptions = {
            from: config.get('TplSeed.mail.MAIL_SENDER'),
            to: to,
            subject: Messages.EMAIL_SUBJECT_USER_CONTACTED_YOU,
            html: header1 + mid_content + footer1,
            attachments: MailAttachments.AttachmentArray
        };
        var sendMailService = new SendMailService();
        sendMailService.sendMail(mailOptions, callback);
    };
    UserService.prototype.sendMailOnError = function (errorInfo, callback) {
        var current_Time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        var header1 = fs.readFileSync('./src/server/app/framework/public/header1.html').toString();
        var content = fs.readFileSync('./src/server/app/framework/public/error.mail.html').toString();
        var footer1 = fs.readFileSync('./src/server/app/framework/public/footer1.html').toString();
        var mid_content = content.replace('$time$', current_Time).replace('$host$', config.get('TplSeed.mail.host')).replace('$reason$', errorInfo.reason).replace('$code$', errorInfo.code).replace('$message$', errorInfo.message);
        var mailOptions = {
            from: config.get('TplSeed.mail.MAIL_SENDER'),
            to: config.get('TplSeed.mail.ADMIN_MAIL'),
            cc: config.get('TplSeed.mail.TPLGROUP_MAIL'),
            subject: Messages.EMAIL_SUBJECT_SERVER_ERROR + ' on ' + config.get('TplSeed.mail.host'),
            html: header1 + mid_content + footer1,
            attachments: MailAttachments.AttachmentArray
        };
        var sendMailService = new SendMailService();
        sendMailService.sendMail(mailOptions, callback);
    };
    UserService.prototype.findById = function (id, callback) {
        this.userRepository.findById(id, callback);
    };
    UserService.prototype.retrieve = function (field, callback) {
        this.userRepository.retrieveWithoutLean(field, callback);
    };
    UserService.prototype.retrieveWithLean = function (field, callback) {
        this.userRepository.retrieve(field, callback);
    };
    UserService.prototype.retrieveAll = function (item, callback) {
        this.userRepository.retrieve(item, function (err, res) {
            if (err) {
                callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
            }
            else {
                callback(null, res);
            }
        });
    };
    ;
    UserService.prototype.update = function (_id, item, callback) {
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
    UserService.prototype.delete = function (_id, callback) {
        this.userRepository.delete(_id, callback);
    };
    UserService.prototype.findOneAndUpdate = function (query, newData, options, callback) {
        this.userRepository.findOneAndUpdate(query, newData, options, callback);
    };
    UserService.prototype.UploadImage = function (tempPath, fileName, cb) {
        var targetpath = fileName;
        fs.rename(tempPath, targetpath, function (err) {
            cb(null, tempPath);
        });
    };
    UserService.prototype.UploadDocuments = function (tempPath, fileName, cb) {
        var targetpath = fileName;
        fs.rename(tempPath, targetpath, function (err) {
            cb(null, tempPath);
        });
    };
    UserService.prototype.findAndUpdateNotification = function (query, newData, options, callback) {
        this.userRepository.findOneAndUpdate(query, newData, options, callback);
    };
    UserService.prototype.retrieveBySortedOrder = function (query, projection, sortingQuery, callback) {
        this.userRepository.retrieveBySortedOrder(query, projection, sortingQuery, callback);
    };
    return UserService;
}());
Object.seal(UserService);
module.exports = UserService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvc2VydmljZXMvdXNlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx5RUFBNEU7QUFDNUUsb0RBQXVEO0FBQ3ZELDBEQUE2RDtBQUM3RCx1QkFBeUI7QUFDekIsbUNBQXFDO0FBQ3JDLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQiw2Q0FBZ0Q7QUFDaEQsOEVBQWlGO0FBQ2pGLHFEQUF3RDtBQUN4RCx1REFBMEQ7QUFDMUQsbUZBQXNGO0FBRXRGO0lBUUU7UUFDRSxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUNyRCxJQUFJLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUM7SUFDeEMsQ0FBQztJQUVELGdDQUFVLEdBQVYsVUFBVyxJQUFTLEVBQUUsUUFBMkM7UUFBakUsaUJBd0JDO1FBdkJDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUMsRUFBRSxVQUFDLEdBQUcsRUFBRSxHQUFHO1lBQzNELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ1IsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUUxQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsRUFBRSxJQUFJLENB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SUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pCLGlCQUFTLFdBQVcsQ0FBQyIsImZpbGUiOiJhcHAvZnJhbWV3b3JrL3NlcnZpY2VzL3VzZXIuc2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBVc2VyUmVwb3NpdG9yeSA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvcmVwb3NpdG9yeS91c2VyLnJlcG9zaXRvcnknKTtcbmltcG9ydCBTZW5kTWFpbFNlcnZpY2UgPSByZXF1aXJlKCcuL3NlbmRtYWlsLnNlcnZpY2UnKTtcbmltcG9ydCBTZW5kTWVzc2FnZVNlcnZpY2UgPSByZXF1aXJlKCcuL3NlbmRtZXNzYWdlLnNlcnZpY2UnKTtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgbW9uZ29vc2UgZnJvbSBcIm1vbmdvb3NlXCI7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XG5pbXBvcnQgTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9zaGFyZWQvbWVzc2FnZXMnKTtcbmltcG9ydCBBdXRoSW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi8uLi9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvcicpO1xuaW1wb3J0IFByb2plY3RBc3NldCA9IHJlcXVpcmUoJy4uL3NoYXJlZC9wcm9qZWN0YXNzZXQnKTtcbmltcG9ydCBNYWlsQXR0YWNobWVudHMgPSByZXF1aXJlKCcuLi9zaGFyZWQvc2hhcmVkYXJyYXknKTtcbmltcG9ydCBSZWNydWl0ZXJSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L3JlY3J1aXRlci5yZXBvc2l0b3J5Jyk7XG5cbmNsYXNzIFVzZXJTZXJ2aWNlIHtcbiAgQVBQX05BTUU6IHN0cmluZztcbiAgY29tcGFueV9uYW1lOiBzdHJpbmc7XG4gIG1pZF9jb250ZW50OiBhbnk7XG4gIHByaXZhdGUgdXNlclJlcG9zaXRvcnk6IFVzZXJSZXBvc2l0b3J5O1xuICBwcml2YXRlIHJlY3J1aXRlclJlcG9zaXRvcnk6IFJlY3J1aXRlclJlcG9zaXRvcnk7XG5cblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5ID0gbmV3IFVzZXJSZXBvc2l0b3J5KCk7XG4gICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5ID0gbmV3IFJlY3J1aXRlclJlcG9zaXRvcnkoKTtcbiAgICB0aGlzLkFQUF9OQU1FID0gUHJvamVjdEFzc2V0LkFQUF9OQU1FO1xuICB9XG5cbiAgY3JlYXRlVXNlcihpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKHsnZW1haWwnOiBpdGVtLmVtYWlsfSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihlcnIpLCBudWxsKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzLmxlbmd0aCA+IDApIHtcblxuICAgICAgICBpZiAocmVzWzBdLmlzQWN0aXZhdGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9SRUdJU1RSQVRJT04pLCBudWxsKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNbMF0uaXNBY3RpdmF0ZWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9WRVJJRllfQUNDT1VOVCksIG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudXNlclJlcG9zaXRvcnkuY3JlYXRlKGl0ZW0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfUkVHSVNUUkFUSU9OX01PQklMRV9OVU1CRVIpLCBudWxsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfSk7XG5cbiAgfTtcblxuXG4gIGdlbmVyYXRlT3RwKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKHsnbW9iaWxlX251bWJlcic6IGZpZWxkLm5ld19tb2JpbGVfbnVtYmVyLCAnaXNBY3RpdmF0ZWQnOiB0cnVlfSwgKGVyciwgcmVzKSA9PiB7XG5cbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VyciBnZW5ydG90cCByZXRyaXYnLCBlcnIpO1xuICAgICAgfSBlbHNlIGlmIChyZXMubGVuZ3RoID4gMCAmJiAocmVzWzBdLl9pZCkgIT09IGZpZWxkLl9pZCkge1xuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTl9NT0JJTEVfTlVNQkVSKSwgbnVsbCk7XG4gICAgICB9IGVsc2UgaWYgKHJlcy5sZW5ndGggPT09IDApIHtcblxuICAgICAgICBsZXQgcXVlcnkgPSB7J19pZCc6IGZpZWxkLl9pZH07XG4gICAgICAgIGxldCBvdHAgPSBNYXRoLmZsb29yKChNYXRoLnJhbmRvbSgpICogOTk5OTkpICsgMTAwMDAwKTtcbiAgICAgICAgLy8gdmFyIG90cCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMDAwMCAtIDEwMDApICsgMTAwMCk7XG4gICAgICAgIGxldCB1cGRhdGVEYXRhID0geydtb2JpbGVfbnVtYmVyJzogZmllbGQubmV3X21vYmlsZV9udW1iZXIsICdvdHAnOiBvdHB9O1xuICAgICAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9SRUdJU1RSQVRJT05fTU9CSUxFX05VTUJFUiksIG51bGwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgRGF0YSA9IHtcbiAgICAgICAgICAgICAgbW9iaWxlTm86IGZpZWxkLm5ld19tb2JpbGVfbnVtYmVyLFxuICAgICAgICAgICAgICBvdHA6IG90cFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGxldCBzZW5kTWVzc2FnZVNlcnZpY2UgPSBuZXcgU2VuZE1lc3NhZ2VTZXJ2aWNlKCk7XG4gICAgICAgICAgICBzZW5kTWVzc2FnZVNlcnZpY2Uuc2VuZE1lc3NhZ2VEaXJlY3QoRGF0YSwgY2FsbGJhY2spO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTl9NT0JJTEVfTlVNQkVSKSwgbnVsbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjaGFuZ2VNb2JpbGVOdW1iZXIoZmllbGQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuXG4gICAgbGV0IHF1ZXJ5ID0geydfaWQnOiBmaWVsZC5faWR9O1xuICAgIC8vIHZhciBvdHAgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMDAgLSAxMDAwKSArIDEwMDApO1xuICAgIGxldCBvdHAgPSBNYXRoLmZsb29yKChNYXRoLnJhbmRvbSgpICogOTk5OTkpICsgMTAwMDAwKTtcbiAgICBsZXQgdXBkYXRlRGF0YSA9IHsnb3RwJzogb3RwLCAndGVtcF9tb2JpbGUnOiBmaWVsZC5uZXdfbW9iaWxlX251bWJlcn07XG5cbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfUkVHSVNUUkFUSU9OKSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgRGF0YSA9IHtcbiAgICAgICAgICBjdXJyZW50X21vYmlsZV9udW1iZXI6IGZpZWxkLmN1cnJlbnRfbW9iaWxlX251bWJlcixcbiAgICAgICAgICBtb2JpbGVObzogZmllbGQubmV3X21vYmlsZV9udW1iZXIsXG4gICAgICAgICAgb3RwOiBvdHBcbiAgICAgICAgfTtcbiAgICAgICAgbGV0IHNlbmRNZXNzYWdlU2VydmljZSA9IG5ldyBTZW5kTWVzc2FnZVNlcnZpY2UoKTtcbiAgICAgICAgc2VuZE1lc3NhZ2VTZXJ2aWNlLnNlbmRDaGFuZ2VNb2JpbGVNZXNzYWdlKERhdGEsIGNhbGxiYWNrKTtcblxuICAgICAgfVxuICAgIH0pO1xuXG4gIH1cblxuICBmb3Jnb3RQYXNzd29yZChmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XG5cbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKHsnZW1haWwnOiBmaWVsZC5lbWFpbH0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgaWYgKHJlcy5sZW5ndGggPiAwICYmIHJlc1swXS5pc0FjdGl2YXRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICBsZXQgaGVhZGVyMSA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL2hlYWRlcjEuaHRtbCcpLnRvU3RyaW5nKCk7XG4gICAgICAgIGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvZm9yZ290cGFzc3dvcmQuaHRtbCcpLnRvU3RyaW5nKCk7XG4gICAgICAgIGxldCBmb290ZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvZm9vdGVyMS5odG1sJykudG9TdHJpbmcoKTtcblxuICAgICAgICBsZXQgYXV0aCA9IG5ldyBBdXRoSW50ZXJjZXB0b3IoKTtcbiAgICAgICAgbGV0IHRva2VuID0gYXV0aC5pc3N1ZVRva2VuV2l0aFVpZChyZXNbMF0pO1xuICAgICAgICBsZXQgaG9zdCA9IGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5ob3N0Jyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmcmd0IHB3ZCBob3N0JywgaG9zdCk7XG4gICAgICAgIGxldCBsaW5rID0gaG9zdCArICdyZXNldF9wYXNzd29yZD9hY2Nlc3NfdG9rZW49JyArIHRva2VuICsgJyZfaWQ9JyArIHJlc1swXS5faWQ7XG4gICAgICAgIGlmIChyZXNbMF0uaXNDYW5kaWRhdGUgPT09IHRydWUpIHtcbiAgICAgICAgICB0aGlzLm1pZF9jb250ZW50ID0gY29udGVudC5yZXBsYWNlKCckbGluayQnLCBsaW5rKS5yZXBsYWNlKCckZmlyc3RfbmFtZSQnLCByZXNbMF0uZmlyc3RfbmFtZSkucmVwbGFjZSgnJGFwcF9uYW1lJCcsIHRoaXMuQVBQX05BTUUpO1xuICAgICAgICAgIGxldCBtYWlsT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGZyb206IGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5NQUlMX1NFTkRFUicpLFxuICAgICAgICAgICAgdG86IGZpZWxkLmVtYWlsLFxuICAgICAgICAgICAgc3ViamVjdDogTWVzc2FnZXMuRU1BSUxfU1VCSkVDVF9GT1JHT1RfUEFTU1dPUkQsXG4gICAgICAgICAgICBodG1sOiBoZWFkZXIxICsgdGhpcy5taWRfY29udGVudCArIGZvb3RlcjFcbiAgICAgICAgICAgICwgYXR0YWNobWVudHM6IE1haWxBdHRhY2htZW50cy5BdHRhY2htZW50QXJyYXlcbiAgICAgICAgICB9O1xuICAgICAgICAgIGxldCBzZW5kTWFpbFNlcnZpY2UgPSBuZXcgU2VuZE1haWxTZXJ2aWNlKCk7XG4gICAgICAgICAgc2VuZE1haWxTZXJ2aWNlLnNlbmRNYWlsKG1haWxPcHRpb25zLCBjYWxsYmFjayk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnJlY3J1aXRlclJlcG9zaXRvcnkucmV0cmlldmUoeyd1c2VySWQnOiBuZXcgbW9uZ29vc2UuVHlwZXMuT2JqZWN0SWQocmVzWzBdLl9pZCl9LCAoZXJyLCByZWNydWl0ZXIpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMuY29tcGFueV9uYW1lID0gcmVjcnVpdGVyWzBdLmNvbXBhbnlfbmFtZTtcblxuICAgICAgICAgICAgICB0aGlzLm1pZF9jb250ZW50ID0gY29udGVudC5yZXBsYWNlKCckbGluayQnLCBsaW5rKS5yZXBsYWNlKCckZmlyc3RfbmFtZSQnLCB0aGlzLmNvbXBhbnlfbmFtZSkucmVwbGFjZSgnJGFwcF9uYW1lJCcsIHRoaXMuQVBQX05BTUUpO1xuXG4gICAgICAgICAgICAgIGxldCBtYWlsT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBmcm9tOiBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuTUFJTF9TRU5ERVInKSxcbiAgICAgICAgICAgICAgICB0bzogZmllbGQuZW1haWwsXG4gICAgICAgICAgICAgICAgc3ViamVjdDogTWVzc2FnZXMuRU1BSUxfU1VCSkVDVF9GT1JHT1RfUEFTU1dPUkQsXG4gICAgICAgICAgICAgICAgaHRtbDogaGVhZGVyMSArIHRoaXMubWlkX2NvbnRlbnQgKyBmb290ZXIxXG4gICAgICAgICAgICAgICAgLCBhdHRhY2htZW50czogTWFpbEF0dGFjaG1lbnRzLkF0dGFjaG1lbnRBcnJheVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBsZXQgc2VuZE1haWxTZXJ2aWNlID0gbmV3IFNlbmRNYWlsU2VydmljZSgpO1xuICAgICAgICAgICAgICBzZW5kTWFpbFNlcnZpY2Uuc2VuZE1haWwobWFpbE9wdGlvbnMsIGNhbGxiYWNrKTtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHJlcy5sZW5ndGggPiAwICYmIHJlc1swXS5pc0FjdGl2YXRlZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9BQ0NPVU5UX1NUQVRVUyksIHJlcyk7XG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfVVNFUl9OT1RfRk9VTkQpLCByZXMpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIH1cblxuXG4gIFNlbmRDaGFuZ2VNYWlsVmVyaWZpY2F0aW9uKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICBsZXQgcXVlcnkgPSB7J2VtYWlsJzogZmllbGQuY3VycmVudF9lbWFpbCwgJ2lzQWN0aXZhdGVkJzogdHJ1ZX07XG4gICAgbGV0IHVwZGF0ZURhdGEgPSB7J3RlbXBfZW1haWwnOiBmaWVsZC5uZXdfZW1haWx9O1xuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlRGF0YSwge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICBpZiAoZXJyb3IpIHtcblxuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX0VNQUlMX0FDVElWRV9OT1cpLCBudWxsKTtcblxuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBsZXQgYXV0aCA9IG5ldyBBdXRoSW50ZXJjZXB0b3IoKTtcbiAgICAgICAgbGV0IHRva2VuID0gYXV0aC5pc3N1ZVRva2VuV2l0aFVpZChyZXN1bHQpO1xuICAgICAgICBsZXQgaG9zdCA9IGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5ob3N0Jyk7XG4gICAgICAgIGxldCBsaW5rID0gaG9zdCArICdhY3RpdmF0ZV91c2VyP2FjY2Vzc190b2tlbj0nICsgdG9rZW4gKyAnJl9pZD0nICsgcmVzdWx0Ll9pZDtcbiAgICAgICAgbGV0IGhlYWRlcjEgPSBmcy5yZWFkRmlsZVN5bmMoJy4vc3JjL3NlcnZlci9hcHAvZnJhbWV3b3JrL3B1YmxpYy9oZWFkZXIxLmh0bWwnKS50b1N0cmluZygpO1xuICAgICAgICBsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL2NoYW5nZS5tYWlsLmh0bWwnKS50b1N0cmluZygpO1xuICAgICAgICBsZXQgZm9vdGVyMSA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL2Zvb3RlcjEuaHRtbCcpLnRvU3RyaW5nKCk7XG4gICAgICAgIGxldCBtaWRfY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgnJGxpbmskJywgbGluayk7XG5cbiAgICAgICAgbGV0IG1haWxPcHRpb25zID0ge1xuICAgICAgICAgIGZyb206IGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5NQUlMX1NFTkRFUicpLFxuICAgICAgICAgIHRvOiBmaWVsZC5uZXdfZW1haWwsXG4gICAgICAgICAgc3ViamVjdDogTWVzc2FnZXMuRU1BSUxfU1VCSkVDVF9DSEFOR0VfRU1BSUxJRCxcbiAgICAgICAgICBodG1sOiBoZWFkZXIxICsgbWlkX2NvbnRlbnQgKyBmb290ZXIxXG5cbiAgICAgICAgICAsIGF0dGFjaG1lbnRzOiBNYWlsQXR0YWNobWVudHMuQXR0YWNobWVudEFycmF5XG4gICAgICAgIH07XG4gICAgICAgIGxldCBzZW5kTWFpbFNlcnZpY2UgPSBuZXcgU2VuZE1haWxTZXJ2aWNlKCk7XG4gICAgICAgIHNlbmRNYWlsU2VydmljZS5zZW5kTWFpbChtYWlsT3B0aW9ucywgY2FsbGJhY2spO1xuXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuXG4gIHNlbmRWZXJpZmljYXRpb25NYWlsKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcblxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkucmV0cmlldmUoeydlbWFpbCc6IGZpZWxkLmVtYWlsfSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5LnJldHJpZXZlKHsndXNlcklkJzogbmV3IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkKHJlc1swXS5faWQpfSwgKGVyciwgcmVjcnVpdGVyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jb21wYW55X25hbWUgPSByZWNydWl0ZXJbMF0uY29tcGFueV9uYW1lO1xuXG4gICAgICAgICAgICBsZXQgYXV0aCA9IG5ldyBBdXRoSW50ZXJjZXB0b3IoKTtcbiAgICAgICAgICAgIGxldCB0b2tlbiA9IGF1dGguaXNzdWVUb2tlbldpdGhVaWQocmVjcnVpdGVyWzBdKTtcbiAgICAgICAgICAgIGxldCBob3N0ID0gY29uZmlnLmdldCgnVHBsU2VlZC5tYWlsLmhvc3QnKTtcbiAgICAgICAgICAgIGxldCBsaW5rID0gaG9zdCArICdjb21wYW55X2RldGFpbHM/YWNjZXNzX3Rva2VuPScgKyB0b2tlbiArICcmX2lkPScgKyByZXNbMF0uX2lkICsgJyZjb21wYW55TmFtZT0nICsgdGhpcy5jb21wYW55X25hbWU7XG4gICAgICAgICAgICBsZXQgaGVhZGVyMSA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL2hlYWRlcjEuaHRtbCcpLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL3JlY3J1aXRlci5tYWlsLmh0bWwnKS50b1N0cmluZygpO1xuICAgICAgICAgICAgbGV0IGZvb3RlcjEgPSBmcy5yZWFkRmlsZVN5bmMoJy4vc3JjL3NlcnZlci9hcHAvZnJhbWV3b3JrL3B1YmxpYy9mb290ZXIxLmh0bWwnKS50b1N0cmluZygpO1xuICAgICAgICAgICAgbGV0IG1pZF9jb250ZW50ID0gY29udGVudC5yZXBsYWNlKCckbGluayQnLCBsaW5rKTtcbiAgICAgICAgICAgIGxldCBtYWlsT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgZnJvbTogY29uZmlnLmdldCgnVHBsU2VlZC5tYWlsLk1BSUxfU0VOREVSJyksXG4gICAgICAgICAgICAgIHRvOiBmaWVsZC5lbWFpbCxcbiAgICAgICAgICAgICAgc3ViamVjdDogTWVzc2FnZXMuRU1BSUxfU1VCSkVDVF9SRUdJU1RSQVRJT04sXG4gICAgICAgICAgICAgIGh0bWw6IGhlYWRlcjEgKyBtaWRfY29udGVudCArIGZvb3RlcjFcbiAgICAgICAgICAgICAgLCBhdHRhY2htZW50czogTWFpbEF0dGFjaG1lbnRzLkF0dGFjaG1lbnRBcnJheVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGxldCBzZW5kTWFpbFNlcnZpY2UgPSBuZXcgU2VuZE1haWxTZXJ2aWNlKCk7XG4gICAgICAgICAgICBzZW5kTWFpbFNlcnZpY2Uuc2VuZE1haWwobWFpbE9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9VU0VSX05PVF9GT1VORCksIHJlcyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBzZW5kUmVjcnVpdGVyVmVyaWZpY2F0aW9uTWFpbChmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XG5cbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKHsnZW1haWwnOiBmaWVsZC5lbWFpbH0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgaWYgKHJlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGxldCBhdXRoID0gbmV3IEF1dGhJbnRlcmNlcHRvcigpO1xuICAgICAgICBsZXQgdG9rZW4gPSBhdXRoLmlzc3VlVG9rZW5XaXRoVWlkKHJlc1swXSk7XG4gICAgICAgIGxldCBob3N0ID0gY29uZmlnLmdldCgnVHBsU2VlZC5tYWlsLmhvc3QnKTtcbiAgICAgICAgbGV0IGxpbmsgPSBob3N0ICsgJ2FjdGl2YXRlX3VzZXI/YWNjZXNzX3Rva2VuPScgKyB0b2tlbiArICcmX2lkPScgKyByZXNbMF0uX2lkO1xuICAgICAgICBsZXQgaGVhZGVyMSA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL2hlYWRlcjEuaHRtbCcpLnRvU3RyaW5nKCk7XG4gICAgICAgIGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvcmVjcnVpdGVyLm1haWwuaHRtbCcpLnRvU3RyaW5nKCk7XG4gICAgICAgIGxldCBmb290ZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvZm9vdGVyMS5odG1sJykudG9TdHJpbmcoKTtcbiAgICAgICAgbGV0IG1pZF9jb250ZW50ID0gY29udGVudC5yZXBsYWNlKCckbGluayQnLCBsaW5rKTtcbiAgICAgICAgbGV0IG1haWxPcHRpb25zID0ge1xuICAgICAgICAgIGZyb206IGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5NQUlMX1NFTkRFUicpLFxuICAgICAgICAgIHRvOiBmaWVsZC5lbWFpbCxcbiAgICAgICAgICBzdWJqZWN0OiBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX1JFR0lTVFJBVElPTixcbiAgICAgICAgICBodG1sOiBoZWFkZXIxICsgbWlkX2NvbnRlbnQgKyBmb290ZXIxXG4gICAgICAgICAgLCBhdHRhY2htZW50czogTWFpbEF0dGFjaG1lbnRzLkF0dGFjaG1lbnRBcnJheVxuICAgICAgICB9O1xuICAgICAgICBsZXQgc2VuZE1haWxTZXJ2aWNlID0gbmV3IFNlbmRNYWlsU2VydmljZSgpO1xuICAgICAgICBzZW5kTWFpbFNlcnZpY2Uuc2VuZE1haWwobWFpbE9wdGlvbnMsIGNhbGxiYWNrKTtcblxuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1VTRVJfTk9UX0ZPVU5EKSwgcmVzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG5cbiAgc2VuZE1haWwoZmllbGQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIGxldCBoZWFkZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvaGVhZGVyMS5odG1sJykudG9TdHJpbmcoKTtcbiAgICBsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL2NvbnRhY3R1cy5tYWlsLmh0bWwnKS50b1N0cmluZygpO1xuICAgIGxldCBmb290ZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvZm9vdGVyMS5odG1sJykudG9TdHJpbmcoKTtcbiAgICBsZXQgbWlkX2NvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoJyRmaXJzdF9uYW1lJCcsIGZpZWxkLmZpcnN0X25hbWUpLnJlcGxhY2UoJyRlbWFpbCQnLCBmaWVsZC5lbWFpbCkucmVwbGFjZSgnJG1lc3NhZ2UkJywgZmllbGQubWVzc2FnZSk7XG4gICAgbGV0IHRvID0gY29uZmlnLmdldCgnVHBsU2VlZC5tYWlsLkFETUlOX01BSUwnKTtcbiAgICBsZXQgbWFpbE9wdGlvbnMgPSB7XG4gICAgICBmcm9tOiBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuTUFJTF9TRU5ERVInKSxcbiAgICAgIHRvOiB0byxcbiAgICAgIHN1YmplY3Q6IE1lc3NhZ2VzLkVNQUlMX1NVQkpFQ1RfVVNFUl9DT05UQUNURURfWU9VLFxuICAgICAgaHRtbDogaGVhZGVyMSArIG1pZF9jb250ZW50ICsgZm9vdGVyMVxuICAgICAgLCBhdHRhY2htZW50czogTWFpbEF0dGFjaG1lbnRzLkF0dGFjaG1lbnRBcnJheVxuICAgIH07XG4gICAgbGV0IHNlbmRNYWlsU2VydmljZSA9IG5ldyBTZW5kTWFpbFNlcnZpY2UoKTtcbiAgICBzZW5kTWFpbFNlcnZpY2Uuc2VuZE1haWwobWFpbE9wdGlvbnMsIGNhbGxiYWNrKTtcblxuICB9XG5cbiAgc2VuZE1haWxPbkVycm9yKGVycm9ySW5mbzogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XG4gICAgbGV0IGN1cnJlbnRfVGltZSA9IG5ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKFtdLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0J30pO1xuICAgIGxldCBoZWFkZXIxID0gZnMucmVhZEZpbGVTeW5jKCcuL3NyYy9zZXJ2ZXIvYXBwL2ZyYW1ld29yay9wdWJsaWMvaGVhZGVyMS5odG1sJykudG9TdHJpbmcoKTtcbiAgICBsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYygnLi9zcmMvc2VydmVyL2FwcC9mcmFtZXdvcmsvcHVibGljL2Vycm9yLm1haWwuaHRtbCcpLnRvU3RyaW5nKCk7XG4gICAgbGV0IGZvb3RlcjEgPSBmcy5yZWFkRmlsZVN5bmMoJy4vc3JjL3NlcnZlci9hcHAvZnJhbWV3b3JrL3B1YmxpYy9mb290ZXIxLmh0bWwnKS50b1N0cmluZygpO1xuICAgIGxldCBtaWRfY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgnJHRpbWUkJywgY3VycmVudF9UaW1lKS5yZXBsYWNlKCckaG9zdCQnLCBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuaG9zdCcpKS5yZXBsYWNlKCckcmVhc29uJCcsIGVycm9ySW5mby5yZWFzb24pLnJlcGxhY2UoJyRjb2RlJCcsIGVycm9ySW5mby5jb2RlKS5yZXBsYWNlKCckbWVzc2FnZSQnLCBlcnJvckluZm8ubWVzc2FnZSk7XG5cbiAgICBsZXQgbWFpbE9wdGlvbnMgPSB7XG4gICAgICBmcm9tOiBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuTUFJTF9TRU5ERVInKSxcbiAgICAgIHRvOiBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuQURNSU5fTUFJTCcpLFxuICAgICAgY2M6IGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5UUExHUk9VUF9NQUlMJyksXG4gICAgICBzdWJqZWN0OiBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX1NFUlZFUl9FUlJPUiArICcgb24gJyArIGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5ob3N0JyksXG4gICAgICBodG1sOiBoZWFkZXIxICsgbWlkX2NvbnRlbnQgKyBmb290ZXIxXG4gICAgICAsIGF0dGFjaG1lbnRzOiBNYWlsQXR0YWNobWVudHMuQXR0YWNobWVudEFycmF5XG4gICAgfVxuICAgIGxldCBzZW5kTWFpbFNlcnZpY2UgPSBuZXcgU2VuZE1haWxTZXJ2aWNlKCk7XG4gICAgc2VuZE1haWxTZXJ2aWNlLnNlbmRNYWlsKG1haWxPcHRpb25zLCBjYWxsYmFjayk7XG5cbiAgfVxuXG4gIGZpbmRCeUlkKGlkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmZpbmRCeUlkKGlkLCBjYWxsYmFjayk7XG4gIH1cblxuICByZXRyaWV2ZShmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5yZXRyaWV2ZVdpdGhvdXRMZWFuKGZpZWxkLCBjYWxsYmFjayk7XG4gIH1cblxuICByZXRyaWV2ZVdpdGhMZWFuKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKGZpZWxkLCBjYWxsYmFjayk7XG4gIH1cblxuICByZXRyaWV2ZUFsbChpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKGl0ZW0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTl9NT0JJTEVfTlVNQkVSKSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIHVwZGF0ZShfaWQ6IHN0cmluZywgaXRlbTogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XG5cbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmZpbmRCeUlkKF9pZCwgKGVycjogYW55LCByZXM6IGFueSkgPT4ge1xuXG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKGVyciwgcmVzKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnVwZGF0ZShyZXMuX2lkLCBpdGVtLCBjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuXG4gIGRlbGV0ZShfaWQ6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZGVsZXRlKF9pZCwgY2FsbGJhY2spO1xuICB9XG5cbiAgZmluZE9uZUFuZFVwZGF0ZShxdWVyeTogYW55LCBuZXdEYXRhOiBhbnksIG9wdGlvbnM6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSwgb3B0aW9ucywgY2FsbGJhY2spO1xuICB9XG5cbiAgVXBsb2FkSW1hZ2UodGVtcFBhdGg6IGFueSwgZmlsZU5hbWU6IGFueSwgY2I6IGFueSkge1xuICAgIGxldCB0YXJnZXRwYXRoID0gZmlsZU5hbWU7XG4gICAgZnMucmVuYW1lKHRlbXBQYXRoLCB0YXJnZXRwYXRoLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBjYihudWxsLCB0ZW1wUGF0aCk7XG4gICAgfSk7XG4gIH1cblxuICBVcGxvYWREb2N1bWVudHModGVtcFBhdGg6IGFueSwgZmlsZU5hbWU6IGFueSwgY2I6IGFueSkge1xuICAgIGxldCB0YXJnZXRwYXRoID0gZmlsZU5hbWU7XG4gICAgZnMucmVuYW1lKHRlbXBQYXRoLCB0YXJnZXRwYXRoLCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcbiAgICAgIGNiKG51bGwsIHRlbXBQYXRoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZpbmRBbmRVcGRhdGVOb3RpZmljYXRpb24ocXVlcnk6IGFueSwgbmV3RGF0YTogYW55LCBvcHRpb25zOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJldHJpZXZlQnlTb3J0ZWRPcmRlcihxdWVyeTogYW55LCBwcm9qZWN0aW9uOmFueSwgc29ydGluZ1F1ZXJ5OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlQnlTb3J0ZWRPcmRlcihxdWVyeSwgcHJvamVjdGlvbiwgc29ydGluZ1F1ZXJ5LCBjYWxsYmFjayk7XG4gIH1cblxufVxuXG5PYmplY3Quc2VhbChVc2VyU2VydmljZSk7XG5leHBvcnQgPSBVc2VyU2VydmljZTtcbiJdfQ==
