"use strict";
var passport = require("passport");
var jwt = require("jwt-simple");
var Bearer = require("passport-http-bearer");
var sharedconstants_1 = require("../shared/sharedconstants");
var BearerStrategy = Bearer.Strategy;
var FacebookTokenStrategy = require('passport-facebook-token');
var UserRepository = require("../dataaccess/repository/user.repository");
var Messages = require("../shared/messages");
var GooglePlusTokenStrategy = require('passport-google-plus-token');
var config = require('config');
var AuthInterceptor = (function () {
    function AuthInterceptor() {
        var fbClientId = config.get('TplSeed.facebookIds.clientId');
        var fbClientSecretId = config.get('TplSeed.facebookIds.clientSecretId');
        var googlePlusClientId = config.get('TplSeed.googlePlusIds.clientId');
        var googlePlusClientSecretId = config.get('TplSeed.googlePlusIds.clientSecretId');
        passport.use(new BearerStrategy(function (token, done) {
            var decoded = null;
            var isShareApi = false;
            try {
                decoded = jwt.decode(token, sharedconstants_1.ConstVariables.AUTHENTICATION_JWT_KEY);
            }
            catch (e) {
                var err = new Error();
                err.message = Messages.MSG_ERROR_INVALID_TOKEN;
                return done(err, false, null);
            }
            if (decoded.shareKey === sharedconstants_1.ConstVariables.AUTHENTICATION_ENCODED_SHARE_KEY) {
                isShareApi = true;
            }
            else {
                if (decoded.exp === undefined) {
                    console.log('its an unsubscribed call in AuthInterceptor');
                }
                else if (decoded.exp <= Date.now()) {
                    var err = new Error();
                    err.message = Messages.MSG_ERROR_TOKEN_SESSION;
                    return done(err, false, null);
                }
            }
            if (decoded.iss !== undefined) {
                var userRepository = new UserRepository();
                userRepository.findById(decoded.iss, function (err, user) {
                    if (err) {
                        return done(err, null, null);
                    }
                    if (!user) {
                        return done(null, false, null);
                    }
                    return done(null, user, isShareApi);
                });
            }
        }));
        passport.use(new FacebookTokenStrategy({
            clientID: fbClientId,
            clientSecret: fbClientSecretId
        }, function (access_token, refresh_token, profile, done) {
            process.nextTick(function () {
                var userRepository = new UserRepository();
                var query = { "email": profile.emails[0].value };
                userRepository.retrieve(query, function (err, user) {
                    if (err) {
                        return done(err, null);
                    }
                    if (user.length > 0) {
                        return done(null, user[0]);
                    }
                    else {
                        if (profile.emails[0].value) {
                            var newUser = {};
                            newUser.first_name = profile.name.givenName;
                            newUser.last_name = profile.name.familyName;
                            newUser.email = profile.emails[0].value;
                            newUser.mobile_number = 12345678;
                            newUser.password = '12345678';
                            newUser.current_theme = 'container-fluid light-theme';
                            var userRepository = new UserRepository();
                            userRepository.create(newUser, function (err, res) {
                                if (err) {
                                    return done(err, null);
                                }
                                else {
                                    return done(null, res);
                                }
                            });
                        }
                        else {
                            return done(null, null, true);
                        }
                    }
                });
            });
        }));
        passport.use(new GooglePlusTokenStrategy({
            clientID: googlePlusClientId,
            clientSecret: googlePlusClientSecretId,
        }, function (req, access_token, refresh_token, profile, done) {
            process.nextTick(function () {
                var userRepository = new UserRepository();
                var query = { "email": profile.emails[0].value };
                userRepository.retrieve(query, function (err, user) {
                    if (err) {
                        return done(err, null);
                    }
                    if (user.length > 0) {
                        return done(null, user[0]);
                    }
                    else {
                        if (profile.emails[0].value) {
                            var newUser = {};
                            var randomMobileNumber = Math.floor(Math.random() * (10000000000 - 100000) + 1000000000);
                            newUser.first_name = profile.name.givenName;
                            newUser.last_name = profile.name.familyName;
                            newUser.email = profile.emails[0].value;
                            newUser.mobile_number = randomMobileNumber;
                            newUser.password = 'YH8n@4Sjj!tYk4q-';
                            var userRepository = new UserRepository();
                            userRepository.create(newUser, function (err, res) {
                                if (err) {
                                    return done(err, null);
                                }
                                else {
                                    return done(null, res);
                                }
                            });
                        }
                        else {
                            return done(null, null, true);
                        }
                    }
                });
            });
        }));
    }
    AuthInterceptor.prototype.issueTokenWithUid = function (user, role) {
        var issuer;
        if (user.userId) {
            issuer = user.userId;
        }
        else {
            issuer = user._id;
        }
        var curDate = new Date();
        var expires = new Date(curDate.getTime() + (60 * 24 * 60 * 60 * 1000));
        var token = jwt.encode({
            iss: issuer,
            exp: expires.getTime(),
            role: role
        }, sharedconstants_1.ConstVariables.AUTHENTICATION_JWT_KEY);
        return token;
    };
    AuthInterceptor.prototype.issueTokenWithUidForShare = function (user) {
        var issuer;
        var customKey = sharedconstants_1.ConstVariables.AUTHENTICATION_ENCODED_SHARE_KEY;
        if (user.userId) {
            issuer = user.userId;
        }
        else {
            issuer = user._id;
        }
        var token = jwt.encode({
            iss: issuer,
            shareKey: customKey
        }, sharedconstants_1.ConstVariables.AUTHENTICATION_JWT_KEY);
        return token;
    };
    AuthInterceptor.prototype.requiresAuth = function (req, res, next) {
        passport.authenticate('bearer', { session: false }, function (err, myuser, isShareApi) {
            if (err) {
                return res.status(401).send({
                    'error': {
                        reason: err.message,
                        message: err.message,
                        code: 401
                    }
                });
            }
            else {
                if (req.headers.authorization.split(' ')[0].toLowerCase() !== 'bearer' || req.headers.authorization.split(' ').length !== 2) {
                    return res.status(401).send({
                        'error': {
                            reason: Messages.MSG_ERROR_IS_BEARER,
                            message: Messages.MSG_ERROR_IS_BEARER,
                            code: 401
                        }
                    });
                }
                else {
                    if (!myuser) {
                        return res.status(401).send({
                            'error': {
                                reason: Messages.MSG_ERROR_INVALID_TOKEN_2,
                                message: Messages.MSG_ERROR_INVALID_TOKEN_2,
                                code: 401
                            }
                        });
                    }
                    else {
                        req.user = myuser;
                        (isShareApi) ? req.isShareApi = true : req.isShareApi = false;
                        next();
                    }
                }
            }
        })(req, res, next);
    };
    AuthInterceptor.prototype.facebookAuth = function (req, res, next) {
        passport.authenticate('facebook-token', { scope: ['email'] }, function (err, user, info) {
            if (err) {
                next(err);
            }
            else if (info) {
                next({
                    reason: Messages.MSG_ERROR_FACEBOOK_AUTH,
                    message: Messages.MSG_ERROR_RSN_NOT_ALLOW,
                    code: 401
                });
            }
            else if (user) {
                req.user = { 'email': user.email, 'password': user.password };
                next();
            }
            else {
                next({
                    reason: Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
                    message: Messages.MSG_ERROR_FACEBOOK_AUTH,
                    code: 401
                });
            }
        })(req, res, next);
    };
    AuthInterceptor.prototype.googleAuth = function (req, res, next) {
        var request = require('request');
        request('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + req.body.googleToken, function (error, response, body) {
            if (error) {
                if (error.code == "ETIMEDOUT") {
                    next({
                        reason: Messages.MSG_ERROR_RSN_WHILE_CONTACTING,
                        message: Messages.MSG_ERROR_CONNECTION_TIMEOUT,
                        code: 401
                    });
                }
            }
            else if (response) {
                if (!error && response.statusCode == 200) {
                    var goolePlusObject = JSON.parse(body);
                    var userRepository = new UserRepository();
                    var query = { "email": goolePlusObject.email };
                    userRepository.retrieve(query, function (err, user) {
                        if (err) {
                            next(err);
                        }
                        else if (user.length > 0) {
                            if (user[0].social_profile_picture) {
                                req.user = { 'email': user[0].email, 'password': user[0].password };
                                next();
                            }
                            else {
                                var query = { "email": user[0].email };
                                var updateData = { "social_profile_picture": goolePlusObject.picture };
                                var userRepository = new UserRepository();
                                userRepository.findOneAndUpdate(query, updateData, { new: true }, function (error, result) {
                                    if (error) {
                                        next(error);
                                    }
                                    else {
                                        req.user = { 'email': user[0].email, 'password': user[0].password };
                                        next();
                                    }
                                });
                            }
                        }
                        else if (user.length === 0) {
                            var newUser = {};
                            var randomMobileNumber = Math.floor((Math.random() * 99999) + 100000);
                            newUser.first_name = goolePlusObject.given_name;
                            newUser.last_name = goolePlusObject.family_name;
                            newUser.email = goolePlusObject.email;
                            newUser.mobile_number = randomMobileNumber;
                            newUser.password = 'YH8n@4Sjj!tYk4q-';
                            newUser.current_theme = 'container-fluid light-theme';
                            newUser.social_profile_picture = goolePlusObject.picture;
                            newUser.isActivated = true;
                            var userRepository = new UserRepository();
                            userRepository.create(newUser, function (err, res) {
                                if (err) {
                                    next(err);
                                }
                                else if (res) {
                                    req.user = { 'email': res.email, 'password': res.password };
                                    next();
                                }
                            });
                        }
                    });
                }
            }
        });
    };
    AuthInterceptor.prototype.secureApiCheck = function (req, res, next) {
        if (req.isShareApi) {
            return res.status(401).send({
                'error': {
                    reason: Messages.MSG_ERROR_API_CHECK,
                    message: Messages.MSG_ERROR_API_CHECK,
                    code: 401
                }
            });
        }
        else {
            next();
        }
    };
    return AuthInterceptor;
}());
Object.seal(AuthInterceptor);
module.exports = AuthInterceptor;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUNBQXFDO0FBQ3JDLGdDQUFrQztBQUNsQyw2Q0FBK0M7QUFDL0MsNkRBQTJEO0FBQzNELElBQUksY0FBYyxHQUFRLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDMUMsSUFBSSxxQkFBcUIsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUMvRCx5RUFBNEU7QUFDNUUsNkNBQThDO0FBRzlDLElBQUksdUJBQXVCLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFDcEUsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRS9CO0lBRUU7UUFFRSxJQUFJLFVBQVUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDNUQsSUFBSSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDeEUsSUFBSSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDdEUsSUFBSSx3QkFBd0IsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFHbEYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxVQUFVLEtBQVUsRUFBRSxJQUFTO1lBQzdELElBQUksT0FBTyxHQUFRLElBQUksQ0FBQztZQUN4QixJQUFJLFVBQVUsR0FBVyxLQUFLLENBQUM7WUFDL0IsSUFBSSxDQUFDO2dCQUNILE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxnQ0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDckUsQ0FBQztZQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDdEIsR0FBRyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsdUJBQXVCLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNoQyxDQUFDO1lBQ0QsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxnQ0FBYyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztnQkFDekUsVUFBVSxHQUFHLElBQUksQ0FBQztZQUNwQixDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7Z0JBQzdELENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDckMsSUFBSSxHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDdEIsR0FBRyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsdUJBQXVCLENBQUM7b0JBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDaEMsQ0FBQztZQUNILENBQUM7WUFFRCxFQUFFLENBQUEsQ0FBQyxPQUFPLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdCLElBQUksY0FBYyxHQUFtQixJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUMxRCxjQUFjLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsVUFBVSxHQUFHLEVBQUUsSUFBSTtvQkFDdEQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDUixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzdCLENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUNWLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBQyxJQUFJLENBQUMsQ0FBQztvQkFDaEMsQ0FBQztvQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ3RDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztRQUtILENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixRQUFRLENBQUMsR0FBRyxDQUFDLElBQUkscUJBQXFCLENBQUM7WUFDbkMsUUFBUSxFQUFFLFVBQVU7WUFDcEIsWUFBWSxFQUFFLGdCQUFnQjtTQUkvQixFQUdELFVBQVUsWUFBaUIsRUFBRSxhQUFrQixFQUFFLE9BQVksRUFBRSxJQUFTO1lBQ3RFLE9BQU8sQ0FBQyxRQUFRLENBQUM7Z0JBRWYsSUFBSSxjQUFjLEdBQW1CLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQzFELElBQUksS0FBSyxHQUFHLEVBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUM7Z0JBQy9DLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFVBQVUsR0FBRyxFQUFFLElBQUk7b0JBRWhELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ1IsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3pCLENBQUM7b0JBRUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUVwQixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDN0IsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFHTixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7NEJBQzVCLElBQUksT0FBTyxHQUFtQixFQUFFLENBQUM7NEJBRWpDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7NEJBQzVDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7NEJBQzVDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7NEJBQ3hDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDOzRCQUNqQyxPQUFPLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQzs0QkFDOUIsT0FBTyxDQUFDLGFBQWEsR0FBRyw2QkFBNkIsQ0FBQzs0QkFHdEQsSUFBSSxjQUFjLEdBQW1CLElBQUksY0FBYyxFQUFFLENBQUM7NEJBQzFELGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFVBQUMsR0FBUSxFQUFFLEdBQVE7Z0NBQ2hELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0NBQ1IsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0NBQ3pCLENBQUM7Z0NBQ0QsSUFBSSxDQUFDLENBQUM7b0NBQ0osTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0NBQ3pCLENBQUM7NEJBQ0gsQ0FBQyxDQUFDLENBQUM7d0JBQ0wsQ0FBQzt3QkFBQyxJQUFJLENBQUMsQ0FBQzs0QkFDTixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ2hDLENBQUM7b0JBQ0gsQ0FBQztnQkFDSCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVOLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsQ0FBQztZQUNyQyxRQUFRLEVBQUUsa0JBQWtCO1lBQzVCLFlBQVksRUFBRSx3QkFBd0I7U0FHdkMsRUFHRCxVQUFVLEdBQVEsRUFBRSxZQUFpQixFQUFFLGFBQWtCLEVBQUUsT0FBWSxFQUFFLElBQVM7WUFDaEYsT0FBTyxDQUFDLFFBQVEsQ0FBQztnQkFFZixJQUFJLGNBQWMsR0FBbUIsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDMUQsSUFBSSxLQUFLLEdBQUcsRUFBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQztnQkFDL0MsY0FBYyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsVUFBVSxHQUFHLEVBQUUsSUFBSTtvQkFFaEQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDUixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDekIsQ0FBQztvQkFFRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBRXBCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM3QixDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUdOLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzs0QkFDNUIsSUFBSSxPQUFPLEdBQW1CLEVBQUUsQ0FBQzs0QkFDakMsSUFBSSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQzs0QkFDekYsT0FBTyxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQzs0QkFDNUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQzs0QkFFNUMsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzs0QkFDeEMsT0FBTyxDQUFDLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQzs0QkFDM0MsT0FBTyxDQUFDLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQzs0QkFHdEMsSUFBSSxjQUFjLEdBQW1CLElBQUksY0FBYyxFQUFFLENBQUM7NEJBQzFELGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFVBQUMsR0FBUSxFQUFFLEdBQVE7Z0NBQ2hELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0NBQ1IsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0NBQ3pCLENBQUM7Z0NBQ0QsSUFBSSxDQUFDLENBQUM7b0NBQ0osTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0NBQ3pCLENBQUM7NEJBQ0gsQ0FBQyxDQUFDLENBQUM7d0JBQ0wsQ0FBQzt3QkFBQyxJQUFJLENBQUMsQ0FBQzs0QkFDTixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ2hDLENBQUM7b0JBQ0gsQ0FBQztnQkFDSCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNSLENBQUM7SUFFRCwyQ0FBaUIsR0FBakIsVUFBa0IsSUFBUyxFQUFDLElBQVk7UUFDdEMsSUFBSSxNQUFjLENBQUM7UUFDbkIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEIsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDdkIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7UUFDcEIsQ0FBQztRQUNELElBQUksT0FBTyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFFekIsSUFBSSxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUNyQixHQUFHLEVBQUUsTUFBTTtZQUNYLEdBQUcsRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ3RCLElBQUksRUFBRSxJQUFJO1NBQ1gsRUFBRSxnQ0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxtREFBeUIsR0FBekIsVUFBMEIsSUFBUTtRQUVoQyxJQUFJLE1BQWEsQ0FBQztRQUNsQixJQUFJLFNBQVMsR0FBVSxnQ0FBYyxDQUFDLGdDQUFnQyxDQUFDO1FBQ3ZFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3ZCLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3BCLENBQUM7UUFDRCxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1lBQ3JCLEdBQUcsRUFBRSxNQUFNO1lBQ1gsUUFBUSxFQUFFLFNBQVM7U0FDcEIsRUFBRSxnQ0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFFMUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxzQ0FBWSxHQUFaLFVBQWEsR0FBUSxFQUFFLEdBQVEsRUFBRSxJQUFTO1FBQ3hDLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBQyxFQUM5QyxVQUFVLEdBQU8sRUFBRSxNQUFVLEVBQUUsVUFBa0I7WUFDL0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDUixNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzFCLE9BQU8sRUFBRTt3QkFDUCxNQUFNLEVBQUUsR0FBRyxDQUFDLE9BQU87d0JBQ25CLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTzt3QkFDcEIsSUFBSSxFQUFFLEdBQUc7cUJBQ1Y7aUJBQ0YsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM1SCxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7d0JBQzFCLE9BQU8sRUFBRTs0QkFDUCxNQUFNLEVBQUUsUUFBUSxDQUFDLG1CQUFtQjs0QkFDcEMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUI7NEJBQ3JDLElBQUksRUFBRSxHQUFHO3lCQUNWO3FCQUNGLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDWixNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7NEJBQzFCLE9BQU8sRUFBRTtnQ0FDUCxNQUFNLEVBQUUsUUFBUSxDQUFDLHlCQUF5QjtnQ0FDMUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyx5QkFBeUI7Z0NBQzNDLElBQUksRUFBRSxHQUFHOzZCQUNWO3lCQUNGLENBQUMsQ0FBQztvQkFDTCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNOLEdBQUcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDO3dCQUNsQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7d0JBQzlELElBQUksRUFBRSxDQUFDO29CQUNULENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxzQ0FBWSxHQUFaLFVBQWEsR0FBUSxFQUFFLEdBQVEsRUFBRSxJQUFTO1FBQ3hDLFFBQVEsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBQyxFQUN4RCxVQUFDLEdBQVEsRUFBRSxJQUFTLEVBQUUsSUFBUztZQUU3QixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNSLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNaLENBQUM7WUFDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDZCxJQUFJLENBQUM7b0JBQ0gsTUFBTSxFQUFFLFFBQVEsQ0FBQyx1QkFBdUI7b0JBQ3hDLE9BQU8sRUFBRSxRQUFRLENBQUMsdUJBQXVCO29CQUN6QyxJQUFJLEVBQUUsR0FBRztpQkFDVixDQUFDLENBQUM7WUFDTCxDQUFDO1lBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2QsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFDLENBQUM7Z0JBQzVELElBQUksRUFBRSxDQUFDO1lBQ1QsQ0FBQztZQUNELElBQUksQ0FBQyxDQUFDO2dCQUNKLElBQUksQ0FBQztvQkFDSCxNQUFNLEVBQUUsUUFBUSxDQUFDLGlDQUFpQztvQkFDbEQsT0FBTyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUI7b0JBQ3pDLElBQUksRUFBRSxHQUFHO2lCQUNWLENBQUMsQ0FBQztZQUVMLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxvQ0FBVSxHQUFWLFVBQVcsR0FBUSxFQUFFLEdBQVEsRUFBRSxJQUFTO1FBQ3RDLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqQyxPQUFPLENBQUMsMERBQTBELEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBQyxLQUFVLEVBQUUsUUFBYSxFQUFFLElBQVM7WUFDOUgsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDVixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQzlCLElBQUksQ0FBQzt3QkFDSCxNQUFNLEVBQUUsUUFBUSxDQUFDLDhCQUE4Qjt3QkFDL0MsT0FBTyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEI7d0JBQzlDLElBQUksRUFBRSxHQUFHO3FCQUNWLENBQUMsQ0FBQztnQkFFTCxDQUFDO1lBQ0gsQ0FBQztZQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ3pDLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3ZDLElBQUksY0FBYyxHQUFtQixJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUMxRCxJQUFJLEtBQUssR0FBRyxFQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsS0FBSyxFQUFDLENBQUM7b0JBQzdDLGNBQWMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFVBQUMsR0FBRyxFQUFFLElBQUk7d0JBQ3ZDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7NEJBQ1IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNaLENBQUM7d0JBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDekIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztnQ0FDbkMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFDLENBQUM7Z0NBQ2xFLElBQUksRUFBRSxDQUFDOzRCQUNULENBQUM7NEJBQ0QsSUFBSSxDQUFDLENBQUM7Z0NBQ0osSUFBSSxLQUFLLEdBQUcsRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDO2dDQUNyQyxJQUFJLFVBQVUsR0FBRyxFQUFDLHdCQUF3QixFQUFFLGVBQWUsQ0FBQyxPQUFPLEVBQUMsQ0FBQztnQ0FDckUsSUFBSSxjQUFjLEdBQW1CLElBQUksY0FBYyxFQUFFLENBQUM7Z0NBQzFELGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxFQUFFLFVBQUMsS0FBSyxFQUFFLE1BQU07b0NBQzVFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7d0NBQ1YsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO29DQUVkLENBQUM7b0NBQ0QsSUFBSSxDQUFDLENBQUM7d0NBQ0osR0FBRyxDQUFDLElBQUksR0FBRyxFQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFDLENBQUM7d0NBQ2xFLElBQUksRUFBRSxDQUFDO29DQUNULENBQUM7Z0NBQ0gsQ0FBQyxDQUFDLENBQUE7NEJBQ0osQ0FBQzt3QkFFSCxDQUFDO3dCQUNELElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzNCLElBQUksT0FBTyxHQUFtQixFQUFFLENBQUM7NEJBRWpDLElBQUksa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQzs0QkFDdEUsT0FBTyxDQUFDLFVBQVUsR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFDOzRCQUNoRCxPQUFPLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUM7NEJBQ2hELE9BQU8sQ0FBQyxLQUFLLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQzs0QkFDdEMsT0FBTyxDQUFDLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQzs0QkFDM0MsT0FBTyxDQUFDLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQzs0QkFDdEMsT0FBTyxDQUFDLGFBQWEsR0FBRyw2QkFBNkIsQ0FBQzs0QkFDdEQsT0FBTyxDQUFDLHNCQUFzQixHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUM7NEJBQ3pELE9BQU8sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDOzRCQUUzQixJQUFJLGNBQWMsR0FBbUIsSUFBSSxjQUFjLEVBQUUsQ0FBQzs0QkFDMUQsY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsVUFBQyxHQUFRLEVBQUUsR0FBUTtnQ0FDaEQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQ0FDUixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ1osQ0FBQztnQ0FDRCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQ0FDYixHQUFHLENBQUMsSUFBSSxHQUFHLEVBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUMsQ0FBQztvQ0FDMUQsSUFBSSxFQUFFLENBQUM7Z0NBQ1QsQ0FBQzs0QkFDSCxDQUFDLENBQUMsQ0FBQzt3QkFDTCxDQUFDO29CQUNILENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsd0NBQWMsR0FBZCxVQUFlLEdBQU8sRUFBRSxHQUFPLEVBQUUsSUFBUTtRQUN2QyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNuQixNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFBRTtvQkFDUCxNQUFNLEVBQUUsUUFBUSxDQUFDLG1CQUFtQjtvQkFDcEMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUI7b0JBQ3JDLElBQUksRUFBRSxHQUFHO2lCQUNWO2FBQ0YsQ0FBQyxDQUFBO1FBQ0osQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sSUFBSSxFQUFFLENBQUM7UUFDVCxDQUFDO0lBQ0gsQ0FBQztJQUNILHNCQUFDO0FBQUQsQ0E3VkEsQUE2VkMsSUFBQTtBQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDN0IsaUJBQVMsZUFBZSxDQUFDIiwiZmlsZSI6ImFwcC9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhc3Nwb3J0IGZyb20gXCJwYXNzcG9ydFwiO1xyXG5pbXBvcnQgKiBhcyBqd3QgZnJvbSBcImp3dC1zaW1wbGVcIjtcclxuaW1wb3J0ICogYXMgQmVhcmVyIGZyb20gXCJwYXNzcG9ydC1odHRwLWJlYXJlclwiO1xyXG5pbXBvcnQgeyBDb25zdFZhcmlhYmxlcyB9IGZyb20gXCIuLi9zaGFyZWQvc2hhcmVkY29uc3RhbnRzXCI7XHJcbnZhciBCZWFyZXJTdHJhdGVneTogYW55ID0gQmVhcmVyLlN0cmF0ZWd5O1xyXG52YXIgRmFjZWJvb2tUb2tlblN0cmF0ZWd5ID0gcmVxdWlyZSgncGFzc3BvcnQtZmFjZWJvb2stdG9rZW4nKTtcclxuaW1wb3J0IFVzZXJSZXBvc2l0b3J5ID0gcmVxdWlyZShcIi4uL2RhdGFhY2Nlc3MvcmVwb3NpdG9yeS91c2VyLnJlcG9zaXRvcnlcIik7XHJcbmltcG9ydCBNZXNzYWdlcz1yZXF1aXJlKFwiLi4vc2hhcmVkL21lc3NhZ2VzXCIpO1xyXG5pbXBvcnQgVXNlck1vZGVsID0gcmVxdWlyZShcIi4uL2RhdGFhY2Nlc3MvbW9kZWwvdXNlci5tb2RlbFwiKTtcclxuXHJcbnZhciBHb29nbGVQbHVzVG9rZW5TdHJhdGVneSA9IHJlcXVpcmUoJ3Bhc3Nwb3J0LWdvb2dsZS1wbHVzLXRva2VuJyk7XHJcbnZhciBjb25maWcgPSByZXF1aXJlKCdjb25maWcnKTtcclxuXHJcbmNsYXNzIEF1dGhJbnRlcmNlcHRvciB7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG5cclxuICAgIHZhciBmYkNsaWVudElkID0gY29uZmlnLmdldCgnVHBsU2VlZC5mYWNlYm9va0lkcy5jbGllbnRJZCcpO1xyXG4gICAgdmFyIGZiQ2xpZW50U2VjcmV0SWQgPSBjb25maWcuZ2V0KCdUcGxTZWVkLmZhY2Vib29rSWRzLmNsaWVudFNlY3JldElkJyk7XHJcbiAgICB2YXIgZ29vZ2xlUGx1c0NsaWVudElkID0gY29uZmlnLmdldCgnVHBsU2VlZC5nb29nbGVQbHVzSWRzLmNsaWVudElkJyk7XHJcbiAgICB2YXIgZ29vZ2xlUGx1c0NsaWVudFNlY3JldElkID0gY29uZmlnLmdldCgnVHBsU2VlZC5nb29nbGVQbHVzSWRzLmNsaWVudFNlY3JldElkJyk7XHJcblxyXG5cclxuICAgIHBhc3Nwb3J0LnVzZShuZXcgQmVhcmVyU3RyYXRlZ3koZnVuY3Rpb24gKHRva2VuOiBhbnksIGRvbmU6IGFueSkge1xyXG4gICAgICB2YXIgZGVjb2RlZDogYW55ID0gbnVsbDtcclxuICAgICAgdmFyIGlzU2hhcmVBcGk6Ym9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGRlY29kZWQgPSBqd3QuZGVjb2RlKHRva2VuLCBDb25zdFZhcmlhYmxlcy5BVVRIRU5USUNBVElPTl9KV1RfS0VZKTtcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcclxuICAgICAgICBlcnIubWVzc2FnZSA9IE1lc3NhZ2VzLk1TR19FUlJPUl9JTlZBTElEX1RPS0VOO1xyXG4gICAgICAgIHJldHVybiBkb25lKGVyciwgZmFsc2UsIG51bGwpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkZWNvZGVkLnNoYXJlS2V5ID09PSBDb25zdFZhcmlhYmxlcy5BVVRIRU5USUNBVElPTl9FTkNPREVEX1NIQVJFX0tFWSkge1xyXG4gICAgICAgIGlzU2hhcmVBcGkgPSB0cnVlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChkZWNvZGVkLmV4cCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnaXRzIGFuIHVuc3Vic2NyaWJlZCBjYWxsIGluIEF1dGhJbnRlcmNlcHRvcicpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZGVjb2RlZC5leHAgPD0gRGF0ZS5ub3coKSkge1xyXG4gICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgICAgZXJyLm1lc3NhZ2UgPSBNZXNzYWdlcy5NU0dfRVJST1JfVE9LRU5fU0VTU0lPTjtcclxuICAgICAgICAgIHJldHVybiBkb25lKGVyciwgZmFsc2UsIG51bGwpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoZGVjb2RlZC5pc3MgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHZhciB1c2VyUmVwb3NpdG9yeTogVXNlclJlcG9zaXRvcnkgPSBuZXcgVXNlclJlcG9zaXRvcnkoKTtcclxuICAgICAgICB1c2VyUmVwb3NpdG9yeS5maW5kQnlJZChkZWNvZGVkLmlzcywgZnVuY3Rpb24gKGVyciwgdXNlcikge1xyXG4gICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICByZXR1cm4gZG9uZShlcnIsbnVsbCxudWxsKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICghdXNlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gZG9uZShudWxsLCBmYWxzZSxudWxsKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBkb25lKG51bGwsIHVzZXIsIGlzU2hhcmVBcGkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IC8qZWxzZSB7XHJcbiAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAgIGVyci5tZXNzYWdlID0gJ0lzc3VlciBpbiB0b2tlbiBpcyBub3QgYXZhaWxhYmxlJztcclxuICAgICAgICByZXR1cm4gZG9uZShlcnIsIGZhbHNlLCBudWxsKTtcclxuICAgICAgfSovXHJcbiAgICB9KSk7XHJcblxyXG4gICAgcGFzc3BvcnQudXNlKG5ldyBGYWNlYm9va1Rva2VuU3RyYXRlZ3koe1xyXG4gICAgICAgIGNsaWVudElEOiBmYkNsaWVudElkLFxyXG4gICAgICAgIGNsaWVudFNlY3JldDogZmJDbGllbnRTZWNyZXRJZFxyXG4gICAgICAgIC8vY2FsbGJhY2tVUkwgICAgIDogICdodHRwOi8vbG9jYWxob3N0OjgwODAvZmJMb2dpbicsXHJcbiAgICAgICAgLy9wcm9maWxlRmllbGRzOiBbJ2lkJywnZW1haWxzJywgJ2Rpc3BsYXlOYW1lJ11cclxuXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBmYWNlYm9vayB3aWxsIHNlbmQgYmFjayB0aGUgdG9rZW5zIGFuZCBwcm9maWxlXHJcbiAgICAgIGZ1bmN0aW9uIChhY2Nlc3NfdG9rZW46IGFueSwgcmVmcmVzaF90b2tlbjogYW55LCBwcm9maWxlOiBhbnksIGRvbmU6IGFueSkge1xyXG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgLy8gZmluZCB0aGUgdXNlciBpbiB0aGUgZGF0YWJhc2UgYmFzZWQgb24gdGhlaXIgZmFjZWJvb2sgaWRcclxuICAgICAgICAgIHZhciB1c2VyUmVwb3NpdG9yeTogVXNlclJlcG9zaXRvcnkgPSBuZXcgVXNlclJlcG9zaXRvcnkoKTtcclxuICAgICAgICAgIHZhciBxdWVyeSA9IHtcImVtYWlsXCI6IHByb2ZpbGUuZW1haWxzWzBdLnZhbHVlfTtcclxuICAgICAgICAgIHVzZXJSZXBvc2l0b3J5LnJldHJpZXZlKHF1ZXJ5LCBmdW5jdGlvbiAoZXJyLCB1c2VyKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGRvbmUoZXJyLCBudWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBpZiB0aGUgdXNlciBpcyBmb3VuZCwgdGhlbiBsb2cgdGhlbSBpblxyXG4gICAgICAgICAgICBpZiAodXNlci5sZW5ndGggPiAwKSB7XHJcblxyXG4gICAgICAgICAgICAgIHJldHVybiBkb25lKG51bGwsIHVzZXJbMF0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIGlmIHRoZXJlIGlzIG5vIHVzZXIgZm91bmQgd2l0aCB0aGF0IGZhY2Vib29rIGlkLCBjcmVhdGUgdGhlbVxyXG5cclxuICAgICAgICAgICAgICBpZiAocHJvZmlsZS5lbWFpbHNbMF0udmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBuZXdVc2VyOiBhbnkgPSA8VXNlck1vZGVsPnt9O1xyXG5cclxuICAgICAgICAgICAgICAgIG5ld1VzZXIuZmlyc3RfbmFtZSA9IHByb2ZpbGUubmFtZS5naXZlbk5hbWU7XHJcbiAgICAgICAgICAgICAgICBuZXdVc2VyLmxhc3RfbmFtZSA9IHByb2ZpbGUubmFtZS5mYW1pbHlOYW1lO1xyXG4gICAgICAgICAgICAgICAgbmV3VXNlci5lbWFpbCA9IHByb2ZpbGUuZW1haWxzWzBdLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbmV3VXNlci5tb2JpbGVfbnVtYmVyID0gMTIzNDU2Nzg7XHJcbiAgICAgICAgICAgICAgICBuZXdVc2VyLnBhc3N3b3JkID0gJzEyMzQ1Njc4JztcclxuICAgICAgICAgICAgICAgIG5ld1VzZXIuY3VycmVudF90aGVtZSA9ICdjb250YWluZXItZmx1aWQgbGlnaHQtdGhlbWUnO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHNhdmUgb3VyIHVzZXIgdG8gdGhlIGRhdGFiYXNlXHJcbiAgICAgICAgICAgICAgICB2YXIgdXNlclJlcG9zaXRvcnk6IFVzZXJSZXBvc2l0b3J5ID0gbmV3IFVzZXJSZXBvc2l0b3J5KCk7XHJcbiAgICAgICAgICAgICAgICB1c2VyUmVwb3NpdG9yeS5jcmVhdGUobmV3VXNlciwgKGVycjogYW55LCByZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRvbmUoZXJyLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShudWxsLCByZXMpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvbmUobnVsbCwgbnVsbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSkpO1xyXG5cclxuICAgIHBhc3Nwb3J0LnVzZShuZXcgR29vZ2xlUGx1c1Rva2VuU3RyYXRlZ3koe1xyXG4gICAgICAgIGNsaWVudElEOiBnb29nbGVQbHVzQ2xpZW50SWQsXHJcbiAgICAgICAgY2xpZW50U2VjcmV0OiBnb29nbGVQbHVzQ2xpZW50U2VjcmV0SWQsXHJcbiAgICAgICAgLy8gcGFzc1JlcVRvQ2FsbGJhY2s6IHRydWVcclxuXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBHb29nbGUgd2lsbCBzZW5kIGJhY2sgdGhlIHRva2VucyBhbmQgcHJvZmlsZVxyXG4gICAgICBmdW5jdGlvbiAocmVxOiBhbnksIGFjY2Vzc190b2tlbjogYW55LCByZWZyZXNoX3Rva2VuOiBhbnksIHByb2ZpbGU6IGFueSwgZG9uZTogYW55KSB7XHJcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAvLyBmaW5kIHRoZSB1c2VyIGluIHRoZSBkYXRhYmFzZSBiYXNlZCBvbiB0aGVpciBmYWNlYm9vayBpZFxyXG4gICAgICAgICAgdmFyIHVzZXJSZXBvc2l0b3J5OiBVc2VyUmVwb3NpdG9yeSA9IG5ldyBVc2VyUmVwb3NpdG9yeSgpO1xyXG4gICAgICAgICAgdmFyIHF1ZXJ5ID0ge1wiZW1haWxcIjogcHJvZmlsZS5lbWFpbHNbMF0udmFsdWV9O1xyXG4gICAgICAgICAgdXNlclJlcG9zaXRvcnkucmV0cmlldmUocXVlcnksIGZ1bmN0aW9uIChlcnIsIHVzZXIpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gZG9uZShlcnIsIG51bGwpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGlmIHRoZSB1c2VyIGlzIGZvdW5kLCB0aGVuIGxvZyB0aGVtIGluXHJcbiAgICAgICAgICAgIGlmICh1c2VyLmxlbmd0aCA+IDApIHtcclxuXHJcbiAgICAgICAgICAgICAgcmV0dXJuIGRvbmUobnVsbCwgdXNlclswXSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgbm8gdXNlciBmb3VuZCB3aXRoIHRoYXQgZ29vZ2xlIGlkLCBjcmVhdGUgdGhlbVxyXG5cclxuICAgICAgICAgICAgICBpZiAocHJvZmlsZS5lbWFpbHNbMF0udmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBuZXdVc2VyOiBhbnkgPSA8VXNlck1vZGVsPnt9O1xyXG4gICAgICAgICAgICAgICAgdmFyIHJhbmRvbU1vYmlsZU51bWJlciA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMDAwMDAwMDAwMCAtIDEwMDAwMCkgKyAxMDAwMDAwMDAwKTtcclxuICAgICAgICAgICAgICAgIG5ld1VzZXIuZmlyc3RfbmFtZSA9IHByb2ZpbGUubmFtZS5naXZlbk5hbWU7XHJcbiAgICAgICAgICAgICAgICBuZXdVc2VyLmxhc3RfbmFtZSA9IHByb2ZpbGUubmFtZS5mYW1pbHlOYW1lO1xyXG4gICAgICAgICAgICAgICAgLy9uZXdVc2VyLmVtYWlsID0gcHJvZmlsZS5lbWFpbHNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBuZXdVc2VyLmVtYWlsID0gcHJvZmlsZS5lbWFpbHNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICBuZXdVc2VyLm1vYmlsZV9udW1iZXIgPSByYW5kb21Nb2JpbGVOdW1iZXI7XHJcbiAgICAgICAgICAgICAgICBuZXdVc2VyLnBhc3N3b3JkID0gJ1lIOG5ANFNqaiF0WWs0cS0nO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHNhdmUgb3VyIHVzZXIgdG8gdGhlIGRhdGFiYXNlXHJcbiAgICAgICAgICAgICAgICB2YXIgdXNlclJlcG9zaXRvcnk6IFVzZXJSZXBvc2l0b3J5ID0gbmV3IFVzZXJSZXBvc2l0b3J5KCk7XHJcbiAgICAgICAgICAgICAgICB1c2VyUmVwb3NpdG9yeS5jcmVhdGUobmV3VXNlciwgKGVycjogYW55LCByZXM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRvbmUoZXJyLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShudWxsLCByZXMpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvbmUobnVsbCwgbnVsbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgaXNzdWVUb2tlbldpdGhVaWQodXNlcjogYW55LHJvbGU/OnN0cmluZykge1xyXG4gICAgdmFyIGlzc3Vlcjogc3RyaW5nO1xyXG4gICAgaWYgKHVzZXIudXNlcklkKSB7XHJcbiAgICAgIGlzc3VlciA9IHVzZXIudXNlcklkO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaXNzdWVyID0gdXNlci5faWQ7XHJcbiAgICB9XHJcbiAgICB2YXIgY3VyRGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAvLyBleHBpcmVzIGluIDYwIGRheXNcclxuICAgIHZhciBleHBpcmVzID0gbmV3IERhdGUoY3VyRGF0ZS5nZXRUaW1lKCkgKyAoNjAgKiAyNCAqIDYwICogNjAgKiAxMDAwKSk7IC8vKGRheSpociptaW4qc2VjKm1pbGlzZWMpXHJcbiAgICB2YXIgdG9rZW4gPSBqd3QuZW5jb2RlKHtcclxuICAgICAgaXNzOiBpc3N1ZXIsIC8vIGlzc3VlXHJcbiAgICAgIGV4cDogZXhwaXJlcy5nZXRUaW1lKCksIC8vIGV4cGlyYXRpb24gdGltZVxyXG4gICAgICByb2xlOiByb2xlXHJcbiAgICB9LCBDb25zdFZhcmlhYmxlcy5BVVRIRU5USUNBVElPTl9KV1RfS0VZKTtcclxuICAgIHJldHVybiB0b2tlbjtcclxuICB9XHJcblxyXG4gIGlzc3VlVG9rZW5XaXRoVWlkRm9yU2hhcmUodXNlcjphbnkpIHtcclxuICAgIC8vVG9rZW4gd2l0aCBubyBleHBpcnkgZGF0ZVxyXG4gICAgdmFyIGlzc3VlcjpzdHJpbmc7XHJcbiAgICB2YXIgY3VzdG9tS2V5OnN0cmluZyA9IENvbnN0VmFyaWFibGVzLkFVVEhFTlRJQ0FUSU9OX0VOQ09ERURfU0hBUkVfS0VZO1xyXG4gICAgaWYgKHVzZXIudXNlcklkKSB7XHJcbiAgICAgIGlzc3VlciA9IHVzZXIudXNlcklkO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaXNzdWVyID0gdXNlci5faWQ7XHJcbiAgICB9XHJcbiAgICB2YXIgdG9rZW4gPSBqd3QuZW5jb2RlKHtcclxuICAgICAgaXNzOiBpc3N1ZXIsIC8vIGlzc3VlXHJcbiAgICAgIHNoYXJlS2V5OiBjdXN0b21LZXlcclxuICAgIH0sIENvbnN0VmFyaWFibGVzLkFVVEhFTlRJQ0FUSU9OX0pXVF9LRVkpO1xyXG5cclxuICAgIHJldHVybiB0b2tlbjtcclxuICB9XHJcblxyXG4gIHJlcXVpcmVzQXV0aChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkge1xyXG4gICAgcGFzc3BvcnQuYXV0aGVudGljYXRlKCdiZWFyZXInLCB7c2Vzc2lvbjogZmFsc2V9LFxyXG4gICAgICBmdW5jdGlvbiAoZXJyOmFueSwgbXl1c2VyOmFueSwgaXNTaGFyZUFwaTpib29sZWFuKSB7XHJcbiAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5zZW5kKHtcclxuICAgICAgICAgICAgJ2Vycm9yJzoge1xyXG4gICAgICAgICAgICAgIHJlYXNvbjogZXJyLm1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgY29kZTogNDAxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBpZiAocmVxLmhlYWRlcnMuYXV0aG9yaXphdGlvbi5zcGxpdCgnICcpWzBdLnRvTG93ZXJDYXNlKCkgIT09ICdiZWFyZXInIHx8IHJlcS5oZWFkZXJzLmF1dGhvcml6YXRpb24uc3BsaXQoJyAnKS5sZW5ndGggIT09IDIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5zZW5kKHtcclxuICAgICAgICAgICAgICAnZXJyb3InOiB7XHJcbiAgICAgICAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9JU19CRUFSRVIsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfSVNfQkVBUkVSLFxyXG4gICAgICAgICAgICAgICAgY29kZTogNDAxXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICghbXl1c2VyKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5zZW5kKHtcclxuICAgICAgICAgICAgICAgICdlcnJvcic6IHtcclxuICAgICAgICAgICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfSU5WQUxJRF9UT0tFTl8yLFxyXG4gICAgICAgICAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfSU5WQUxJRF9UT0tFTl8yLFxyXG4gICAgICAgICAgICAgICAgICBjb2RlOiA0MDFcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICByZXEudXNlciA9IG15dXNlcjtcclxuICAgICAgICAgICAgICAoaXNTaGFyZUFwaSkgPyByZXEuaXNTaGFyZUFwaSA9IHRydWUgOiByZXEuaXNTaGFyZUFwaSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSkocmVxLCByZXMsIG5leHQpO1xyXG4gIH1cclxuXHJcbiAgZmFjZWJvb2tBdXRoKHJlcTogYW55LCByZXM6IGFueSwgbmV4dDogYW55KSB7XHJcbiAgICBwYXNzcG9ydC5hdXRoZW50aWNhdGUoJ2ZhY2Vib29rLXRva2VuJywge3Njb3BlOiBbJ2VtYWlsJ119LFxyXG4gICAgICAoZXJyOiBhbnksIHVzZXI6IGFueSwgaW5mbzogYW55KSA9PiB7XHJcblxyXG4gICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgIG5leHQoZXJyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoaW5mbykge1xyXG4gICAgICAgICAgbmV4dCh7XHJcbiAgICAgICAgICAgIHJlYXNvbjogTWVzc2FnZXMuTVNHX0VSUk9SX0ZBQ0VCT09LX0FVVEgsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9SU05fTk9UX0FMTE9XLFxyXG4gICAgICAgICAgICBjb2RlOiA0MDFcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh1c2VyKSB7XHJcbiAgICAgICAgICByZXEudXNlciA9IHsnZW1haWwnOiB1c2VyLmVtYWlsLCAncGFzc3dvcmQnOiB1c2VyLnBhc3N3b3JkfTtcclxuICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICBuZXh0KHtcclxuICAgICAgICAgICAgcmVhc29uOiBNZXNzYWdlcy5NU0dfRVJST1JfUlNOX0lOVkFMSURfQ1JFREVOVElBTFMsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6IE1lc3NhZ2VzLk1TR19FUlJPUl9GQUNFQk9PS19BVVRILFxyXG4gICAgICAgICAgICBjb2RlOiA0MDFcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH0pKHJlcSwgcmVzLCBuZXh0KTtcclxuICB9XHJcblxyXG4gIGdvb2dsZUF1dGgocmVxOiBhbnksIHJlczogYW55LCBuZXh0OiBhbnkpIHtcclxuICAgIHZhciByZXF1ZXN0ID0gcmVxdWlyZSgncmVxdWVzdCcpO1xyXG4gICAgcmVxdWVzdCgnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YzL3Rva2VuaW5mbz9pZF90b2tlbj0nICsgcmVxLmJvZHkuZ29vZ2xlVG9rZW4sIChlcnJvcjogYW55LCByZXNwb25zZTogYW55LCBib2R5OiBhbnkpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgaWYgKGVycm9yLmNvZGUgPT0gXCJFVElNRURPVVRcIikge1xyXG4gICAgICAgICAgbmV4dCh7XHJcbiAgICAgICAgICAgIHJlYXNvbjogTWVzc2FnZXMuTVNHX0VSUk9SX1JTTl9XSElMRV9DT05UQUNUSU5HLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfQ09OTkVDVElPTl9USU1FT1VULFxyXG4gICAgICAgICAgICBjb2RlOiA0MDFcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSBpZiAocmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAoIWVycm9yICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKSB7XHJcbiAgICAgICAgICB2YXIgZ29vbGVQbHVzT2JqZWN0ID0gSlNPTi5wYXJzZShib2R5KTtcclxuICAgICAgICAgIHZhciB1c2VyUmVwb3NpdG9yeTogVXNlclJlcG9zaXRvcnkgPSBuZXcgVXNlclJlcG9zaXRvcnkoKTtcclxuICAgICAgICAgIHZhciBxdWVyeSA9IHtcImVtYWlsXCI6IGdvb2xlUGx1c09iamVjdC5lbWFpbH07XHJcbiAgICAgICAgICB1c2VyUmVwb3NpdG9yeS5yZXRyaWV2ZShxdWVyeSwgKGVyciwgdXNlcikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgbmV4dChlcnIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGlmIHRoZSB1c2VyIGlzIGZvdW5kLCB0aGVuIGxvZyB0aGVtIGluXHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHVzZXIubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgIGlmICh1c2VyWzBdLnNvY2lhbF9wcm9maWxlX3BpY3R1cmUpIHtcclxuICAgICAgICAgICAgICAgIHJlcS51c2VyID0geydlbWFpbCc6IHVzZXJbMF0uZW1haWwsICdwYXNzd29yZCc6IHVzZXJbMF0ucGFzc3dvcmR9O1xyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBxdWVyeSA9IHtcImVtYWlsXCI6IHVzZXJbMF0uZW1haWx9O1xyXG4gICAgICAgICAgICAgICAgdmFyIHVwZGF0ZURhdGEgPSB7XCJzb2NpYWxfcHJvZmlsZV9waWN0dXJlXCI6IGdvb2xlUGx1c09iamVjdC5waWN0dXJlfTtcclxuICAgICAgICAgICAgICAgIHZhciB1c2VyUmVwb3NpdG9yeTogVXNlclJlcG9zaXRvcnkgPSBuZXcgVXNlclJlcG9zaXRvcnkoKTtcclxuICAgICAgICAgICAgICAgIHVzZXJSZXBvc2l0b3J5LmZpbmRPbmVBbmRVcGRhdGUocXVlcnksIHVwZGF0ZURhdGEsIHtuZXc6IHRydWV9LCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX0VNQUlMX0FDVElWRV9OT1cpLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXEudXNlciA9IHsnZW1haWwnOiB1c2VyWzBdLmVtYWlsLCAncGFzc3dvcmQnOiB1c2VyWzBdLnBhc3N3b3JkfTtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICh1c2VyLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgIHZhciBuZXdVc2VyOiBhbnkgPSA8VXNlck1vZGVsPnt9O1xyXG4gICAgICAgICAgICAgIC8vdmFyIHJhbmRvbU1vYmlsZU51bWJlciA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMDAwMDAwMDAwMCAtIDEwMDAwMCkgKyAxMDAwMDAwMDAwKTtcclxuICAgICAgICAgICAgICB2YXIgcmFuZG9tTW9iaWxlTnVtYmVyID0gTWF0aC5mbG9vcigoTWF0aC5yYW5kb20oKSAqIDk5OTk5KSArIDEwMDAwMCk7XHJcbiAgICAgICAgICAgICAgbmV3VXNlci5maXJzdF9uYW1lID0gZ29vbGVQbHVzT2JqZWN0LmdpdmVuX25hbWU7XHJcbiAgICAgICAgICAgICAgbmV3VXNlci5sYXN0X25hbWUgPSBnb29sZVBsdXNPYmplY3QuZmFtaWx5X25hbWU7XHJcbiAgICAgICAgICAgICAgbmV3VXNlci5lbWFpbCA9IGdvb2xlUGx1c09iamVjdC5lbWFpbDtcclxuICAgICAgICAgICAgICBuZXdVc2VyLm1vYmlsZV9udW1iZXIgPSByYW5kb21Nb2JpbGVOdW1iZXI7XHJcbiAgICAgICAgICAgICAgbmV3VXNlci5wYXNzd29yZCA9ICdZSDhuQDRTamohdFlrNHEtJztcclxuICAgICAgICAgICAgICBuZXdVc2VyLmN1cnJlbnRfdGhlbWUgPSAnY29udGFpbmVyLWZsdWlkIGxpZ2h0LXRoZW1lJztcclxuICAgICAgICAgICAgICBuZXdVc2VyLnNvY2lhbF9wcm9maWxlX3BpY3R1cmUgPSBnb29sZVBsdXNPYmplY3QucGljdHVyZTtcclxuICAgICAgICAgICAgICBuZXdVc2VyLmlzQWN0aXZhdGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgdmFyIHVzZXJSZXBvc2l0b3J5OiBVc2VyUmVwb3NpdG9yeSA9IG5ldyBVc2VyUmVwb3NpdG9yeSgpO1xyXG4gICAgICAgICAgICAgIHVzZXJSZXBvc2l0b3J5LmNyZWF0ZShuZXdVc2VyLCAoZXJyOiBhbnksIHJlczogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgIG5leHQoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHJlcykge1xyXG4gICAgICAgICAgICAgICAgICByZXEudXNlciA9IHsnZW1haWwnOiByZXMuZW1haWwsICdwYXNzd29yZCc6IHJlcy5wYXNzd29yZH07XHJcbiAgICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHNlY3VyZUFwaUNoZWNrKHJlcTphbnksIHJlczphbnksIG5leHQ6YW55KSB7XHJcbiAgICBpZiAocmVxLmlzU2hhcmVBcGkpIHtcclxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5zZW5kKHtcclxuICAgICAgICAnZXJyb3InOiB7XHJcbiAgICAgICAgICByZWFzb246IE1lc3NhZ2VzLk1TR19FUlJPUl9BUElfQ0hFQ0ssXHJcbiAgICAgICAgICBtZXNzYWdlOiBNZXNzYWdlcy5NU0dfRVJST1JfQVBJX0NIRUNLLFxyXG4gICAgICAgICAgY29kZTogNDAxXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbmV4dCgpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5PYmplY3Quc2VhbChBdXRoSW50ZXJjZXB0b3IpO1xyXG5leHBvcnQgPSBBdXRoSW50ZXJjZXB0b3I7XHJcbiJdfQ==
