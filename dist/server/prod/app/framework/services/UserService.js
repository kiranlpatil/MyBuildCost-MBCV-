"use strict";
var UserRepository = require("../dataaccess/repository/UserRepository");
var SendMailService = require("./mailer.service");
var SendMessageService = require("./sendmessage.service");
var fs = require("fs");
var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;
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
var ProjectRepository = require("../../applicationProject/dataaccess/repository/ProjectRepository");
var ProjectSubscriptionDetails = require("../../applicationProject/dataaccess/model/project/Subscription/ProjectSubscriptionDetails");
var messages = require("../../applicationProject/shared/messages");
var constants = require("../../applicationProject/shared/constants");
var UserService = (function () {
    function UserService() {
        this.isActiveAddBuildingButton = false;
        this.userRepository = new UserRepository();
        this.projectRepository = new ProjectRepository();
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
                        subScriptionService_1.getSubscriptionPackageByName('Free', 'BasePackage', function (err, freeSubscription) {
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
    UserService.prototype.checkForValidSubscription = function (userid, callback) {
        var query = [
            { $match: { '_id': userid } },
            { $project: { 'subscription': 1 } },
            { $unwind: '$subscription' }
        ];
        this.userRepository.aggregate(query, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                var validSubscriptionPackage = void 0;
                if (result.length > 0) {
                    for (var _i = 0, result_1 = result; _i < result_1.length; _i++) {
                        var subscriptionPackage = result_1[_i];
                        if (subscriptionPackage.subscription.projectId.length === 0) {
                            validSubscriptionPackage = subscriptionPackage;
                        }
                    }
                }
                callback(null, validSubscriptionPackage);
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
    UserService.prototype.getUserForCheckingBuilding = function (userId, projectId, user, callback) {
        var _this = this;
        var query = [
            { $match: { '_id': userId } },
            { $project: { 'subscription': 1 } },
            { $unwind: '$subscription' },
            { $match: { 'subscription.projectId': projectId } }
        ];
        this.userRepository.aggregate(query, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                if (result.length > 0) {
                    var _loop_1 = function (subscriptionPackage) {
                        if (subscriptionPackage && subscriptionPackage.subscription.projectId !== null) {
                            var query_1 = { _id: projectId };
                            var populate = { path: 'building', select: ['name', 'buildings',] };
                            _this.projectRepository.findAndPopulate(query_1, populate, function (error, result) {
                                if (error) {
                                    callback(error, null);
                                }
                                else {
                                    var noOfBuildings = result.buildings.length;
                                    if (subscriptionPackage && noOfBuildings <= subscriptionPackage.subscription.numOfBuildings) {
                                        _this.isActiveAddBuildingButton = false;
                                    }
                                    else {
                                        _this.isActiveAddBuildingButton = true;
                                    }
                                }
                                callback(null, result);
                            });
                        }
                    };
                    for (var _i = 0, result_2 = result; _i < result_2.length; _i++) {
                        var subscriptionPackage = result_2[_i];
                        _loop_1(subscriptionPackage);
                    }
                }
            }
            callback(null, { data: _this.isActiveAddBuildingButton });
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
    UserService.prototype.assignPremiumPackage = function (user, userId, callback) {
        var _this = this;
        var projection = { subscription: 1 };
        this.userRepository.findByIdWithProjection(userId, projection, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                var subScriptionArray_1 = result.subscription;
                var subScriptionService = new SubscriptionService();
                subScriptionService.getSubscriptionPackageByName('Premium', 'BasePackage', function (error, subscriptionPackage) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var premiumPackage = subscriptionPackage[0];
                        var subscription = new UserSubscription();
                        subscription.activationDate = new Date();
                        subscription.numOfBuildings = premiumPackage.basePackage.numOfBuildings;
                        subscription.numOfProjects = premiumPackage.basePackage.numOfProjects;
                        subscription.validity = premiumPackage.basePackage.validity;
                        subscription.projectId = new Array();
                        subscription.purchased = new Array();
                        subscription.purchased.push(premiumPackage.basePackage);
                        subScriptionArray_1.push(subscription);
                        var query = { '_id': userId };
                        var newData = { $set: { 'subscription': subScriptionArray_1 } };
                        _this.userRepository.findOneAndUpdate(query, newData, { new: true }, function (err, response) {
                            if (err) {
                                callback(err, null);
                            }
                            else {
                                callback(null, { data: 'success' });
                            }
                        });
                    }
                });
            }
        });
    };
    UserService.prototype.getProjects = function (user, callback) {
        var _this = this;
        var query = { _id: user._id };
        var populate = { path: 'project', select: ['name', 'buildings', 'activeStatus'] };
        this.userRepository.findAndPopulate(query, populate, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                var authInterceptor = new AuthInterceptor();
                var populatedProject = result[0];
                var projectList = result[0].project;
                var subscriptionList = result[0].subscription;
                var projectSubscriptionArray = Array();
                var isAbleToCreateNewProject = false;
                for (var _i = 0, projectList_1 = projectList; _i < projectList_1.length; _i++) {
                    var project = projectList_1[_i];
                    for (var _a = 0, subscriptionList_1 = subscriptionList; _a < subscriptionList_1.length; _a++) {
                        var subscription = subscriptionList_1[_a];
                        if (subscription.projectId.indexOf(project._id)) {
                            var projectSubscription = new ProjectSubscriptionDetails();
                            projectSubscription.projectName = project.name;
                            projectSubscription.projectId = project._id;
                            projectSubscription.activeStatus = project.activeStatus;
                            projectSubscription.numOfBuildingsRemaining = (subscription.numOfBuildings - project.buildings.length);
                            projectSubscription.numOfBuildingsAllocated = project.buildings.length;
                            projectSubscription.packageName = _this.checkCurrentPackage(subscription);
                            var activation_date = new Date(subscription.activationDate);
                            var expiryDate = new Date(subscription.activationDate);
                            projectSubscription.expiryDate = new Date(expiryDate.setDate(activation_date.getDate() + subscription.validity));
                            var current_date = new Date();
                            projectSubscription.numOfDaysToExpire = _this.daysdifference(projectSubscription.expiryDate, current_date);
                            if (projectSubscription.numOfDaysToExpire < 30 && projectSubscription.numOfDaysToExpire >= 0) {
                                projectSubscription.warningMessage =
                                    'Expiring in ' + Math.round(projectSubscription.numOfDaysToExpire) + ' days,';
                            }
                            else if (projectSubscription.numOfDaysToExpire < 0) {
                                projectSubscription.expiryMessage = 'Project expired,';
                            }
                            projectSubscriptionArray.push(projectSubscription);
                        }
                        else if (subscription.projectId.length === 0) {
                            isAbleToCreateNewProject = true;
                        }
                    }
                }
                if (projectList.length === 0) {
                    isAbleToCreateNewProject = true;
                }
                callback(null, {
                    data: projectSubscriptionArray,
                    isSubscriptionAvailable: isAbleToCreateNewProject,
                    access_token: authInterceptor.issueTokenWithUid(user)
                });
            }
        });
    };
    UserService.prototype.checkCurrentPackage = function (subscription) {
        var activation_date = new Date(subscription.activationDate);
        var expiryDate = new Date(subscription.activationDate);
        var current_date = new Date();
        for (var _i = 0, _a = subscription.purchased; _i < _a.length; _i++) {
            var purchasePackage = _a[_i];
            expiryDate = new Date(expiryDate.setDate(activation_date.getDate() + purchasePackage.validity));
            if (expiryDate >= current_date) {
                return purchasePackage.name;
            }
        }
    };
    UserService.prototype.daysdifference = function (date1, date2) {
        var ONEDAY = 1000 * 60 * 60 * 24;
        var date1_ms = date1.getTime();
        var date2_ms = date2.getTime();
        var difference_ms = (date1_ms - date2_ms);
        return Math.round(difference_ms / ONEDAY);
    };
    UserService.prototype.getProjectSubscription = function (user, projectId, callback) {
        var _this = this;
        var query = [
            { $match: { '_id': ObjectId(user._id) } },
            { $project: { 'subscription': 1 } },
            { $unwind: '$subscription' },
            { $match: { 'subscription.projectId': ObjectId(projectId) } }
        ];
        this.userRepository.aggregate(query, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                var query_2 = { _id: projectId };
                var populate = { path: 'buildings' };
                _this.projectRepository.findAndPopulate(query_2, populate, function (error, resp) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        var projectSubscription = new ProjectSubscriptionDetails();
                        projectSubscription.projectName = resp[0].name;
                        projectSubscription.projectId = resp[0]._id;
                        projectSubscription.activeStatus = resp[0].activeStatus;
                        projectSubscription.numOfBuildingsAllocated = resp[0].buildings.length;
                        projectSubscription.numOfBuildingsRemaining = (result[0].subscription.numOfBuildings - resp[0].buildings.length);
                        var activation_date = new Date(result[0].subscription.activationDate);
                        var expiryDate = new Date(result[0].subscription.activationDate);
                        projectSubscription.expiryDate = new Date(expiryDate.setDate(activation_date.getDate() + result[0].subscription.validity));
                        var current_date = new Date();
                        projectSubscription.numOfDaysToExpire = _this.daysdifference(projectSubscription.expiryDate, current_date);
                        if (projectSubscription.numOfDaysToExpire < 30 && projectSubscription.numOfDaysToExpire >= 0) {
                            projectSubscription.warningMessage =
                                'Expiring in ' + Math.round(projectSubscription.numOfDaysToExpire) + ' days.';
                        }
                        else if (projectSubscription.numOfDaysToExpire < 0) {
                            projectSubscription.expiryMessage = 'Project expired,';
                        }
                        callback(null, projectSubscription);
                    }
                });
            }
        });
    };
    UserService.prototype.updateSubscription = function (user, projectId, packageName, callback) {
        var _this = this;
        var query = [
            { $match: { '_id': ObjectId(user._id) } },
            { $project: { 'subscription': 1 } },
            { $unwind: '$subscription' },
            { $match: { 'subscription.projectId': ObjectId(projectId) } }
        ];
        this.userRepository.aggregate(query, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                var subscription = result[0].subscription;
                _this.updatePackage(user, subscription, packageName, projectId, function (error, result) {
                    if (error) {
                        var error_1 = new Error();
                        error_1.message = messages.MSG_ERROR_WHILE_CONTACTING;
                        callback(error_1, null);
                    }
                    else {
                        if (packageName === constants.RENEW_PROJECT) {
                            callback(null, { data: messages.MSG_SUCCESS_PROJECT_RENEW });
                        }
                        else {
                            callback(null, { data: 'success' });
                        }
                    }
                });
            }
        });
    };
    UserService.prototype.updatePackage = function (user, subscription, packageName, projectId, callback) {
        var _this = this;
        var subScriptionService = new SubscriptionService();
        switch (packageName) {
            case 'Premium':
                {
                    subScriptionService.getSubscriptionPackageByName('Premium', 'BasePackage', function (error, subscriptionPackage) {
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            var result = subscriptionPackage[0];
                            subscription.numOfBuildings = result.basePackage.numOfBuildings;
                            subscription.numOfProjects = result.basePackage.numOfProjects;
                            var noOfDaysToExpiry = _this.calculateValidity(subscription);
                            subscription.validity = noOfDaysToExpiry + result.basePackage.validity;
                            subscription.purchased.push(result.basePackage);
                            _this.updateSubscriptionPackage(user._id, projectId, subscription, function (error, result) {
                                if (error) {
                                    callback(error, null);
                                }
                                else {
                                    callback(null, { data: 'success' });
                                }
                            });
                        }
                    });
                    break;
                }
            case 'RenewProject':
                {
                    subScriptionService.getSubscriptionPackageByName('RenewProject', 'addOnPackage', function (error, subscriptionPackage) {
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            var result = subscriptionPackage[0];
                            var noOfDaysToExpiry = _this.calculateValidity(subscription);
                            subscription.validity = noOfDaysToExpiry + result.addOnPackage.validity;
                            subscription.purchased.push(result.addOnPackage);
                            _this.updateSubscriptionPackage(user._id, projectId, subscription, function (error, result) {
                                if (error) {
                                    callback(error, null);
                                }
                                else {
                                    callback(null, { data: 'success' });
                                }
                            });
                        }
                    });
                    break;
                }
            case 'Add_building':
                {
                    subScriptionService.getSubscriptionPackageByName('Add_building', 'addOnPackage', function (error, subscriptionPackage) {
                        if (error) {
                            callback(error, null);
                        }
                        else {
                            var result = subscriptionPackage[0];
                            subscription.numOfBuildings = subscription.numOfBuildings + result.addOnPackage.numOfBuildings;
                            subscription.purchased.push(result.addOnPackage);
                            _this.updateSubscriptionPackage(user._id, projectId, subscription, function (error, result) {
                                if (error) {
                                    callback(error, null);
                                }
                                else {
                                    callback(null, { data: 'success' });
                                }
                            });
                        }
                    });
                    break;
                }
        }
    };
    UserService.prototype.updateSubscriptionPackage = function (userId, projectId, subscription, callback) {
        var query = { _id: userId };
        var updateQuery = { $set: { 'subscription.$[]': subscription } };
        this.userRepository.findOneAndUpdate(query, updateQuery, { new: true }, function (error, result) {
            if (error) {
                callback(error, null);
            }
            else {
                callback(null, { data: 'success' });
            }
        });
    };
    UserService.prototype.calculateValidity = function (subscription) {
        var activationDate = new Date(subscription.activationDate);
        var expiryDate = new Date(subscription.activationDate);
        var projectExpiryDate = new Date(expiryDate.setDate(activationDate.getDate() + subscription.validity));
        var current_date = new Date();
        var days = this.daysdifference(projectExpiryDate, current_date);
        return days;
    };
    return UserService;
}());
Object.seal(UserService);
module.exports = UserService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvc2VydmljZXMvVXNlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHdFQUEyRTtBQUMzRSxrREFBcUQ7QUFDckQsMERBQTZEO0FBQzdELHVCQUF5QjtBQUN6QixtQ0FBcUM7QUFDckMsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7QUFFdkMsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzQiw2Q0FBZ0Q7QUFDaEQsOEVBQWlGO0FBQ2pGLHFEQUF3RDtBQUN4RCx1REFBMEQ7QUFFMUQsK0JBQWtDO0FBQ2xDLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzlDLHVFQUFvRTtBQUdwRSwyRkFBOEY7QUFHOUYsa0hBQXFIO0FBQ3JILG9HQUF1RztBQUN2RyxzSUFBeUk7QUFDekksbUVBQXVFO0FBQ3ZFLHFFQUF5RTtBQUV6RTtJQVFFO1FBSkEsOEJBQXlCLEdBQVMsS0FBSyxDQUFDO1FBS3RDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUMzQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ2pELElBQUksQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQztJQUN4QyxDQUFDO0lBRUQsZ0NBQVUsR0FBVixVQUFXLElBQVMsRUFBRSxRQUEyQztRQUFqRSxpQkFrREM7UUFqREMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBQyxFQUFFLFVBQUMsR0FBRyxFQUFFLEdBQUc7WUFDM0QsRUFB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Q0FBQztJQUNkLENBQUM7SUFFSCxrQkFBQztBQUFELENBdjlCQSxBQXU5QkMsSUFBQTtBQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDekIsaUJBQVMsV0FBVyxDQUFDIiwiZmlsZSI6ImFwcC9mcmFtZXdvcmsvc2VydmljZXMvVXNlclNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVXNlclJlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvVXNlclJlcG9zaXRvcnknKTtcclxuaW1wb3J0IFNlbmRNYWlsU2VydmljZSA9IHJlcXVpcmUoJy4vbWFpbGVyLnNlcnZpY2UnKTtcclxuaW1wb3J0IFNlbmRNZXNzYWdlU2VydmljZSA9IHJlcXVpcmUoJy4vc2VuZG1lc3NhZ2Uuc2VydmljZScpO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcclxubGV0IE9iamVjdElkID0gbW9uZ29vc2UuVHlwZXMuT2JqZWN0SWQ7XHJcbmltcG9ydCB7IFNlbnRNZXNzYWdlSW5mbyB9IGZyb20gJ25vZGVtYWlsZXInO1xyXG5sZXQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XHJcbmxldCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG5pbXBvcnQgTWVzc2FnZXMgPSByZXF1aXJlKCcuLi9zaGFyZWQvbWVzc2FnZXMnKTtcclxuaW1wb3J0IEF1dGhJbnRlcmNlcHRvciA9IHJlcXVpcmUoJy4uLy4uL2ZyYW1ld29yay9pbnRlcmNlcHRvci9hdXRoLmludGVyY2VwdG9yJyk7XHJcbmltcG9ydCBQcm9qZWN0QXNzZXQgPSByZXF1aXJlKCcuLi9zaGFyZWQvcHJvamVjdGFzc2V0Jyk7XHJcbmltcG9ydCBNYWlsQXR0YWNobWVudHMgPSByZXF1aXJlKCcuLi9zaGFyZWQvc2hhcmVkYXJyYXknKTtcclxuaW1wb3J0IHsgYXNFbGVtZW50RGF0YSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUvc3JjL3ZpZXcnO1xyXG5pbXBvcnQgYmNyeXB0ID0gcmVxdWlyZSgnYmNyeXB0Jyk7XHJcbmxldCBsb2c0anMgPSByZXF1aXJlKCdsb2c0anMnKTtcclxubGV0IGxvZ2dlciA9IGxvZzRqcy5nZXRMb2dnZXIoJ1VzZXIgc2VydmljZScpO1xyXG5pbXBvcnQgeyBNYWlsQ2hpbXBNYWlsZXJTZXJ2aWNlIH0gZnJvbSAnLi9tYWlsY2hpbXAtbWFpbGVyLnNlcnZpY2UnO1xyXG5pbXBvcnQgVXNlck1vZGVsID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb2RlbC9Vc2VyTW9kZWwnKTtcclxuaW1wb3J0IFVzZXIgPSByZXF1aXJlKCcuLi9kYXRhYWNjZXNzL21vbmdvb3NlL3VzZXInKTtcclxuaW1wb3J0IFN1YnNjcmlwdGlvblNlcnZpY2UgPSByZXF1aXJlKCcuLi8uLi9hcHBsaWNhdGlvblByb2plY3Qvc2VydmljZXMvU3Vic2NyaXB0aW9uU2VydmljZScpO1xyXG5pbXBvcnQgU3Vic2NyaXB0aW9uUGFja2FnZSA9IHJlcXVpcmUoJy4uLy4uL2FwcGxpY2F0aW9uUHJvamVjdC9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvU3Vic2NyaXB0aW9uL1N1YnNjcmlwdGlvblBhY2thZ2UnKTtcclxuaW1wb3J0IEJhc2VTdWJzY3JpcHRpb25QYWNrYWdlID0gcmVxdWlyZSgnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9TdWJzY3JpcHRpb24vQmFzZVN1YnNjcmlwdGlvblBhY2thZ2UnKTtcclxuaW1wb3J0IFVzZXJTdWJzY3JpcHRpb24gPSByZXF1aXJlKCcuLi8uLi9hcHBsaWNhdGlvblByb2plY3QvZGF0YWFjY2Vzcy9tb2RlbC9wcm9qZWN0L1N1YnNjcmlwdGlvbi9Vc2VyU3Vic2NyaXB0aW9uJyk7XHJcbmltcG9ydCBQcm9qZWN0UmVwb3NpdG9yeSA9IHJlcXVpcmUoJy4uLy4uL2FwcGxpY2F0aW9uUHJvamVjdC9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvUHJvamVjdFJlcG9zaXRvcnknKTtcclxuaW1wb3J0IFByb2plY3RTdWJzY3JpcHRpb25EZXRhaWxzID0gcmVxdWlyZSgnLi4vLi4vYXBwbGljYXRpb25Qcm9qZWN0L2RhdGFhY2Nlc3MvbW9kZWwvcHJvamVjdC9TdWJzY3JpcHRpb24vUHJvamVjdFN1YnNjcmlwdGlvbkRldGFpbHMnKTtcclxuaW1wb3J0IG1lc3NhZ2VzICA9IHJlcXVpcmUoJy4uLy4uL2FwcGxpY2F0aW9uUHJvamVjdC9zaGFyZWQvbWVzc2FnZXMnKTtcclxuaW1wb3J0IGNvbnN0YW50cyAgPSByZXF1aXJlKCcuLi8uLi9hcHBsaWNhdGlvblByb2plY3Qvc2hhcmVkL2NvbnN0YW50cycpO1xyXG5cclxuY2xhc3MgVXNlclNlcnZpY2Uge1xyXG4gIEFQUF9OQU1FOiBzdHJpbmc7XHJcbiAgY29tcGFueV9uYW1lOiBzdHJpbmc7XHJcbiAgbWlkX2NvbnRlbnQ6IGFueTtcclxuICBpc0FjdGl2ZUFkZEJ1aWxkaW5nQnV0dG9uOmJvb2xlYW49ZmFsc2U7XHJcbiAgcHJpdmF0ZSB1c2VyUmVwb3NpdG9yeTogVXNlclJlcG9zaXRvcnk7XHJcbiAgcHJpdmF0ZSBwcm9qZWN0UmVwb3NpdG9yeTpQcm9qZWN0UmVwb3NpdG9yeTtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5ID0gbmV3IFVzZXJSZXBvc2l0b3J5KCk7XHJcbiAgICB0aGlzLnByb2plY3RSZXBvc2l0b3J5ID0gbmV3IFByb2plY3RSZXBvc2l0b3J5KCk7XHJcbiAgICB0aGlzLkFQUF9OQU1FID0gUHJvamVjdEFzc2V0LkFQUF9OQU1FO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlVXNlcihpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkucmV0cmlldmUoeydlbWFpbCc6IGl0ZW0uZW1haWx9LCAoZXJyLCByZXMpID0+IHtcclxuICAgICAgaWYgKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihlcnIpLCBudWxsKTtcclxuICAgICAgfSBlbHNlIGlmIChyZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnRW1haWwgYWxyZWFkeSBleGlzdCcrSlNPTi5zdHJpbmdpZnkocmVzKSk7XHJcblxyXG4gICAgICAgIGlmIChyZXNbMF0uaXNBY3RpdmF0ZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfUkVHSVNUUkFUSU9OKSwgbnVsbCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZXNbMF0uaXNBY3RpdmF0ZWQgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1ZFUklGWV9BQ0NPVU5UKSwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsb2dnZXIuZGVidWcoJ0VtYWlsIG5vdCBwcmVzZW50LicrSlNPTi5zdHJpbmdpZnkocmVzKSk7XHJcbiAgICAgICAgY29uc3Qgc2FsdFJvdW5kcyA9IDEwO1xyXG4gICAgICAgIGJjcnlwdC5oYXNoKGl0ZW0ucGFzc3dvcmQsIHNhbHRSb3VuZHMsIChlcnI6IGFueSwgaGFzaDogYW55KSA9PiB7XHJcbiAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgaW4gY3JlYXRpbmcgaGFzaCBwYXNzd29yZCcpO1xyXG4gICAgICAgICAgICBjYWxsYmFjayh7XHJcbiAgICAgICAgICAgICAgcmVhc29uOiAnRXJyb3IgaW4gY3JlYXRpbmcgaGFzaCB1c2luZyBiY3J5cHQnLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdFcnJvciBpbiBjcmVhdGluZyBoYXNoIHVzaW5nIGJjcnlwdCcsXHJcbiAgICAgICAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXHJcbiAgICAgICAgICAgICAgY29kZTogNDAzXHJcbiAgICAgICAgICAgIH0sIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCdjcmVhdGVkIGhhc2ggc3VjY2VzZnVsbHkuJyk7XHJcbiAgICAgICAgICAgIGl0ZW0ucGFzc3dvcmQgPSBoYXNoO1xyXG4gICAgICAgICAgICBsZXQgc3ViU2NyaXB0aW9uU2VydmljZSA9IG5ldyBTdWJzY3JpcHRpb25TZXJ2aWNlKCk7XHJcbiAgICAgICAgICAgIHN1YlNjcmlwdGlvblNlcnZpY2UuZ2V0U3Vic2NyaXB0aW9uUGFja2FnZUJ5TmFtZSgnRnJlZScsJ0Jhc2VQYWNrYWdlJywgKGVycjogYW55LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJlZVN1YnNjcmlwdGlvbjogQXJyYXk8U3Vic2NyaXB0aW9uUGFja2FnZT4pID0+IHtcclxuICAgICAgICAgICAgICBpZiAoZnJlZVN1YnNjcmlwdGlvbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2ZyZWVTdWJzY3JpcHRpb24gbGVuZ3RoICA+IDAnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXNzaWduRnJlZVN1YnNjcmlwdGlvbkFuZENyZWF0ZVVzZXIoaXRlbSwgZnJlZVN1YnNjcmlwdGlvblswXSwgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICAgIH1lbHNlIHtcclxuICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnZnJlZVN1YnNjcmlwdGlvbiBsZW5ndGggIT09MCcpO1xyXG4gICAgICAgICAgICAgICAgc3ViU2NyaXB0aW9uU2VydmljZS5hZGRTdWJzY3JpcHRpb25QYWNrYWdlKGNvbmZpZy5nZXQoJ3N1YnNjcmlwdGlvbi5wYWNrYWdlLkZyZWUnKSxcclxuICAgICAgICAgICAgICAgICAgKGVycjogYW55LCBmcmVlU3Vic2NyaXB0aW9uKT0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ2Fzc2lnbmluZyBmcmVlIHN1YnNjcmlwdGlvbiBieSBjcmVhdGluZyBuZXcgdXNlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXNzaWduRnJlZVN1YnNjcmlwdGlvbkFuZENyZWF0ZVVzZXIoaXRlbSwgZnJlZVN1YnNjcmlwdGlvbiwgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjaGVja0ZvclZhbGlkU3Vic2NyaXB0aW9uKHVzZXJpZCA6IHN0cmluZywgY2FsbGJhY2sgOiAoZXJyb3IgOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcblxyXG4gICAgbGV0IHF1ZXJ5ID0gW1xyXG4gICAgICB7ICRtYXRjaDogeydfaWQnOnVzZXJpZH19LFxyXG4gICAgICB7ICRwcm9qZWN0IDogeydzdWJzY3JpcHRpb24nOjF9fSxcclxuICAgICAgeyAkdW53aW5kOiAnJHN1YnNjcmlwdGlvbid9XHJcbiAgICBdO1xyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5hZ2dyZWdhdGUocXVlcnkgLChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgdmFsaWRTdWJzY3JpcHRpb25QYWNrYWdlO1xyXG4gICAgICAgIGlmKHJlc3VsdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBmb3IobGV0IHN1YnNjcmlwdGlvblBhY2thZ2Ugb2YgcmVzdWx0KSB7XHJcbiAgICAgICAgICAgIGlmKHN1YnNjcmlwdGlvblBhY2thZ2Uuc3Vic2NyaXB0aW9uLnByb2plY3RJZC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICB2YWxpZFN1YnNjcmlwdGlvblBhY2thZ2UgPSBzdWJzY3JpcHRpb25QYWNrYWdlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHZhbGlkU3Vic2NyaXB0aW9uUGFja2FnZSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgIGFzc2lnbkZyZWVTdWJzY3JpcHRpb25BbmRDcmVhdGVVc2VyKGl0ZW06IGFueSwgZnJlZVN1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uUGFja2FnZSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbGV0IHVzZXI6IFVzZXJNb2RlbCA9IGl0ZW07XHJcbiAgICBsZXQgc2VuZE1haWxTZXJ2aWNlID0gbmV3IFNlbmRNYWlsU2VydmljZSgpO1xyXG4gICAgdGhpcy5hc3NpZ25GcmVlU3Vic2NyaXB0aW9uUGFja2FnZSh1c2VyLCBmcmVlU3Vic2NyaXB0aW9uKTtcclxuICAgIGxvZ2dlci5kZWJ1ZygnQ3JlYXRpbmcgdXNlciB3aXRoIG5ldyBmcmVlIHRyYWlsIHN1YnNjcmlwdGlvbiBwYWNrYWdlJyk7XHJcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmNyZWF0ZSh1c2VyLCAoZXJyOkVycm9yLCByZXM6YW55KSA9PiB7XHJcbiAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBDcmVhdGluZyB1c2VyIHN1YnNjcmlwdGlvbiBwYWNrYWdlJyk7XHJcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9SRUdJU1RSQVRJT05fTU9CSUxFX05VTUJFUiksIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnY3JlYXRlZCB1c2VyIHN1Y2Nlc2Z1bGx5LicrSlNPTi5zdHJpbmdpZnkocmVzKSk7XHJcbiAgICAgICAgbGV0IGF1dGggPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XHJcbiAgICAgICAgbGV0IHRva2VuID0gYXV0aC5pc3N1ZVRva2VuV2l0aFVpZChyZXMpO1xyXG4gICAgICAgIGxldCBob3N0ID0gY29uZmlnLmdldCgnYXBwbGljYXRpb24ubWFpbC5ob3N0Jyk7XHJcbiAgICAgICAgbGV0IGxpbmsgPSBob3N0ICsgJ3NpZ25pbj9hY2Nlc3NfdG9rZW49JyArIHRva2VuICsgJyZfaWQ9JyArIHJlcy5faWQ7XHJcbiAgICAgICAgbGV0IGh0bWxUZW1wbGF0ZSA9ICd3ZWxjb21lLWFib2FyZC5odG1sJztcclxuICAgICAgICBsZXQgZGF0YTpNYXA8c3RyaW5nLHN0cmluZz49IG5ldyBNYXAoW1snJGFwcGxpY2F0aW9uTGluayQnLGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpXSxcclxuICAgICAgICAgIFsnJGZpcnN0X25hbWUkJyxyZXMuZmlyc3RfbmFtZV0sWyckbGluayQnLGxpbmtdLFsnJGFwcF9uYW1lJCcsdGhpcy5BUFBfTkFNRV1dKTtcclxuICAgICAgICBsZXQgYXR0YWNobWVudCA9IE1haWxBdHRhY2htZW50cy5XZWxjb21lQWJvYXJkQXR0YWNobWVudEFycmF5O1xyXG4gICAgICAgIGxvZ2dlci5kZWJ1Zygnc2VuZGluZyBtYWlsIHRvIG5ldyB1c2VyLicrSlNPTi5zdHJpbmdpZnkoYXR0YWNobWVudCkpO1xyXG4gICAgICAgIHNlbmRNYWlsU2VydmljZS5zZW5kKCB1c2VyLmVtYWlsLCBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX0NBTkRJREFURV9SRUdJU1RSQVRJT04sIGh0bWxUZW1wbGF0ZSwgZGF0YSxhdHRhY2htZW50LFxyXG4gICAgICAgICAgKGVycjogYW55LCByZXN1bHQ6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldFVzZXJGb3JDaGVja2luZ0J1aWxkaW5nKHVzZXJJZDpzdHJpbmcscHJvamVjdElkOnN0cmluZyx1c2VyOlVzZXIsY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgbGV0IHF1ZXJ5PSBbXHJcbiAgICAgIHsgJG1hdGNoOiB7J19pZCc6dXNlcklkfX0sXHJcbiAgICAgIHsgJHByb2plY3QgOiB7J3N1YnNjcmlwdGlvbic6MX19LFxyXG4gICAgICB7ICR1bndpbmQ6ICckc3Vic2NyaXB0aW9uJ30sXHJcbiAgICAgIHsgJG1hdGNoOiB7J3N1YnNjcmlwdGlvbi5wcm9qZWN0SWQnOnByb2plY3RJZH19XHJcbiAgICBdO1xyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5hZ2dyZWdhdGUocXVlcnksKGVycm9yLHJlc3VsdCk9PiB7XHJcbiAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsbnVsbCk7XHJcbiAgICAgIH1lbHNlIHtcclxuICAgICAgICBpZihyZXN1bHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgZm9yKGxldCBzdWJzY3JpcHRpb25QYWNrYWdlIG9mIHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgIGlmKHN1YnNjcmlwdGlvblBhY2thZ2UgJiYgc3Vic2NyaXB0aW9uUGFja2FnZS5zdWJzY3JpcHRpb24ucHJvamVjdElkIT09bnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHF1ZXJ5ID0ge19pZDogcHJvamVjdElkfTtcclxuICAgICAgICAgICAgICAgIGxldCBwb3B1bGF0ZSA9IHtwYXRoOiAnYnVpbGRpbmcnLCBzZWxlY3Q6IFsnbmFtZScsICdidWlsZGluZ3MnLF19O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQW5kUG9wdWxhdGUocXVlcnksIHBvcHVsYXRlLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5vT2ZCdWlsZGluZ3M9cmVzdWx0LmJ1aWxkaW5ncy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoc3Vic2NyaXB0aW9uUGFja2FnZSAmJiBub09mQnVpbGRpbmdzIDw9IHN1YnNjcmlwdGlvblBhY2thZ2Uuc3Vic2NyaXB0aW9uLm51bU9mQnVpbGRpbmdzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQWN0aXZlQWRkQnVpbGRpbmdCdXR0b249ZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0FjdGl2ZUFkZEJ1aWxkaW5nQnV0dG9uPXRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCxyZXN1bHQpO1xyXG5cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBjYWxsYmFjayhudWxsLHtkYXRhOnRoaXMuaXNBY3RpdmVBZGRCdWlsZGluZ0J1dHRvbn0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuXHJcbiAgYXNzaWduRnJlZVN1YnNjcmlwdGlvblBhY2thZ2UodXNlcjogVXNlck1vZGVsLCBmcmVlU3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb25QYWNrYWdlKSB7XHJcbiAgICBsZXQgc3Vic2NyaXB0aW9uID0gbmV3IFVzZXJTdWJzY3JpcHRpb24oKTtcclxuICAgIHN1YnNjcmlwdGlvbi5hY3RpdmF0aW9uRGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICBzdWJzY3JpcHRpb24ubnVtT2ZCdWlsZGluZ3MgPSBmcmVlU3Vic2NyaXB0aW9uLmJhc2VQYWNrYWdlLm51bU9mQnVpbGRpbmdzO1xyXG4gICAgc3Vic2NyaXB0aW9uLm51bU9mUHJvamVjdHMgPSBmcmVlU3Vic2NyaXB0aW9uLmJhc2VQYWNrYWdlLm51bU9mUHJvamVjdHM7XHJcbiAgICBzdWJzY3JpcHRpb24udmFsaWRpdHkgPSBmcmVlU3Vic2NyaXB0aW9uLmJhc2VQYWNrYWdlLnZhbGlkaXR5O1xyXG4gICAgc3Vic2NyaXB0aW9uLnByb2plY3RJZCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XHJcbiAgICBzdWJzY3JpcHRpb24ucHVyY2hhc2VkID0gbmV3IEFycmF5PEJhc2VTdWJzY3JpcHRpb25QYWNrYWdlPigpO1xyXG4gICAgc3Vic2NyaXB0aW9uLnB1cmNoYXNlZC5wdXNoKGZyZWVTdWJzY3JpcHRpb24uYmFzZVBhY2thZ2UpO1xyXG4gICAgdXNlci5zdWJzY3JpcHRpb24gPSBuZXcgQXJyYXk8VXNlclN1YnNjcmlwdGlvbj4oKTtcclxuICAgIHVzZXIuc3Vic2NyaXB0aW9uLnB1c2goc3Vic2NyaXB0aW9uKTtcclxuICB9XHJcblxyXG4gIGxvZ2luKGRhdGE6IGFueSwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICB0aGlzLnJldHJpZXZlKHsnZW1haWwnOiBkYXRhLmVtYWlsfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdC5sZW5ndGggPiAwICYmIHJlc3VsdFswXS5pc0FjdGl2YXRlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICAgIGJjcnlwdC5jb21wYXJlKGRhdGEucGFzc3dvcmQsIHJlc3VsdFswXS5wYXNzd29yZCwgKGVycjogYW55LCBpc1NhbWU6IGFueSkgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayh7XHJcbiAgICAgICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0lOVkFMSURfUkVHSVNUUkFUSU9OX1NUQVRVUyxcclxuICAgICAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfVkVSSUZZX0NBTkRJREFURV9BQ0NPVU5ULFxyXG4gICAgICAgICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxyXG4gICAgICAgICAgICAgIGFjdHVhbEVycm9yOiBlcnIsXHJcbiAgICAgICAgICAgICAgY29kZTogNTAwXHJcbiAgICAgICAgICAgIH0sIG51bGwpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLypjb25zb2xlLmxvZygnZ290IHVzZXInKTsqL1xyXG4gICAgICAgICAgICBpZiAoaXNTYW1lKSB7XHJcbiAgICAgICAgICAgICAgbGV0IGF1dGggPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XHJcbiAgICAgICAgICAgICAgbGV0IHRva2VuID0gYXV0aC5pc3N1ZVRva2VuV2l0aFVpZChyZXN1bHRbMF0pO1xyXG4gICAgICAgICAgICAgIHZhciBkYXRhOiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICAnc3RhdHVzJzogTWVzc2FnZXMuU1RBVFVTX1NVQ0NFU1MsXHJcbiAgICAgICAgICAgICAgICAnZGF0YSc6IHtcclxuICAgICAgICAgICAgICAgICAgJ2ZpcnN0X25hbWUnOiByZXN1bHRbMF0uZmlyc3RfbmFtZSxcclxuICAgICAgICAgICAgICAgICAgJ2xhc3RfbmFtZSc6IHJlc3VsdFswXS5sYXN0X25hbWUsXHJcbiAgICAgICAgICAgICAgICAgICdjb21wYW55X25hbWUnOiByZXN1bHRbMF0uY29tcGFueV9uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAnZW1haWwnOiByZXN1bHRbMF0uZW1haWwsXHJcbiAgICAgICAgICAgICAgICAgICdfaWQnOiByZXN1bHRbMF0uX2lkLFxyXG4gICAgICAgICAgICAgICAgICAnY3VycmVudF90aGVtZSc6IHJlc3VsdFswXS5jdXJyZW50X3RoZW1lLFxyXG4gICAgICAgICAgICAgICAgICAncGljdHVyZSc6IHJlc3VsdFswXS5waWN0dXJlLFxyXG4gICAgICAgICAgICAgICAgICAnbW9iaWxlX251bWJlcic6IHJlc3VsdFswXS5tb2JpbGVfbnVtYmVyLFxyXG4gICAgICAgICAgICAgICAgICAnYWNjZXNzX3Rva2VuJzogdG9rZW5cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBhY2Nlc3NfdG9rZW46IHRva2VuXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBkYXRhKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayh7XHJcbiAgICAgICAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fSU5WQUxJRF9DUkVERU5USUFMUyxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9XUk9OR19QQVNTV09SRCxcclxuICAgICAgICAgICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxyXG4gICAgICAgICAgICAgICAgY29kZTogNDAwXHJcbiAgICAgICAgICAgICAgfSwgbnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIGlmIChyZXN1bHQubGVuZ3RoID4gMCAmJiByZXN1bHRbMF0uaXNBY3RpdmF0ZWQgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgY2FsbGJhY2soe1xyXG4gICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0lOVkFMSURfUkVHSVNUUkFUSU9OX1NUQVRVUyxcclxuICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9WRVJJRllfQ0FORElEQVRFX0FDQ09VTlQsXHJcbiAgICAgICAgICBzdGFja1RyYWNlOiBuZXcgRXJyb3IoKSxcclxuICAgICAgICAgIGNvZGU6IDUwMFxyXG4gICAgICAgIH0sIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKHtcclxuICAgICAgICAgIHJlYXNvbjogTWVzc2FnZXMuTVNHX0VSUk9SX1JTTl9VU0VSX05PVF9GT1VORCxcclxuICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9VU0VSX05PVF9QUkVTRU5ULFxyXG4gICAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXHJcbiAgICAgICAgICBjb2RlOiA0MDBcclxuICAgICAgICB9LG51bGwpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHNlbmRPdHAocGFyYW1zOiBhbnksIHVzZXI6IGFueSwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgRGF0YSA9IHtcclxuICAgICAgbmV3X21vYmlsZV9udW1iZXI6IHBhcmFtcy5tb2JpbGVfbnVtYmVyLFxyXG4gICAgICBvbGRfbW9iaWxlX251bWJlcjogdXNlci5tb2JpbGVfbnVtYmVyLFxyXG4gICAgICBfaWQ6IHVzZXIuX2lkXHJcbiAgICB9O1xyXG4gICAgdGhpcy5nZW5lcmF0ZU90cChEYXRhLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBpZiAoZXJyb3IgPT09IE1lc3NhZ2VzLk1TR19FUlJPUl9DSEVDS19NT0JJTEVfUFJFU0VOVCkge1xyXG4gICAgICAgICAgY2FsbGJhY2soe1xyXG4gICAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fRVhJU1RJTkdfVVNFUixcclxuICAgICAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTl9NT0JJTEVfTlVNQkVSLFxyXG4gICAgICAgICAgICBzdGFja1RyYWNlOiBuZXcgRXJyb3IoKSxcclxuICAgICAgICAgICAgY29kZTogNDAwXHJcbiAgICAgICAgICB9LCBudWxsKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmIChyZXN1bHQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNhbGxiYWNrKHtcclxuICAgICAgICAgICdzdGF0dXMnOiBNZXNzYWdlcy5TVEFUVVNfU1VDQ0VTUyxcclxuICAgICAgICAgICdkYXRhJzoge1xyXG4gICAgICAgICAgICAnbWVzc2FnZSc6IE1lc3NhZ2VzLk1TR19TVUNDRVNTX09UUFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKHtcclxuICAgICAgICAgIHJlYXNvbjogTWVzc2FnZXMuTVNHX0VSUk9SX1JTTl9VU0VSX05PVF9GT1VORCxcclxuICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fVVNFUl9OT1RfRk9VTkQsXHJcbiAgICAgICAgICBzdGFja1RyYWNlOiBuZXcgRXJyb3IoKSxcclxuICAgICAgICAgIGNvZGU6IDQwMFxyXG4gICAgICAgIH0sIG51bGwpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdlbmVyYXRlT3RwKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkucmV0cmlldmUoeydtb2JpbGVfbnVtYmVyJzogZmllbGQubmV3X21vYmlsZV9udW1iZXIsICdpc0FjdGl2YXRlZCc6IHRydWV9LCAoZXJyLCByZXMpID0+IHtcclxuXHJcbiAgICAgIGlmIChlcnIpIHtcclxuICAgICAgfSBlbHNlIGlmIChyZXMubGVuZ3RoID4gMCAmJiAocmVzWzBdLl9pZCkgIT09IGZpZWxkLl9pZCkge1xyXG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfUkVHSVNUUkFUSU9OX01PQklMRV9OVU1CRVIpLCBudWxsKTtcclxuICAgICAgfSBlbHNlIGlmIChyZXMubGVuZ3RoID09PSAwKSB7XHJcblxyXG4gICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJzogZmllbGQuX2lkfTtcclxuICAgICAgICBsZXQgb3RwID0gTWF0aC5mbG9vcigoTWF0aC5yYW5kb20oKSAqIDk5OTk5KSArIDEwMDAwMCk7XHJcbiAgICAgICAgbGV0IHVwZGF0ZURhdGEgPSB7J21vYmlsZV9udW1iZXInOiBmaWVsZC5uZXdfbW9iaWxlX251bWJlciwgJ290cCc6IG90cH07XHJcbiAgICAgICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTl9NT0JJTEVfTlVNQkVSKSwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgRGF0YSA9IHtcclxuICAgICAgICAgICAgICBtb2JpbGVObzogZmllbGQubmV3X21vYmlsZV9udW1iZXIsXHJcbiAgICAgICAgICAgICAgb3RwOiBvdHBcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgbGV0IHNlbmRNZXNzYWdlU2VydmljZSA9IG5ldyBTZW5kTWVzc2FnZVNlcnZpY2UoKTtcclxuICAgICAgICAgICAgc2VuZE1lc3NhZ2VTZXJ2aWNlLnNlbmRNZXNzYWdlRGlyZWN0KERhdGEsIGNhbGxiYWNrKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTl9NT0JJTEVfTlVNQkVSKSwgbnVsbCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdmVyaWZ5T3RwKHBhcmFtczogYW55LCB1c2VyOmFueSwgY2FsbGJhY2s6KGVycm9yOmFueSwgcmVzdWx0OmFueSkgPT4gdm9pZCkge1xyXG4gICAgbGV0IG1haWxDaGltcE1haWxlclNlcnZpY2UgPSBuZXcgTWFpbENoaW1wTWFpbGVyU2VydmljZSgpO1xyXG5cclxuICAgIGxldCBxdWVyeSA9IHsnX2lkJzogdXNlci5faWQsICdpc0FjdGl2YXRlZCc6IGZhbHNlfTtcclxuICAgIGxldCB1cGRhdGVEYXRhID0geydpc0FjdGl2YXRlZCc6IHRydWUsICdhY3RpdmF0aW9uX2RhdGUnOiBuZXcgRGF0ZSgpfTtcclxuICAgIGlmICh1c2VyLm90cCA9PT0gcGFyYW1zLm90cCkge1xyXG4gICAgICB0aGlzLmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLHtcclxuICAgICAgICAgICAgJ3N0YXR1cyc6ICdTdWNjZXNzJyxcclxuICAgICAgICAgICAgJ2RhdGEnOiB7J21lc3NhZ2UnOiAnVXNlciBBY2NvdW50IHZlcmlmaWVkIHN1Y2Nlc3NmdWxseSd9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIG1haWxDaGltcE1haWxlclNlcnZpY2Uub25DYW5kaWRhdGVTaWduU3VjY2VzcyhyZXN1bHQpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY2FsbGJhY2soe1xyXG4gICAgICAgIHJlYXNvbjogTWVzc2FnZXMuTVNHX0VSUk9SX1JTTl9JTlZBTElEX0NSRURFTlRJQUxTLFxyXG4gICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9XUk9OR19PVFAsXHJcbiAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXHJcbiAgICAgICAgY29kZTogNDAwXHJcbiAgICAgIH0sIG51bGwpO1xyXG4gICAgfVxyXG5cclxuICB9XHJcblxyXG4gIGNoYW5nZU1vYmlsZU51bWJlcihmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcblxyXG4gICAgbGV0IHF1ZXJ5ID0geydfaWQnOiBmaWVsZC5faWR9O1xyXG4gICAgbGV0IG90cCA9IE1hdGguZmxvb3IoKE1hdGgucmFuZG9tKCkgKiA5OTk5OSkgKyAxMDAwMDApO1xyXG4gICAgbGV0IHVwZGF0ZURhdGEgPSB7J290cCc6IG90cCwgJ3RlbXBfbW9iaWxlJzogZmllbGQubmV3X21vYmlsZV9udW1iZXJ9O1xyXG5cclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlRGF0YSwge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfUkVHSVNUUkFUSU9OKSwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IERhdGEgPSB7XHJcbiAgICAgICAgICBjdXJyZW50X21vYmlsZV9udW1iZXI6IGZpZWxkLmN1cnJlbnRfbW9iaWxlX251bWJlcixcclxuICAgICAgICAgIG1vYmlsZU5vOiBmaWVsZC5uZXdfbW9iaWxlX251bWJlcixcclxuICAgICAgICAgIG90cDogb3RwXHJcbiAgICAgICAgfTtcclxuICAgICAgICBsZXQgc2VuZE1lc3NhZ2VTZXJ2aWNlID0gbmV3IFNlbmRNZXNzYWdlU2VydmljZSgpO1xyXG4gICAgICAgIHNlbmRNZXNzYWdlU2VydmljZS5zZW5kQ2hhbmdlTW9iaWxlTWVzc2FnZShEYXRhLCBjYWxsYmFjayk7XHJcblxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG5cclxuICBmb3Jnb3RQYXNzd29yZChmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogU2VudE1lc3NhZ2VJbmZvKSA9PiB2b2lkKSB7XHJcblxyXG4gICAgbGV0IHNlbmRNYWlsU2VydmljZSA9IG5ldyBTZW5kTWFpbFNlcnZpY2UoKTtcclxuICAgIGxldCBxdWVyeSA9IHsnZW1haWwnOiBmaWVsZC5lbWFpbH07XHJcblxyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5yZXRyaWV2ZShxdWVyeSwgKGVyciwgcmVzKSA9PiB7XHJcblxyXG4gICAgICBpZiAocmVzLmxlbmd0aCA+IDAgJiYgcmVzWzBdLmlzQWN0aXZhdGVkID09PSB0cnVlKSB7XHJcblxyXG4gICAgICAgIGxldCBhdXRoID0gbmV3IEF1dGhJbnRlcmNlcHRvcigpO1xyXG4gICAgICAgIGxldCB0b2tlbiA9IGF1dGguaXNzdWVUb2tlbldpdGhVaWQocmVzWzBdKTtcclxuICAgICAgICBsZXQgaG9zdCA9IGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpO1xyXG4gICAgICAgIGxldCBsaW5rID0gaG9zdCArICdyZXNldC1wYXNzd29yZD9hY2Nlc3NfdG9rZW49JyArIHRva2VuICsgJyZfaWQ9JyArIHJlc1swXS5faWQ7XHJcbiAgICAgICAgbGV0IGh0bWxUZW1wbGF0ZSA9ICdmb3Jnb3RwYXNzd29yZC5odG1sJztcclxuICAgICAgICBsZXQgZGF0YTpNYXA8c3RyaW5nLHN0cmluZz49IG5ldyBNYXAoW1snJGFwcGxpY2F0aW9uTGluayQnLGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpXSxcclxuICAgICAgICAgIFsnJGZpcnN0X25hbWUkJyxyZXNbMF0uZmlyc3RfbmFtZV0sWyckbGluayQnLGxpbmtdLFsnJGFwcF9uYW1lJCcsdGhpcy5BUFBfTkFNRV1dKTtcclxuICAgICAgICBsZXQgYXR0YWNobWVudD1NYWlsQXR0YWNobWVudHMuRm9yZ2V0UGFzc3dvcmRBdHRhY2htZW50QXJyYXk7XHJcbiAgICAgICAgc2VuZE1haWxTZXJ2aWNlLnNlbmQoIGZpZWxkLmVtYWlsLCBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX0ZPUkdPVF9QQVNTV09SRCwgaHRtbFRlbXBsYXRlLCBkYXRhLGF0dGFjaG1lbnQsXHJcbihlcnI6IGFueSwgcmVzdWx0OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSBpZiAocmVzLmxlbmd0aCA+IDAgJiYgcmVzWzBdLmlzQWN0aXZhdGVkID09PSBmYWxzZSkge1xyXG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfQUNDT1VOVF9TVEFUVVMpLCByZXMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihNZXNzYWdlcy5NU0dfRVJST1JfVVNFUl9OT1RfRk9VTkQpLCByZXMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG5cclxuXHJcbiAgU2VuZENoYW5nZU1haWxWZXJpZmljYXRpb24oZmllbGQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IFNlbnRNZXNzYWdlSW5mbykgPT4gdm9pZCkge1xyXG4gICAgbGV0IHF1ZXJ5ID0geydlbWFpbCc6IGZpZWxkLmN1cnJlbnRfZW1haWwsICdpc0FjdGl2YXRlZCc6IHRydWV9O1xyXG4gICAgbGV0IHVwZGF0ZURhdGEgPSB7JHNldDp7J3RlbXBfZW1haWwnOiBmaWVsZC5uZXdfZW1haWx9fTtcclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlRGF0YSwge25ldzogdHJ1ZX0sIChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX0VNQUlMX0FDVElWRV9OT1cpLCBudWxsKTtcclxuICAgICAgfSBlbHNlIGlmKHJlc3VsdCA9PSBudWxsKSB7XHJcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKE1lc3NhZ2VzLk1TR19FUlJPUl9WRVJJRllfQUNDT1VOVCksIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBhdXRoID0gbmV3IEF1dGhJbnRlcmNlcHRvcigpO1xyXG4gICAgICAgIGxldCB0b2tlbiA9IGF1dGguaXNzdWVUb2tlbldpdGhVaWQocmVzdWx0KTtcclxuICAgICAgICBsZXQgaG9zdCA9IGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpO1xyXG4gICAgICAgIGxldCBsaW5rID0gaG9zdCArICdhY3RpdmF0ZS11c2VyP2FjY2Vzc190b2tlbj0nICsgdG9rZW4gKyAnJl9pZD0nICsgcmVzdWx0Ll9pZCsnaXNFbWFpbFZlcmlmaWNhdGlvbic7XHJcbiAgICAgICAgbGV0IHNlbmRNYWlsU2VydmljZSA9IG5ldyBTZW5kTWFpbFNlcnZpY2UoKTtcclxuICAgICAgICBsZXQgZGF0YTogTWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXAoW1snJGFwcGxpY2F0aW9uTGluayQnLGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpXSxcclxuICAgICAgICAgIFsnJGxpbmskJywgbGlua11dKTtcclxuICAgICAgICBsZXQgYXR0YWNobWVudD1NYWlsQXR0YWNobWVudHMuQXR0YWNobWVudEFycmF5O1xyXG4gICAgICAgIHNlbmRNYWlsU2VydmljZS5zZW5kKGZpZWxkLm5ld19lbWFpbCxcclxuICAgICAgICAgIE1lc3NhZ2VzLkVNQUlMX1NVQkpFQ1RfQ0hBTkdFX0VNQUlMSUQsXHJcbiAgICAgICAgICAnY2hhbmdlLm1haWwuaHRtbCcsIGRhdGEsYXR0YWNobWVudCwgY2FsbGJhY2spO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHNlbmRNYWlsKGZpZWxkOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBTZW50TWVzc2FnZUluZm8pID0+IHZvaWQpIHtcclxuICAgIGxldCBzZW5kTWFpbFNlcnZpY2UgPSBuZXcgU2VuZE1haWxTZXJ2aWNlKCk7XHJcbiAgICBsZXQgZGF0YTpNYXA8c3RyaW5nLHN0cmluZz49IG5ldyBNYXAoW1snJGFwcGxpY2F0aW9uTGluayQnLGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpXSxcclxuICAgICAgWyckZmlyc3RfbmFtZSQnLGZpZWxkLmZpcnN0X25hbWVdLFsnJGVtYWlsJCcsZmllbGQuZW1haWxdLFsnJG1lc3NhZ2UkJyxmaWVsZC5tZXNzYWdlXV0pO1xyXG4gICAgbGV0IGF0dGFjaG1lbnQ9TWFpbEF0dGFjaG1lbnRzLkF0dGFjaG1lbnRBcnJheTtcclxuICAgIHNlbmRNYWlsU2VydmljZS5zZW5kKGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuQURNSU5fTUFJTCcpLFxyXG4gICAgICBNZXNzYWdlcy5FTUFJTF9TVUJKRUNUX1VTRVJfQ09OVEFDVEVEX1lPVSxcclxuICAgICAgJ2NvbnRhY3R1cy5tYWlsLmh0bWwnLGRhdGEsYXR0YWNobWVudCxjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICBzZW5kTWFpbE9uRXJyb3IoZXJyb3JJbmZvOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBTZW50TWVzc2FnZUluZm8pID0+IHZvaWQpIHtcclxuICAgIGxldCBjdXJyZW50X1RpbWUgPSBuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZyhbXSwge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCd9KTtcclxuICAgIGxldCBkYXRhOk1hcDxzdHJpbmcsc3RyaW5nPjtcclxuICAgIGlmKGVycm9ySW5mby5zdGFja1RyYWNlKSB7XHJcbiAgICAgICBkYXRhPSBuZXcgTWFwKFtbJyRhcHBsaWNhdGlvbkxpbmskJyxjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5tYWlsLmhvc3QnKV0sXHJcbiAgICAgICAgIFsnJHRpbWUkJyxjdXJyZW50X1RpbWVdLFsnJGhvc3QkJyxjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5tYWlsLmhvc3QnKV0sXHJcbiAgICAgICAgWyckcmVhc29uJCcsZXJyb3JJbmZvLnJlYXNvbl0sWyckY29kZSQnLGVycm9ySW5mby5jb2RlXSxcclxuICAgICAgICBbJyRtZXNzYWdlJCcsZXJyb3JJbmZvLm1lc3NhZ2VdLFsnJGVycm9yJCcsZXJyb3JJbmZvLnN0YWNrVHJhY2Uuc3RhY2tdXSk7XHJcblxyXG4gICAgfSBlbHNlIGlmKGVycm9ySW5mby5zdGFjaykge1xyXG4gICAgICBkYXRhPSBuZXcgTWFwKFtbJyRhcHBsaWNhdGlvbkxpbmskJyxjb25maWcuZ2V0KCdhcHBsaWNhdGlvbi5tYWlsLmhvc3QnKV0sXHJcbiAgICAgICAgWyckdGltZSQnLGN1cnJlbnRfVGltZV0sWyckaG9zdCQnLGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLm1haWwuaG9zdCcpXSxcclxuICAgICAgICBbJyRyZWFzb24kJyxlcnJvckluZm8ucmVhc29uXSxbJyRjb2RlJCcsZXJyb3JJbmZvLmNvZGVdLFxyXG4gICAgICAgIFsnJG1lc3NhZ2UkJyxlcnJvckluZm8ubWVzc2FnZV0sWyckZXJyb3IkJyxlcnJvckluZm8uc3RhY2tdXSk7XHJcbiAgICB9XHJcbiAgICBsZXQgc2VuZE1haWxTZXJ2aWNlID0gbmV3IFNlbmRNYWlsU2VydmljZSgpO1xyXG4gICAgbGV0IGF0dGFjaG1lbnQgPSBNYWlsQXR0YWNobWVudHMuQXR0YWNobWVudEFycmF5O1xyXG4gICAgc2VuZE1haWxTZXJ2aWNlLnNlbmQoY29uZmlnLmdldCgnYXBwbGljYXRpb24ubWFpbC5BRE1JTl9NQUlMJyksXHJcbiAgICAgIE1lc3NhZ2VzLkVNQUlMX1NVQkpFQ1RfU0VSVkVSX0VSUk9SICsgJyBvbiAnICsgY29uZmlnLmdldCgnYXBwbGljYXRpb24ubWFpbC5ob3N0JyksXHJcbiAgICAgICdlcnJvci5tYWlsLmh0bWwnLGRhdGEsYXR0YWNobWVudCwgY2FsbGJhY2ssY29uZmlnLmdldCgnYXBwbGljYXRpb24ubWFpbC5UUExHUk9VUF9NQUlMJykpO1xyXG4gIH1cclxuXHJcbiAgZmluZEJ5SWQoaWQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kQnlJZChpZCwgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgcmV0cmlldmUoZmllbGQ6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5yZXRyaWV2ZShmaWVsZCwgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgcmV0cmlldmVXaXRoTGltaXQoZmllbGQ6IGFueSwgaW5jbHVkZWQgOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIGxldCBsaW1pdCA9IGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLmxpbWl0Rm9yUXVlcnknKTtcclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkucmV0cmlldmVXaXRoTGltaXQoZmllbGQsIGluY2x1ZGVkLCBsaW1pdCwgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgcmV0cmlldmVXaXRoTGVhbihmaWVsZDogYW55LCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKGZpZWxkLCBjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICByZXRyaWV2ZUFsbChpdGVtOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkucmV0cmlldmUoaXRlbSwgKGVyciwgcmVzKSA9PiB7XHJcbiAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX1JFR0lTVFJBVElPTl9NT0JJTEVfTlVNQkVSKSwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGUoX2lkOiBhbnksIGl0ZW06IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG5cclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZEJ5SWQoX2lkLCAoZXJyOiBhbnksIHJlczogYW55KSA9PiB7XHJcblxyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyLCByZXMpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMudXNlclJlcG9zaXRvcnkudXBkYXRlKF9pZCwgaXRlbSwgY2FsbGJhY2spO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG5cclxuICBkZWxldGUoX2lkOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZGVsZXRlKF9pZCwgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgZmluZE9uZUFuZFVwZGF0ZShxdWVyeTogYW55LCBuZXdEYXRhOiBhbnksIG9wdGlvbnM6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCBvcHRpb25zLCBjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICBVcGxvYWRJbWFnZSh0ZW1wUGF0aDogYW55LCBmaWxlTmFtZTogYW55LCBjYjogYW55KSB7XHJcbiAgICBsZXQgdGFyZ2V0cGF0aCA9IGZpbGVOYW1lO1xyXG4gICAgZnMucmVuYW1lKHRlbXBQYXRoLCB0YXJnZXRwYXRoLCBmdW5jdGlvbiAoZXJyKSB7XHJcbiAgICAgIGNiKG51bGwsIHRlbXBQYXRoKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgVXBsb2FkRG9jdW1lbnRzKHRlbXBQYXRoOiBhbnksIGZpbGVOYW1lOiBhbnksIGNiOiBhbnkpIHtcclxuICAgIGxldCB0YXJnZXRwYXRoID0gZmlsZU5hbWU7XHJcbiAgICBmcy5yZW5hbWUodGVtcFBhdGgsIHRhcmdldHBhdGgsIGZ1bmN0aW9uIChlcnI6IGFueSkge1xyXG4gICAgICBjYihudWxsLCB0ZW1wUGF0aCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGZpbmRBbmRVcGRhdGVOb3RpZmljYXRpb24ocXVlcnk6IGFueSwgbmV3RGF0YTogYW55LCBvcHRpb25zOiBhbnksIGNhbGxiYWNrOiAoZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpID0+IHZvaWQpIHtcclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgbmV3RGF0YSwgb3B0aW9ucywgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgcmV0cmlldmVCeVNvcnRlZE9yZGVyKHF1ZXJ5OiBhbnksIHByb2plY3Rpb246YW55LCBzb3J0aW5nUXVlcnk6IGFueSwgY2FsbGJhY2s6IChlcnJvcjogYW55LCByZXN1bHQ6IGFueSkgPT4gdm9pZCkge1xyXG4gICAgLy90aGlzLnVzZXJSZXBvc2l0b3J5LnJldHJpZXZlQnlTb3J0ZWRPcmRlcihxdWVyeSwgcHJvamVjdGlvbiwgc29ydGluZ1F1ZXJ5LCBjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICByZXNldFBhc3N3b3JkKGRhdGE6IGFueSwgdXNlciA6IGFueSwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PmFueSkge1xyXG4gICAgY29uc3Qgc2FsdFJvdW5kcyA9IDEwO1xyXG4gICAgYmNyeXB0Lmhhc2goZGF0YS5uZXdfcGFzc3dvcmQsIHNhbHRSb3VuZHMsIChlcnI6IGFueSwgaGFzaDogYW55KSA9PiB7XHJcbiAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICBjYWxsYmFjayh7XHJcbiAgICAgICAgICByZWFzb246ICdFcnJvciBpbiBjcmVhdGluZyBoYXNoIHVzaW5nIGJjcnlwdCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnRXJyb3IgaW4gY3JlYXRpbmcgaGFzaCB1c2luZyBiY3J5cHQnLFxyXG4gICAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXHJcbiAgICAgICAgICBjb2RlOiA0MDNcclxuICAgICAgICB9LCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgdXBkYXRlRGF0YSA9IHsncGFzc3dvcmQnOiBoYXNofTtcclxuICAgICAgICBsZXQgcXVlcnkgPSB7J19pZCc6IHVzZXIuX2lkLCAncGFzc3dvcmQnOiB1c2VyLnBhc3N3b3JkfTtcclxuICAgICAgICB0aGlzLmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwse1xyXG4gICAgICAgICAgICAgICdzdGF0dXMnOiAnU3VjY2VzcycsXHJcbiAgICAgICAgICAgICAgJ2RhdGEnOiB7J21lc3NhZ2UnOiAnUGFzc3dvcmQgY2hhbmdlZCBzdWNjZXNzZnVsbHknfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVEZXRhaWxzKGRhdGE6ICBVc2VyTW9kZWwsIHVzZXI6IFVzZXJNb2RlbCwgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgYXV0aDogQXV0aEludGVyY2VwdG9yID0gbmV3IEF1dGhJbnRlcmNlcHRvcigpO1xyXG4gICAgbGV0IHF1ZXJ5ID0geydfaWQnOiB1c2VyLl9pZH07XHJcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIGRhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCx7XHJcbiAgICAgICAgICAnc3RhdHVzJzogJ1N1Y2Nlc3MnLFxyXG4gICAgICAgICAgJ2RhdGEnOiB7J21lc3NhZ2UnOiAnVXNlciBQcm9maWxlIFVwZGF0ZWQgc3VjY2Vzc2Z1bGx5J31cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgIH0pO1xyXG4gIH1cclxuICBnZXRVc2VyQnlJZCh1c2VyOmFueSwgY2FsbGJhY2s6KGVycm9yOmFueSwgcmVzdWx0OmFueSk9PnZvaWQpIHtcclxuICAgIGxldCBhdXRoOiBBdXRoSW50ZXJjZXB0b3IgPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XHJcblxyXG4gICAgbGV0IHRva2VuID0gYXV0aC5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKTtcclxuICAgIGNhbGxiYWNrKG51bGwse1xyXG4gICAgICAnc3RhdHVzJzogJ3N1Y2Nlc3MnLFxyXG4gICAgICAnZGF0YSc6IHtcclxuICAgICAgICAnZmlyc3RfbmFtZSc6IHVzZXIuZmlyc3RfbmFtZSxcclxuICAgICAgICAnbGFzdF9uYW1lJzogdXNlci5sYXN0X25hbWUsXHJcbiAgICAgICAgJ2VtYWlsJzogdXNlci5lbWFpbCxcclxuICAgICAgICAnbW9iaWxlX251bWJlcic6IHVzZXIubW9iaWxlX251bWJlcixcclxuICAgICAgICAnY29tcGFueV9uYW1lJzogdXNlci5jb21wYW55X25hbWUsXHJcbiAgICAgICAgJ3N0YXRlJzogdXNlci5zdGF0ZSxcclxuICAgICAgICAnY2l0eSc6IHVzZXIuY2l0eSxcclxuICAgICAgICAncGljdHVyZSc6IHVzZXIucGljdHVyZSxcclxuICAgICAgICAnc29jaWFsX3Byb2ZpbGVfcGljdHVyZSc6IHVzZXIuc29jaWFsX3Byb2ZpbGVfcGljdHVyZSxcclxuICAgICAgICAnX2lkJzogdXNlci5faWQsXHJcbiAgICAgICAgJ2N1cnJlbnRfdGhlbWUnOiB1c2VyLmN1cnJlbnRfdGhlbWVcclxuICAgICAgfSxcclxuICAgICAgYWNjZXNzX3Rva2VuOiB0b2tlblxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB2ZXJpZnlBY2NvdW50KHVzZXI6VXNlciwgY2FsbGJhY2s6KGVycm9yOmFueSwgcmVzdWx0OmFueSk9PnZvaWQpIHtcclxuICAgIGxldCBxdWVyeSA9IHsnX2lkJzogdXNlci5faWQsICdpc0FjdGl2YXRlZCc6IGZhbHNlfTtcclxuICAgIGxldCB1cGRhdGVEYXRhID0geydpc0FjdGl2YXRlZCc6IHRydWV9O1xyXG4gICAgdGhpcy5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVEYXRhLCB7bmV3OiB0cnVlfSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwse1xyXG4gICAgICAgICAgJ3N0YXR1cyc6ICdTdWNjZXNzJyxcclxuICAgICAgICAgICdkYXRhJzogeydtZXNzYWdlJzogJ1VzZXIgQWNjb3VudCB2ZXJpZmllZCBzdWNjZXNzZnVsbHknfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjaGFuZ2VFbWFpbElkKGRhdGE6YW55LCB1c2VyIDogVXNlciwgY2FsbGJhY2s6KGVycm9yOmFueSwgcmVzdWx0OmFueSk9PnZvaWQpIHtcclxuICAgIGxldCBhdXRoOiBBdXRoSW50ZXJjZXB0b3IgPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XHJcbiAgICBsZXQgcXVlcnkgPSB7J2VtYWlsJzogZGF0YS5uZXdfZW1haWx9O1xyXG5cclxuICAgIHRoaXMucmV0cmlldmUocXVlcnksIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcblxyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0Lmxlbmd0aCA+IDAgJiYgcmVzdWx0WzBdLmlzQWN0aXZhdGVkID09PSB0cnVlKSB7XHJcbiAgICAgICAgY2FsbGJhY2soe1xyXG4gICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0VYSVNUSU5HX1VTRVIsXHJcbiAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfUkVHSVNUUkFUSU9OLFxyXG4gICAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXHJcbiAgICAgICAgICBjb2RlOiA0MDBcclxuICAgICAgICB9LG51bGwpO1xyXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdC5sZW5ndGggPiAwICYmIHJlc3VsdFswXS5pc0FjdGl2YXRlZCA9PT0gZmFsc2UpIHtcclxuICAgICAgICBjYWxsYmFjayh7XHJcbiAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fRVhJU1RJTkdfVVNFUixcclxuICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9BQ0NPVU5UX1NUQVRVUyxcclxuICAgICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxyXG4gICAgICAgICAgY29kZTogNDAwXHJcbiAgICAgICAgfSwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgIHRoaXMuU2VuZENoYW5nZU1haWxWZXJpZmljYXRpb24oZGF0YSwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IubWVzc2FnZSA9PT0gTWVzc2FnZXMuTVNHX0VSUk9SX0NIRUNLX0VNQUlMX0FDQ09VTlQpIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayh7XHJcbiAgICAgICAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fRVhJU1RJTkdfVVNFUixcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9FTUFJTF9BQ1RJVkVfTk9XLFxyXG4gICAgICAgICAgICAgICAgc3RhY2tUcmFjZTogbmV3IEVycm9yKCksXHJcbiAgICAgICAgICAgICAgICBjb2RlOiA0MDBcclxuICAgICAgICAgICAgICB9LCBudWxsKTtcclxuICAgICAgICAgICAgfWlmIChlcnJvci5tZXNzYWdlID09PSBNZXNzYWdlcy5NU0dfRVJST1JfVkVSSUZZX0FDQ09VTlQpIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayh7XHJcbiAgICAgICAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9WRVJJRllfQUNDT1VOVCxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9WRVJJRllfQUNDT1VOVCxcclxuICAgICAgICAgICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxyXG4gICAgICAgICAgICAgICAgY29kZTogNDAwXHJcbiAgICAgICAgICAgICAgfSwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soe1xyXG4gICAgICAgICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX1dISUxFX0NPTlRBQ1RJTkcsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfV0hJTEVfQ09OVEFDVElORyxcclxuICAgICAgICAgICAgICAgIHN0YWNrVHJhY2U6IG5ldyBFcnJvcigpLFxyXG4gICAgICAgICAgICAgICAgY29kZTogNDAwXHJcbiAgICAgICAgICAgICAgfSwgbnVsbCk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7XHJcbiAgICAgICAgICAgICAgJ3N0YXR1cyc6IE1lc3NhZ2VzLlNUQVRVU19TVUNDRVNTLFxyXG4gICAgICAgICAgICAgICdkYXRhJzogeydtZXNzYWdlJzogTWVzc2FnZXMuTVNHX1NVQ0NFU1NfRU1BSUxfQ0hBTkdFX0VNQUlMSUR9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB2ZXJpZnlDaGFuZ2VkRW1haWxJZCh1c2VyOiBhbnksIGNhbGxiYWNrOihlcnJvciA6IGFueSwgcmVzdWx0IDogYW55KT0+IGFueSkge1xyXG4gICAgbGV0IHF1ZXJ5ID0geydfaWQnOiB1c2VyLl9pZH07XHJcbiAgICBsZXQgdXBkYXRlRGF0YSA9IHsnZW1haWwnOiB1c2VyLnRlbXBfZW1haWwsICd0ZW1wX2VtYWlsJzogdXNlci5lbWFpbH07XHJcbiAgICB0aGlzLmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCx7XHJcbiAgICAgICAgICAnc3RhdHVzJzogJ1N1Y2Nlc3MnLFxyXG4gICAgICAgICAgJ2RhdGEnOiB7J21lc3NhZ2UnOiAnVXNlciBBY2NvdW50IHZlcmlmaWVkIHN1Y2Nlc3NmdWxseSd9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHZlcmlmeU1vYmlsZU51bWJlcihkYXRhIDphbnkgLCB1c2VyIDogYW55LCBjYWxsYmFjazooZXJyb3I6YW55LCByZXN1bHQ6YW55KT0+dm9pZCkge1xyXG4gICAgbGV0IHF1ZXJ5ID0geydfaWQnOiB1c2VyLl9pZH07XHJcbiAgICBsZXQgdXBkYXRlRGF0YSA9IHsnbW9iaWxlX251bWJlcic6IHVzZXIudGVtcF9tb2JpbGUsICd0ZW1wX21vYmlsZSc6IHVzZXIubW9iaWxlX251bWJlcn07XHJcbiAgICBpZiAodXNlci5vdHAgPT09IGRhdGEub3RwKSB7XHJcbiAgICAgIHRoaXMuZmluZE9uZUFuZFVwZGF0ZShxdWVyeSwgdXBkYXRlRGF0YSwge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNhbGxiYWNrKG51bGwse1xyXG4gICAgICAgICAgICAnc3RhdHVzJzogJ1N1Y2Nlc3MnLFxyXG4gICAgICAgICAgICAnZGF0YSc6IHsnbWVzc2FnZSc6ICdVc2VyIEFjY291bnQgdmVyaWZpZWQgc3VjY2Vzc2Z1bGx5J31cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjYWxsYmFjayh7XHJcbiAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0lOVkFMSURfQ1JFREVOVElBTFMsXHJcbiAgICAgICAgbWVzc2FnZTogTWVzc2FnZXMuTVNHX0VSUk9SX1dST05HX09UUCxcclxuICAgICAgICBzdGFja1RyYWNlOiBuZXcgRXJyb3IoKSxcclxuICAgICAgICBjb2RlOiA0MDBcclxuICAgICAgfSwgbnVsbCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3NpZ25QcmVtaXVtUGFja2FnZSh1c2VyOlVzZXIsdXNlcklkOnN0cmluZyxjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgcHJvamVjdGlvbiA9IHtzdWJzY3JpcHRpb246IDF9O1xyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kQnlJZFdpdGhQcm9qZWN0aW9uKHVzZXJJZCxwcm9qZWN0aW9uLChlcnJvcixyZXN1bHQpPT4ge1xyXG4gICAgICBpZihlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLG51bGwpO1xyXG4gICAgICB9ZWxzZSB7XHJcbiAgICAgICAgbGV0IHN1YlNjcmlwdGlvbkFycmF5ID0gcmVzdWx0LnN1YnNjcmlwdGlvbjtcclxuICAgICAgICBsZXQgc3ViU2NyaXB0aW9uU2VydmljZSA9IG5ldyBTdWJzY3JpcHRpb25TZXJ2aWNlKCk7XHJcbiAgICAgICAgc3ViU2NyaXB0aW9uU2VydmljZS5nZXRTdWJzY3JpcHRpb25QYWNrYWdlQnlOYW1lKCdQcmVtaXVtJywnQmFzZVBhY2thZ2UnLFxyXG4gICAgICAgICAgKGVycm9yOiBhbnksIHN1YnNjcmlwdGlvblBhY2thZ2U6IEFycmF5PFN1YnNjcmlwdGlvblBhY2thZ2U+KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbGV0IHByZW1pdW1QYWNrYWdlID0gc3Vic2NyaXB0aW9uUGFja2FnZVswXTtcclxuICAgICAgICAgICAgICBsZXQgc3Vic2NyaXB0aW9uID0gbmV3IFVzZXJTdWJzY3JpcHRpb24oKTtcclxuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24uYWN0aXZhdGlvbkRhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICAgIHN1YnNjcmlwdGlvbi5udW1PZkJ1aWxkaW5ncyA9IHByZW1pdW1QYWNrYWdlLmJhc2VQYWNrYWdlLm51bU9mQnVpbGRpbmdzO1xyXG4gICAgICAgICAgICAgIHN1YnNjcmlwdGlvbi5udW1PZlByb2plY3RzID0gcHJlbWl1bVBhY2thZ2UuYmFzZVBhY2thZ2UubnVtT2ZQcm9qZWN0cztcclxuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24udmFsaWRpdHkgPSBwcmVtaXVtUGFja2FnZS5iYXNlUGFja2FnZS52YWxpZGl0eTtcclxuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24ucHJvamVjdElkID0gbmV3IEFycmF5PHN0cmluZz4oKTtcclxuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24ucHVyY2hhc2VkID0gbmV3IEFycmF5PEJhc2VTdWJzY3JpcHRpb25QYWNrYWdlPigpO1xyXG4gICAgICAgICAgICAgIHN1YnNjcmlwdGlvbi5wdXJjaGFzZWQucHVzaChwcmVtaXVtUGFja2FnZS5iYXNlUGFja2FnZSk7XHJcbiAgICAgICAgICAgICAgc3ViU2NyaXB0aW9uQXJyYXkucHVzaChzdWJzY3JpcHRpb24pO1xyXG4gICAgICAgICAgICAgIGxldCBxdWVyeSA9IHsnX2lkJzogdXNlcklkfTtcclxuICAgICAgICAgICAgICBsZXQgbmV3RGF0YSA9IHskc2V0OiB7J3N1YnNjcmlwdGlvbic6IHN1YlNjcmlwdGlvbkFycmF5fX07XHJcbiAgICAgICAgICAgICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCBuZXdEYXRhLCB7bmV3OiB0cnVlfSwgKGVyciwgcmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOidzdWNjZXNzJ30pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0UHJvamVjdHModXNlcjogVXNlciwgY2FsbGJhY2s6KGVycm9yIDogYW55LCByZXN1bHQgOmFueSk9PnZvaWQpIHtcclxuXHJcbiAgICBsZXQgcXVlcnkgPSB7X2lkOiB1c2VyLl9pZCB9O1xyXG4gICAgbGV0IHBvcHVsYXRlID0ge3BhdGg6ICdwcm9qZWN0Jywgc2VsZWN0OiBbJ25hbWUnLCdidWlsZGluZ3MnLCdhY3RpdmVTdGF0dXMnXX07XHJcbiAgICB0aGlzLnVzZXJSZXBvc2l0b3J5LmZpbmRBbmRQb3B1bGF0ZShxdWVyeSwgcG9wdWxhdGUsIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgYXV0aEludGVyY2VwdG9yID0gbmV3IEF1dGhJbnRlcmNlcHRvcigpO1xyXG4gICAgICAgIGxldCBwb3B1bGF0ZWRQcm9qZWN0ID0gcmVzdWx0WzBdO1xyXG4gICAgICAgIGxldCBwcm9qZWN0TGlzdCA9IHJlc3VsdFswXS5wcm9qZWN0O1xyXG4gICAgICAgIGxldCBzdWJzY3JpcHRpb25MaXN0ID0gcmVzdWx0WzBdLnN1YnNjcmlwdGlvbjtcclxuXHJcbiAgICAgICAgbGV0IHByb2plY3RTdWJzY3JpcHRpb25BcnJheSA9IEFycmF5PFByb2plY3RTdWJzY3JpcHRpb25EZXRhaWxzPigpO1xyXG4gICAgICAgIGxldCBpc0FibGVUb0NyZWF0ZU5ld1Byb2plY3QgOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGZvcihsZXQgcHJvamVjdCBvZiBwcm9qZWN0TGlzdCkge1xyXG4gICAgICAgICAgZm9yKGxldCBzdWJzY3JpcHRpb24gb2Ygc3Vic2NyaXB0aW9uTGlzdCkge1xyXG4gICAgICAgICAgICBpZihzdWJzY3JpcHRpb24ucHJvamVjdElkLmluZGV4T2YocHJvamVjdC5faWQpKSB7XHJcbiAgICAgICAgICAgICAgbGV0IHByb2plY3RTdWJzY3JpcHRpb24gPSBuZXcgUHJvamVjdFN1YnNjcmlwdGlvbkRldGFpbHMoKTtcclxuICAgICAgICAgICAgICBwcm9qZWN0U3Vic2NyaXB0aW9uLnByb2plY3ROYW1lID0gcHJvamVjdC5uYW1lO1xyXG4gICAgICAgICAgICAgIHByb2plY3RTdWJzY3JpcHRpb24ucHJvamVjdElkID0gcHJvamVjdC5faWQ7XHJcbiAgICAgICAgICAgICAgcHJvamVjdFN1YnNjcmlwdGlvbi5hY3RpdmVTdGF0dXMgPSBwcm9qZWN0LmFjdGl2ZVN0YXR1cztcclxuICAgICAgICAgICAgICBwcm9qZWN0U3Vic2NyaXB0aW9uLm51bU9mQnVpbGRpbmdzUmVtYWluaW5nID0gKHN1YnNjcmlwdGlvbi5udW1PZkJ1aWxkaW5ncyAtIHByb2plY3QuYnVpbGRpbmdzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgcHJvamVjdFN1YnNjcmlwdGlvbi5udW1PZkJ1aWxkaW5nc0FsbG9jYXRlZCA9IHByb2plY3QuYnVpbGRpbmdzLmxlbmd0aDtcclxuICAgICAgICAgICAgICBwcm9qZWN0U3Vic2NyaXB0aW9uLnBhY2thZ2VOYW1lID0gdGhpcy5jaGVja0N1cnJlbnRQYWNrYWdlKHN1YnNjcmlwdGlvbik7XHJcbiAgICAgICAgICAgICAgLy9hY3RpdmF0aW9uIGRhdGUgZm9yIHByb2plY3Qgc3Vic2NyaXB0aW9uXHJcbiAgICAgICAgICAgICAgbGV0IGFjdGl2YXRpb25fZGF0ZSA9IG5ldyBEYXRlKHN1YnNjcmlwdGlvbi5hY3RpdmF0aW9uRGF0ZSk7XHJcbiAgICAgICAgICAgICAgbGV0IGV4cGlyeURhdGUgPSBuZXcgRGF0ZShzdWJzY3JpcHRpb24uYWN0aXZhdGlvbkRhdGUpO1xyXG4gICAgICAgICAgICAgIHByb2plY3RTdWJzY3JpcHRpb24uZXhwaXJ5RGF0ZSA9IG5ldyBEYXRlKGV4cGlyeURhdGUuc2V0RGF0ZShhY3RpdmF0aW9uX2RhdGUuZ2V0RGF0ZSgpICsgc3Vic2NyaXB0aW9uLnZhbGlkaXR5KSk7XHJcblxyXG4gICAgICAgICAgICAgIC8vZXhwaXJ5IGRhdGUgZm9yIHByb2plY3Qgc3Vic2NyaXB0aW9uXHJcbiAgICAgICAgICAgICAgbGV0IGN1cnJlbnRfZGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgcHJvamVjdFN1YnNjcmlwdGlvbi5udW1PZkRheXNUb0V4cGlyZSA9IHRoaXMuZGF5c2RpZmZlcmVuY2UocHJvamVjdFN1YnNjcmlwdGlvbi5leHBpcnlEYXRlLCBjdXJyZW50X2RhdGUpO1xyXG5cclxuICAgICAgICAgICAgICBpZihwcm9qZWN0U3Vic2NyaXB0aW9uLm51bU9mRGF5c1RvRXhwaXJlIDwgMzAgJiYgcHJvamVjdFN1YnNjcmlwdGlvbi5udW1PZkRheXNUb0V4cGlyZSA+PTApIHtcclxuICAgICAgICAgICAgICAgIHByb2plY3RTdWJzY3JpcHRpb24ud2FybmluZ01lc3NhZ2UgPVxyXG4gICAgICAgICAgICAgICAgICAnRXhwaXJpbmcgaW4gJyArICBNYXRoLnJvdW5kKHByb2plY3RTdWJzY3JpcHRpb24ubnVtT2ZEYXlzVG9FeHBpcmUpICsgJyBkYXlzLCcgO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZihwcm9qZWN0U3Vic2NyaXB0aW9uLm51bU9mRGF5c1RvRXhwaXJlIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgcHJvamVjdFN1YnNjcmlwdGlvbi5leHBpcnlNZXNzYWdlID0gICdQcm9qZWN0IGV4cGlyZWQsJztcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIHByb2plY3RTdWJzY3JpcHRpb25BcnJheS5wdXNoKHByb2plY3RTdWJzY3JpcHRpb24pO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlIGlmKHN1YnNjcmlwdGlvbi5wcm9qZWN0SWQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgaXNBYmxlVG9DcmVhdGVOZXdQcm9qZWN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYocHJvamVjdExpc3QubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICBpc0FibGVUb0NyZWF0ZU5ld1Byb2plY3QgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwge1xyXG4gICAgICAgICAgZGF0YTogcHJvamVjdFN1YnNjcmlwdGlvbkFycmF5LFxyXG4gICAgICAgICAgaXNTdWJzY3JpcHRpb25BdmFpbGFibGUgOiBpc0FibGVUb0NyZWF0ZU5ld1Byb2plY3QsXHJcbiAgICAgICAgICBhY2Nlc3NfdG9rZW46IGF1dGhJbnRlcmNlcHRvci5pc3N1ZVRva2VuV2l0aFVpZCh1c2VyKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vVG8gY2hlY2sgd2hpY2ggaXMgY3VycmVudCBwYWNrYWdlIG9jY3VwaWVkIGJ5IHVzZXIuXHJcbiAgIGNoZWNrQ3VycmVudFBhY2thZ2Uoc3Vic2NyaXB0aW9uOmFueSkge1xyXG4gICAgIGxldCBhY3RpdmF0aW9uX2RhdGUgPSBuZXcgRGF0ZShzdWJzY3JpcHRpb24uYWN0aXZhdGlvbkRhdGUpO1xyXG4gICAgIGxldCBleHBpcnlEYXRlID0gbmV3IERhdGUoc3Vic2NyaXB0aW9uLmFjdGl2YXRpb25EYXRlKTtcclxuICAgICBsZXQgY3VycmVudF9kYXRlID0gbmV3IERhdGUoKTtcclxuICAgICBmb3IobGV0IHB1cmNoYXNlUGFja2FnZSBvZiBzdWJzY3JpcHRpb24ucHVyY2hhc2VkKSB7XHJcbiAgICAgICAvL2V4cGlyeSBkYXRlIGZvciBlYWNoIHBhY2thZ2UuXHJcbiAgICAgICBleHBpcnlEYXRlID0gbmV3IERhdGUoZXhwaXJ5RGF0ZS5zZXREYXRlKGFjdGl2YXRpb25fZGF0ZS5nZXREYXRlKCkgKyBwdXJjaGFzZVBhY2thZ2UudmFsaWRpdHkpKTtcclxuICAgICAgaWYoZXhwaXJ5RGF0ZSA+PSBjdXJyZW50X2RhdGUpIHtcclxuICAgICAgICByZXR1cm4gcHVyY2hhc2VQYWNrYWdlLm5hbWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIH1cclxuXHJcbiAgZGF5c2RpZmZlcmVuY2UoZGF0ZTEgOiBEYXRlLCBkYXRlMiA6IERhdGUpIHtcclxuICAgIGxldCBPTkVEQVkgPSAxMDAwICogNjAgKiA2MCAqIDI0O1xyXG4gICAgbGV0IGRhdGUxX21zID0gZGF0ZTEuZ2V0VGltZSgpO1xyXG4gICAgbGV0IGRhdGUyX21zID0gZGF0ZTIuZ2V0VGltZSgpO1xyXG4gICAgbGV0IGRpZmZlcmVuY2VfbXMgPSAoZGF0ZTFfbXMgLSBkYXRlMl9tcyk7XHJcbiAgICByZXR1cm4gTWF0aC5yb3VuZChkaWZmZXJlbmNlX21zL09ORURBWSk7XHJcbiAgfVxyXG5cclxuICBnZXRQcm9qZWN0U3Vic2NyaXB0aW9uKHVzZXI6IFVzZXIsIHByb2plY3RJZDogc3RyaW5nLCBjYWxsYmFjazooZXJyb3IgOiBhbnksIHJlc3VsdCA6YW55KT0+dm9pZCkge1xyXG5cclxuICAgIGxldCBxdWVyeSA9IFtcclxuICAgICAgeyRtYXRjaDogeydfaWQnOk9iamVjdElkKHVzZXIuX2lkKX19LFxyXG4gICAgICB7ICRwcm9qZWN0IDogeydzdWJzY3JpcHRpb24nOjF9fSxcclxuICAgICAgeyAkdW53aW5kOiAnJHN1YnNjcmlwdGlvbid9LFxyXG4gICAgICB7ICRtYXRjaDogeydzdWJzY3JpcHRpb24ucHJvamVjdElkJyA6IE9iamVjdElkKHByb2plY3RJZCl9fVxyXG4gICAgXTtcclxuICAgIHRoaXMudXNlclJlcG9zaXRvcnkuYWdncmVnYXRlKHF1ZXJ5ICwoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbGV0IHF1ZXJ5ID0geyBfaWQ6IHByb2plY3RJZH07XHJcbiAgICAgICAgbGV0IHBvcHVsYXRlID0ge3BhdGggOiAnYnVpbGRpbmdzJ307XHJcbiAgICAgICAgdGhpcy5wcm9qZWN0UmVwb3NpdG9yeS5maW5kQW5kUG9wdWxhdGUocXVlcnksIHBvcHVsYXRlLCAoZXJyb3IsIHJlc3ApID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgcHJvamVjdFN1YnNjcmlwdGlvbiA9IG5ldyBQcm9qZWN0U3Vic2NyaXB0aW9uRGV0YWlscygpO1xyXG4gICAgICAgICAgICBwcm9qZWN0U3Vic2NyaXB0aW9uLnByb2plY3ROYW1lID0gcmVzcFswXS5uYW1lO1xyXG4gICAgICAgICAgICBwcm9qZWN0U3Vic2NyaXB0aW9uLnByb2plY3RJZCA9IHJlc3BbMF0uX2lkO1xyXG4gICAgICAgICAgICBwcm9qZWN0U3Vic2NyaXB0aW9uLmFjdGl2ZVN0YXR1cyA9IHJlc3BbMF0uYWN0aXZlU3RhdHVzO1xyXG4gICAgICAgICAgICBwcm9qZWN0U3Vic2NyaXB0aW9uLm51bU9mQnVpbGRpbmdzQWxsb2NhdGVkID0gcmVzcFswXS5idWlsZGluZ3MubGVuZ3RoO1xyXG4gICAgICAgICAgICBwcm9qZWN0U3Vic2NyaXB0aW9uLm51bU9mQnVpbGRpbmdzUmVtYWluaW5nID0gKHJlc3VsdFswXS5zdWJzY3JpcHRpb24ubnVtT2ZCdWlsZGluZ3MgLSByZXNwWzBdLmJ1aWxkaW5ncy5sZW5ndGgpO1xyXG4gICAgICAgICAgICBsZXQgYWN0aXZhdGlvbl9kYXRlID0gbmV3IERhdGUocmVzdWx0WzBdLnN1YnNjcmlwdGlvbi5hY3RpdmF0aW9uRGF0ZSk7XHJcbiAgICAgICAgICAgIGxldCBleHBpcnlEYXRlID0gbmV3IERhdGUocmVzdWx0WzBdLnN1YnNjcmlwdGlvbi5hY3RpdmF0aW9uRGF0ZSk7XHJcbiAgICAgICAgICAgIHByb2plY3RTdWJzY3JpcHRpb24uZXhwaXJ5RGF0ZSA9IG5ldyBEYXRlKGV4cGlyeURhdGUuc2V0RGF0ZShhY3RpdmF0aW9uX2RhdGUuZ2V0RGF0ZSgpICsgcmVzdWx0WzBdLnN1YnNjcmlwdGlvbi52YWxpZGl0eSkpO1xyXG5cclxuICAgICAgICAgICAgLy9leHBpcnkgZGF0ZSBmb3IgcHJvamVjdCBzdWJzY3JpcHRpb25cclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRfZGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgIHByb2plY3RTdWJzY3JpcHRpb24ubnVtT2ZEYXlzVG9FeHBpcmUgPSB0aGlzLmRheXNkaWZmZXJlbmNlKHByb2plY3RTdWJzY3JpcHRpb24uZXhwaXJ5RGF0ZSwgY3VycmVudF9kYXRlKTtcclxuXHJcbiAgICAgICAgICAgIGlmKHByb2plY3RTdWJzY3JpcHRpb24ubnVtT2ZEYXlzVG9FeHBpcmUgPCAzMCAmJiBwcm9qZWN0U3Vic2NyaXB0aW9uLm51bU9mRGF5c1RvRXhwaXJlID49MCkge1xyXG4gICAgICAgICAgICAgIHByb2plY3RTdWJzY3JpcHRpb24ud2FybmluZ01lc3NhZ2UgPVxyXG4gICAgICAgICAgICAgICAgJ0V4cGlyaW5nIGluICcgKyAgTWF0aC5yb3VuZChwcm9qZWN0U3Vic2NyaXB0aW9uLm51bU9mRGF5c1RvRXhwaXJlKSArICcgZGF5cy4nIDtcclxuICAgICAgICAgICAgfSBlbHNlIGlmKHByb2plY3RTdWJzY3JpcHRpb24ubnVtT2ZEYXlzVG9FeHBpcmUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgcHJvamVjdFN1YnNjcmlwdGlvbi5leHBpcnlNZXNzYWdlID0gJ1Byb2plY3QgZXhwaXJlZCwnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHByb2plY3RTdWJzY3JpcHRpb24pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVN1YnNjcmlwdGlvbih1c2VyIDogVXNlciwgcHJvamVjdElkOiBzdHJpbmcsIHBhY2thZ2VOYW1lOiBzdHJpbmcsIGNhbGxiYWNrOihlcnJvcjogYW55LCByZXN1bHQ6IGFueSk9PiB2b2lkKSB7XHJcbiAgICBsZXQgcXVlcnkgPSBbXHJcbiAgICAgIHskbWF0Y2g6IHsnX2lkJzpPYmplY3RJZCh1c2VyLl9pZCl9fSxcclxuICAgICAgeyAkcHJvamVjdCA6IHsnc3Vic2NyaXB0aW9uJzoxfX0sXHJcbiAgICAgIHsgJHVud2luZDogJyRzdWJzY3JpcHRpb24nfSxcclxuICAgICAgeyAkbWF0Y2g6IHsnc3Vic2NyaXB0aW9uLnByb2plY3RJZCcgOiBPYmplY3RJZChwcm9qZWN0SWQpfX1cclxuICAgIF07XHJcbiAgIHRoaXMudXNlclJlcG9zaXRvcnkuYWdncmVnYXRlKHF1ZXJ5LCAoZXJyb3IscmVzdWx0KSA9PiB7XHJcbiAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgfSBlbHNlIHtcclxuICAgICAgIGxldCBzdWJzY3JpcHRpb24gPSByZXN1bHRbMF0uc3Vic2NyaXB0aW9uO1xyXG4gICAgICAgdGhpcy51cGRhdGVQYWNrYWdlKHVzZXIsIHN1YnNjcmlwdGlvbiwgcGFja2FnZU5hbWUscHJvamVjdElkLChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgIGVycm9yLm1lc3NhZ2UgPSBtZXNzYWdlcy5NU0dfRVJST1JfV0hJTEVfQ09OVEFDVElORztcclxuICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgaWYocGFja2FnZU5hbWUgPT09IGNvbnN0YW50cy5SRU5FV19QUk9KRUNUKSB7XHJcbiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogbWVzc2FnZXMuTVNHX1NVQ0NFU1NfUFJPSkVDVF9SRU5FV30pO1xyXG4gICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnfSk7XHJcbiAgICAgICAgICAgfVxyXG4gICAgICAgICB9XHJcbiAgICAgICB9KTtcclxuICAgICB9XHJcbiAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlUGFja2FnZSh1c2VyOiBVc2VyLCBzdWJzY3JpcHRpb246IGFueSwgcGFja2FnZU5hbWU6IHN0cmluZywgcHJvamVjdElkOnN0cmluZywgY2FsbGJhY2s6KGVycm9yOiBhbnksIHJlc3VsdDogYW55KT0+IHZvaWQpIHtcclxuICAgIGxldCBzdWJTY3JpcHRpb25TZXJ2aWNlID0gbmV3IFN1YnNjcmlwdGlvblNlcnZpY2UoKTtcclxuICAgIHN3aXRjaCAocGFja2FnZU5hbWUpIHtcclxuICAgICAgY2FzZSAnUHJlbWl1bSc6XHJcbiAgICAgIHtcclxuICAgICAgICBzdWJTY3JpcHRpb25TZXJ2aWNlLmdldFN1YnNjcmlwdGlvblBhY2thZ2VCeU5hbWUoJ1ByZW1pdW0nLCdCYXNlUGFja2FnZScsXHJcbiAgICAgICAgICAoZXJyb3I6IGFueSwgc3Vic2NyaXB0aW9uUGFja2FnZTogQXJyYXk8U3Vic2NyaXB0aW9uUGFja2FnZT4pID0+IHtcclxuICAgICAgICAgICAgaWYoZXJyb3IpIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvcixudWxsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gc3Vic2NyaXB0aW9uUGFja2FnZVswXTtcclxuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24ubnVtT2ZCdWlsZGluZ3MgPSByZXN1bHQuYmFzZVBhY2thZ2UubnVtT2ZCdWlsZGluZ3M7XHJcbiAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uLm51bU9mUHJvamVjdHMgPSByZXN1bHQuYmFzZVBhY2thZ2UubnVtT2ZQcm9qZWN0cztcclxuICAgICAgICAgICAgICBsZXQgbm9PZkRheXNUb0V4cGlyeSA9IHRoaXMuY2FsY3VsYXRlVmFsaWRpdHkoc3Vic2NyaXB0aW9uKTtcclxuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24udmFsaWRpdHkgPSBub09mRGF5c1RvRXhwaXJ5ICsgcmVzdWx0LmJhc2VQYWNrYWdlLnZhbGlkaXR5O1xyXG4gICAgICAgICAgICAgIHN1YnNjcmlwdGlvbi5wdXJjaGFzZWQucHVzaChyZXN1bHQuYmFzZVBhY2thZ2UpO1xyXG4gICAgICAgICAgICAgIHRoaXMudXBkYXRlU3Vic2NyaXB0aW9uUGFja2FnZSh1c2VyLl9pZCwgcHJvamVjdElkLHN1YnNjcmlwdGlvbiwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjYXNlICdSZW5ld1Byb2plY3QnOlxyXG4gICAgICB7XHJcbiAgICAgICAgc3ViU2NyaXB0aW9uU2VydmljZS5nZXRTdWJzY3JpcHRpb25QYWNrYWdlQnlOYW1lKCdSZW5ld1Byb2plY3QnLCdhZGRPblBhY2thZ2UnLFxyXG4gICAgICAgICAgKGVycm9yOiBhbnksIHN1YnNjcmlwdGlvblBhY2thZ2U6IEFycmF5PFN1YnNjcmlwdGlvblBhY2thZ2U+KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHN1YnNjcmlwdGlvblBhY2thZ2VbMF07XHJcbiAgICAgICAgICAgICAgbGV0IG5vT2ZEYXlzVG9FeHBpcnkgPSB0aGlzLmNhbGN1bGF0ZVZhbGlkaXR5KHN1YnNjcmlwdGlvbik7XHJcbiAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uLnZhbGlkaXR5ID0gbm9PZkRheXNUb0V4cGlyeSArIHJlc3VsdC5hZGRPblBhY2thZ2UudmFsaWRpdHk7XHJcbiAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uLnB1cmNoYXNlZC5wdXNoKHJlc3VsdC5hZGRPblBhY2thZ2UpO1xyXG4gICAgICAgICAgICAgIHRoaXMudXBkYXRlU3Vic2NyaXB0aW9uUGFja2FnZSh1c2VyLl9pZCxwcm9qZWN0SWQsIHN1YnNjcmlwdGlvbiwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTogJ3N1Y2Nlc3MnfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjYXNlICdBZGRfYnVpbGRpbmcnOlxyXG4gICAgICB7XHJcbiAgICAgICAgc3ViU2NyaXB0aW9uU2VydmljZS5nZXRTdWJzY3JpcHRpb25QYWNrYWdlQnlOYW1lKCdBZGRfYnVpbGRpbmcnLCdhZGRPblBhY2thZ2UnLFxyXG4gICAgICAgICAgKGVycm9yOiBhbnksIHN1YnNjcmlwdGlvblBhY2thZ2U6IEFycmF5PFN1YnNjcmlwdGlvblBhY2thZ2U+KSA9PiB7XHJcbiAgICAgICAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHN1YnNjcmlwdGlvblBhY2thZ2VbMF07XHJcbiAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uLm51bU9mQnVpbGRpbmdzID0gc3Vic2NyaXB0aW9uLm51bU9mQnVpbGRpbmdzICsgcmVzdWx0LmFkZE9uUGFja2FnZS5udW1PZkJ1aWxkaW5ncztcclxuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24ucHVyY2hhc2VkLnB1c2gocmVzdWx0LmFkZE9uUGFja2FnZSk7XHJcbiAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdWJzY3JpcHRpb25QYWNrYWdlKHVzZXIuX2lkLCBwcm9qZWN0SWQsc3Vic2NyaXB0aW9uLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtkYXRhOiAnc3VjY2Vzcyd9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHVwZGF0ZVN1YnNjcmlwdGlvblBhY2thZ2UoIHVzZXJJZDogYW55LCBwcm9qZWN0SWQ6c3RyaW5nLHN1YnNjcmlwdGlvbjogYW55LCBjYWxsYmFjazooZXJyb3I6IGFueSwgcmVzdWx0OiBhbnkpPT4gdm9pZCkge1xyXG4gICAgbGV0IHF1ZXJ5ID0ge19pZDogdXNlcklkfTtcclxuICAgIC8vVE9ETyBmb3IgbW9yZSBvYmplY3RzIGluIHN1YnNjcmlwdGlvbiAuXHJcbiAgICBsZXQgdXBkYXRlUXVlcnkgPSB7JHNldDp7J3N1YnNjcmlwdGlvbi4kW10nOnN1YnNjcmlwdGlvbn19O1xyXG4gICAgdGhpcy51c2VyUmVwb3NpdG9yeS5maW5kT25lQW5kVXBkYXRlKHF1ZXJ5LCB1cGRhdGVRdWVyeSwge25ldzogdHJ1ZX0sIChlcnJvciwgcmVzdWx0KSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB7ZGF0YTonc3VjY2Vzcyd9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBjYWxjdWxhdGVWYWxpZGl0eShzdWJzY3JpcHRpb246IGFueSkge1xyXG4gICAgbGV0IGFjdGl2YXRpb25EYXRlID0gbmV3IERhdGUoc3Vic2NyaXB0aW9uLmFjdGl2YXRpb25EYXRlKTtcclxuICAgIGxldCBleHBpcnlEYXRlID0gbmV3IERhdGUoc3Vic2NyaXB0aW9uLmFjdGl2YXRpb25EYXRlKTtcclxuICAgIGxldCBwcm9qZWN0RXhwaXJ5RGF0ZSA9IG5ldyBEYXRlKGV4cGlyeURhdGUuc2V0RGF0ZShhY3RpdmF0aW9uRGF0ZS5nZXREYXRlKCkgKyBzdWJzY3JpcHRpb24udmFsaWRpdHkpKTtcclxuICAgIGxldCBjdXJyZW50X2RhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgbGV0IGRheXMgPSB0aGlzLmRheXNkaWZmZXJlbmNlKHByb2plY3RFeHBpcnlEYXRlLGN1cnJlbnRfZGF0ZSk7XHJcbiAgICByZXR1cm4gZGF5cztcclxuICB9XHJcblxyXG59XHJcblxyXG5PYmplY3Quc2VhbChVc2VyU2VydmljZSk7XHJcbmV4cG9ydCA9IFVzZXJTZXJ2aWNlO1xyXG4iXX0=
