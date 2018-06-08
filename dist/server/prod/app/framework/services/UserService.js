"use strict";
var UserRepository = require("../dataaccess/repository/UserRepository");
var SendMailService = require("./mailer.service");
var SendMessageService = require("./sendmessage.service");
var fs = require("fs");
var config = require('config');
var path = require('path');
var Messages = require("../shared/messages");
var AuthInterceptor = require("../../framework/interceptor/auth.interceptor");
var ProjectAsset = require("../shared/projectasset");
var MailAttachments = require("../shared/sharedarray");
var bcrypt = require("bcrypt");
var log4js = require('log4js');
var logger = log4js.getLogger('User service');
var mailchimp_mailer_service_1 = require("./mailchimp-mailer.service");
var SubscriptionService = require("../../applicationProject/services/SubscriptionService");
var UserSubscription = require("../../applicationProject/dataaccess/model/project/Subscription/UserSubscription");
var UserService = (function () {
    function UserService() {
        this.userRepository = new UserRepository();
        this.APP_NAME = ProjectAsset.APP_NAME;
    }
    UserService.prototype.createUser = function (item, callback) {
        var _this = this;
        this.userRepository.retrieve({ 'email': item.email }, function (err, res) {
            if (err) {
                callback(new Error(err), null);
            }
            else if (res.length > 0) {
                logger.debug('Email already exist' + JSON.stringify(res));
                if (res[0].isActivated === true) {
                    callback(new Error(Messages.MSG_ERROR_REGISTRATION), null);
                }
                else if (res[0].isActivated === false) {
                    callback(new Error(Messages.MSG_ERROR_VERIFY_ACCOUNT), null);
                }
            }
            else {
                logger.debug('Email not present.' + JSON.stringify(res));
                var saltRounds = 10;
                bcrypt.hash(item.password, saltRounds, function (err, hash) {
                    if (err) {
                        logger.error('Error in creating hash password');
                        callback({
                            reason: 'Error in creating hash using bcrypt',
                            message: 'Error in creating hash using bcrypt',
                            stackTrace: new Error(),
                            code: 403
                        }, null);
                    }
                    else {
                        logger.debug('created hash succesfully.');
                        item.password = hash;
                        var subScriptionService_1 = new SubscriptionService();
                        subScriptionService_1.getSubscriptionPackageByName('Free', function (err, freeSubscription) {
                            if (freeSubscription.length > 0) {
                                logger.debug('freeSubscription length  > 0');
                                _this.assignFreeSubscriptionAndCreateUser(item, freeSubscription[0], callback);
                            }
                            else {
                                logger.debug('freeSubscription length !==0');
                                subScriptionService_1.addSubscriptionPackage(config.get('subscription.package.Free'), function (err, freeSubscription) {
                                    logger.debug('assigning free subscription by creating new user');
                                    _this.assignFreeSubscriptionAndCreateUser(item, freeSubscription, callback);
                                });
                            }
                        });
                    }
                });
            }
        });
    };
    UserService.prototype.assignFreeSubscriptionAndCreateUser = function (item, freeSubscription, callback) {
        var _this = this;
        var user = item;
        var sendMailService = new SendMailService();
        this.assignFreeSubscriptionPackage(user, freeSubscription);
        logger.debug('Creating user with new free trail subscription package');
        this.userRepository.create(user, function (err, res) {
            if (err) {
                logger.error('Failed to Creating user subscription package');
                callback(new Error(Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER), null);
            }
            else {
                logger.debug('created user succesfully.' + JSON.stringify(res));
                var auth = new AuthInterceptor();
                var token = auth.issueTokenWithUid(res);
                var host = config.get('application.mail.host');
                var link = host + 'signin?access_token=' + token + '&_id=' + res._id;
                var htmlTemplate = 'welcome-aboard.html';
                var data = new Map([['$applicationLink$', config.get('application.mail.host')],
                    ['$first_name$', res.first_name], ['$link$', link], ['$app_name$', _this.APP_NAME]]);
                var attachment = MailAttachments.WelcomeAboardAttachmentArray;
                logger.debug('sending mail to new user.' + JSON.stringify(attachment));
                sendMailService.send(user.email, Messages.EMAIL_SUBJECT_CANDIDATE_REGISTRATION, htmlTemplate, data, attachment, function (err, result) {
                    callback(err, result);
                });
            }
        });
    };
    UserService.prototype.assignFreeSubscriptionPackage = function (user, freeSubscription) {
        var subscription = new UserSubscription();
        subscription.activationDate = new Date();
        subscription.numOfBuildings = freeSubscription.basePackage.numOfBuildings;
        subscription.numOfProjects = freeSubscription.basePackage.numOfProjects;
        subscription.validity = freeSubscription.basePackage.validity;
        subscription.projectId = new Array();
        subscription.purchased = new Array();
        subscription.purchased.push(freeSubscription.basePackage);
        user.subscription = new Array();
        user.subscription.push(subscription);
    };
    UserService.prototype.login = function (data, callback) {
        this.retrieve({ 'email': data.email }, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else if (result.length > 0 && result[0].isActivated === true) {
                bcrypt.compare(data.password, result[0].password, function (err, isSame) {
                    if (err) {
                        callback({
                            reason: Messages.MSG_ERROR_RSN_INVALID_REGISTRATION_STATUS,
                            message: Messages.MSG_ERROR_VERIFY_CANDIDATE_ACCOUNT,
                            stackTrace: new Error(),
                            actualError: err,
                            code: 500
                        }, null);
                    }
                    else {
                        if (isSame) {
                            var auth = new AuthInterceptor();
                            var token = auth.issueTokenWithUid(result[0]);
                            var data = {
                                'status': Messages.STATUS_SUCCESS,
                                'data': {
                                    'first_name': result[0].first_name,
                                    'last_name': result[0].last_name,
                                    'company_name': result[0].company_name,
                                    'email': result[0].email,
                                    '_id': result[0]._id,
                                    'current_theme': result[0].current_theme,
                                    'picture': result[0].picture,
                                    'mobile_number': result[0].mobile_number,
                                    'access_token': token
                                },
                                access_token: token
                            };
                            callback(null, data);
                        }
                        else {
                            callback({
                                reason: Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
                                message: Messages.MSG_ERROR_WRONG_PASSWORD,
                                stackTrace: new Error(),
                                code: 400
                            }, null);
                        }
                    }
                });
            }
            else if (result.length > 0 && result[0].isActivated === false) {
                callback({
                    reason: Messages.MSG_ERROR_RSN_INVALID_REGISTRATION_STATUS,
                    message: Messages.MSG_ERROR_VERIFY_CANDIDATE_ACCOUNT,
                    stackTrace: new Error(),
                    code: 500
                }, null);
            }
            else {
                callback({
                    reason: Messages.MSG_ERROR_RSN_USER_NOT_FOUND,
                    message: Messages.MSG_ERROR_USER_NOT_PRESENT,
                    stackTrace: new Error(),
                    code: 400
                }, null);
            }
        });
    };
    UserService.prototype.sendOtp = function (params, user, callback) {
        var Data = {
            new_mobile_number: params.mobile_number,
            old_mobile_number: user.mobile_number,
            _id: user._id
        };
        this.generateOtp(Data, function (error, result) {
            if (error) {
                if (error === Messages.MSG_ERROR_CHECK_MOBILE_PRESENT) {
                    callback({
                        reason: Messages.MSG_ERROR_RSN_EXISTING_USER,
                        message: Messages.MSG_ERROR_REGISTRATION_MOBILE_NUMBER,
                        stackTrace: new Error(),
                        code: 400
                    }, null);
                }
                else {
                    callback(error, null);
                }
            }
            else if (result.length > 0) {
                callback({
                    'status': Messages.STATUS_SUCCESS,
                    'data': {
                        'message': Messages.MSG_SUCCESS_OTP
                    }
                }, null);
            }
            else {
                callback({
                    reason: Messages.MSG_ERROR_RSN_USER_NOT_FOUND,
                    message: Messages.MSG_ERROR_RSN_USER_NOT_FOUND,
                    stackTrace: new Error(),
                    code: 400
                }, null);
            }
        });
    };
    UserService.prototype.generateOtp = function (field, callback) {
        var _this = this;
        this.userRepository.retrieve({ 'mobile_number': field.new_mobile_number, 'isActivated': true }, function (err, res) {
            if (err) {
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
    UserService.prototype.verifyOtp = function (params, user, callback) {
        var mailChimpMailerService = new mailchimp_mailer_service_1.MailChimpMailerService();
        var query = { '_id': user._id, 'isActivated': false };
        var updateData = { 'isActivated': true, 'activation_date': new Date() };
        if (user.otp === params.otp) {
            this.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
                if (error) {
                    callback(error, null);
                }
                else {
                    callback(null, {
                        'status': 'Success',
                        'data': { 'message': 'User Account verified successfully' }
                    });
                    mailChimpMailerService.onCandidateSignSuccess(result);
                }
            });
        }
        else {
            callback({
                reason: Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
                message: Messages.MSG_ERROR_WRONG_OTP,
                stackTrace: new Error(),
                code: 400
            }, null);
        }
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
        var sendMailService = new SendMailService();
        var query = { 'email': field.email };
        this.userRepository.retrieve(query, function (err, res) {
            if (res.length > 0 && res[0].isActivated === true) {
                var auth = new AuthInterceptor();
                var token = auth.issueTokenWithUid(res[0]);
                var host = config.get('application.mail.host');
                var link = host + 'reset-password?access_token=' + token + '&_id=' + res[0]._id;
                var htmlTemplate = 'forgotpassword.html';
                var data = new Map([['$applicationLink$', config.get('application.mail.host')],
                    ['$first_name$', res[0].first_name], ['$link$', link], ['$app_name$', _this.APP_NAME]]);
                var attachment = MailAttachments.ForgetPasswordAttachmentArray;
                sendMailService.send(field.email, Messages.EMAIL_SUBJECT_FORGOT_PASSWORD, htmlTemplate, data, attachment, function (err, result) {
                    callback(err, result);
                });
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
        var updateData = { $set: { 'temp_email': field.new_email } };
        this.userRepository.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
            if (error) {
                callback(new Error(Messages.MSG_ERROR_EMAIL_ACTIVE_NOW), null);
            }
            else if (result == null) {
                callback(new Error(Messages.MSG_ERROR_VERIFY_ACCOUNT), null);
            }
            else {
                var auth = new AuthInterceptor();
                var token = auth.issueTokenWithUid(result);
                var host = config.get('application.mail.host');
                var link = host + 'activate-user?access_token=' + token + '&_id=' + result._id + 'isEmailVerification';
                var sendMailService = new SendMailService();
                var data = new Map([['$applicationLink$', config.get('application.mail.host')],
                    ['$link$', link]]);
                var attachment = MailAttachments.AttachmentArray;
                sendMailService.send(field.new_email, Messages.EMAIL_SUBJECT_CHANGE_EMAILID, 'change.mail.html', data, attachment, callback);
            }
        });
    };
    UserService.prototype.sendMail = function (field, callback) {
        var sendMailService = new SendMailService();
        var data = new Map([['$applicationLink$', config.get('application.mail.host')],
            ['$first_name$', field.first_name], ['$email$', field.email], ['$message$', field.message]]);
        var attachment = MailAttachments.AttachmentArray;
        sendMailService.send(config.get('application.mail.ADMIN_MAIL'), Messages.EMAIL_SUBJECT_USER_CONTACTED_YOU, 'contactus.mail.html', data, attachment, callback);
    };
    UserService.prototype.sendMailOnError = function (errorInfo, callback) {
        var current_Time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        var data;
        if (errorInfo.stackTrace) {
            data = new Map([['$applicationLink$', config.get('application.mail.host')],
                ['$time$', current_Time], ['$host$', config.get('application.mail.host')],
                ['$reason$', errorInfo.reason], ['$code$', errorInfo.code],
                ['$message$', errorInfo.message], ['$error$', errorInfo.stackTrace.stack]]);
        }
        else if (errorInfo.stack) {
            data = new Map([['$applicationLink$', config.get('application.mail.host')],
                ['$time$', current_Time], ['$host$', config.get('application.mail.host')],
                ['$reason$', errorInfo.reason], ['$code$', errorInfo.code],
                ['$message$', errorInfo.message], ['$error$', errorInfo.stack]]);
        }
        var sendMailService = new SendMailService();
        var attachment = MailAttachments.AttachmentArray;
        sendMailService.send(config.get('application.mail.ADMIN_MAIL'), Messages.EMAIL_SUBJECT_SERVER_ERROR + ' on ' + config.get('application.mail.host'), 'error.mail.html', data, attachment, callback, config.get('application.mail.TPLGROUP_MAIL'));
    };
    UserService.prototype.findById = function (id, callback) {
        this.userRepository.findById(id, callback);
    };
    UserService.prototype.retrieve = function (field, callback) {
        this.userRepository.retrieve(field, callback);
    };
    UserService.prototype.retrieveWithLimit = function (field, included, callback) {
        var limit = config.get('application.limitForQuery');
        this.userRepository.retrieveWithLimit(field, included, limit, callback);
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
    UserService.prototype.update = function (_id, item, callback) {
        var _this = this;
        this.userRepository.findById(_id, function (err, res) {
            if (err) {
                callback(err, res);
            }
            else {
                _this.userRepository.update(_id, item, callback);
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
    };
    UserService.prototype.resetPassword = function (data, user, callback) {
        var _this = this;
        var saltRounds = 10;
        bcrypt.hash(data.new_password, saltRounds, function (err, hash) {
            if (err) {
                callback({
                    reason: 'Error in creating hash using bcrypt',
                    message: 'Error in creating hash using bcrypt',
                    stackTrace: new Error(),
                    code: 403
                }, null);
            }
            else {
                var updateData = { 'password': hash };
                var query = { '_id': user._id, 'password': user.password };
                _this.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, {
                            'status': 'Success',
                            'data': { 'message': 'Password changed successfully' }
                        });
                    }
                });
            }
        });
    };
    UserService.prototype.updateDetails = function (data, user, callback) {
        var auth = new AuthInterceptor();
        var query = { '_id': user._id };
        this.userRepository.findOneAndUpdate(query, data, { new: true }, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, {
                    'status': 'Success',
                    'data': { 'message': 'User Profile Updated successfully' }
                });
            }
        });
    };
    UserService.prototype.getUserById = function (user, callback) {
        var auth = new AuthInterceptor();
        var token = auth.issueTokenWithUid(user);
        callback(null, {
            'status': 'success',
            'data': {
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'mobile_number': user.mobile_number,
                'company_name': user.company_name,
                'state': user.state,
                'city': user.city,
                'picture': user.picture,
                'social_profile_picture': user.social_profile_picture,
                '_id': user._id,
                'current_theme': user.current_theme
            },
            access_token: token
        });
    };
    UserService.prototype.verifyAccount = function (user, callback) {
        var query = { '_id': user._id, 'isActivated': false };
        var updateData = { 'isActivated': true };
        this.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, {
                    'status': 'Success',
                    'data': { 'message': 'User Account verified successfully' }
                });
            }
        });
    };
    UserService.prototype.changeEmailId = function (data, user, callback) {
        var _this = this;
        var auth = new AuthInterceptor();
        var query = { 'email': data.new_email };
        this.retrieve(query, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else if (result.length > 0 && result[0].isActivated === true) {
                callback({
                    reason: Messages.MSG_ERROR_RSN_EXISTING_USER,
                    message: Messages.MSG_ERROR_REGISTRATION,
                    stackTrace: new Error(),
                    code: 400
                }, null);
            }
            else if (result.length > 0 && result[0].isActivated === false) {
                callback({
                    reason: Messages.MSG_ERROR_RSN_EXISTING_USER,
                    message: Messages.MSG_ERROR_ACCOUNT_STATUS,
                    stackTrace: new Error(),
                    code: 400
                }, null);
            }
            else {
                _this.SendChangeMailVerification(data, function (error, result) {
                    if (error) {
                        if (error.message === Messages.MSG_ERROR_CHECK_EMAIL_ACCOUNT) {
                            callback({
                                reason: Messages.MSG_ERROR_RSN_EXISTING_USER,
                                message: Messages.MSG_ERROR_EMAIL_ACTIVE_NOW,
                                stackTrace: new Error(),
                                code: 400
                            }, null);
                        }
                        if (error.message === Messages.MSG_ERROR_VERIFY_ACCOUNT) {
                            callback({
                                reason: Messages.MSG_ERROR_VERIFY_ACCOUNT,
                                message: Messages.MSG_ERROR_VERIFY_ACCOUNT,
                                stackTrace: new Error(),
                                code: 400
                            }, null);
                        }
                        else {
                            callback({
                                reason: Messages.MSG_ERROR_RSN_WHILE_CONTACTING,
                                message: Messages.MSG_ERROR_WHILE_CONTACTING,
                                stackTrace: new Error(),
                                code: 400
                            }, null);
                        }
                    }
                    else {
                        callback(null, {
                            'status': Messages.STATUS_SUCCESS,
                            'data': { 'message': Messages.MSG_SUCCESS_EMAIL_CHANGE_EMAILID }
                        });
                    }
                });
            }
        });
    };
    UserService.prototype.verifyChangedEmailId = function (user, callback) {
        var query = { '_id': user._id };
        var updateData = { 'email': user.temp_email, 'temp_email': user.email };
        this.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, {
                    'status': 'Success',
                    'data': { 'message': 'User Account verified successfully' }
                });
            }
        });
    };
    UserService.prototype.verifyMobileNumber = function (data, user, callback) {
        var query = { '_id': user._id };
        var updateData = { 'mobile_number': user.temp_mobile, 'temp_mobile': user.mobile_number };
        if (user.otp === data.otp) {
            this.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
                if (error) {
                    callback(error, null);
                }
                else {
                    callback(null, {
                        'status': 'Success',
                        'data': { 'message': 'User Account verified successfully' }
                    });
                }
            });
        }
        else {
            callback({
                reason: Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
                message: Messages.MSG_ERROR_WRONG_OTP,
                stackTrace: new Error(),
                code: 400
            }, null);
        }
    };
    UserService.prototype.getProjects = function (user, callback) {
        var query = { _id: user._id };
        this.userRepository.findAndPopulate(query, { path: 'project', select: 'name' }, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                var authInterceptor = new AuthInterceptor();
                callback(null, { data: result[0].project, access_token: authInterceptor.issueTokenWithUid(user) });
            }
        });
    };
    return UserService;
}());
Object.seal(UserService);
module.exports = UserService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvc2VydmljZXMvVXNlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHdFQUEyRTtBQUMzRSxrREFBcUQ7QUFDckQsMERBQTZEO0FBQzdELHVCQUF5QjtBQUd6QixJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLDZDQUFnRDtBQUNoRCw4RUFBaUY7QUFDakYscURBQXdEO0FBQ3hELHVEQUEwRDtBQUUxRCwrQkFBa0M7QUFDbEMsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDOUMsdUVBQW9FO0FBR3BFLDJGQUE4RjtBQUc5RixrSEFBcUg7QUFFckg7SUFPRTtRQUNFLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUM7SUFDeEMsQ0FBQztJQUVELGdDQUFVLEdBQVYsVUFBVyxJQUFTLEVBQUUsUUFBMkM7UUFBakUsaUJBa0RDO1FBakRDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUMsRUFBRSxVQUFDLEdBQUcsRUFBRSxHQUFHO1lBQzNELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ1IsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixNQUFNLENBQUMsS0FB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RSxRQUF5QztRQUMvRCxJQUFJLEtBQUssR0FBRyxFQUFDLEdBQUcsRUFBRyxJQUFJLENBQUMsR0FBRyxFQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLEVBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFDLEVBQUUsVUFBQyxLQUFLLEVBQUUsTUFBTTtZQUMxRixFQUFFLENBQUEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNULFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDeEIsQ0FBQztZQUFBLElBQUksQ0FBQyxDQUFDO2dCQUNMLElBQUksZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQzVDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFDLENBQUMsQ0FBQztZQUNuRyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ0gsa0JBQUM7QUFBRCxDQW5yQkEsQUFtckJDLElBQUE7QUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pCLGlCQUFTLFdBQVcsQ0FBQyIsImZpbGUiOiJhcHAvZnJhbWV3b3JrL3NlcnZpY2VzL1VzZXJTZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFVzZXJSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L1VzZXJSZXBvc2l0b3J5Jyk7XG5pbXBvcnQgU2VuZE1haWxTZXJ2aWNlID0gcmVxdWlyZSgnLi9tYWlsZXIuc2VydmljZScpO1xuaW1wb3J0IFNlbmRNZXNzYWdlU2VydmljZSA9IHJlcXVpcmUoJy4vc2VuZG1lc3NhZ2Uuc2VydmljZScpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgbW9uZ29vc2UgZnJvbSAnbW9uZ29vc2UnO1xuaW1wb3J0IHsgU2VudE1lc3NhZ2VJbmZvIH0gZnJvbSAnbm9kZW1haWxlcic7XG5sZXQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XG5sZXQgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbmltcG9ydCBNZXNzYWdlcyA9IHJlcXVpcmUoJy4uL3NoYXJlZC9tZXNzYWdlcycpO1xuaW1wb3J0IEF1dGhJbnRlcmNlcHRvciA9IHJlcXVpcmUoJy4uLy4uL2ZyYW1ld29yay9pbnRlcmNlcHRvci9hdXRoLmludGVyY2VwdG9yJyk7XG5pbXBvcnQgUHJvamVjdEFzc2V0ID0gcmVxdWlyZSgnLi4vc2hhcmVkL3Byb2plY3Rhc3NldCcpO1xuaW1wb3J0IE1haWxBdHRhY2htZW50cyA9IHJlcXVpcmUoJy4uL3NoYXJlZC9zaGFyZWRhcnJheScpO1xuaW1wb3J0IHsgYXNFbGVtZW50RGF0YSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUvc3JjL3ZpZXcnO1xuaW1wb3J0IGJjcnlwdCA9IHJlcXVpcmUoJ2JjcnlwdCcpO1xubGV0IGxvZzRqcyA9IHJlcXVpcmUoJ2xvZzRqcycpO1xubGV0IGxvZ2dlciA9IGxvZzRqcy5nZXRMb2dnZXIoJ1VzZXIgc2VydmljZScpO1xuaW1wb3J0IHsgTWFpbENoaW1wTWFpbGVyU2VydmljZSB9IGZyb20gJy4vbWFpbGNoaW1wLW1haWxlci5zZXJ2aWNlJztcbmltcG9ydCBVc2VyTW9kZWwgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vZGVsL1VzZXJNb2RlbCcpO1xuaW1wb3J0IFVzZXIgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vbmdvb3NlL3VzZXInKTtcbmltcG9ydCBTdWJzY3JpcHRpb25TZXJ2aWNlID0gcmVxdWlyZSgnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L3NlcnZpY2VzL1N1YnNjcmlwdGlvblNlcnZpY2UnKTtcbmltcG9ydCBTdWJzY3JpcHRpb25QYWNrYWdlID0gcmVxdWlyZSgnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9TdWJzY3JpcHRpb24vU3Vic2NyaXB0aW9uUGFja2FnZScpO1xuaW1wb3J0IEJhc2VTdWJzY3JpcHRpb25QYWNrYWdlID0gcmVxdWlyZSgnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9TdWJzY3JpcHRpb24vQmFzZVN1YnNjcmlwdGlvblBhY2thZ2UnKTtcbmltcG9ydCBVc2VyU3Vic2NyaXB0aW9uID0gcmVxdWlyZSgnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9TdWJzY3JpcHRpb24vVXNlclN1YnNjcmlwdGlvbicpO1xuXG5jbGFzcyBVc2VyU2VydmljZSB7XG4gIEFQUF9OQU1FOiBzdHJpbmc7XG4gIGNvbXBhbnlfbmFtZTogc3RyaW5nO1xuICBtaWRfY29udGVudDogYW55O1xuICBwcml2YXRlIHVzZXJSZXBvc2l0b3J5OiBVc2VyUmVwb3NpdG9yeTtcblxuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMudXNlclJlcG9zaXRvcnkgPSBuZXcgVXNlclJlcG9zaXRvcnkoKTtcbiAgICB0aGlzLkFQUF9OQU1FID0gUHJvamVjdEFzc2V0LkFQUF9OQU1FO1xuICB9XG5cbiAgY3JlYXRlVXNlcihpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKHsnZW1haWwnOiBpdGVtLmVtYWlsfSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihlcnIpLCBudWxsKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdFbWFpbCBhbHJlYWR5IGV4aXN0JytKU09OLnN0cmluZ2lmeShyZXMpKTtcblxuICAgICAgICBpZiAocmVzWzBdLmlzQWN0aXZhdGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9SRUdJU1RSQVRJT04pLCBudWxsKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNbMF0uaXNBY3RpdmF0ZWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9WRVJJRllfQUNDT1VOVCksIG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnRW1haWwgbm90IHByZXNlbnQuJytKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICAgICAgY29uc3Qgc2FsdFJvdW5kcyA9IDEwO1xuICAgICAgICBiY3J5cHQuaGFzaChpdGVtLnBhc3N3b3JkLCBzYWx0Um91bmRzLCAoZXJyOiBhbnksIGhhc2g6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gY3JlYXRpbmcgaGFzaCBwYXNzd29yZCcpO1xuICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICByZWFzb246ICdFcnJvciBpbiBjcmVhdGluZyBoYXNoIHVzaW5nIGJjcnlwdCcsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdFcnJvciBpbiBjcmVhdGluZyBoYXNoIHVzaW5nIGJjcnlwdCcsXG4gICAgICAgICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxuICAgICAgICAgICAgICBjb2RlOiA0MDNcbiAgICAgICAgICAgIH0sIG51bGwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2NyZWF0ZWQgaGFzaCBzdWNjZXNmdWxseS4nKTtcbiAgICAgICAgICAgIGl0ZW0ucGFzc3dvcmQgPSBoYXNoO1xuICAgICAgICAgICAgbGV0IHN1YlNjcmlwdGlvblNlcnZpY2UgPSBuZXcgU3Vic2NyaXB0aW9uU2VydmljZSgpO1xuICAgICAgICAgICAgc3ViU2NyaXB0aW9uU2VydmljZS5nZXRTdWJzY3JpcHRpb25QYWNrYWdlQnlOYW1lKCdGcmVlJywgKGVycjogYW55LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyZWVTdWJzY3JpcHRpb246IEFycmF5PFN1YnNjcmlwdGlvblBhY2thZ2U+KSA9PiB7XG4gICAgICAgICAgICAgIGlmIChmcmVlU3Vic2NyaXB0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2ZyZWVTdWJzY3JpcHRpb24gbGVuZ3RoICA+IDAnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFzc2lnbkZyZWVTdWJzY3JpcHRpb25BbmRDcmVhdGVVc2VyKGl0ZW0sIGZyZWVTdWJzY3JpcHRpb25bMF0sIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfWVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnZnJlZVN1YnNjcmlwdGlvbiBsZW5ndGggIT09MCcpO1xuICAgICAgICAgICAgICAgIHN1YlNjcmlwdGlvblNlcnZpY2UuYWRkU3Vic2NyaXB0aW9uUGFja2FnZShjb25maWcuZ2V0KCdzdWJzY3JpcHRpb24ucGFja2FnZS5GcmVlJyksXG4gICAgICAgICAgICAgICAgICAoZXJyOiBhbnksIGZyZWVTdWJzY3JpcHRpb24pPT4ge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2Fzc2lnbmluZyBmcmVlIHN1YnNjcmlwdGlvbiBieSBjcmVhdGluZyBuZXcgdXNlcicpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFzc2lnbkZyZWVTdWJzY3JpcHRpb25BbmRDcmVhdGVVc2VyKGl0ZW0sIGZyZWVTdWJzY3JpcHRpb24sIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9KTtcbiAgfVxuXG4gICBhc3NpZ25GcmVlU3Vic2NyaXB0aW9uQW5kQ3JlYXRlVXNlcihpdGVtOiBhbnksIGZyZWVTdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvblBhY2thZ2UsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICBsZXQgdXNlcjogVXNlck1vZGVsID0gaXRlbTtcbiAgICBsZXQgc2VuZE1haWxTZXJ2aWNlID0gbmV3IFNlbmRNYWlsU2VydmljZSgpO1xuICAgIHRoaXMuYXNzaWduRnJlZVN1YnNjcmlwdGlvblBhY2thZ2UodXNlciwgZnJlZVN1YnNjcmlwdGlvbik7XG4gICAgbG9nZ2VyLmRlYnVnKCdDcmVhdGluZyB1c2VyIHdpdGggbmV3IGZyZWUgdHJhaWwgc3Vic2NyaXB0aW9uIHBhY2thZ2UnKTtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmNyZWF0ZSh1c2VyLCAoZXJyOkVycm9yLCByZXM6YW55KSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIENyZWF0aW5nIHVzZXIgc3Vic2NyaXB0aW9uIHBhY2thZ2UnKTtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9SRUdJU1RSQVRJT05fTU9CSUxFX05VTUJFUiksIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdjcmVhdGVkIHVzZXIgc3VjY2VzZnVsbHkuJytKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICAgICAgbGV0IGF1dGggPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XG4gICAgICAgIGxldCB0b2tlbiA9IGF1dGguaXNzdWVUb2tlbldpdGhVaWQocmVzKTtcbiAgICAgICAgbGV0IGhvc3QgPSBjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5tYWlsLmhvc3QnKTtcbiAgICAgICAgbGV0IGxpbmsgPSBob3N0ICsgJ3NpZ25pbj9hY2Nlc3NfdG9rZW49JyArIHRva2VuICsgJyZfaWQ9JyArIHJlcy5faWQ7XG4gICAgICAgIGxldCBodG1sVGVtcGxhdGUgPSAnd2VsY29tZS1hYm9hcmQuaHRtbCc7XG4gICAgICAgIGxldCBkYXRhOk1hcDxzdHJpbmcsc3RyaW5nPj0gbmV3IE1hcChbWyckYXBwbGljYXRpb25MaW5rJCcsY29uZmlnLmdldCgnYXBwbGljYXRpb24ubWFpbC5ob3N0JyldLFxuICAgICAgICAgIFsnJGZpcnN0X25hbWUkJyxyZXMuZmlyc3RfbmFtZV0sWyckbGluayQnLGxpbmtdLFsnJGFwcF9uYW1lJCcsdGhpcy5BUFBfTkFNRV1dKTtcbiAgICAgICAgbGV0IGF0dGFjaG1lbnQgPSBNYWlsQXR0YWNobWVudHMuV2VsY29tZUFib2FyZEF0dGFjaG1lbnRBcnJheTtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdzZW5kaW5nIG1haWwgdG8gbmV3IHVzZXIuJytKU09OLnN0cmluZ2lmeShhdHRhY2htZW50KSk7XG4gICAgICAgIHNlbmRNYWlsU2VydmljZS5zZW5kKCB1c2VyLmVtYWlsLCBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX0NBTkRJREFURV9SRUdJU1RSQVRJT04sIGh0bWxUZW1wbGF0ZSwgZGF0YSxhdHRhY2htZW50LFxuICAgICAgICAgIChlcnI6IGFueSwgcmVzdWx0OiBhbnkpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgYXNzaWduRnJlZVN1YnNjcmlwdGlvblBhY2thZ2UodXNlcjogVXNlck1vZGVsLCBmcmVlU3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb25QYWNrYWdlKSB7XG4gICAgbGV0IHN1YnNjcmlwdGlvbiA9IG5ldyBVc2VyU3Vic2NyaXB0aW9uKCk7XG4gICAgc3Vic2NyaXB0aW9uLmFjdGl2YXRpb25EYXRlID0gbmV3IERhdGUoKTtcbiAgICBzdWJzY3JpcHRpb24ubnVtT2ZCdWlsZGluZ3MgPSBmcmVlU3Vic2NyaXB0aW9uLmJhc2VQYWNrYWdlLm51bU9mQnVpbGRpbmdzO1xuICAgIHN1YnNjcmlwdGlvbi5udW1PZlByb2plY3RzID0gZnJlZVN1YnNjcmlwdGlvbi5iYXNlUGFja2FnZS5udW1PZlByb2plY3RzO1xuICAgIHN1YnNjcmlwdGlvbi52YWxpZGl0eSA9IGZyZWVTdWJzY3JpcHRpb24uYmFzZVBhY2thZ2UudmFsaWRpdHk7XG4gICAgc3Vic2NyaXB0aW9uLnByb2plY3RJZCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XG4gICAgc3Vic2NyaXB0aW9uLnB1cmNoYXNlZCA9IG5ldyBBcnJheTxCYXNlU3Vic2NyaXB0aW9uUGFja2FnZT4oKTtcbiAgICBzdWJzY3JpcHRpb24ucHVyY2hhc2VkLnB1c2goZnJlZVN1YnNjcmlwdGlvbi5iYXNlUGFja2FnZSk7XG4gICAgdXNlci5zdWJzY3JpcHRpb24gPSBuZXcgQXJyYXk8VXNlclN1YnNjcmlwdGlvbj4oKTtcbiAgICB1c2VyLnN1YnNjcmlwdGlvbi5wdXNoKHN1YnNjcmlwdGlvbik7XG4gIH1cblxuICBsb2dpbihkYXRhOiBhbnksIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMucmV0cmlldmUoeydlbWFpbCc6IGRhdGEuZW1haWx9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0Lmxlbmd0aCA+IDAgJiYgcmVzdWx0WzBdLmlzQWN0aXZhdGVkID09PSB0cnVlKSB7XG4gICAgICAgIGJjcnlwdC5jb21wYXJlKGRhdGEucGFzc3dvcmQsIHJlc3VsdFswXS5wYXNzd29yZCwgKGVycjogYW55LCBpc1NhbWU6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0lOVkFMSURfUkVHSVNUUkFUSU9OX1NUQVRVUyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX1ZFUklGWV9DQU5ESURBVEVfQUNDT1VOVCxcbiAgICAgICAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXG4gICAgICAgICAgICAgIGFjdHVhbEVycm9yOiBlcnIsXG4gICAgICAgICAgICAgIGNvZGU6IDUwMFxuICAgICAgICAgICAgfSwgbnVsbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8qY29uc29sZS5sb2coJ2dvdCB1c2VyJyk7Ki9cbiAgICAgICAgICAgIGlmIChpc1NhbWUpIHtcbiAgICAgICAgICAgICAgbGV0IGF1dGggPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XG4gICAgICAgICAgICAgIGxldCB0b2tlbiA9IGF1dGguaXNzdWVUb2tlbldpdGhVaWQocmVzdWx0WzBdKTtcbiAgICAgICAgICAgICAgdmFyIGRhdGE6IGFueSA9IHtcbiAgICAgICAgICAgICAgICAnc3RhdHVzJzogTWVzc2FnZXMuU1RBVFVTX1NVQ0NFU1MsXG4gICAgICAgICAgICAgICAgJ2RhdGEnOiB7XG4gICAgICAgICAgICAgICAgICAnZmlyc3RfbmFtZSc6IHJlc3VsdFswXS5maXJzdF9uYW1lLFxuICAgICAgICAgICAgICAgICAgJ2xhc3RfbmFtZSc6IHJlc3VsdFswXS5sYXN0X25hbWUsXG4gICAgICAgICAgICAgICAgICAnY29tcGFueV9uYW1lJzogcmVzdWx0WzBdLmNvbXBhbnlfbmFtZSxcbiAgICAgICAgICAgICAgICAgICdlbWFpbCc6IHJlc3VsdFswXS5lbWFpbCxcbiAgICAgICAgICAgICAgICAgICdfaWQnOiByZXN1bHRbMF0uX2lkLFxuICAgICAgICAgICAgICAgICAgJ2N1cnJlbnRfdGhlbWUnOiByZXN1bHRbMF0uY3VycmVudF90aGVtZSxcbiAgICAgICAgICAgICAgICAgICdwaWN0dXJlJzogcmVzdWx0WzBdLnBpY3R1cmUsXG4gICAgICAgICAgICAgICAgICAnbW9iaWxlX251bWJlcic6IHJlc3VsdFswXS5tb2JpbGVfbnVtYmVyLFxuICAgICAgICAgICAgICAgICAgJ2FjY2Vzc190b2tlbic6IHRva2VuXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhY2Nlc3NfdG9rZW46IHRva2VuXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlYXNvbjogTWVzc2FnZXMuTVNHX0VSUk9SX1JTTl9JTlZBTElEX0NSRURFTlRJQUxTLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9XUk9OR19QQVNTV09SRCxcbiAgICAgICAgICAgICAgICBzdGFja1RyYWNlOiBuZXcgRXJyb3IoKSxcbiAgICAgICAgICAgICAgICBjb2RlOiA0MDBcbiAgICAgICAgICAgICAgfSwgbnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0Lmxlbmd0aCA+IDAgJiYgcmVzdWx0WzBdLmlzQWN0aXZhdGVkID09PSBmYWxzZSkge1xuICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0lOVkFMSURfUkVHSVNUUkFUSU9OX1NUQVRVUyxcbiAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfVkVSSUZZX0NBTkRJREFURV9BQ0NPVU5ULFxuICAgICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxuICAgICAgICAgIGNvZGU6IDUwMFxuICAgICAgICB9LCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fVVNFUl9OT1RfRk9VTkQsXG4gICAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX1VTRVJfTk9UX1BSRVNFTlQsXG4gICAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXG4gICAgICAgICAgY29kZTogNDAwXG4gICAgICAgIH0sbnVsbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBzZW5kT3RwKHBhcmFtczogYW55LCB1c2VyOiBhbnksIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIGxldCBEYXRhID0ge1xuICAgICAgbmV3X21vYmlsZV9udW1iZXI6IHBhcmFtcy5tb2JpbGVfbnVtYmVyLFxuICAgICAgb2xkX21vYmlsZV9udW1iZXI6IHVzZXIubW9iaWxlX251bWJlcixcbiAgICAgIF9pZDogdXNlci5faWRcbiAgICB9O1xuICAgIHRoaXMuZ2VuZXJhdGVPdHAoRGF0YSwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgPT09IE1lc3NhZ2VzLk1TR19FUlJPUl9DSEVDS19NT0JJTEVfUFJFU0VOVCkge1xuICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgIHJlYXNvbjogTWVzc2FnZXMuTVNHX0VSUk9SX1JTTl9FWElTVElOR19VU0VSLFxuICAgICAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTl9NT0JJTEVfTlVNQkVSLFxuICAgICAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXG4gICAgICAgICAgICBjb2RlOiA0MDBcbiAgICAgICAgICB9LCBudWxsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICdzdGF0dXMnOiBNZXNzYWdlcy5TVEFUVVNfU1VDQ0VTUyxcbiAgICAgICAgICAnZGF0YSc6IHtcbiAgICAgICAgICAgICdtZXNzYWdlJzogTWVzc2FnZXMuTVNHX1NVQ0NFU1NfT1RQXG4gICAgICAgICAgfVxuICAgICAgICB9LCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fVVNFUl9OT1RfRk9VTkQsXG4gICAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX1JTTl9VU0VSX05PVF9GT1VORCxcbiAgICAgICAgICBzdGFja1RyYWNlOiBuZXcgRXJyb3IoKSxcbiAgICAgICAgICBjb2RlOiA0MDBcbiAgICAgICAgfSwgbnVsbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBnZW5lcmF0ZU90cChmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5yZXRyaWV2ZSh7J21vYmlsZV9udW1iZXInOiBmaWVsZC5uZXdfbW9iaWxlX251bWJlciwgJ2lzQWN0aXZhdGVkJzogdHJ1ZX0sIChlcnIsIHJlcykgPT4ge1xuXG4gICAgICBpZiAoZXJyKSB7XG4gICAgICB9IGVsc2UgaWYgKHJlcy5sZW5ndGggPiAwICYmIChyZXNbMF0uX2lkKSAhPT0gZmllbGQuX2lkKSB7XG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfUkVHSVNUUkFUSU9OX01PQklMRV9OVU1CRVIpLCBudWxsKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJzogZmllbGQuX2lkfTtcbiAgICAgICAgbGV0IG90cCA9IE1hdGguZmxvb3IoKE1hdGgucmFuZG9tKCkgKiA5OTk5OSkgKyAxMDAwMDApO1xuICAgICAgICBsZXQgdXBkYXRlRGF0YSA9IHsnbW9iaWxlX251bWJlcic6IGZpZWxkLm5ld19tb2JpbGVfbnVtYmVyLCAnb3RwJzogb3RwfTtcbiAgICAgICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfUkVHSVNUUkFUSU9OX01PQklMRV9OVU1CRVIpLCBudWxsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IERhdGEgPSB7XG4gICAgICAgICAgICAgIG1vYmlsZU5vOiBmaWVsZC5uZXdfbW9iaWxlX251bWJlcixcbiAgICAgICAgICAgICAgb3RwOiBvdHBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsZXQgc2VuZE1lc3NhZ2VTZXJ2aWNlID0gbmV3IFNlbmRNZXNzYWdlU2VydmljZSgpO1xuICAgICAgICAgICAgc2VuZE1lc3NhZ2VTZXJ2aWNlLnNlbmRNZXNzYWdlRGlyZWN0KERhdGEsIGNhbGxiYWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9SRUdJU1RSQVRJT05fTU9CSUxFX05VTUJFUiksIG51bGwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgdmVyaWZ5T3RwKHBhcmFtczogYW55LCB1c2VyOmFueSwgY2FsbGJhY2s6KGVycm9yOmFueSwgcmVzdWx0OmFueSkgPT4gdm9pZCkge1xuICAgIGxldCBtYWlsQ2hpbXBNYWlsZXJTZXJ2aWNlID0gbmV3IE1haWxDaGltcE1haWxlclNlcnZpY2UoKTtcblxuICAgIGxldCBxdWVyeSA9IHsnX2lkJzogdXNlci5faWQsICdpc0FjdGl2YXRlZCc6IGZhbHNlfTtcbiAgICBsZXQgdXBkYXRlRGF0YSA9IHsnaXNBY3RpdmF0ZWQnOiB0cnVlLCAnYWN0aXZhdGlvbl9kYXRlJzogbmV3IERhdGUoKX07XG4gICAgaWYgKHVzZXIub3RwID09PSBwYXJhbXMub3RwKSB7XG4gICAgICB0aGlzLmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FsbGJhY2sobnVsbCx7XG4gICAgICAgICAgICAnc3RhdHVzJzogJ1N1Y2Nlc3MnLFxuICAgICAgICAgICAgJ2RhdGEnOiB7J21lc3NhZ2UnOiAnVXNlciBBY2NvdW50IHZlcmlmaWVkIHN1Y2Nlc3NmdWxseSd9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgbWFpbENoaW1wTWFpbGVyU2VydmljZS5vbkNhbmRpZGF0ZVNpZ25TdWNjZXNzKHJlc3VsdCk7XG5cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0lOVkFMSURfQ1JFREVOVElBTFMsXG4gICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9XUk9OR19PVFAsXG4gICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxuICAgICAgICBjb2RlOiA0MDBcbiAgICAgIH0sIG51bGwpO1xuICAgIH1cblxuICB9XG5cbiAgY2hhbmdlTW9iaWxlTnVtYmVyKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcblxuICAgIGxldCBxdWVyeSA9IHsnX2lkJzogZmllbGQuX2lkfTtcbiAgICBsZXQgb3RwID0gTWF0aC5mbG9vcigoTWF0aC5yYW5kb20oKSAqIDk5OTk5KSArIDEwMDAwMCk7XG4gICAgbGV0IHVwZGF0ZURhdGEgPSB7J290cCc6IG90cCwgJ3RlbXBfbW9iaWxlJzogZmllbGQubmV3X21vYmlsZV9udW1iZXJ9O1xuXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTiksIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IERhdGEgPSB7XG4gICAgICAgICAgY3VycmVudF9tb2JpbGVfbnVtYmVyOiBmaWVsZC5jdXJyZW50X21vYmlsZV9udW1iZXIsXG4gICAgICAgICAgbW9iaWxlTm86IGZpZWxkLm5ld19tb2JpbGVfbnVtYmVyLFxuICAgICAgICAgIG90cDogb3RwXG4gICAgICAgIH07XG4gICAgICAgIGxldCBzZW5kTWVzc2FnZVNlcnZpY2UgPSBuZXcgU2VuZE1lc3NhZ2VTZXJ2aWNlKCk7XG4gICAgICAgIHNlbmRNZXNzYWdlU2VydmljZS5zZW5kQ2hhbmdlTW9iaWxlTWVzc2FnZShEYXRhLCBjYWxsYmFjayk7XG5cbiAgICAgIH1cbiAgICB9KTtcblxuICB9XG5cbiAgZm9yZ290UGFzc3dvcmQoZmllbGQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IFNlbnRNZXNzYWdlSW5mbykgPT4gdm9pZCkge1xuXG4gICAgbGV0IHNlbmRNYWlsU2VydmljZSA9IG5ldyBTZW5kTWFpbFNlcnZpY2UoKTtcbiAgICBsZXQgcXVlcnkgPSB7J2VtYWlsJzogZmllbGQuZW1haWx9O1xuXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5yZXRyaWV2ZShxdWVyeSwgKGVyciwgcmVzKSA9PiB7XG5cbiAgICAgIGlmIChyZXMubGVuZ3RoID4gMCAmJiByZXNbMF0uaXNBY3RpdmF0ZWQgPT09IHRydWUpIHtcblxuICAgICAgICBsZXQgYXV0aCA9IG5ldyBBdXRoSW50ZXJjZXB0b3IoKTtcbiAgICAgICAgbGV0IHRva2VuID0gYXV0aC5pc3N1ZVRva2VuV2l0aFVpZChyZXNbMF0pO1xuICAgICAgICBsZXQgaG9zdCA9IGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpO1xuICAgICAgICBsZXQgbGluayA9IGhvc3QgKyAncmVzZXQtcGFzc3dvcmQ/YWNjZXNzX3Rva2VuPScgKyB0b2tlbiArICcmX2lkPScgKyByZXNbMF0uX2lkO1xuICAgICAgICBsZXQgaHRtbFRlbXBsYXRlID0gJ2ZvcmdvdHBhc3N3b3JkLmh0bWwnO1xuICAgICAgICBsZXQgZGF0YTpNYXA8c3RyaW5nLHN0cmluZz49IG5ldyBNYXAoW1snJGFwcGxpY2F0aW9uTGluayQnLGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpXSxcbiAgICAgICAgICBbJyRmaXJzdF9uYW1lJCcscmVzWzBdLmZpcnN0X25hbWVdLFsnJGxpbmskJyxsaW5rXSxbJyRhcHBfbmFtZSQnLHRoaXMuQVBQX05BTUVdXSk7XG4gICAgICAgIGxldCBhdHRhY2htZW50PU1haWxBdHRhY2htZW50cy5Gb3JnZXRQYXNzd29yZEF0dGFjaG1lbnRBcnJheTtcbiAgICAgICAgc2VuZE1haWxTZXJ2aWNlLnNlbmQoIGZpZWxkLmVtYWlsLCBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX0ZPUkdPVF9QQVNTV09SRCwgaHRtbFRlbXBsYXRlLCBkYXRhLGF0dGFjaG1lbnQsXG4oZXJyOiBhbnksIHJlc3VsdDogYW55KSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHJlcy5sZW5ndGggPiAwICYmIHJlc1swXS5pc0FjdGl2YXRlZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9BQ0NPVU5UX1NUQVRVUyksIHJlcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1VTRVJfTk9UX0ZPVU5EKSwgcmVzKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICB9XG5cblxuICBTZW5kQ2hhbmdlTWFpbFZlcmlmaWNhdGlvbihmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogU2VudE1lc3NhZ2VJbmZvKSA9PiB2b2lkKSB7XG4gICAgbGV0IHF1ZXJ5ID0geydlbWFpbCc6IGZpZWxkLmN1cnJlbnRfZW1haWwsICdpc0FjdGl2YXRlZCc6IHRydWV9O1xuICAgIGxldCB1cGRhdGVEYXRhID0geyRzZXQ6eyd0ZW1wX2VtYWlsJzogZmllbGQubmV3X2VtYWlsfX07XG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9FTUFJTF9BQ1RJVkVfTk9XKSwgbnVsbCk7XG4gICAgICB9IGVsc2UgaWYocmVzdWx0ID09IG51bGwpIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9WRVJJRllfQUNDT1VOVCksIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGF1dGggPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XG4gICAgICAgIGxldCB0b2tlbiA9IGF1dGguaXNzdWVUb2tlbldpdGhVaWQocmVzdWx0KTtcbiAgICAgICAgbGV0IGhvc3QgPSBjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5tYWlsLmhvc3QnKTtcbiAgICAgICAgbGV0IGxpbmsgPSBob3N0ICsgJ2FjdGl2YXRlLXVzZXI/YWNjZXNzX3Rva2VuPScgKyB0b2tlbiArICcmX2lkPScgKyByZXN1bHQuX2lkKydpc0VtYWlsVmVyaWZpY2F0aW9uJztcbiAgICAgICAgbGV0IHNlbmRNYWlsU2VydmljZSA9IG5ldyBTZW5kTWFpbFNlcnZpY2UoKTtcbiAgICAgICAgbGV0IGRhdGE6IE1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKFtbJyRhcHBsaWNhdGlvbkxpbmskJyxjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5tYWlsLmhvc3QnKV0sXG4gICAgICAgICAgWyckbGluayQnLCBsaW5rXV0pO1xuICAgICAgICBsZXQgYXR0YWNobWVudD1NYWlsQXR0YWNobWVudHMuQXR0YWNobWVudEFycmF5O1xuICAgICAgICBzZW5kTWFpbFNlcnZpY2Uuc2VuZChmaWVsZC5uZXdfZW1haWwsXG4gICAgICAgICAgTWVzc2FnZXMuRU1BSUxfU1VCSkVDVF9DSEFOR0VfRU1BSUxJRCxcbiAgICAgICAgICAnY2hhbmdlLm1haWwuaHRtbCcsIGRhdGEsYXR0YWNobWVudCwgY2FsbGJhY2spO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cblxuIC8qIHNlbmRWZXJpZmljYXRpb25NYWlsKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBTZW50TWVzc2FnZUluZm8pID0+IHZvaWQpIHtcblxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkucmV0cmlldmUoeydlbWFpbCc6IGZpZWxkLmVtYWlsfSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5LnJldHJpZXZlKHsndXNlcklkJzogbmV3IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkKHJlc1swXS5faWQpfSwgKGVyciwgcmVjcnVpdGVyKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jb21wYW55X25hbWUgPSByZWNydWl0ZXJbMF0uY29tcGFueV9uYW1lO1xuICAgICAgICAgICAgbGV0IGF1dGggPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XG4gICAgICAgICAgICBsZXQgdG9rZW4gPSBhdXRoLmlzc3VlVG9rZW5XaXRoVWlkKHJlY3J1aXRlclswXSk7XG4gICAgICAgICAgICBsZXQgaG9zdCA9IGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpO1xuICAgICAgICAgICAgbGV0IGxpbmsgPSBob3N0ICsgJ2NvbXBhbnktZGV0YWlscz9hY2Nlc3NfdG9rZW49JyArIHRva2VuICsgJyZfaWQ9JyArIHJlc1swXS5faWQgKyAnJmNvbXBhbnlOYW1lPScgKyB0aGlzLmNvbXBhbnlfbmFtZTtcbiAgICAgICAgICAgIGxldCBzZW5kTWFpbFNlcnZpY2UgPSBuZXcgU2VuZE1haWxTZXJ2aWNlKCk7XG4gICAgICAgICAgICBsZXQgZGF0YTpNYXA8c3RyaW5nLHN0cmluZz49IG5ldyBNYXAoW1snJGpvYm1vc2lzTGluayQnLGNvbmZpZy5nZXQoJ1RwbFNlZWQubWFpbC5ob3N0JyldLFxuICAgICAgICAgICAgICBbJyRsaW5rJCcsbGlua11dKTtcbiAgICAgICAgICAgIHNlbmRNYWlsU2VydmljZS5zZW5kKGZpZWxkLmVtYWlsLFxuICAgICAgICAgICAgICBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX1JFR0lTVFJBVElPTixcbiAgICAgICAgICAgICAgJ3JlY3J1aXRlci5tYWlsLmh0bWwnLGRhdGEsKGVycjogYW55LCByZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIscmVzdWx0KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgcmVjcnVpdGVyU2VydmljZSA9IG5ldyBSZWNydWl0ZXJTZXJ2aWNlKCk7XG4gICAgICAgICAgICAgICAgcmVjcnVpdGVyU2VydmljZS5tYWlsT25SZWNydWl0ZXJTaWdudXBUb0FkbWluKHJlc1swXSwgdGhpcy5jb21wYW55X25hbWUsIGNhbGxiYWNrKTtcblxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgfSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfVVNFUl9OT1RfRk9VTkQpLCByZXMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9Ki9cblxuLyogIHNlbmRSZWNydWl0ZXJWZXJpZmljYXRpb25NYWlsKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBTZW50TWVzc2FnZUluZm8pID0+IHZvaWQpIHtcblxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkucmV0cmlldmUoeydlbWFpbCc6IGZpZWxkLmVtYWlsfSwgKGVyciwgcmVzKSA9PiB7XG4gICAgICBpZiAocmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbGV0IGF1dGggPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XG4gICAgICAgIGxldCB0b2tlbiA9IGF1dGguaXNzdWVUb2tlbldpdGhVaWQocmVzWzBdKTtcbiAgICAgICAgbGV0IGhvc3QgPSBjb25maWcuZ2V0KCdUcGxTZWVkLm1haWwuaG9zdCcpO1xuICAgICAgICBsZXQgbGluayA9IGhvc3QgKyAnYWN0aXZhdGUtdXNlcj9hY2Nlc3NfdG9rZW49JyArIHRva2VuICsgJyZfaWQ9JyArIHJlc1swXS5faWQ7XG4gICAgICAgIGxldCBzZW5kTWFpbFNlcnZpY2UgPSBuZXcgU2VuZE1haWxTZXJ2aWNlKCk7XG4gICAgICAgIGxldCBkYXRhOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcChbWyckam9ibW9zaXNMaW5rJCcsY29uZmlnLmdldCgnVHBsU2VlZC5tYWlsLmhvc3QnKV0sWyckbGluayQnLCBsaW5rXV0pO1xuICAgICAgICBzZW5kTWFpbFNlcnZpY2Uuc2VuZChmaWVsZC5lbWFpbCxcbiAgICAgICAgICBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX1JFR0lTVFJBVElPTixcbiAgICAgICAgICAncmVjcnVpdGVyLm1haWwuaHRtbCcsIGRhdGEsIGNhbGxiYWNrKTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9VU0VSX05PVF9GT1VORCksIHJlcyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0qL1xuXG5cbiAgc2VuZE1haWwoZmllbGQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IFNlbnRNZXNzYWdlSW5mbykgPT4gdm9pZCkge1xuICAgIGxldCBzZW5kTWFpbFNlcnZpY2UgPSBuZXcgU2VuZE1haWxTZXJ2aWNlKCk7XG4gICAgbGV0IGRhdGE6TWFwPHN0cmluZyxzdHJpbmc+PSBuZXcgTWFwKFtbJyRhcHBsaWNhdGlvbkxpbmskJyxjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5tYWlsLmhvc3QnKV0sXG4gICAgICBbJyRmaXJzdF9uYW1lJCcsZmllbGQuZmlyc3RfbmFtZV0sWyckZW1haWwkJyxmaWVsZC5lbWFpbF0sWyckbWVzc2FnZSQnLGZpZWxkLm1lc3NhZ2VdXSk7XG4gICAgbGV0IGF0dGFjaG1lbnQ9TWFpbEF0dGFjaG1lbnRzLkF0dGFjaG1lbnRBcnJheTtcbiAgICBzZW5kTWFpbFNlcnZpY2Uuc2VuZChjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5tYWlsLkFETUlOX01BSUwnKSxcbiAgICAgIE1lc3NhZ2VzLkVNQUlMX1NVQkpFQ1RfVVNFUl9DT05UQUNURURfWU9VLFxuICAgICAgJ2NvbnRhY3R1cy5tYWlsLmh0bWwnLGRhdGEsYXR0YWNobWVudCxjYWxsYmFjayk7XG4gIH1cblxuICBzZW5kTWFpbE9uRXJyb3IoZXJyb3JJbmZvOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBTZW50TWVzc2FnZUluZm8pID0+IHZvaWQpIHtcbiAgICBsZXQgY3VycmVudF9UaW1lID0gbmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoW10sIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnfSk7XG4gICAgbGV0IGRhdGE6TWFwPHN0cmluZyxzdHJpbmc+O1xuICAgIGlmKGVycm9ySW5mby5zdGFja1RyYWNlKSB7XG4gICAgICAgZGF0YT0gbmV3IE1hcChbWyckYXBwbGljYXRpb25MaW5rJCcsY29uZmlnLmdldCgnYXBwbGljYXRpb24ubWFpbC5ob3N0JyldLFxuICAgICAgICAgWyckdGltZSQnLGN1cnJlbnRfVGltZV0sWyckaG9zdCQnLGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpXSxcbiAgICAgICAgWyckcmVhc29uJCcsZXJyb3JJbmZvLnJlYXNvbl0sWyckY29kZSQnLGVycm9ySW5mby5jb2RlXSxcbiAgICAgICAgWyckbWVzc2FnZSQnLGVycm9ySW5mby5tZXNzYWdlXSxbJyRlcnJvciQnLGVycm9ySW5mby5zdGFja1RyYWNlLnN0YWNrXV0pO1xuXG4gICAgfSBlbHNlIGlmKGVycm9ySW5mby5zdGFjaykge1xuICAgICAgZGF0YT0gbmV3IE1hcChbWyckYXBwbGljYXRpb25MaW5rJCcsY29uZmlnLmdldCgnYXBwbGljYXRpb24ubWFpbC5ob3N0JyldLFxuICAgICAgICBbJyR0aW1lJCcsY3VycmVudF9UaW1lXSxbJyRob3N0JCcsY29uZmlnLmdldCgnYXBwbGljYXRpb24ubWFpbC5ob3N0JyldLFxuICAgICAgICBbJyRyZWFzb24kJyxlcnJvckluZm8ucmVhc29uXSxbJyRjb2RlJCcsZXJyb3JJbmZvLmNvZGVdLFxuICAgICAgICBbJyRtZXNzYWdlJCcsZXJyb3JJbmZvLm1lc3NhZ2VdLFsnJGVycm9yJCcsZXJyb3JJbmZvLnN0YWNrXV0pO1xuICAgIH1cbiAgICBsZXQgc2VuZE1haWxTZXJ2aWNlID0gbmV3IFNlbmRNYWlsU2VydmljZSgpO1xuICAgIGxldCBhdHRhY2htZW50ID0gTWFpbEF0dGFjaG1lbnRzLkF0dGFjaG1lbnRBcnJheTtcbiAgICBzZW5kTWFpbFNlcnZpY2Uuc2VuZChjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5tYWlsLkFETUlOX01BSUwnKSxcbiAgICAgIE1lc3NhZ2VzLkVNQUlMX1NVQkpFQ1RfU0VSVkVSX0VSUk9SICsgJyBvbiAnICsgY29uZmlnLmdldCgnYXBwbGljYXRpb24ubWFpbC5ob3N0JyksXG4gICAgICAnZXJyb3IubWFpbC5odG1sJyxkYXRhLGF0dGFjaG1lbnQsIGNhbGxiYWNrLGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuVFBMR1JPVVBfTUFJTCcpKTtcbiAgfVxuXG4gIGZpbmRCeUlkKGlkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmZpbmRCeUlkKGlkLCBjYWxsYmFjayk7XG4gIH1cblxuICByZXRyaWV2ZShmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5yZXRyaWV2ZShmaWVsZCwgY2FsbGJhY2spO1xuICB9XG5cbiAgcmV0cmlldmVXaXRoTGltaXQoZmllbGQ6IGFueSwgaW5jbHVkZWQgOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICBsZXQgbGltaXQgPSBjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5saW1pdEZvclF1ZXJ5Jyk7XG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5yZXRyaWV2ZVdpdGhMaW1pdChmaWVsZCwgaW5jbHVkZWQsIGxpbWl0LCBjYWxsYmFjayk7XG4gIH1cblxuICByZXRyaWV2ZVdpdGhMZWFuKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKGZpZWxkLCBjYWxsYmFjayk7XG4gIH1cblxuICByZXRyaWV2ZUFsbChpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKGl0ZW0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTl9NT0JJTEVfTlVNQkVSKSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgdXBkYXRlKF9pZDogYW55LCBpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcblxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZEJ5SWQoX2lkLCAoZXJyOiBhbnksIHJlczogYW55KSA9PiB7XG5cbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyLCByZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy51c2VyUmVwb3NpdG9yeS51cGRhdGUoX2lkLCBpdGVtLCBjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuXG4gIGRlbGV0ZShfaWQ6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZGVsZXRlKF9pZCwgY2FsbGJhY2spO1xuICB9XG5cbiAgZmluZE9uZUFuZFVwZGF0ZShxdWVyeTogYW55LCBuZXdEYXRhOiBhbnksIG9wdGlvbnM6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSwgb3B0aW9ucywgY2FsbGJhY2spO1xuICB9XG5cbiAgVXBsb2FkSW1hZ2UodGVtcFBhdGg6IGFueSwgZmlsZU5hbWU6IGFueSwgY2I6IGFueSkge1xuICAgIGxldCB0YXJnZXRwYXRoID0gZmlsZU5hbWU7XG4gICAgZnMucmVuYW1lKHRlbXBQYXRoLCB0YXJnZXRwYXRoLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBjYihudWxsLCB0ZW1wUGF0aCk7XG4gICAgfSk7XG4gIH1cblxuICBVcGxvYWREb2N1bWVudHModGVtcFBhdGg6IGFueSwgZmlsZU5hbWU6IGFueSwgY2I6IGFueSkge1xuICAgIGxldCB0YXJnZXRwYXRoID0gZmlsZU5hbWU7XG4gICAgZnMucmVuYW1lKHRlbXBQYXRoLCB0YXJnZXRwYXRoLCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcbiAgICAgIGNiKG51bGwsIHRlbXBQYXRoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZpbmRBbmRVcGRhdGVOb3RpZmljYXRpb24ocXVlcnk6IGFueSwgbmV3RGF0YTogYW55LCBvcHRpb25zOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIG5ld0RhdGEsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJldHJpZXZlQnlTb3J0ZWRPcmRlcihxdWVyeTogYW55LCBwcm9qZWN0aW9uOmFueSwgc29ydGluZ1F1ZXJ5OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICAvL3RoaXMudXNlclJlcG9zaXRvcnkucmV0cmlldmVCeVNvcnRlZE9yZGVyKHF1ZXJ5LCBwcm9qZWN0aW9uLCBzb3J0aW5nUXVlcnksIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJlc2V0UGFzc3dvcmQoZGF0YTogYW55LCB1c2VyIDogYW55LCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+YW55KSB7XG4gICAgY29uc3Qgc2FsdFJvdW5kcyA9IDEwO1xuICAgIGJjcnlwdC5oYXNoKGRhdGEubmV3X3Bhc3N3b3JkLCBzYWx0Um91bmRzLCAoZXJyOiBhbnksIGhhc2g6IGFueSkgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgcmVhc29uOiAnRXJyb3IgaW4gY3JlYXRpbmcgaGFzaCB1c2luZyBiY3J5cHQnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdFcnJvciBpbiBjcmVhdGluZyBoYXNoIHVzaW5nIGJjcnlwdCcsXG4gICAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXG4gICAgICAgICAgY29kZTogNDAzXG4gICAgICAgIH0sIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHVwZGF0ZURhdGEgPSB7J3Bhc3N3b3JkJzogaGFzaH07XG4gICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJzogdXNlci5faWQsICdwYXNzd29yZCc6IHVzZXIucGFzc3dvcmR9O1xuICAgICAgICB0aGlzLmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLHtcbiAgICAgICAgICAgICAgJ3N0YXR1cyc6ICdTdWNjZXNzJyxcbiAgICAgICAgICAgICAgJ2RhdGEnOiB7J21lc3NhZ2UnOiAnUGFzc3dvcmQgY2hhbmdlZCBzdWNjZXNzZnVsbHknfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHVwZGF0ZURldGFpbHMoZGF0YTogIFVzZXJNb2RlbCwgdXNlcjogVXNlck1vZGVsLCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcbiAgICBsZXQgYXV0aDogQXV0aEludGVyY2VwdG9yID0gbmV3IEF1dGhJbnRlcmNlcHRvcigpO1xuICAgIGxldCBxdWVyeSA9IHsnX2lkJzogdXNlci5faWR9O1xuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgZGF0YSwge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCx7XG4gICAgICAgICAgJ3N0YXR1cyc6ICdTdWNjZXNzJyxcbiAgICAgICAgICAnZGF0YSc6IHsnbWVzc2FnZSc6ICdVc2VyIFByb2ZpbGUgVXBkYXRlZCBzdWNjZXNzZnVsbHknfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH0pO1xuICB9XG4gIGdldFVzZXJCeUlkKHVzZXI6YW55LCBjYWxsYmFjazooZXJyb3I6YW55LCByZXN1bHQ6YW55KT0+dm9pZCkge1xuICAgIGxldCBhdXRoOiBBdXRoSW50ZXJjZXB0b3IgPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XG5cbiAgICBsZXQgdG9rZW4gPSBhdXRoLmlzc3VlVG9rZW5XaXRoVWlkKHVzZXIpO1xuICAgIGNhbGxiYWNrKG51bGwse1xuICAgICAgJ3N0YXR1cyc6ICdzdWNjZXNzJyxcbiAgICAgICdkYXRhJzoge1xuICAgICAgICAnZmlyc3RfbmFtZSc6IHVzZXIuZmlyc3RfbmFtZSxcbiAgICAgICAgJ2xhc3RfbmFtZSc6IHVzZXIubGFzdF9uYW1lLFxuICAgICAgICAnZW1haWwnOiB1c2VyLmVtYWlsLFxuICAgICAgICAnbW9iaWxlX251bWJlcic6IHVzZXIubW9iaWxlX251bWJlcixcbiAgICAgICAgJ2NvbXBhbnlfbmFtZSc6IHVzZXIuY29tcGFueV9uYW1lLFxuICAgICAgICAnc3RhdGUnOiB1c2VyLnN0YXRlLFxuICAgICAgICAnY2l0eSc6IHVzZXIuY2l0eSxcbiAgICAgICAgJ3BpY3R1cmUnOiB1c2VyLnBpY3R1cmUsXG4gICAgICAgICdzb2NpYWxfcHJvZmlsZV9waWN0dXJlJzogdXNlci5zb2NpYWxfcHJvZmlsZV9waWN0dXJlLFxuICAgICAgICAnX2lkJzogdXNlci5faWQsXG4gICAgICAgICdjdXJyZW50X3RoZW1lJzogdXNlci5jdXJyZW50X3RoZW1lXG4gICAgICB9LFxuICAgICAgYWNjZXNzX3Rva2VuOiB0b2tlblxuICAgIH0pO1xuICB9XG5cbiAgdmVyaWZ5QWNjb3VudCh1c2VyOlVzZXIsIGNhbGxiYWNrOihlcnJvcjphbnksIHJlc3VsdDphbnkpPT52b2lkKSB7XG4gICAgbGV0IHF1ZXJ5ID0geydfaWQnOiB1c2VyLl9pZCwgJ2lzQWN0aXZhdGVkJzogZmFsc2V9O1xuICAgIGxldCB1cGRhdGVEYXRhID0geydpc0FjdGl2YXRlZCc6IHRydWV9O1xuICAgIHRoaXMuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlRGF0YSwge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCx7XG4gICAgICAgICAgJ3N0YXR1cyc6ICdTdWNjZXNzJyxcbiAgICAgICAgICAnZGF0YSc6IHsnbWVzc2FnZSc6ICdVc2VyIEFjY291bnQgdmVyaWZpZWQgc3VjY2Vzc2Z1bGx5J31cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICB9KTtcbiAgfVxuXG4gIGNoYW5nZUVtYWlsSWQoZGF0YTphbnksIHVzZXIgOiBVc2VyLCBjYWxsYmFjazooZXJyb3I6YW55LCByZXN1bHQ6YW55KT0+dm9pZCkge1xuICAgIGxldCBhdXRoOiBBdXRoSW50ZXJjZXB0b3IgPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XG4gICAgbGV0IHF1ZXJ5ID0geydlbWFpbCc6IGRhdGEubmV3X2VtYWlsfTtcblxuICAgIHRoaXMucmV0cmlldmUocXVlcnksIChlcnJvciwgcmVzdWx0KSA9PiB7XG5cbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdC5sZW5ndGggPiAwICYmIHJlc3VsdFswXS5pc0FjdGl2YXRlZCA9PT0gdHJ1ZSkge1xuICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0VYSVNUSU5HX1VTRVIsXG4gICAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTixcbiAgICAgICAgICBzdGFja1RyYWNlOiBuZXcgRXJyb3IoKSxcbiAgICAgICAgICBjb2RlOiA0MDBcbiAgICAgICAgfSxudWxsKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0Lmxlbmd0aCA+IDAgJiYgcmVzdWx0WzBdLmlzQWN0aXZhdGVkID09PSBmYWxzZSkge1xuICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0VYSVNUSU5HX1VTRVIsXG4gICAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX0FDQ09VTlRfU1RBVFVTLFxuICAgICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxuICAgICAgICAgIGNvZGU6IDQwMFxuICAgICAgICB9LCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgdGhpcy5TZW5kQ2hhbmdlTWFpbFZlcmlmaWNhdGlvbihkYXRhLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKGVycm9yLm1lc3NhZ2UgPT09IE1lc3NhZ2VzLk1TR19FUlJPUl9DSEVDS19FTUFJTF9BQ0NPVU5UKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fRVhJU1RJTkdfVVNFUixcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfRU1BSUxfQUNUSVZFX05PVyxcbiAgICAgICAgICAgICAgICBzdGFja1RyYWNlOiBuZXcgRXJyb3IoKSxcbiAgICAgICAgICAgICAgICBjb2RlOiA0MDBcbiAgICAgICAgICAgICAgfSwgbnVsbCk7XG4gICAgICAgICAgICB9aWYgKGVycm9yLm1lc3NhZ2UgPT09IE1lc3NhZ2VzLk1TR19FUlJPUl9WRVJJRllfQUNDT1VOVCkge1xuICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfVkVSSUZZX0FDQ09VTlQsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX1ZFUklGWV9BQ0NPVU5ULFxuICAgICAgICAgICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxuICAgICAgICAgICAgICAgIGNvZGU6IDQwMFxuICAgICAgICAgICAgICB9LCBudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fV0hJTEVfQ09OVEFDVElORyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfV0hJTEVfQ09OVEFDVElORyxcbiAgICAgICAgICAgICAgICBzdGFja1RyYWNlOiBuZXcgRXJyb3IoKSxcbiAgICAgICAgICAgICAgICBjb2RlOiA0MDBcbiAgICAgICAgICAgICAgfSwgbnVsbCk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICAgICAgICAnc3RhdHVzJzogTWVzc2FnZXMuU1RBVFVTX1NVQ0NFU1MsXG4gICAgICAgICAgICAgICdkYXRhJzogeydtZXNzYWdlJzogTWVzc2FnZXMuTVNHX1NVQ0NFU1NfRU1BSUxfQ0hBTkdFX0VNQUlMSUR9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICB2ZXJpZnlDaGFuZ2VkRW1haWxJZCh1c2VyOiBhbnksIGNhbGxiYWNrOihlcnJvciA6IGFueSwgcmVzdWx0IDogYW55KT0+IGFueSkge1xuICAgIGxldCBxdWVyeSA9IHsnX2lkJzogdXNlci5faWR9O1xuICAgIGxldCB1cGRhdGVEYXRhID0geydlbWFpbCc6IHVzZXIudGVtcF9lbWFpbCwgJ3RlbXBfZW1haWwnOiB1c2VyLmVtYWlsfTtcbiAgICB0aGlzLmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwse1xuICAgICAgICAgICdzdGF0dXMnOiAnU3VjY2VzcycsXG4gICAgICAgICAgJ2RhdGEnOiB7J21lc3NhZ2UnOiAnVXNlciBBY2NvdW50IHZlcmlmaWVkIHN1Y2Nlc3NmdWxseSd9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfSk7XG4gIH1cblxuICB2ZXJpZnlNb2JpbGVOdW1iZXIoZGF0YSA6YW55ICwgdXNlciA6IGFueSwgY2FsbGJhY2s6KGVycm9yOmFueSwgcmVzdWx0OmFueSk9PnZvaWQpIHtcbiAgICBsZXQgcXVlcnkgPSB7J19pZCc6IHVzZXIuX2lkfTtcbiAgICBsZXQgdXBkYXRlRGF0YSA9IHsnbW9iaWxlX251bWJlcic6IHVzZXIudGVtcF9tb2JpbGUsICd0ZW1wX21vYmlsZSc6IHVzZXIubW9iaWxlX251bWJlcn07XG4gICAgaWYgKHVzZXIub3RwID09PSBkYXRhLm90cCkge1xuICAgICAgdGhpcy5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrKG51bGwse1xuICAgICAgICAgICAgJ3N0YXR1cyc6ICdTdWNjZXNzJyxcbiAgICAgICAgICAgICdkYXRhJzogeydtZXNzYWdlJzogJ1VzZXIgQWNjb3VudCB2ZXJpZmllZCBzdWNjZXNzZnVsbHknfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2soe1xuICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fSU5WQUxJRF9DUkVERU5USUFMUyxcbiAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX1dST05HX09UUCxcbiAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXG4gICAgICAgIGNvZGU6IDQwMFxuICAgICAgfSwgbnVsbCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UHJvamVjdHModXNlcjogVXNlciwgY2FsbGJhY2s6KGVycm9yIDogYW55LCByZXN1bHQgOmFueSk9PnZvaWQpIHtcbiAgICBsZXQgcXVlcnkgPSB7X2lkIDogdXNlci5faWR9O1xuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZEFuZFBvcHVsYXRlKHF1ZXJ5LCB7cGF0aDogJ3Byb2plY3QnLCBzZWxlY3Q6ICduYW1lJ30sIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICBpZihlcnJvcikge1xuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XG4gICAgICB9ZWxzZSB7XG4gICAgICAgIGxldCBhdXRoSW50ZXJjZXB0b3IgPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiByZXN1bHRbMF0ucHJvamVjdCwgYWNjZXNzX3Rva2VuOiBhdXRoSW50ZXJjZXB0b3IuaXNzdWVUb2tlbldpdGhVaWQodXNlcil9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5PYmplY3Quc2VhbChVc2VyU2VydmljZSk7XG5leHBvcnQgPSBVc2VyU2VydmljZTtcbiJdfQ==
