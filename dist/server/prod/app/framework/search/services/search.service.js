"use strict";
var CandidateRepository = require("../../dataaccess/repository/candidate.repository");
var ProjectAsset = require("../../shared/projectasset");
var RecruiterRepository = require("../../dataaccess/repository/recruiter.repository");
var JobProfileService = require("../../services/jobprofile.service");
var sharedconstants_1 = require("../../shared/sharedconstants");
var profile_comparison_data_model_1 = require("../../dataaccess/model/profile-comparison-data.model");
var capability_matrix_model_1 = require("../../dataaccess/model/capability-matrix.model");
var profile_comparison_model_1 = require("../../dataaccess/model/profile-comparison.model");
var profile_comparison_job_model_1 = require("../../dataaccess/model/profile-comparison-job.model");
var mongoose = require("mongoose");
var candidatedetailswithjobmatching_1 = require("../../dataaccess/model/candidatedetailswithjobmatching");
var utility_function_1 = require("../../uitility/utility-function");
var MatchViewModel = require("../../dataaccess/model/match-view.model");
var Match = require("../../dataaccess/model/match-enum");
var IndustryRepository = require("../../dataaccess/repository/industry.repository");
var usestracking = require('uses-tracking');
var SearchService = (function () {
    function SearchService() {
        this.APP_NAME = ProjectAsset.APP_NAME;
        this.candidateRepository = new CandidateRepository();
        this.recruiterRepository = new RecruiterRepository();
        this.industryRepository = new IndustryRepository();
        var obj = new usestracking.MyController();
        this.usesTrackingController = obj._controller;
    }
    SearchService.prototype.getMatchingCandidates = function (jobProfile, callback) {
        var _this = this;
        console.time('getMatching Candidate');
        var data;
        var isFound = false;
        var industries = [];
        var isReleventIndustriesFound = false;
        if (jobProfile.interestedIndustries && jobProfile.interestedIndustries.length > 0) {
            for (var _i = 0, _a = jobProfile.interestedIndustries; _i < _a.length; _i++) {
                var name_1 = _a[_i];
                if (name_1 === 'None') {
                    isFound = true;
                }
            }
            if (jobProfile.releventIndustries && jobProfile.releventIndustries.length) {
                isReleventIndustriesFound = true;
            }
            if (isFound) {
                if (isReleventIndustriesFound) {
                    industries = jobProfile.releventIndustries;
                    industries.push(jobProfile.industry.name);
                    data = {
                        'industry.name': { $in: industries },
                        $or: [
                            { 'professionalDetails.relocate': 'Yes' },
                            { 'location.city': jobProfile.location.city }
                        ],
                        'proficiencies': { $in: jobProfile.proficiencies },
                        'isVisible': true,
                    };
                }
                else {
                    data = {
                        'industry.name': jobProfile.industry.name,
                        $or: [
                            { 'professionalDetails.relocate': 'Yes' },
                            { 'location.city': jobProfile.location.city }
                        ],
                        'proficiencies': { $in: jobProfile.proficiencies },
                        'isVisible': true,
                    };
                }
            }
            else {
                if (isReleventIndustriesFound) {
                    industries = jobProfile.releventIndustries;
                    industries.push(jobProfile.industry.name);
                    data = {
                        'industry.name': { $in: industries },
                        $or: [
                            { 'professionalDetails.relocate': 'Yes' },
                            { 'location.city': jobProfile.location.city }
                        ],
                        'proficiencies': { $in: jobProfile.proficiencies },
                        'interestedIndustries': { $in: jobProfile.interestedIndustries },
                        'isVisible': true,
                    };
                }
                else {
                    data = {
                        'industry.name': jobProfile.industry.name,
                        $or: [
                            { 'professionalDetails.relocate': 'Yes' },
                            { 'location.city': jobProfile.location.city }
                        ],
                        'proficiencies': { $in: jobProfile.proficiencies },
                        'interestedIndustries': { $in: jobProfile.interestedIndustries },
                        'isVisible': true,
                    };
                }
            }
        }
        else {
            data = {
                'isVisible': true,
                'industry.name': jobProfile.industry.name,
                'proficiencies': { $in: jobProfile.proficiencies },
                $or: [
                    { 'professionalDetails.relocate': 'Yes' },
                    { 'location.city': jobProfile.location.city }
                ]
            };
        }
        var included_fields = {
            'industry.roles.capabilities.complexities.scenarios.code': 1,
            'industry.roles.capabilities.complexities.scenarios.isChecked': 1,
            'industry.roles.default_complexities.complexities.scenarios.code': 1,
            'industry.roles.default_complexities.complexities.scenarios.isChecked': 1,
            'userId': 1,
            'proficiencies': 1,
            'location': 1,
            'interestedIndustries': 1,
            'professionalDetails': 1,
            'capability_matrix': 1
        };
        this.candidateRepository.retrieveWithLean(data, included_fields, function (err, res) {
            if (err) {
                callback(err, null);
            }
            else {
                _this.candidateRepository.getCandidateQCard(res, jobProfile, undefined, callback);
            }
        });
    };
    SearchService.prototype.getMatchingJobProfile = function (candidate, callback) {
        var _this = this;
        var currentDate = new Date();
        var data = {
            'postedJobs.industry.name': candidate.industry.name,
            'postedJobs.proficiencies': { $in: candidate.proficiencies },
            'postedJobs.expiringDate': { $gte: currentDate }
        };
        var excluded_fields = {
            'postedJobs.industry.roles': 0,
        };
        this.recruiterRepository.retrieveWithLean(data, excluded_fields, function (err, res) {
            if (err) {
                callback(err, null);
            }
            else {
                _this.recruiterRepository.getJobProfileQCard(res, candidate, undefined, 'none', callback);
            }
        });
    };
    SearchService.prototype.getMatchingResult = function (candidateId, jobId, isCandidate, callback) {
        var _this = this;
        var uses_data = {
            candidateId: candidateId,
            jobProfileId: jobId,
            timestamp: new Date(),
            action: sharedconstants_1.Actions.DEFAULT_VALUE
        };
        if (isCandidate) {
            uses_data.action = sharedconstants_1.Actions.VIEWED_JOB_PROFILE_BY_CANDIDATE;
        }
        else {
            uses_data.action = sharedconstants_1.Actions.VIEWED_FULL_PROFILE_BY_RECRUITER;
        }
        this.usesTrackingController.create(uses_data);
        this.candidateRepository.findByIdwithExclude(candidateId, { 'industry': 0 }, function (err, candidateRes) {
            if (err) {
                callback(err, null);
            }
            else {
                if (candidateRes) {
                    var data = {
                        'postedJob': jobId
                    };
                    var jobProfileService = new JobProfileService();
                    jobProfileService.retrieve(data, function (errInJob, resOfRecruiter) {
                        if (errInJob) {
                            callback(errInJob, null);
                        }
                        else {
                            _this.getResult(candidateRes, resOfRecruiter.postedJobs[0], isCandidate, callback);
                        }
                    });
                }
            }
        });
    };
    SearchService.prototype.compareTwoOptions = function (first, second) {
        if (first < second) {
            return 'below';
        }
        else if (first > second) {
            return 'above';
        }
        else {
            return 'exact';
        }
    };
    SearchService.prototype.getEductionSwitchCase = function (education) {
        switch (education) {
            case 'Under Graduate':
                return 1;
            case 'Graduate':
                return 2;
            case 'Post Graduate':
                return 3;
        }
        return -1;
    };
    SearchService.prototype.getPeriodSwitchCase = function (period) {
        switch (period) {
            case 'Immediate':
                return 1;
            case 'Within 1 months':
                return 2;
            case '1-2 Months':
                return 3;
            case '2-3 Months':
                return 4;
            case 'Beyond 3 months':
                return 5;
        }
        return -1;
    };
    SearchService.prototype.getResult = function (candidate, job, isCandidate, callback) {
        var _this = this;
        this.industryRepository.retrieve({ 'name': job.industry.name }, function (err, industries) {
            if (err) {
                callback(err, null);
            }
            else {
                var newCandidate = _this.getCompareData(candidate, job, isCandidate, industries);
                callback(null, newCandidate);
            }
        });
    };
    SearchService.prototype.getCompareData = function (candidate, job, isCandidate, industries) {
        var newCandidate = this.buildCandidateModel(candidate);
        var jobMinExperience = Number(job.experienceMinValue);
        var jobMaxExperience = Number(job.experienceMaxValue);
        var jobMinSalary = Number(job.salaryMinValue);
        var jobMaxSalary = Number(job.salaryMaxValue);
        var candiExperience = newCandidate.professionalDetails.experience.split(' ');
        var canSalary = newCandidate.professionalDetails.currentSalary.split(' ');
        if ((jobMaxExperience >= Number(candiExperience[0])) && (jobMinExperience <= Number(candiExperience[0]))) {
            newCandidate.experienceMatch = 'exact';
        }
        else {
            newCandidate.experienceMatch = 'missing';
        }
        if ((jobMaxSalary >= Number(canSalary[0])) && (jobMinSalary <= Number(canSalary[0]))) {
            newCandidate.salaryMatch = 'exact';
        }
        else {
            newCandidate.salaryMatch = 'missing';
        }
        var canEducation = this.getEductionSwitchCase(newCandidate.professionalDetails.education);
        var jobEducation = this.getEductionSwitchCase(job.education);
        newCandidate.educationMatch = this.compareTwoOptions(canEducation, jobEducation);
        newCandidate.releaseMatch = this.compareTwoOptions(this.getPeriodSwitchCase(newCandidate.professionalDetails.noticePeriod), this.getPeriodSwitchCase(job.joiningPeriod));
        newCandidate.interestedIndustryMatch = new Array(0);
        for (var _i = 0, _a = job.interestedIndustries; _i < _a.length; _i++) {
            var industry = _a[_i];
            if (newCandidate.interestedIndustries.indexOf(industry) !== -1) {
                newCandidate.interestedIndustryMatch.push(industry);
            }
        }
        newCandidate.proficienciesMatch = new Array(0);
        for (var _b = 0, _c = job.proficiencies; _b < _c.length; _b++) {
            var proficiency = _c[_b];
            if (newCandidate.proficiencies.indexOf(proficiency) !== -1) {
                newCandidate.proficienciesMatch.push(proficiency);
            }
        }
        newCandidate.proficienciesUnMatch = new Array(0);
        for (var _d = 0, _e = job.proficiencies; _d < _e.length; _d++) {
            var proficiency = _e[_d];
            if (newCandidate.proficienciesMatch.indexOf(proficiency) == -1) {
                newCandidate.proficienciesUnMatch.push(proficiency);
            }
        }
        newCandidate = this.buildMultiCompareCapabilityView(job, newCandidate, industries, isCandidate);
        newCandidate = this.buildCompareView(job, newCandidate, industries, isCandidate);
        newCandidate = this.getAdditionalCapabilities(job, newCandidate, industries);
        return newCandidate;
    };
    SearchService.prototype.buildCandidateModel = function (candidate) {
        var profileComparisonResult = new profile_comparison_data_model_1.ProfileComparisonDataModel();
        profileComparisonResult._id = candidate._id;
        profileComparisonResult.industryName = candidate.industry.name;
        profileComparisonResult.aboutMyself = candidate.aboutMyself;
        profileComparisonResult.academics = candidate.academics;
        profileComparisonResult.professionalDetails = candidate.professionalDetails;
        profileComparisonResult.awards = candidate.awards;
        profileComparisonResult.capability_matrix = candidate.capability_matrix;
        profileComparisonResult.experienceMatch = '';
        profileComparisonResult.certifications = candidate.certifications;
        profileComparisonResult.employmentHistory = candidate.employmentHistory;
        profileComparisonResult.interestedIndustries = candidate.interestedIndustries;
        profileComparisonResult.isSubmitted = candidate.isSubmitted;
        profileComparisonResult.isVisible = candidate.isVisible;
        profileComparisonResult.location = candidate.location;
        profileComparisonResult.job_list = candidate.job_list;
        profileComparisonResult.educationMatch = '';
        profileComparisonResult.proficiencies = candidate.proficiencies;
        profileComparisonResult.profileComparisonHeader = candidate.userId;
        profileComparisonResult.roleType = candidate.roleType;
        profileComparisonResult.salaryMatch = '';
        profileComparisonResult.secondaryCapability = candidate.secondaryCapability;
        profileComparisonResult.lockedOn = candidate.lockedOn;
        profileComparisonResult.match_map = {};
        profileComparisonResult.capabilityMap = {};
        profileComparisonResult.complexity_note_matrix = candidate.complexity_note_matrix;
        return profileComparisonResult;
    };
    SearchService.prototype.buildMultiCompareCapabilityView = function (job, newCandidate, industries, isCandidate) {
        var capabilityPercentage = new Array(0);
        var capabilityKeys = new Array(0);
        var correctQestionCountForAvgPercentage = 0;
        var qestionCountForAvgPercentsge = 0;
        for (var cap in job.capability_matrix) {
            var capabilityKey = cap.split('_');
            if (capabilityKeys.indexOf(capabilityKey[0]) == -1) {
                capabilityKeys.push(capabilityKey[0]);
            }
        }
        for (var _i = 0, capabilityKeys_1 = capabilityKeys; _i < capabilityKeys_1.length; _i++) {
            var _cap = capabilityKeys_1[_i];
            var isCapabilityFound = false;
            var capabilityQuestionCount = 0;
            var matchCount = 0;
            for (var cap in job.capability_matrix) {
                if (_cap == cap.split('_')[0]) {
                    if (job.capability_matrix[cap] == -1 || job.capability_matrix[cap] == 0 || job.capability_matrix[cap] == undefined) {
                    }
                    else if (job.capability_matrix[cap] == newCandidate.capability_matrix[cap]) {
                        matchCount++;
                        capabilityQuestionCount++;
                        correctQestionCountForAvgPercentage++;
                        qestionCountForAvgPercentsge++;
                    }
                    else if (job.capability_matrix[cap] == (Number(newCandidate.capability_matrix[cap]) - sharedconstants_1.ConstVariables.DIFFERENCE_IN_COMPLEXITY_SCENARIO)) {
                        matchCount++;
                        capabilityQuestionCount++;
                        correctQestionCountForAvgPercentage++;
                        qestionCountForAvgPercentsge++;
                    }
                    else if (job.capability_matrix[cap] == (Number(newCandidate.capability_matrix[cap]) + sharedconstants_1.ConstVariables.DIFFERENCE_IN_COMPLEXITY_SCENARIO)) {
                        capabilityQuestionCount++;
                        qestionCountForAvgPercentsge++;
                    }
                    else {
                        capabilityQuestionCount++;
                        qestionCountForAvgPercentsge++;
                    }
                }
            }
            var capabilityModel = new capability_matrix_model_1.CapabilityMatrixModel();
            var capName;
            var complexity;
            for (var _a = 0, _b = industries[0].roles; _a < _b.length; _a++) {
                var role = _b[_a];
                for (var _c = 0, _d = role.capabilities; _c < _d.length; _c++) {
                    var capability = _d[_c];
                    if (_cap == capability.code) {
                        isCapabilityFound = true;
                        capName = capability.name;
                        complexity = capability.complexities;
                        break;
                    }
                }
                for (var _e = 0, _f = role.default_complexities; _e < _f.length; _e++) {
                    var capability = _f[_e];
                    if (_cap == capability.code) {
                        isCapabilityFound = true;
                        capName = capability.name;
                        complexity = capability.complexities;
                        break;
                    }
                }
            }
            var percentage = 0;
            if (capabilityQuestionCount) {
                percentage = (matchCount / capabilityQuestionCount) * 100;
            }
            capabilityModel.capabilityName = capName;
            capabilityModel.capabilityPercentage = percentage;
            capabilityModel.complexities = complexity;
            capabilityPercentage.push(percentage);
            if (isCapabilityFound) {
                newCandidate['capabilityMap'][_cap] = capabilityModel;
            }
        }
        var avgPercentage = 0;
        if (qestionCountForAvgPercentsge) {
            avgPercentage = ((correctQestionCountForAvgPercentage / qestionCountForAvgPercentsge) * 100);
        }
        newCandidate.matchingPercentage = avgPercentage;
        return newCandidate;
    };
    SearchService.prototype.getAdditionalCapabilities = function (job, newCandidate, industries) {
        newCandidate.additionalCapabilites = new Array(0);
        for (var cap in newCandidate.capability_matrix) {
            var isFound = false;
            for (var jobCap in job.capability_matrix) {
                if (cap.substr(0, cap.indexOf('_')) === jobCap.substr(0, jobCap.indexOf('_'))) {
                    isFound = true;
                    break;
                }
            }
            if (!isFound) {
                for (var _i = 0, _a = industries[0].roles; _i < _a.length; _i++) {
                    var role = _a[_i];
                    for (var _b = 0, _c = role.capabilities; _b < _c.length; _b++) {
                        var capability = _c[_b];
                        for (var _d = 0, _e = capability.complexities; _d < _e.length; _d++) {
                            var complexity = _e[_d];
                            var custom_code = capability.code + '_' + complexity.code;
                            if (custom_code === cap) {
                                if (newCandidate.additionalCapabilites.indexOf(capability.name) == -1) {
                                    newCandidate.additionalCapabilites.push(capability.name);
                                }
                            }
                        }
                    }
                }
            }
        }
        return newCandidate;
    };
    SearchService.prototype.buildCompareView = function (job, newCandidate, industries, isCandidate) {
        var _loop_1 = function (cap) {
            var match_view = new MatchViewModel();
            if (job.capability_matrix[cap] == -1 || job.capability_matrix[cap] == 0 || job.capability_matrix[cap] == undefined || newCandidate.capability_matrix[cap] == undefined ||
                newCandidate.capability_matrix[cap] == 0 || newCandidate.capability_matrix[cap] == -1) {
                match_view.match = Match.MissMatch;
            }
            else if (job.capability_matrix[cap] == newCandidate.capability_matrix[cap]) {
                match_view.match = Match.Exact;
            }
            else if (job.capability_matrix[cap] == (Number(newCandidate.capability_matrix[cap]) - sharedconstants_1.ConstVariables.DIFFERENCE_IN_COMPLEXITY_SCENARIO)) {
                match_view.match = Match.Above;
            }
            else if (job.capability_matrix[cap] == (Number(newCandidate.capability_matrix[cap]) + sharedconstants_1.ConstVariables.DIFFERENCE_IN_COMPLEXITY_SCENARIO)) {
                match_view.match = Match.Below;
            }
            else {
                match_view.match = Match.MissMatch;
            }
            var isFound = false;
            for (var _i = 0, _a = industries[0].roles; _i < _a.length; _i++) {
                var role = _a[_i];
                for (var _b = 0, _c = role.capabilities; _b < _c.length; _b++) {
                    var capability = _c[_b];
                    for (var _d = 0, _e = capability.complexities; _d < _e.length; _d++) {
                        var complexity = _e[_d];
                        var custom_code = capability.code + '_' + complexity.code;
                        if (custom_code === cap) {
                            isFound = true;
                            var scenarios = complexity.scenarios.filter(function (sce) {
                                sce.code = sce.code.replace('.', '_');
                                sce.code = sce.code.replace('.', '_');
                                sce.code = sce.code.substr(sce.code.lastIndexOf('_') + 1);
                                if (sce.code == newCandidate.capability_matrix[cap]) {
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            });
                            var job_scenarios = complexity.scenarios.filter(function (sce) {
                                sce.code = sce.code.replace('.', '_');
                                sce.code = sce.code.replace('.', '_');
                                sce.code = sce.code.substr(sce.code.lastIndexOf('_') + 1);
                                if (sce.code == job.capability_matrix[cap]) {
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            });
                            match_view.capability_name = capability.name;
                            match_view.complexity_name = complexity.name;
                            if (newCandidate.complexity_note_matrix && newCandidate.complexity_note_matrix[cap]) {
                                match_view.complexityNote = newCandidate.complexity_note_matrix[cap];
                            }
                            if (job_scenarios[0]) {
                                match_view.job_scenario_name = job_scenarios[0].name;
                            }
                            if (scenarios[0]) {
                                match_view.candidate_scenario_name = scenarios[0].name;
                            }
                            match_view.scenario_name = match_view.job_scenario_name;
                            break;
                        }
                    }
                    if (isFound) {
                        break;
                    }
                }
                for (var _f = 0, _g = role.default_complexities; _f < _g.length; _f++) {
                    var capability = _g[_f];
                    for (var _h = 0, _j = capability.complexities; _h < _j.length; _h++) {
                        var complexity = _j[_h];
                        var custom_code = capability.code + '_' + complexity.code;
                        if (custom_code === cap) {
                            isFound = true;
                            var scenarios = complexity.scenarios.filter(function (sce) {
                                sce.code = sce.code.replace('.', '_');
                                sce.code = sce.code.replace('.', '_');
                                sce.code = sce.code.substr(sce.code.lastIndexOf('_') + 1);
                                if (sce.code == newCandidate.capability_matrix[cap]) {
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            });
                            var job_scenarios = complexity.scenarios.filter(function (sce) {
                                sce.code = sce.code.replace('.', '_');
                                sce.code = sce.code.replace('.', '_');
                                sce.code = sce.code.substr(sce.code.lastIndexOf('_') + 1);
                                if (sce.code == job.capability_matrix[cap]) {
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            });
                            match_view.capability_name = capability.name;
                            match_view.complexity_name = complexity.name;
                            if (newCandidate.complexity_note_matrix && newCandidate.complexity_note_matrix[cap]) {
                                match_view.complexityNote = newCandidate.complexity_note_matrix[cap];
                            }
                            if (job_scenarios[0]) {
                                match_view.job_scenario_name = job_scenarios[0].name;
                            }
                            if (scenarios[0]) {
                                match_view.candidate_scenario_name = scenarios[0].name;
                            }
                            match_view.scenario_name = match_view.job_scenario_name;
                            break;
                        }
                    }
                    if (isFound) {
                        break;
                    }
                }
                if (isFound) {
                    break;
                }
            }
            if (match_view.capability_name != undefined) {
                newCandidate['match_map'][cap] = match_view;
            }
        };
        for (var cap in job.capability_matrix) {
            _loop_1(cap);
        }
        return newCandidate;
    };
    SearchService.prototype.getMultiCompareResult = function (candidate, jobId, recruiterId, isCandidate, callback) {
        var _this = this;
        this.candidateRepository.retrieveByMultiIdsAndPopulate(candidate, {}, function (err, candidateRes) {
            if (err) {
                callback(err, null);
            }
            else {
                if (candidateRes.length > 0) {
                    var data = {
                        'postedJob': jobId
                    };
                    var jobProfileService = new JobProfileService();
                    jobProfileService.retrieve(data, function (errInJob, resOfRecruiter) {
                        if (errInJob) {
                            callback(errInJob, null);
                        }
                        else {
                            var jobName = resOfRecruiter.postedJobs[0].industry.name;
                            var job = resOfRecruiter.postedJobs[0];
                            _this.industryRepository.retrieve({ 'name': jobName }, function (err, industries) {
                                if (err) {
                                    callback(err, null);
                                }
                                else {
                                    var compareResult = new Array(0);
                                    for (var _i = 0, candidateRes_1 = candidateRes; _i < candidateRes_1.length; _i++) {
                                        var candidate_1 = candidateRes_1[_i];
                                        var newCandidate = _this.getCompareData(candidate_1, job, isCandidate, industries);
                                        newCandidate = _this.getListStatusOfCandidate(newCandidate, job);
                                        newCandidate = _this.sortCandidateSkills(newCandidate);
                                        compareResult.push(newCandidate);
                                    }
                                    var profileComparisonModel = new profile_comparison_model_1.ProfileComparisonModel();
                                    profileComparisonModel.profileComparisonData = compareResult;
                                    var jobDetails = _this.getJobDetailsForComparison(job);
                                    profileComparisonModel.profileComparisonJobData = jobDetails;
                                    callback(null, profileComparisonModel);
                                }
                            });
                        }
                    });
                }
                else {
                    callback(null, 'No Candidate Profile Result Found');
                }
            }
        });
    };
    SearchService.prototype.getJobDetailsForComparison = function (job) {
        var profileComparisonJobModel = new profile_comparison_job_model_1.ProfileComparisonJobModel();
        profileComparisonJobModel.city = job.location.city;
        profileComparisonJobModel.country = job.location.country;
        profileComparisonJobModel.state = job.location.state;
        profileComparisonJobModel.education = job.education;
        profileComparisonJobModel.experienceMaxValue = job.experienceMaxValue;
        profileComparisonJobModel.experienceMinValue = job.experienceMinValue;
        profileComparisonJobModel.industryName = job.industry.name;
        profileComparisonJobModel.jobTitle = job.jobTitle;
        profileComparisonJobModel.joiningPeriod = job.joiningPeriod;
        profileComparisonJobModel.salaryMaxValue = job.salaryMaxValue;
        profileComparisonJobModel.salaryMinValue = job.salaryMinValue;
        profileComparisonJobModel.proficiencies = job.proficiencies;
        profileComparisonJobModel.interestedIndustries = job.interestedIndustries;
        return profileComparisonJobModel;
    };
    SearchService.prototype.getListStatusOfCandidate = function (newCandidate, jobProfile) {
        var candidateListStatus = new Array(0);
        for (var _i = 0, _a = jobProfile.candidate_list; _i < _a.length; _i++) {
            var list = _a[_i];
            for (var _b = 0, _c = list.ids; _b < _c.length; _b++) {
                var id = _c[_b];
                if (newCandidate._id == id) {
                    candidateListStatus.push(list.name);
                }
            }
        }
        if (candidateListStatus.length == 0) {
            candidateListStatus.push('matchedList');
        }
        newCandidate.candidateListStatus = candidateListStatus;
        return newCandidate;
    };
    SearchService.prototype.sortCandidateSkills = function (newCandidate) {
        var skillStatusData = new Array(0);
        for (var _i = 0, _a = newCandidate.proficienciesMatch; _i < _a.length; _i++) {
            var value = _a[_i];
            var skillStatus = new profile_comparison_data_model_1.SkillStatus();
            skillStatus.name = value;
            skillStatus.status = 'Match';
            skillStatusData.push(skillStatus);
        }
        for (var _b = 0, _c = newCandidate.proficienciesUnMatch; _b < _c.length; _b++) {
            var value = _c[_b];
            var skillStatus = new profile_comparison_data_model_1.SkillStatus();
            skillStatus.name = value;
            skillStatus.status = 'UnMatch';
            skillStatusData.push(skillStatus);
        }
        newCandidate.candidateSkillStatus = skillStatusData;
        return newCandidate;
    };
    SearchService.prototype.getCandidateVisibilityAgainstRecruiter = function (candidateDetails, jobProfiles) {
        var isGotIt = true;
        var _canDetailsWithJobMatching = new candidatedetailswithjobmatching_1.CandidateDetailsWithJobMatching();
        for (var _i = 0, jobProfiles_1 = jobProfiles; _i < jobProfiles_1.length; _i++) {
            var job = jobProfiles_1[_i];
            for (var _a = 0, _b = job.candidate_list; _a < _b.length; _a++) {
                var item = _b[_a];
                if (item.name === 'cartListed') {
                    if (item.ids.indexOf(new mongoose.Types.ObjectId(candidateDetails._id).toString()) !== -1) {
                        isGotIt = false;
                        break;
                    }
                }
            }
            if (!isGotIt) {
                break;
            }
        }
        if (isGotIt) {
            candidateDetails.userId.mobile_number = utility_function_1.UtilityFunction.mobileNumberHider(candidateDetails.userId.mobile_number);
            candidateDetails.userId.email = utility_function_1.UtilityFunction.emailValueHider(candidateDetails.userId.email);
            candidateDetails.academics = [];
            candidateDetails.employmentHistory = [];
            candidateDetails.areaOfWork = [];
            candidateDetails.proficiencies = [];
            candidateDetails.awards = [];
            candidateDetails.proficiencies = [];
            candidateDetails.professionalDetails.education = utility_function_1.UtilityFunction.valueHide(candidateDetails.professionalDetails.education);
            candidateDetails.professionalDetails.experience = utility_function_1.UtilityFunction.valueHide(candidateDetails.professionalDetails.experience);
            candidateDetails.professionalDetails.industryExposure = utility_function_1.UtilityFunction.valueHide(candidateDetails.professionalDetails.industryExposure);
            candidateDetails.professionalDetails.currentSalary = utility_function_1.UtilityFunction.valueHide(candidateDetails.professionalDetails.currentSalary);
            candidateDetails.professionalDetails.noticePeriod = utility_function_1.UtilityFunction.valueHide(candidateDetails.professionalDetails.noticePeriod);
            candidateDetails.professionalDetails.relocate = utility_function_1.UtilityFunction.valueHide(candidateDetails.professionalDetails.relocate);
        }
        candidateDetails.userId.password = '';
        _canDetailsWithJobMatching.candidateDetails = candidateDetails;
        _canDetailsWithJobMatching.isShowCandidateDetails = isGotIt;
        return _canDetailsWithJobMatching;
    };
    return SearchService;
}());
Object.seal(SearchService);
module.exports = SearchService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvc2VhcmNoL3NlcnZpY2VzL3NlYXJjaC5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxzRkFBeUY7QUFDekYsd0RBQTJEO0FBQzNELHNGQUF5RjtBQUV6RixxRUFBd0U7QUFDeEUsZ0VBQXFFO0FBQ3JFLHNHQUE2RztBQUM3RywwRkFBcUY7QUFDckYsNEZBQXVGO0FBQ3ZGLG9HQUE4RjtBQUM5RixtQ0FBcUM7QUFDckMsMEdBQXVHO0FBQ3ZHLG9FQUFnRTtBQUNoRSx3RUFBMkU7QUFDM0UseURBQTREO0FBQzVELG9GQUF1RjtBQUd2RixJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFNUM7SUFPRTtRQUNFLElBQUksQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQztRQUN0QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQ3JELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFDckQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQztRQUNuRCxJQUFJLEdBQUcsR0FBUSxJQUFJLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQztJQUNoRCxDQUFDO0lBRUQsNkNBQXFCLEdBQXJCLFVBQXNCLFVBQTJCLEVBQUUsUUFBMkM7UUFBOUYsaUJBMEdDO1FBekdDLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUN0QyxJQUFJLElBQVMsQ0FBQztRQUNkLElBQUksT0FBTyxHQUFZLEtBQUssQ0FBQztRQUM3QixJQUFJLFVBQVUsR0FBYSxFQUFFLENBQUM7UUFDOUIsSUFBSSx5QkFBeUIsR0FBWSxLQUFLLENBQUM7UUFDL0MsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLG9C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QUFNLENBQUMsMEJBQTBCLENBQUM7SUFDcEMsQ0FBQztJQUNILG9CQUFDO0FBQUQsQ0F4cUJBLEFBd3FCQyxJQUFBO0FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMzQixpQkFBUyxhQUFhLENBQUMiLCJmaWxlIjoiYXBwL2ZyYW1ld29yay9zZWFyY2gvc2VydmljZXMvc2VhcmNoLnNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgSm9iUHJvZmlsZU1vZGVsID0gcmVxdWlyZSgnLi4vLi4vZGF0YWFjY2Vzcy9tb2RlbC9qb2Jwcm9maWxlLm1vZGVsJyk7XHJcbmltcG9ydCBDYW5kaWRhdGVSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L2NhbmRpZGF0ZS5yZXBvc2l0b3J5Jyk7XHJcbmltcG9ydCBQcm9qZWN0QXNzZXQgPSByZXF1aXJlKCcuLi8uLi9zaGFyZWQvcHJvamVjdGFzc2V0Jyk7XHJcbmltcG9ydCBSZWNydWl0ZXJSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L3JlY3J1aXRlci5yZXBvc2l0b3J5Jyk7XHJcbmltcG9ydCBDYW5kaWRhdGVNb2RlbCA9IHJlcXVpcmUoJy4uLy4uL2RhdGFhY2Nlc3MvbW9kZWwvY2FuZGlkYXRlLm1vZGVsJyk7XHJcbmltcG9ydCBKb2JQcm9maWxlU2VydmljZSA9IHJlcXVpcmUoJy4uLy4uL3NlcnZpY2VzL2pvYnByb2ZpbGUuc2VydmljZScpO1xyXG5pbXBvcnQge0FjdGlvbnMsIENvbnN0VmFyaWFibGVzfSBmcm9tIFwiLi4vLi4vc2hhcmVkL3NoYXJlZGNvbnN0YW50c1wiO1xyXG5pbXBvcnQge1Byb2ZpbGVDb21wYXJpc29uRGF0YU1vZGVsLCBTa2lsbFN0YXR1c30gZnJvbSBcIi4uLy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvZmlsZS1jb21wYXJpc29uLWRhdGEubW9kZWxcIjtcclxuaW1wb3J0IHtDYXBhYmlsaXR5TWF0cml4TW9kZWx9IGZyb20gXCIuLi8uLi9kYXRhYWNjZXNzL21vZGVsL2NhcGFiaWxpdHktbWF0cml4Lm1vZGVsXCI7XHJcbmltcG9ydCB7UHJvZmlsZUNvbXBhcmlzb25Nb2RlbH0gZnJvbSBcIi4uLy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvZmlsZS1jb21wYXJpc29uLm1vZGVsXCI7XHJcbmltcG9ydCB7UHJvZmlsZUNvbXBhcmlzb25Kb2JNb2RlbH0gZnJvbSBcIi4uLy4uL2RhdGFhY2Nlc3MvbW9kZWwvcHJvZmlsZS1jb21wYXJpc29uLWpvYi5tb2RlbFwiO1xyXG5pbXBvcnQgKiBhcyBtb25nb29zZSBmcm9tIFwibW9uZ29vc2VcIjtcclxuaW1wb3J0IHtDYW5kaWRhdGVEZXRhaWxzV2l0aEpvYk1hdGNoaW5nfSBmcm9tIFwiLi4vLi4vZGF0YWFjY2Vzcy9tb2RlbC9jYW5kaWRhdGVkZXRhaWxzd2l0aGpvYm1hdGNoaW5nXCI7XHJcbmltcG9ydCB7VXRpbGl0eUZ1bmN0aW9ufSBmcm9tIFwiLi4vLi4vdWl0aWxpdHkvdXRpbGl0eS1mdW5jdGlvblwiO1xyXG5pbXBvcnQgTWF0Y2hWaWV3TW9kZWwgPSByZXF1aXJlKCcuLi8uLi9kYXRhYWNjZXNzL21vZGVsL21hdGNoLXZpZXcubW9kZWwnKTtcclxuaW1wb3J0IE1hdGNoID0gcmVxdWlyZSgnLi4vLi4vZGF0YWFjY2Vzcy9tb2RlbC9tYXRjaC1lbnVtJyk7XHJcbmltcG9ydCBJbmR1c3RyeVJlcG9zaXRvcnkgPSByZXF1aXJlKCcuLi8uLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvaW5kdXN0cnkucmVwb3NpdG9yeScpO1xyXG5pbXBvcnQgSW5kdXN0cnlNb2RlbCA9IHJlcXVpcmUoJy4uLy4uL2RhdGFhY2Nlc3MvbW9kZWwvaW5kdXN0cnkubW9kZWwnKTtcclxuaW1wb3J0IFNjZW5hcmlvTW9kZWwgPSByZXF1aXJlKCcuLi8uLi9kYXRhYWNjZXNzL21vZGVsL3NjZW5hcmlvLm1vZGVsJyk7XHJcbmxldCB1c2VzdHJhY2tpbmcgPSByZXF1aXJlKCd1c2VzLXRyYWNraW5nJyk7XHJcblxyXG5jbGFzcyBTZWFyY2hTZXJ2aWNlIHtcclxuICBBUFBfTkFNRTogc3RyaW5nO1xyXG4gIGNhbmRpZGF0ZVJlcG9zaXRvcnk6IENhbmRpZGF0ZVJlcG9zaXRvcnk7XHJcbiAgcmVjcnVpdGVyUmVwb3NpdG9yeTogUmVjcnVpdGVyUmVwb3NpdG9yeTtcclxuICBpbmR1c3RyeVJlcG9zaXRvcnk6IEluZHVzdHJ5UmVwb3NpdG9yeTtcclxuICBwcml2YXRlIHVzZXNUcmFja2luZ0NvbnRyb2xsZXI6IGFueTtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLkFQUF9OQU1FID0gUHJvamVjdEFzc2V0LkFQUF9OQU1FO1xyXG4gICAgdGhpcy5jYW5kaWRhdGVSZXBvc2l0b3J5ID0gbmV3IENhbmRpZGF0ZVJlcG9zaXRvcnkoKTtcclxuICAgIHRoaXMucmVjcnVpdGVyUmVwb3NpdG9yeSA9IG5ldyBSZWNydWl0ZXJSZXBvc2l0b3J5KCk7XHJcbiAgICB0aGlzLmluZHVzdHJ5UmVwb3NpdG9yeSA9IG5ldyBJbmR1c3RyeVJlcG9zaXRvcnkoKTtcclxuICAgIGxldCBvYmo6IGFueSA9IG5ldyB1c2VzdHJhY2tpbmcuTXlDb250cm9sbGVyKCk7XHJcbiAgICB0aGlzLnVzZXNUcmFja2luZ0NvbnRyb2xsZXIgPSBvYmouX2NvbnRyb2xsZXI7XHJcbiAgfVxyXG5cclxuICBnZXRNYXRjaGluZ0NhbmRpZGF0ZXMoam9iUHJvZmlsZTogSm9iUHJvZmlsZU1vZGVsLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBjb25zb2xlLnRpbWUoJ2dldE1hdGNoaW5nIENhbmRpZGF0ZScpO1xyXG4gICAgbGV0IGRhdGE6IGFueTtcclxuICAgIGxldCBpc0ZvdW5kOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBsZXQgaW5kdXN0cmllczogc3RyaW5nW10gPSBbXTtcclxuICAgIGxldCBpc1JlbGV2ZW50SW5kdXN0cmllc0ZvdW5kOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBpZiAoam9iUHJvZmlsZS5pbnRlcmVzdGVkSW5kdXN0cmllcyAmJiBqb2JQcm9maWxlLmludGVyZXN0ZWRJbmR1c3RyaWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgLyppc0ZvdW5kPSBqb2JQcm9maWxlLmludGVyZXN0ZWRJbmR1c3RyaWVzLmZpbHRlcigobmFtZSA6IHN0cmluZyk9PiB7XHJcbiAgICAgICBpZihuYW1lID09PSAnTm9uZScpe1xyXG4gICAgICAgcmV0dXJuIG5hbWU7XHJcbiAgICAgICB9XHJcbiAgICAgICB9KTsqL1xyXG4gICAgICAvL2pvYlByb2ZpbGUucmVsZXZlbnRJbmR1c3RyaWVzID0gWydUZXh0aWxlJ107XHJcbiAgICAgIGZvciAobGV0IG5hbWUgb2Ygam9iUHJvZmlsZS5pbnRlcmVzdGVkSW5kdXN0cmllcykge1xyXG4gICAgICAgIGlmIChuYW1lID09PSAnTm9uZScpIHtcclxuICAgICAgICAgIGlzRm91bmQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBpZihqb2JQcm9maWxlLnJlbGV2ZW50SW5kdXN0cmllcyAmJiBqb2JQcm9maWxlLnJlbGV2ZW50SW5kdXN0cmllcy5sZW5ndGgpIHtcclxuICAgICAgICBpc1JlbGV2ZW50SW5kdXN0cmllc0ZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNGb3VuZCkge1xyXG5cclxuICAgICAgICBpZihpc1JlbGV2ZW50SW5kdXN0cmllc0ZvdW5kKSB7XHJcbiAgICAgICAgICBpbmR1c3RyaWVzID0gam9iUHJvZmlsZS5yZWxldmVudEluZHVzdHJpZXM7XHJcblxyXG4gICAgICAgICAgaW5kdXN0cmllcy5wdXNoKGpvYlByb2ZpbGUuaW5kdXN0cnkubmFtZSk7XHJcbiAgICAgICAgICBkYXRhID0ge1xyXG4gICAgICAgICAgICAnaW5kdXN0cnkubmFtZSc6IHskaW46IGluZHVzdHJpZXN9LFxyXG4gICAgICAgICAgICAkb3I6IFtcclxuICAgICAgICAgICAgICB7J3Byb2Zlc3Npb25hbERldGFpbHMucmVsb2NhdGUnOiAnWWVzJ30sXHJcbiAgICAgICAgICAgICAgeydsb2NhdGlvbi5jaXR5Jzogam9iUHJvZmlsZS5sb2NhdGlvbi5jaXR5fVxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAncHJvZmljaWVuY2llcyc6IHskaW46IGpvYlByb2ZpbGUucHJvZmljaWVuY2llc30sXHJcbiAgICAgICAgICAgICdpc1Zpc2libGUnOiB0cnVlLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZGF0YSA9IHtcclxuICAgICAgICAgICAgJ2luZHVzdHJ5Lm5hbWUnOiBqb2JQcm9maWxlLmluZHVzdHJ5Lm5hbWUsXHJcbiAgICAgICAgICAgICRvcjogW1xyXG4gICAgICAgICAgICAgIHsncHJvZmVzc2lvbmFsRGV0YWlscy5yZWxvY2F0ZSc6ICdZZXMnfSxcclxuICAgICAgICAgICAgICB7J2xvY2F0aW9uLmNpdHknOiBqb2JQcm9maWxlLmxvY2F0aW9uLmNpdHl9XHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICdwcm9maWNpZW5jaWVzJzogeyRpbjogam9iUHJvZmlsZS5wcm9maWNpZW5jaWVzfSxcclxuICAgICAgICAgICAgJ2lzVmlzaWJsZSc6IHRydWUsXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpZihpc1JlbGV2ZW50SW5kdXN0cmllc0ZvdW5kKSB7XHJcbiAgICAgICAgICBpbmR1c3RyaWVzID0gam9iUHJvZmlsZS5yZWxldmVudEluZHVzdHJpZXM7XHJcbiAgICAgICAgICBpbmR1c3RyaWVzLnB1c2goam9iUHJvZmlsZS5pbmR1c3RyeS5uYW1lKTtcclxuICAgICAgICAgIGRhdGEgPSB7XHJcbiAgICAgICAgICAgICdpbmR1c3RyeS5uYW1lJzogeyRpbjogaW5kdXN0cmllc30sXHJcbiAgICAgICAgICAgICRvcjogW1xyXG4gICAgICAgICAgICAgIHsncHJvZmVzc2lvbmFsRGV0YWlscy5yZWxvY2F0ZSc6ICdZZXMnfSxcclxuICAgICAgICAgICAgICB7J2xvY2F0aW9uLmNpdHknOiBqb2JQcm9maWxlLmxvY2F0aW9uLmNpdHl9XHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICdwcm9maWNpZW5jaWVzJzogeyRpbjogam9iUHJvZmlsZS5wcm9maWNpZW5jaWVzfSxcclxuICAgICAgICAgICAgJ2ludGVyZXN0ZWRJbmR1c3RyaWVzJzogeyRpbjogam9iUHJvZmlsZS5pbnRlcmVzdGVkSW5kdXN0cmllc30sXHJcbiAgICAgICAgICAgICdpc1Zpc2libGUnOiB0cnVlLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZGF0YSA9IHtcclxuICAgICAgICAgICAgJ2luZHVzdHJ5Lm5hbWUnOiBqb2JQcm9maWxlLmluZHVzdHJ5Lm5hbWUsXHJcbiAgICAgICAgICAgICRvcjogW1xyXG4gICAgICAgICAgICAgIHsncHJvZmVzc2lvbmFsRGV0YWlscy5yZWxvY2F0ZSc6ICdZZXMnfSxcclxuICAgICAgICAgICAgICB7J2xvY2F0aW9uLmNpdHknOiBqb2JQcm9maWxlLmxvY2F0aW9uLmNpdHl9XHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICdwcm9maWNpZW5jaWVzJzogeyRpbjogam9iUHJvZmlsZS5wcm9maWNpZW5jaWVzfSxcclxuICAgICAgICAgICAgJ2ludGVyZXN0ZWRJbmR1c3RyaWVzJzogeyRpbjogam9iUHJvZmlsZS5pbnRlcmVzdGVkSW5kdXN0cmllc30sXHJcbiAgICAgICAgICAgICdpc1Zpc2libGUnOiB0cnVlLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBkYXRhID0ge1xyXG4gICAgICAgICdpc1Zpc2libGUnOiB0cnVlLFxyXG4gICAgICAgICdpbmR1c3RyeS5uYW1lJzogam9iUHJvZmlsZS5pbmR1c3RyeS5uYW1lLFxyXG4gICAgICAgICdwcm9maWNpZW5jaWVzJzogeyRpbjogam9iUHJvZmlsZS5wcm9maWNpZW5jaWVzfSxcclxuICAgICAgICAkb3I6IFtcclxuICAgICAgICAgIHsncHJvZmVzc2lvbmFsRGV0YWlscy5yZWxvY2F0ZSc6ICdZZXMnfSxcclxuICAgICAgICAgIHsnbG9jYXRpb24uY2l0eSc6IGpvYlByb2ZpbGUubG9jYXRpb24uY2l0eX1cclxuICAgICAgICBdXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgICBsZXQgaW5jbHVkZWRfZmllbGRzID0ge1xyXG4gICAgICAnaW5kdXN0cnkucm9sZXMuY2FwYWJpbGl0aWVzLmNvbXBsZXhpdGllcy5zY2VuYXJpb3MuY29kZSc6IDEsXHJcbiAgICAgICdpbmR1c3RyeS5yb2xlcy5jYXBhYmlsaXRpZXMuY29tcGxleGl0aWVzLnNjZW5hcmlvcy5pc0NoZWNrZWQnOiAxLFxyXG4gICAgICAnaW5kdXN0cnkucm9sZXMuZGVmYXVsdF9jb21wbGV4aXRpZXMuY29tcGxleGl0aWVzLnNjZW5hcmlvcy5jb2RlJzogMSxcclxuICAgICAgJ2luZHVzdHJ5LnJvbGVzLmRlZmF1bHRfY29tcGxleGl0aWVzLmNvbXBsZXhpdGllcy5zY2VuYXJpb3MuaXNDaGVja2VkJzogMSxcclxuICAgICAgJ3VzZXJJZCc6IDEsXHJcbiAgICAgICdwcm9maWNpZW5jaWVzJzogMSxcclxuICAgICAgJ2xvY2F0aW9uJzogMSxcclxuICAgICAgJ2ludGVyZXN0ZWRJbmR1c3RyaWVzJzogMSxcclxuICAgICAgJ3Byb2Zlc3Npb25hbERldGFpbHMnOiAxLFxyXG4gICAgICAnY2FwYWJpbGl0eV9tYXRyaXgnOjFcclxuICAgIH07XHJcbiAgICB0aGlzLmNhbmRpZGF0ZVJlcG9zaXRvcnkucmV0cmlldmVXaXRoTGVhbihkYXRhLCBpbmNsdWRlZF9maWVsZHMsIChlcnIsIHJlcykgPT4ge1xyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBjYWxsYmFjayhudWxsLCByZXMpO1xyXG4gICAgICAgIHRoaXMuY2FuZGlkYXRlUmVwb3NpdG9yeS5nZXRDYW5kaWRhdGVRQ2FyZChyZXMsIGpvYlByb2ZpbGUsIHVuZGVmaW5lZCwgY2FsbGJhY2spO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldE1hdGNoaW5nSm9iUHJvZmlsZShjYW5kaWRhdGU6IENhbmRpZGF0ZU1vZGVsLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcblxyXG4gICAgbGV0IGN1cnJlbnREYXRlID0gbmV3IERhdGUoKTtcclxuICAgIGxldCBkYXRhID0ge1xyXG4gICAgICAncG9zdGVkSm9icy5pbmR1c3RyeS5uYW1lJzogY2FuZGlkYXRlLmluZHVzdHJ5Lm5hbWUsXHJcbiAgICAgICdwb3N0ZWRKb2JzLnByb2ZpY2llbmNpZXMnOiB7JGluOiBjYW5kaWRhdGUucHJvZmljaWVuY2llc30sXHJcbiAgICAgICdwb3N0ZWRKb2JzLmV4cGlyaW5nRGF0ZSc6IHskZ3RlOiBjdXJyZW50RGF0ZX1cclxuICAgIH07XHJcbiAgICBsZXQgZXhjbHVkZWRfZmllbGRzID0ge1xyXG4gICAgICAncG9zdGVkSm9icy5pbmR1c3RyeS5yb2xlcyc6IDAsXHJcbiAgICB9O1xyXG4gICAgdGhpcy5yZWNydWl0ZXJSZXBvc2l0b3J5LnJldHJpZXZlV2l0aExlYW4oZGF0YSxleGNsdWRlZF9maWVsZHMsIChlcnIsIHJlcykgPT4ge1xyXG4gICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnJlY3J1aXRlclJlcG9zaXRvcnkuZ2V0Sm9iUHJvZmlsZVFDYXJkKHJlcywgY2FuZGlkYXRlLCB1bmRlZmluZWQsICdub25lJywgY2FsbGJhY2spO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldE1hdGNoaW5nUmVzdWx0KGNhbmRpZGF0ZUlkOiBzdHJpbmcsIGpvYklkOiBzdHJpbmcsIGlzQ2FuZGlkYXRlIDogYm9vbGVhbixjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICBsZXQgdXNlc19kYXRhID0ge1xyXG4gICAgICBjYW5kaWRhdGVJZDogY2FuZGlkYXRlSWQsXHJcbiAgICAgIGpvYlByb2ZpbGVJZDogam9iSWQsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgYWN0aW9uOiBBY3Rpb25zLkRFRkFVTFRfVkFMVUVcclxuICAgIH07XHJcbiAgICBpZiAoaXNDYW5kaWRhdGUpIHtcclxuICAgICAgdXNlc19kYXRhLmFjdGlvbiA9IEFjdGlvbnMuVklFV0VEX0pPQl9QUk9GSUxFX0JZX0NBTkRJREFURTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHVzZXNfZGF0YS5hY3Rpb24gPSBBY3Rpb25zLlZJRVdFRF9GVUxMX1BST0ZJTEVfQllfUkVDUlVJVEVSO1xyXG4gICAgfVxyXG4gICAgdGhpcy51c2VzVHJhY2tpbmdDb250cm9sbGVyLmNyZWF0ZSh1c2VzX2RhdGEpO1xyXG4gICAgdGhpcy5jYW5kaWRhdGVSZXBvc2l0b3J5LmZpbmRCeUlkd2l0aEV4Y2x1ZGUoY2FuZGlkYXRlSWQseydpbmR1c3RyeSc6MH0sIChlcnI6IGFueSwgY2FuZGlkYXRlUmVzOiBhbnkpID0+IHtcclxuICAgICAgaWYgKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKGNhbmRpZGF0ZVJlcykge1xyXG4gICAgICAgICAgbGV0IGRhdGEgPSB7XHJcbiAgICAgICAgICAgICdwb3N0ZWRKb2InOiBqb2JJZFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIGxldCBqb2JQcm9maWxlU2VydmljZTogSm9iUHJvZmlsZVNlcnZpY2UgPSBuZXcgSm9iUHJvZmlsZVNlcnZpY2UoKTtcclxuICAgICAgICAgIGpvYlByb2ZpbGVTZXJ2aWNlLnJldHJpZXZlKGRhdGEsIChlcnJJbkpvYiwgcmVzT2ZSZWNydWl0ZXIpID0+IHtcclxuICAgICAgICAgICAgaWYgKGVyckluSm9iKSB7XHJcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJySW5Kb2IsIG51bGwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRoaXMuZ2V0UmVzdWx0KGNhbmRpZGF0ZVJlcywgcmVzT2ZSZWNydWl0ZXIucG9zdGVkSm9ic1swXSwgaXNDYW5kaWRhdGUsIGNhbGxiYWNrKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG5cclxuICBjb21wYXJlVHdvT3B0aW9ucyhmaXJzdDogbnVtYmVyLCBzZWNvbmQ6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBpZiAoZmlyc3QgPCBzZWNvbmQpIHtcclxuICAgICAgcmV0dXJuICdiZWxvdyc7XHJcbiAgICB9IGVsc2UgaWYgKGZpcnN0ID4gc2Vjb25kKSB7XHJcbiAgICAgIHJldHVybiAnYWJvdmUnO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuICdleGFjdCc7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRFZHVjdGlvblN3aXRjaENhc2UoZWR1Y2F0aW9uOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgc3dpdGNoIChlZHVjYXRpb24pIHtcclxuICAgICAgY2FzZSAnVW5kZXIgR3JhZHVhdGUnOlxyXG4gICAgICAgIHJldHVybiAxO1xyXG4gICAgICBjYXNlICdHcmFkdWF0ZSc6XHJcbiAgICAgICAgcmV0dXJuIDI7XHJcbiAgICAgIGNhc2UgJ1Bvc3QgR3JhZHVhdGUnOlxyXG4gICAgICAgIHJldHVybiAzO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIC0xO1xyXG4gIH1cclxuXHJcbiAgZ2V0UGVyaW9kU3dpdGNoQ2FzZShwZXJpb2Q6IHN0cmluZyk6IG51bWJlciB7Ly9UTyBETyA6RG8gbm90IHVzZSBoYXJkIGNvZGluZ1xyXG4gICAgc3dpdGNoIChwZXJpb2QpIHtcclxuICAgICAgY2FzZSAnSW1tZWRpYXRlJyA6XHJcbiAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgIGNhc2UgJ1dpdGhpbiAxIG1vbnRocyc6XHJcbiAgICAgICAgcmV0dXJuIDI7XHJcbiAgICAgIGNhc2UgJzEtMiBNb250aHMnOlxyXG4gICAgICAgIHJldHVybiAzO1xyXG4gICAgICBjYXNlICcyLTMgTW9udGhzJzpcclxuICAgICAgICByZXR1cm4gNDtcclxuICAgICAgY2FzZSAnQmV5b25kIDMgbW9udGhzJzpcclxuICAgICAgICByZXR1cm4gNTtcclxuICAgIH1cclxuICAgIHJldHVybiAtMTtcclxuICB9XHJcblxyXG4gIGdldFJlc3VsdChjYW5kaWRhdGU6IGFueSwgam9iOiBhbnksIGlzQ2FuZGlkYXRlOiBib29sZWFuLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcbiAgICB0aGlzLmluZHVzdHJ5UmVwb3NpdG9yeS5yZXRyaWV2ZSh7J25hbWUnOiBqb2IuaW5kdXN0cnkubmFtZX0sIChlcnI6IGFueSwgaW5kdXN0cmllczogSW5kdXN0cnlNb2RlbFtdKSA9PiB7XHJcbiAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciBuZXdDYW5kaWRhdGUgPSB0aGlzLmdldENvbXBhcmVEYXRhKGNhbmRpZGF0ZSwgam9iLCBpc0NhbmRpZGF0ZSwgaW5kdXN0cmllcyk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgbmV3Q2FuZGlkYXRlKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRDb21wYXJlRGF0YShjYW5kaWRhdGU6IENhbmRpZGF0ZU1vZGVsLCBqb2I6IGFueSwgaXNDYW5kaWRhdGU6IGJvb2xlYW4sIGluZHVzdHJpZXM6IEluZHVzdHJ5TW9kZWxbXSkge1xyXG4gICAgLy9sZXQgbmV3Q2FuZGlkYXRlID0gY2FuZGlkYXRlLnRvT2JqZWN0KCk7XHJcbiAgICB2YXIgbmV3Q2FuZGlkYXRlID0gdGhpcy5idWlsZENhbmRpZGF0ZU1vZGVsKGNhbmRpZGF0ZSk7XHJcbiAgICBsZXQgam9iTWluRXhwZXJpZW5jZTogbnVtYmVyID0gTnVtYmVyKGpvYi5leHBlcmllbmNlTWluVmFsdWUpO1xyXG4gICAgbGV0IGpvYk1heEV4cGVyaWVuY2U6IG51bWJlciA9IE51bWJlcihqb2IuZXhwZXJpZW5jZU1heFZhbHVlKTtcclxuICAgIGxldCBqb2JNaW5TYWxhcnk6IG51bWJlciA9IE51bWJlcihqb2Iuc2FsYXJ5TWluVmFsdWUpO1xyXG4gICAgbGV0IGpvYk1heFNhbGFyeTogbnVtYmVyID0gTnVtYmVyKGpvYi5zYWxhcnlNYXhWYWx1ZSk7XHJcbiAgICBsZXQgY2FuZGlFeHBlcmllbmNlOiBzdHJpbmdbXSA9IG5ld0NhbmRpZGF0ZS5wcm9mZXNzaW9uYWxEZXRhaWxzLmV4cGVyaWVuY2Uuc3BsaXQoJyAnKTtcclxuICAgIGxldCBjYW5TYWxhcnk6IHN0cmluZ1tdID0gbmV3Q2FuZGlkYXRlLnByb2Zlc3Npb25hbERldGFpbHMuY3VycmVudFNhbGFyeS5zcGxpdCgnICcpO1xyXG4gICAgaWYgKChqb2JNYXhFeHBlcmllbmNlID49IE51bWJlcihjYW5kaUV4cGVyaWVuY2VbMF0pKSAmJiAoam9iTWluRXhwZXJpZW5jZSA8PSBOdW1iZXIoY2FuZGlFeHBlcmllbmNlWzBdKSkpIHtcclxuICAgICAgbmV3Q2FuZGlkYXRlLmV4cGVyaWVuY2VNYXRjaCA9ICdleGFjdCc7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBuZXdDYW5kaWRhdGUuZXhwZXJpZW5jZU1hdGNoID0gJ21pc3NpbmcnO1xyXG4gICAgfVxyXG4gICAgaWYgKChqb2JNYXhTYWxhcnkgPj0gTnVtYmVyKGNhblNhbGFyeVswXSkpICYmIChqb2JNaW5TYWxhcnkgPD0gTnVtYmVyKGNhblNhbGFyeVswXSkpKSB7XHJcbiAgICAgIG5ld0NhbmRpZGF0ZS5zYWxhcnlNYXRjaCA9ICdleGFjdCc7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBuZXdDYW5kaWRhdGUuc2FsYXJ5TWF0Y2ggPSAnbWlzc2luZyc7XHJcbiAgICB9XHJcbiAgICBsZXQgY2FuRWR1Y2F0aW9uOiBudW1iZXIgPSB0aGlzLmdldEVkdWN0aW9uU3dpdGNoQ2FzZShuZXdDYW5kaWRhdGUucHJvZmVzc2lvbmFsRGV0YWlscy5lZHVjYXRpb24pO1xyXG4gICAgbGV0IGpvYkVkdWNhdGlvbjogbnVtYmVyID0gdGhpcy5nZXRFZHVjdGlvblN3aXRjaENhc2Uoam9iLmVkdWNhdGlvbik7XHJcbiAgICBuZXdDYW5kaWRhdGUuZWR1Y2F0aW9uTWF0Y2ggPSB0aGlzLmNvbXBhcmVUd29PcHRpb25zKGNhbkVkdWNhdGlvbiwgam9iRWR1Y2F0aW9uKTtcclxuICAgIG5ld0NhbmRpZGF0ZS5yZWxlYXNlTWF0Y2ggPSB0aGlzLmNvbXBhcmVUd29PcHRpb25zKHRoaXMuZ2V0UGVyaW9kU3dpdGNoQ2FzZShuZXdDYW5kaWRhdGUucHJvZmVzc2lvbmFsRGV0YWlscy5ub3RpY2VQZXJpb2QpLCB0aGlzLmdldFBlcmlvZFN3aXRjaENhc2Uoam9iLmpvaW5pbmdQZXJpb2QpKTtcclxuICAgIG5ld0NhbmRpZGF0ZS5pbnRlcmVzdGVkSW5kdXN0cnlNYXRjaCA9IG5ldyBBcnJheSgwKTtcclxuXHJcbiAgICBmb3IgKGxldCBpbmR1c3RyeSBvZiBqb2IuaW50ZXJlc3RlZEluZHVzdHJpZXMpIHtcclxuICAgICAgaWYgKG5ld0NhbmRpZGF0ZS5pbnRlcmVzdGVkSW5kdXN0cmllcy5pbmRleE9mKGluZHVzdHJ5KSAhPT0gLTEpIHtcclxuICAgICAgICBuZXdDYW5kaWRhdGUuaW50ZXJlc3RlZEluZHVzdHJ5TWF0Y2gucHVzaChpbmR1c3RyeSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIG5ld0NhbmRpZGF0ZS5wcm9maWNpZW5jaWVzTWF0Y2ggPSBuZXcgQXJyYXkoMCk7XHJcbiAgICBmb3IgKGxldCBwcm9maWNpZW5jeSBvZiBqb2IucHJvZmljaWVuY2llcykge1xyXG4gICAgICBpZiAobmV3Q2FuZGlkYXRlLnByb2ZpY2llbmNpZXMuaW5kZXhPZihwcm9maWNpZW5jeSkgIT09IC0xKSB7XHJcbiAgICAgICAgbmV3Q2FuZGlkYXRlLnByb2ZpY2llbmNpZXNNYXRjaC5wdXNoKHByb2ZpY2llbmN5KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG5ld0NhbmRpZGF0ZS5wcm9maWNpZW5jaWVzVW5NYXRjaCA9IG5ldyBBcnJheSgwKTtcclxuICAgIGZvciAobGV0IHByb2ZpY2llbmN5IG9mIGpvYi5wcm9maWNpZW5jaWVzKSB7XHJcbiAgICAgIGlmIChuZXdDYW5kaWRhdGUucHJvZmljaWVuY2llc01hdGNoLmluZGV4T2YocHJvZmljaWVuY3kpID09IC0xKSB7XHJcbiAgICAgICAgbmV3Q2FuZGlkYXRlLnByb2ZpY2llbmNpZXNVbk1hdGNoLnB1c2gocHJvZmljaWVuY3kpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbi8vICAgICAgICBsZXQgbWF0Y2hfbWFwOiBNYXA8c3RyaW5nLE1hdGNoVmlld01vZGVsPiA9IG5ldyBNYXA8c3RyaW5nLE1hdGNoVmlld01vZGVsPigpO1xyXG4gICAgLy9uZXdDYW5kaWRhdGUubWF0Y2hfbWFwID0ge307XHJcbiAgICBuZXdDYW5kaWRhdGUgPSB0aGlzLmJ1aWxkTXVsdGlDb21wYXJlQ2FwYWJpbGl0eVZpZXcoam9iLCBuZXdDYW5kaWRhdGUsIGluZHVzdHJpZXMsIGlzQ2FuZGlkYXRlKTtcclxuICAgIG5ld0NhbmRpZGF0ZSA9IHRoaXMuYnVpbGRDb21wYXJlVmlldyhqb2IsIG5ld0NhbmRpZGF0ZSwgaW5kdXN0cmllcywgaXNDYW5kaWRhdGUpO1xyXG4gICAgbmV3Q2FuZGlkYXRlID0gdGhpcy5nZXRBZGRpdGlvbmFsQ2FwYWJpbGl0aWVzKGpvYiwgbmV3Q2FuZGlkYXRlLCBpbmR1c3RyaWVzKTtcclxuXHJcbiAgICByZXR1cm4gbmV3Q2FuZGlkYXRlO1xyXG4gIH1cclxuXHJcbiAgYnVpbGRDYW5kaWRhdGVNb2RlbChjYW5kaWRhdGU6IENhbmRpZGF0ZU1vZGVsKSB7XHJcbiAgICBsZXQgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQ6IFByb2ZpbGVDb21wYXJpc29uRGF0YU1vZGVsID0gbmV3IFByb2ZpbGVDb21wYXJpc29uRGF0YU1vZGVsKCk7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvblJlc3VsdC5faWQgPSBjYW5kaWRhdGUuX2lkO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQuaW5kdXN0cnlOYW1lID0gY2FuZGlkYXRlLmluZHVzdHJ5Lm5hbWU7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvblJlc3VsdC5hYm91dE15c2VsZiA9IGNhbmRpZGF0ZS5hYm91dE15c2VsZjtcclxuICAgIHByb2ZpbGVDb21wYXJpc29uUmVzdWx0LmFjYWRlbWljcyA9IGNhbmRpZGF0ZS5hY2FkZW1pY3M7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvblJlc3VsdC5wcm9mZXNzaW9uYWxEZXRhaWxzID0gY2FuZGlkYXRlLnByb2Zlc3Npb25hbERldGFpbHM7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvblJlc3VsdC5hd2FyZHMgPSBjYW5kaWRhdGUuYXdhcmRzO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQuY2FwYWJpbGl0eV9tYXRyaXggPSBjYW5kaWRhdGUuY2FwYWJpbGl0eV9tYXRyaXg7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvblJlc3VsdC5leHBlcmllbmNlTWF0Y2ggPSAnJztcclxuICAgIHByb2ZpbGVDb21wYXJpc29uUmVzdWx0LmNlcnRpZmljYXRpb25zID0gY2FuZGlkYXRlLmNlcnRpZmljYXRpb25zO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQuZW1wbG95bWVudEhpc3RvcnkgPSBjYW5kaWRhdGUuZW1wbG95bWVudEhpc3Rvcnk7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvblJlc3VsdC5pbnRlcmVzdGVkSW5kdXN0cmllcyA9IGNhbmRpZGF0ZS5pbnRlcmVzdGVkSW5kdXN0cmllcztcclxuICAgIHByb2ZpbGVDb21wYXJpc29uUmVzdWx0LmlzU3VibWl0dGVkID0gY2FuZGlkYXRlLmlzU3VibWl0dGVkO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQuaXNWaXNpYmxlID0gY2FuZGlkYXRlLmlzVmlzaWJsZTtcclxuICAgIHByb2ZpbGVDb21wYXJpc29uUmVzdWx0LmxvY2F0aW9uID0gY2FuZGlkYXRlLmxvY2F0aW9uO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQuam9iX2xpc3QgPSBjYW5kaWRhdGUuam9iX2xpc3Q7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvblJlc3VsdC5lZHVjYXRpb25NYXRjaCA9ICcnO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQucHJvZmljaWVuY2llcyA9IGNhbmRpZGF0ZS5wcm9maWNpZW5jaWVzO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQucHJvZmlsZUNvbXBhcmlzb25IZWFkZXIgPSBjYW5kaWRhdGUudXNlcklkO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQucm9sZVR5cGUgPSBjYW5kaWRhdGUucm9sZVR5cGU7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvblJlc3VsdC5zYWxhcnlNYXRjaCA9ICcnO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQuc2Vjb25kYXJ5Q2FwYWJpbGl0eSA9IGNhbmRpZGF0ZS5zZWNvbmRhcnlDYXBhYmlsaXR5O1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25SZXN1bHQubG9ja2VkT24gPSBjYW5kaWRhdGUubG9ja2VkT247XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvblJlc3VsdC5tYXRjaF9tYXAgPSB7fTtcclxuICAgIHByb2ZpbGVDb21wYXJpc29uUmVzdWx0LmNhcGFiaWxpdHlNYXAgPSB7fTtcclxuICAgIHByb2ZpbGVDb21wYXJpc29uUmVzdWx0LmNvbXBsZXhpdHlfbm90ZV9tYXRyaXggPSBjYW5kaWRhdGUuY29tcGxleGl0eV9ub3RlX21hdHJpeDtcclxuICAgIHJldHVybiBwcm9maWxlQ29tcGFyaXNvblJlc3VsdDtcclxuICB9XHJcblxyXG4gIGJ1aWxkTXVsdGlDb21wYXJlQ2FwYWJpbGl0eVZpZXcoam9iOmFueSwgbmV3Q2FuZGlkYXRlOlByb2ZpbGVDb21wYXJpc29uRGF0YU1vZGVsLCBpbmR1c3RyaWVzOmFueSwgaXNDYW5kaWRhdGU6YW55KSB7XHJcbiAgICB2YXIgY2FwYWJpbGl0eVBlcmNlbnRhZ2U6bnVtYmVyW10gPSBuZXcgQXJyYXkoMCk7XHJcbiAgICB2YXIgY2FwYWJpbGl0eUtleXM6c3RyaW5nW10gPSBuZXcgQXJyYXkoMCk7XHJcbiAgICB2YXIgY29ycmVjdFFlc3Rpb25Db3VudEZvckF2Z1BlcmNlbnRhZ2U6bnVtYmVyID0gMDtcclxuICAgIHZhciBxZXN0aW9uQ291bnRGb3JBdmdQZXJjZW50c2dlOm51bWJlciA9IDA7XHJcbiAgICBmb3IgKGxldCBjYXAgaW4gam9iLmNhcGFiaWxpdHlfbWF0cml4KSB7XHJcblxyXG4gICAgICB2YXIgY2FwYWJpbGl0eUtleSA9IGNhcC5zcGxpdCgnXycpO1xyXG4gICAgICBpZiAoY2FwYWJpbGl0eUtleXMuaW5kZXhPZihjYXBhYmlsaXR5S2V5WzBdKSA9PSAtMSkge1xyXG4gICAgICAgIGNhcGFiaWxpdHlLZXlzLnB1c2goY2FwYWJpbGl0eUtleVswXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vZm9yKGxldCBfY2FwIGluIGNhcGJpbGl0eUtleXMpIHtcclxuICAgIGZvciAobGV0IF9jYXAgb2YgY2FwYWJpbGl0eUtleXMpIHtcclxuICAgICAgbGV0IGlzQ2FwYWJpbGl0eUZvdW5kIDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICB2YXIgY2FwYWJpbGl0eVF1ZXN0aW9uQ291bnQ6bnVtYmVyID0gMDtcclxuICAgICAgdmFyIG1hdGNoQ291bnQ6bnVtYmVyID0gMDtcclxuICAgICAgZm9yIChsZXQgY2FwIGluIGpvYi5jYXBhYmlsaXR5X21hdHJpeCkge1xyXG4gICAgICAgIC8vY2FsY3VsYXRlIHRvdGFsIG51bWJlciBvZiBxdWVzdGlvbnMgaW4gY2FwYWJpbGl0eVxyXG5cclxuICAgICAgICBpZiAoX2NhcCA9PSBjYXAuc3BsaXQoJ18nKVswXSkge1xyXG4gICAgICAgICAgaWYgKGpvYi5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IC0xIHx8IGpvYi5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IDAgfHwgam9iLmNhcGFiaWxpdHlfbWF0cml4W2NhcF0gPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIC8vbWF0Y2hfdmlldy5tYXRjaCA9IE1hdGNoLk1pc3NNYXRjaDtcclxuICAgICAgICAgIH0gZWxzZSBpZiAoam9iLmNhcGFiaWxpdHlfbWF0cml4W2NhcF0gPT0gbmV3Q2FuZGlkYXRlLmNhcGFiaWxpdHlfbWF0cml4W2NhcF0pIHtcclxuICAgICAgICAgICAgbWF0Y2hDb3VudCsrO1xyXG4gICAgICAgICAgICBjYXBhYmlsaXR5UXVlc3Rpb25Db3VudCsrO1xyXG4gICAgICAgICAgICBjb3JyZWN0UWVzdGlvbkNvdW50Rm9yQXZnUGVyY2VudGFnZSsrO1xyXG4gICAgICAgICAgICBxZXN0aW9uQ291bnRGb3JBdmdQZXJjZW50c2dlKys7XHJcbiAgICAgICAgICAgIC8vbWF0Y2hfdmlldy5tYXRjaCA9IE1hdGNoLkV4YWN0O1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChqb2IuY2FwYWJpbGl0eV9tYXRyaXhbY2FwXSA9PSAoTnVtYmVyKG5ld0NhbmRpZGF0ZS5jYXBhYmlsaXR5X21hdHJpeFtjYXBdKSAtIENvbnN0VmFyaWFibGVzLkRJRkZFUkVOQ0VfSU5fQ09NUExFWElUWV9TQ0VOQVJJTykpIHtcclxuICAgICAgICAgICAgbWF0Y2hDb3VudCsrO1xyXG4gICAgICAgICAgICBjYXBhYmlsaXR5UXVlc3Rpb25Db3VudCsrO1xyXG4gICAgICAgICAgICBjb3JyZWN0UWVzdGlvbkNvdW50Rm9yQXZnUGVyY2VudGFnZSsrO1xyXG4gICAgICAgICAgICBxZXN0aW9uQ291bnRGb3JBdmdQZXJjZW50c2dlKys7XHJcbiAgICAgICAgICAgIC8vbWF0Y2hfdmlldy5tYXRjaCA9IE1hdGNoLkFib3ZlO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChqb2IuY2FwYWJpbGl0eV9tYXRyaXhbY2FwXSA9PSAoTnVtYmVyKG5ld0NhbmRpZGF0ZS5jYXBhYmlsaXR5X21hdHJpeFtjYXBdKSArIENvbnN0VmFyaWFibGVzLkRJRkZFUkVOQ0VfSU5fQ09NUExFWElUWV9TQ0VOQVJJTykpIHtcclxuICAgICAgICAgICAgLy9tYXRjaF92aWV3Lm1hdGNoID0gTWF0Y2guQmVsb3c7XHJcbiAgICAgICAgICAgIGNhcGFiaWxpdHlRdWVzdGlvbkNvdW50Kys7XHJcbiAgICAgICAgICAgIHFlc3Rpb25Db3VudEZvckF2Z1BlcmNlbnRzZ2UrKztcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhcGFiaWxpdHlRdWVzdGlvbkNvdW50Kys7XHJcbiAgICAgICAgICAgIHFlc3Rpb25Db3VudEZvckF2Z1BlcmNlbnRzZ2UrKztcclxuICAgICAgICAgICAgLy9tYXRjaF92aWV3Lm1hdGNoID0gTWF0Y2guTWlzc01hdGNoO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB2YXIgY2FwYWJpbGl0eU1vZGVsID0gbmV3IENhcGFiaWxpdHlNYXRyaXhNb2RlbCgpO1xyXG4gICAgICB2YXIgY2FwTmFtZTpzdHJpbmc7XHJcbiAgICAgIHZhciBjb21wbGV4aXR5OmFueTtcclxuICAgICAgZm9yIChsZXQgcm9sZSBvZiBpbmR1c3RyaWVzWzBdLnJvbGVzKSB7XHJcbiAgICAgICAgZm9yIChsZXQgY2FwYWJpbGl0eSBvZiByb2xlLmNhcGFiaWxpdGllcykge1xyXG4gICAgICAgICAgaWYgKF9jYXAgPT0gY2FwYWJpbGl0eS5jb2RlKSB7XHJcbiAgICAgICAgICAgIGlzQ2FwYWJpbGl0eUZvdW5kPXRydWU7XHJcbiAgICAgICAgICAgIGNhcE5hbWUgPSBjYXBhYmlsaXR5Lm5hbWU7XHJcbiAgICAgICAgICAgIGNvbXBsZXhpdHkgPSBjYXBhYmlsaXR5LmNvbXBsZXhpdGllcztcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAobGV0IGNhcGFiaWxpdHkgb2Ygcm9sZS5kZWZhdWx0X2NvbXBsZXhpdGllcykge1xyXG4gICAgICAgICAgaWYgKF9jYXAgPT0gY2FwYWJpbGl0eS5jb2RlKSB7XHJcbiAgICAgICAgICAgIGlzQ2FwYWJpbGl0eUZvdW5kPXRydWU7XHJcbiAgICAgICAgICAgIGNhcE5hbWUgPSBjYXBhYmlsaXR5Lm5hbWU7XHJcbiAgICAgICAgICAgIGNvbXBsZXhpdHkgPSBjYXBhYmlsaXR5LmNvbXBsZXhpdGllcztcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHZhciBwZXJjZW50YWdlOm51bWJlciA9IDA7XHJcbiAgICAgIGlmIChjYXBhYmlsaXR5UXVlc3Rpb25Db3VudCkge1xyXG4gICAgICAgIHBlcmNlbnRhZ2UgPSAobWF0Y2hDb3VudCAvIGNhcGFiaWxpdHlRdWVzdGlvbkNvdW50KSAqIDEwMDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY2FwYWJpbGl0eU1vZGVsLmNhcGFiaWxpdHlOYW1lID0gY2FwTmFtZTtcclxuICAgICAgY2FwYWJpbGl0eU1vZGVsLmNhcGFiaWxpdHlQZXJjZW50YWdlID0gcGVyY2VudGFnZTtcclxuICAgICAgY2FwYWJpbGl0eU1vZGVsLmNvbXBsZXhpdGllcyA9IGNvbXBsZXhpdHk7XHJcbiAgICAgIGNhcGFiaWxpdHlQZXJjZW50YWdlLnB1c2gocGVyY2VudGFnZSk7XHJcbiAgICAgIGlmKGlzQ2FwYWJpbGl0eUZvdW5kKXtcclxuICAgICAgICBuZXdDYW5kaWRhdGVbJ2NhcGFiaWxpdHlNYXAnXVtfY2FwXSA9IGNhcGFiaWxpdHlNb2RlbDtcclxuICAgICAgfVxyXG4gICAgICAvL31cclxuICAgIH1cclxuICAgIHZhciBhdmdQZXJjZW50YWdlOm51bWJlciA9IDA7XHJcbiAgICBpZiAocWVzdGlvbkNvdW50Rm9yQXZnUGVyY2VudHNnZSkge1xyXG4gICAgICBhdmdQZXJjZW50YWdlID0gKChjb3JyZWN0UWVzdGlvbkNvdW50Rm9yQXZnUGVyY2VudGFnZSAvIHFlc3Rpb25Db3VudEZvckF2Z1BlcmNlbnRzZ2UpICogMTAwKTtcclxuICAgIH1cclxuICAgIG5ld0NhbmRpZGF0ZS5tYXRjaGluZ1BlcmNlbnRhZ2UgPSBhdmdQZXJjZW50YWdlO1xyXG4gICAgcmV0dXJuIG5ld0NhbmRpZGF0ZTtcclxuICB9XHJcblxyXG4gIGdldEFkZGl0aW9uYWxDYXBhYmlsaXRpZXMoam9iIDogYW55LCBuZXdDYW5kaWRhdGUgOiBhbnkgLCBpbmR1c3RyaWVzIDogYW55KSA6IGFueSB7XHJcbiAgICBuZXdDYW5kaWRhdGUuYWRkaXRpb25hbENhcGFiaWxpdGVzID0gbmV3IEFycmF5KDApO1xyXG4gICAgZm9yIChsZXQgY2FwIGluIG5ld0NhbmRpZGF0ZS5jYXBhYmlsaXR5X21hdHJpeCkge1xyXG4gICAgICAgIGxldCBpc0ZvdW5kOiBib29sZWFuPSBmYWxzZTtcclxuICAgICAgICBmb3IobGV0IGpvYkNhcCBpbiBqb2IuY2FwYWJpbGl0eV9tYXRyaXgpIHtcclxuICAgICAgICAgICAgaWYoY2FwLnN1YnN0cigwLGNhcC5pbmRleE9mKCdfJykpID09PSBqb2JDYXAuc3Vic3RyKDAsam9iQ2FwLmluZGV4T2YoJ18nKSkpIHtcclxuICAgICAgICAgICAgICBpc0ZvdW5kPXRydWU7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoIWlzRm91bmQpIHtcclxuICAgICAgICAgIGZvciAobGV0IHJvbGUgb2YgaW5kdXN0cmllc1swXS5yb2xlcykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjYXBhYmlsaXR5IG9mIHJvbGUuY2FwYWJpbGl0aWVzKSB7XHJcbiAgICAgICAgICAgICAgZm9yIChsZXQgY29tcGxleGl0eSBvZiBjYXBhYmlsaXR5LmNvbXBsZXhpdGllcykge1xyXG4gICAgICAgICAgICAgICAgbGV0IGN1c3RvbV9jb2RlID0gY2FwYWJpbGl0eS5jb2RlICsgJ18nICsgY29tcGxleGl0eS5jb2RlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1c3RvbV9jb2RlID09PSBjYXApIHtcclxuICAgICAgICAgICAgICAgICAgaWYobmV3Q2FuZGlkYXRlLmFkZGl0aW9uYWxDYXBhYmlsaXRlcy5pbmRleE9mKGNhcGFiaWxpdHkubmFtZSkgPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXdDYW5kaWRhdGUuYWRkaXRpb25hbENhcGFiaWxpdGVzLnB1c2goY2FwYWJpbGl0eS5uYW1lKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBuZXdDYW5kaWRhdGU7XHJcbiAgfVxyXG5cclxuICBidWlsZENvbXBhcmVWaWV3KGpvYiA6IGFueSwgbmV3Q2FuZGlkYXRlIDogYW55ICwgaW5kdXN0cmllcyA6IGFueSwgaXNDYW5kaWRhdGUgOiBib29sZWFuKSA6IGFueSB7XHJcblxyXG4gICAgZm9yIChsZXQgY2FwIGluIGpvYi5jYXBhYmlsaXR5X21hdHJpeCkge1xyXG4gICAgICBsZXQgbWF0Y2hfdmlldzogTWF0Y2hWaWV3TW9kZWwgPSBuZXcgTWF0Y2hWaWV3TW9kZWwoKTtcclxuICAgICAgaWYgKGpvYi5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IC0xIHx8IGpvYi5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IDAgfHwgam9iLmNhcGFiaWxpdHlfbWF0cml4W2NhcF0gPT0gdW5kZWZpbmVkIHx8IG5ld0NhbmRpZGF0ZS5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IHVuZGVmaW5lZCB8fFxyXG4gICAgICAgIG5ld0NhbmRpZGF0ZS5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IDAgfHwgbmV3Q2FuZGlkYXRlLmNhcGFiaWxpdHlfbWF0cml4W2NhcF0gPT0gLTEpIHtcclxuICAgICAgICBtYXRjaF92aWV3Lm1hdGNoID0gTWF0Y2guTWlzc01hdGNoO1xyXG4gICAgICB9IGVsc2UgaWYgKGpvYi5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IG5ld0NhbmRpZGF0ZS5jYXBhYmlsaXR5X21hdHJpeFtjYXBdKSB7XHJcbiAgICAgICAgbWF0Y2hfdmlldy5tYXRjaCA9IE1hdGNoLkV4YWN0O1xyXG4gICAgICB9IGVsc2UgaWYgKGpvYi5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IChOdW1iZXIobmV3Q2FuZGlkYXRlLmNhcGFiaWxpdHlfbWF0cml4W2NhcF0pIC0gQ29uc3RWYXJpYWJsZXMuRElGRkVSRU5DRV9JTl9DT01QTEVYSVRZX1NDRU5BUklPKSkge1xyXG4gICAgICAgIG1hdGNoX3ZpZXcubWF0Y2ggPSBNYXRjaC5BYm92ZTtcclxuICAgICAgfSBlbHNlIGlmIChqb2IuY2FwYWJpbGl0eV9tYXRyaXhbY2FwXSA9PSAoTnVtYmVyKG5ld0NhbmRpZGF0ZS5jYXBhYmlsaXR5X21hdHJpeFtjYXBdKSArIENvbnN0VmFyaWFibGVzLkRJRkZFUkVOQ0VfSU5fQ09NUExFWElUWV9TQ0VOQVJJTykpIHtcclxuICAgICAgICBtYXRjaF92aWV3Lm1hdGNoID0gTWF0Y2guQmVsb3c7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbWF0Y2hfdmlldy5tYXRjaCA9IE1hdGNoLk1pc3NNYXRjaDtcclxuICAgICAgfVxyXG4gICAgICBsZXQgaXNGb3VuZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICBmb3IgKGxldCByb2xlIG9mIGluZHVzdHJpZXNbMF0ucm9sZXMpIHtcclxuICAgICAgICBmb3IgKGxldCBjYXBhYmlsaXR5IG9mIHJvbGUuY2FwYWJpbGl0aWVzKSB7XHJcbiAgICAgICAgICBmb3IgKGxldCBjb21wbGV4aXR5IG9mIGNhcGFiaWxpdHkuY29tcGxleGl0aWVzKSB7XHJcbiAgICAgICAgICAgIGxldCBjdXN0b21fY29kZSA9IGNhcGFiaWxpdHkuY29kZSArICdfJyArIGNvbXBsZXhpdHkuY29kZTtcclxuICAgICAgICAgICAgaWYgKGN1c3RvbV9jb2RlID09PSBjYXApIHtcclxuICAgICAgICAgICAgICBpc0ZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICBsZXQgc2NlbmFyaW9zID0gY29tcGxleGl0eS5zY2VuYXJpb3MuZmlsdGVyKChzY2U6IFNjZW5hcmlvTW9kZWwpID0+IHtcclxuICAgICAgICAgICAgICAgIHNjZS5jb2RlID1zY2UuY29kZS5yZXBsYWNlKCcuJywnXycpO1xyXG4gICAgICAgICAgICAgICAgc2NlLmNvZGUgPXNjZS5jb2RlLnJlcGxhY2UoJy4nLCdfJyk7XHJcbiAgICAgICAgICAgICAgICBzY2UuY29kZSA9IHNjZS5jb2RlLnN1YnN0cihzY2UuY29kZS5sYXN0SW5kZXhPZignXycpKzEpO1xyXG4gICAgICAgICAgICAgICAgaWYoc2NlLmNvZGUgPT0gbmV3Q2FuZGlkYXRlLmNhcGFiaWxpdHlfbWF0cml4W2NhcF0pICB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgbGV0IGpvYl9zY2VuYXJpb3MgPSBjb21wbGV4aXR5LnNjZW5hcmlvcy5maWx0ZXIoKHNjZTogU2NlbmFyaW9Nb2RlbCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgc2NlLmNvZGUgPXNjZS5jb2RlLnJlcGxhY2UoJy4nLCdfJyk7XHJcbiAgICAgICAgICAgICAgICBzY2UuY29kZSA9c2NlLmNvZGUucmVwbGFjZSgnLicsJ18nKTtcclxuICAgICAgICAgICAgICAgIHNjZS5jb2RlID0gc2NlLmNvZGUuc3Vic3RyKHNjZS5jb2RlLmxhc3RJbmRleE9mKCdfJykrMSk7XHJcbiAgICAgICAgICAgICAgICBpZihzY2UuY29kZSA9PSBqb2IuY2FwYWJpbGl0eV9tYXRyaXhbY2FwXSkgIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICBtYXRjaF92aWV3LmNhcGFiaWxpdHlfbmFtZSA9IGNhcGFiaWxpdHkubmFtZTtcclxuICAgICAgICAgICAgICBtYXRjaF92aWV3LmNvbXBsZXhpdHlfbmFtZSA9IGNvbXBsZXhpdHkubmFtZTtcclxuICAgICAgICAgICAgICBpZihuZXdDYW5kaWRhdGUuY29tcGxleGl0eV9ub3RlX21hdHJpeCAmJiBuZXdDYW5kaWRhdGUuY29tcGxleGl0eV9ub3RlX21hdHJpeFtjYXBdKSB7XHJcbiAgICAgICAgICAgICAgICBtYXRjaF92aWV3LmNvbXBsZXhpdHlOb3RlID0gbmV3Q2FuZGlkYXRlLmNvbXBsZXhpdHlfbm90ZV9tYXRyaXhbY2FwXTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYoam9iX3NjZW5hcmlvc1swXSkge1xyXG4gICAgICAgICAgICAgICAgbWF0Y2hfdmlldy5qb2Jfc2NlbmFyaW9fbmFtZT0gam9iX3NjZW5hcmlvc1swXS5uYW1lO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBpZihzY2VuYXJpb3NbMF0pIHtcclxuICAgICAgICAgICAgICAgIG1hdGNoX3ZpZXcuY2FuZGlkYXRlX3NjZW5hcmlvX25hbWU9c2NlbmFyaW9zWzBdLm5hbWU7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbWF0Y2hfdmlldy5zY2VuYXJpb19uYW1lID0gbWF0Y2hfdmlldy5qb2Jfc2NlbmFyaW9fbmFtZTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYoaXNGb3VuZCkge1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yIChsZXQgY2FwYWJpbGl0eSBvZiByb2xlLmRlZmF1bHRfY29tcGxleGl0aWVzKSB7XHJcbiAgICAgICAgICBmb3IgKGxldCBjb21wbGV4aXR5IG9mIGNhcGFiaWxpdHkuY29tcGxleGl0aWVzKSB7XHJcbiAgICAgICAgICAgIGxldCBjdXN0b21fY29kZSA9IGNhcGFiaWxpdHkuY29kZSArICdfJyArIGNvbXBsZXhpdHkuY29kZTtcclxuICAgICAgICAgICAgaWYgKGN1c3RvbV9jb2RlID09PSBjYXApIHtcclxuICAgICAgICAgICAgICBpc0ZvdW5kID0gdHJ1ZTtcclxuICAgICAgICAgICAgICBsZXQgc2NlbmFyaW9zID0gY29tcGxleGl0eS5zY2VuYXJpb3MuZmlsdGVyKChzY2U6IFNjZW5hcmlvTW9kZWwpID0+IHtcclxuICAgICAgICAgICAgICAgIHNjZS5jb2RlID1zY2UuY29kZS5yZXBsYWNlKCcuJywnXycpO1xyXG4gICAgICAgICAgICAgICAgc2NlLmNvZGUgPXNjZS5jb2RlLnJlcGxhY2UoJy4nLCdfJyk7XHJcbiAgICAgICAgICAgICAgICBzY2UuY29kZSA9IHNjZS5jb2RlLnN1YnN0cihzY2UuY29kZS5sYXN0SW5kZXhPZignXycpKzEpO1xyXG4gICAgICAgICAgICAgICAgaWYoc2NlLmNvZGUgPT0gbmV3Q2FuZGlkYXRlLmNhcGFiaWxpdHlfbWF0cml4W2NhcF0pICB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgbGV0IGpvYl9zY2VuYXJpb3MgPSBjb21wbGV4aXR5LnNjZW5hcmlvcy5maWx0ZXIoKHNjZTogU2NlbmFyaW9Nb2RlbCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgc2NlLmNvZGUgPXNjZS5jb2RlLnJlcGxhY2UoJy4nLCdfJyk7XHJcbiAgICAgICAgICAgICAgICBzY2UuY29kZSA9c2NlLmNvZGUucmVwbGFjZSgnLicsJ18nKTtcclxuICAgICAgICAgICAgICAgIHNjZS5jb2RlID0gc2NlLmNvZGUuc3Vic3RyKHNjZS5jb2RlLmxhc3RJbmRleE9mKCdfJykrMSk7XHJcbiAgICAgICAgICAgICAgICBpZihzY2UuY29kZSA9PSBqb2IuY2FwYWJpbGl0eV9tYXRyaXhbY2FwXSkgIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICBtYXRjaF92aWV3LmNhcGFiaWxpdHlfbmFtZSA9IGNhcGFiaWxpdHkubmFtZTtcclxuICAgICAgICAgICAgICBtYXRjaF92aWV3LmNvbXBsZXhpdHlfbmFtZSA9IGNvbXBsZXhpdHkubmFtZTtcclxuICAgICAgICAgICAgICBpZihuZXdDYW5kaWRhdGUuY29tcGxleGl0eV9ub3RlX21hdHJpeCAmJiBuZXdDYW5kaWRhdGUuY29tcGxleGl0eV9ub3RlX21hdHJpeFtjYXBdKSB7XHJcbiAgICAgICAgICAgICAgICBtYXRjaF92aWV3LmNvbXBsZXhpdHlOb3RlID0gbmV3Q2FuZGlkYXRlLmNvbXBsZXhpdHlfbm90ZV9tYXRyaXhbY2FwXTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYoam9iX3NjZW5hcmlvc1swXSl7XHJcbiAgICAgICAgICAgICAgICBtYXRjaF92aWV3LmpvYl9zY2VuYXJpb19uYW1lPWpvYl9zY2VuYXJpb3NbMF0ubmFtZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgaWYoc2NlbmFyaW9zWzBdKSB7XHJcbiAgICAgICAgICAgICAgICBtYXRjaF92aWV3LmNhbmRpZGF0ZV9zY2VuYXJpb19uYW1lPXNjZW5hcmlvc1swXS5uYW1lO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG1hdGNoX3ZpZXcuc2NlbmFyaW9fbmFtZSA9IG1hdGNoX3ZpZXcuam9iX3NjZW5hcmlvX25hbWU7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmKGlzRm91bmQpIHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpc0ZvdW5kKSB7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgaWYgKG1hdGNoX3ZpZXcuY2FwYWJpbGl0eV9uYW1lICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIG5ld0NhbmRpZGF0ZVsnbWF0Y2hfbWFwJ11bY2FwXSA9IG1hdGNoX3ZpZXc7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3Q2FuZGlkYXRlO1xyXG4gIH1cclxuXHJcbiAgZ2V0TXVsdGlDb21wYXJlUmVzdWx0KGNhbmRpZGF0ZTogYW55LCBqb2JJZDogc3RyaW5nLCByZWNydWl0ZXJJZDphbnksIGlzQ2FuZGlkYXRlOiBib29sZWFuLCBjYWxsYmFjazogKGVycm9yOiBhbnksIHJlc3VsdDogYW55KSA9PiB2b2lkKSB7XHJcblxyXG4gICAgdGhpcy5jYW5kaWRhdGVSZXBvc2l0b3J5LnJldHJpZXZlQnlNdWx0aUlkc0FuZFBvcHVsYXRlKGNhbmRpZGF0ZSwge30sIChlcnI6IGFueSwgY2FuZGlkYXRlUmVzOiBhbnkpID0+IHtcclxuICAgICAgaWYgKGVycikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKGNhbmRpZGF0ZVJlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBsZXQgZGF0YSA9IHtcclxuICAgICAgICAgICAgJ3Bvc3RlZEpvYic6IGpvYklkXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgbGV0IGpvYlByb2ZpbGVTZXJ2aWNlOiBKb2JQcm9maWxlU2VydmljZSA9IG5ldyBKb2JQcm9maWxlU2VydmljZSgpO1xyXG4gICAgICAgICAgam9iUHJvZmlsZVNlcnZpY2UucmV0cmlldmUoZGF0YSwgKGVyckluSm9iLCByZXNPZlJlY3J1aXRlcikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZXJySW5Kb2IpIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnJJbkpvYiwgbnVsbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgdmFyIGpvYk5hbWUgPSByZXNPZlJlY3J1aXRlci5wb3N0ZWRKb2JzWzBdLmluZHVzdHJ5Lm5hbWU7XHJcbiAgICAgICAgICAgICAgdmFyIGpvYiA9IHJlc09mUmVjcnVpdGVyLnBvc3RlZEpvYnNbMF07XHJcbiAgICAgICAgICAgICAgdGhpcy5pbmR1c3RyeVJlcG9zaXRvcnkucmV0cmlldmUoeyduYW1lJzogam9iTmFtZX0sIChlcnI6IGFueSwgaW5kdXN0cmllczogSW5kdXN0cnlNb2RlbFtdKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICB2YXIgY29tcGFyZVJlc3VsdDogUHJvZmlsZUNvbXBhcmlzb25EYXRhTW9kZWxbXSA9IG5ldyBBcnJheSgwKTtcclxuICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZVJlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdDYW5kaWRhdGUgPSB0aGlzLmdldENvbXBhcmVEYXRhKGNhbmRpZGF0ZSwgam9iLCBpc0NhbmRpZGF0ZSwgaW5kdXN0cmllcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0NhbmRpZGF0ZSA9IHRoaXMuZ2V0TGlzdFN0YXR1c09mQ2FuZGlkYXRlKG5ld0NhbmRpZGF0ZSxqb2IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdDYW5kaWRhdGUgPSB0aGlzLnNvcnRDYW5kaWRhdGVTa2lsbHMobmV3Q2FuZGlkYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBjb21wYXJlUmVzdWx0LnB1c2gobmV3Q2FuZGlkYXRlKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBsZXQgcHJvZmlsZUNvbXBhcmlzb25Nb2RlbDpQcm9maWxlQ29tcGFyaXNvbk1vZGVsID0gbmV3IFByb2ZpbGVDb21wYXJpc29uTW9kZWwoKTtcclxuICAgICAgICAgICAgICAgICAgcHJvZmlsZUNvbXBhcmlzb25Nb2RlbC5wcm9maWxlQ29tcGFyaXNvbkRhdGEgPSBjb21wYXJlUmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgICB2YXIgam9iRGV0YWlsczpQcm9maWxlQ29tcGFyaXNvbkpvYk1vZGVsID0gdGhpcy5nZXRKb2JEZXRhaWxzRm9yQ29tcGFyaXNvbihqb2IpO1xyXG4gICAgICAgICAgICAgICAgICBwcm9maWxlQ29tcGFyaXNvbk1vZGVsLnByb2ZpbGVDb21wYXJpc29uSm9iRGF0YSA9IGpvYkRldGFpbHM7XHJcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHByb2ZpbGVDb21wYXJpc29uTW9kZWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ05vIENhbmRpZGF0ZSBQcm9maWxlIFJlc3VsdCBGb3VuZCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRKb2JEZXRhaWxzRm9yQ29tcGFyaXNvbihqb2I6Sm9iUHJvZmlsZU1vZGVsKSB7XHJcbiAgICB2YXIgcHJvZmlsZUNvbXBhcmlzb25Kb2JNb2RlbDpQcm9maWxlQ29tcGFyaXNvbkpvYk1vZGVsID0gbmV3IFByb2ZpbGVDb21wYXJpc29uSm9iTW9kZWwoKTtcclxuICAgIHByb2ZpbGVDb21wYXJpc29uSm9iTW9kZWwuY2l0eSA9IGpvYi5sb2NhdGlvbi5jaXR5O1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25Kb2JNb2RlbC5jb3VudHJ5ID0gam9iLmxvY2F0aW9uLmNvdW50cnk7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvbkpvYk1vZGVsLnN0YXRlID0gam9iLmxvY2F0aW9uLnN0YXRlO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25Kb2JNb2RlbC5lZHVjYXRpb24gPSBqb2IuZWR1Y2F0aW9uO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25Kb2JNb2RlbC5leHBlcmllbmNlTWF4VmFsdWUgPSBqb2IuZXhwZXJpZW5jZU1heFZhbHVlO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25Kb2JNb2RlbC5leHBlcmllbmNlTWluVmFsdWUgPSBqb2IuZXhwZXJpZW5jZU1pblZhbHVlO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25Kb2JNb2RlbC5pbmR1c3RyeU5hbWUgPSBqb2IuaW5kdXN0cnkubmFtZTtcclxuICAgIHByb2ZpbGVDb21wYXJpc29uSm9iTW9kZWwuam9iVGl0bGUgPSBqb2Iuam9iVGl0bGU7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvbkpvYk1vZGVsLmpvaW5pbmdQZXJpb2QgPSBqb2Iuam9pbmluZ1BlcmlvZDtcclxuICAgIHByb2ZpbGVDb21wYXJpc29uSm9iTW9kZWwuc2FsYXJ5TWF4VmFsdWUgPSBqb2Iuc2FsYXJ5TWF4VmFsdWU7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvbkpvYk1vZGVsLnNhbGFyeU1pblZhbHVlID0gam9iLnNhbGFyeU1pblZhbHVlO1xyXG4gICAgcHJvZmlsZUNvbXBhcmlzb25Kb2JNb2RlbC5wcm9maWNpZW5jaWVzID0gam9iLnByb2ZpY2llbmNpZXM7XHJcbiAgICBwcm9maWxlQ29tcGFyaXNvbkpvYk1vZGVsLmludGVyZXN0ZWRJbmR1c3RyaWVzID0gam9iLmludGVyZXN0ZWRJbmR1c3RyaWVzO1xyXG4gICAgcmV0dXJuIHByb2ZpbGVDb21wYXJpc29uSm9iTW9kZWw7XHJcbiAgfVxyXG4gIGdldExpc3RTdGF0dXNPZkNhbmRpZGF0ZShuZXdDYW5kaWRhdGU6UHJvZmlsZUNvbXBhcmlzb25EYXRhTW9kZWwsam9iUHJvZmlsZTpKb2JQcm9maWxlTW9kZWwpIHtcclxuICAgIHZhciBjYW5kaWRhdGVMaXN0U3RhdHVzOnN0cmluZ1tdID0gbmV3IEFycmF5KDApO1xyXG4gICAgZm9yKGxldCBsaXN0IG9mIGpvYlByb2ZpbGUuY2FuZGlkYXRlX2xpc3QpIHtcclxuICAgICAgZm9yKGxldCBpZCBvZiBsaXN0Lmlkcykge1xyXG4gICAgICAgICBpZihuZXdDYW5kaWRhdGUuX2lkID09IGlkKSB7XHJcbiAgICAgICAgICAgY2FuZGlkYXRlTGlzdFN0YXR1cy5wdXNoKGxpc3QubmFtZSk7XHJcbiAgICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYoY2FuZGlkYXRlTGlzdFN0YXR1cy5sZW5ndGggPT0gMCkge1xyXG4gICAgICBjYW5kaWRhdGVMaXN0U3RhdHVzLnB1c2goJ21hdGNoZWRMaXN0Jyk7XHJcbiAgICB9XHJcbiAgICBuZXdDYW5kaWRhdGUuY2FuZGlkYXRlTGlzdFN0YXR1cyA9IGNhbmRpZGF0ZUxpc3RTdGF0dXM7XHJcbiAgICByZXR1cm4gbmV3Q2FuZGlkYXRlO1xyXG4gIH1cclxuXHJcbiAgc29ydENhbmRpZGF0ZVNraWxscyhuZXdDYW5kaWRhdGU6UHJvZmlsZUNvbXBhcmlzb25EYXRhTW9kZWwpIHtcclxuXHJcbiAgICB2YXIgc2tpbGxTdGF0dXNEYXRhOlNraWxsU3RhdHVzW10gPSBuZXcgQXJyYXkoMCk7XHJcbiAgICBmb3IobGV0IHZhbHVlIG9mIG5ld0NhbmRpZGF0ZS5wcm9maWNpZW5jaWVzTWF0Y2gpIHtcclxuICAgICAgdmFyIHNraWxsU3RhdHVzOlNraWxsU3RhdHVzID0gbmV3IFNraWxsU3RhdHVzKCk7XHJcbiAgICAgIHNraWxsU3RhdHVzLm5hbWUgPSB2YWx1ZTtcclxuICAgICAgc2tpbGxTdGF0dXMuc3RhdHVzID0gJ01hdGNoJztcclxuICAgICAgc2tpbGxTdGF0dXNEYXRhLnB1c2goc2tpbGxTdGF0dXMpO1xyXG4gICAgfVxyXG4gICAgZm9yKGxldCB2YWx1ZSBvZiBuZXdDYW5kaWRhdGUucHJvZmljaWVuY2llc1VuTWF0Y2gpIHtcclxuICAgICAgdmFyIHNraWxsU3RhdHVzOlNraWxsU3RhdHVzID0gbmV3IFNraWxsU3RhdHVzKCk7XHJcbiAgICAgIHNraWxsU3RhdHVzLm5hbWUgPSB2YWx1ZTtcclxuICAgICAgc2tpbGxTdGF0dXMuc3RhdHVzID0gJ1VuTWF0Y2gnO1xyXG4gICAgICBza2lsbFN0YXR1c0RhdGEucHVzaChza2lsbFN0YXR1cyk7XHJcbiAgICB9XHJcbiAgICBuZXdDYW5kaWRhdGUuY2FuZGlkYXRlU2tpbGxTdGF0dXMgPSBza2lsbFN0YXR1c0RhdGE7XHJcbiAgICByZXR1cm4gbmV3Q2FuZGlkYXRlO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q2FuZGlkYXRlVmlzaWJpbGl0eUFnYWluc3RSZWNydWl0ZXIoY2FuZGlkYXRlRGV0YWlsczpDYW5kaWRhdGVNb2RlbCwgam9iUHJvZmlsZXM6Sm9iUHJvZmlsZU1vZGVsW10pIHtcclxuICAgIGxldCBpc0dvdEl0ID0gdHJ1ZTtcclxuICAgIHZhciBfY2FuRGV0YWlsc1dpdGhKb2JNYXRjaGluZzpDYW5kaWRhdGVEZXRhaWxzV2l0aEpvYk1hdGNoaW5nID0gbmV3IENhbmRpZGF0ZURldGFpbHNXaXRoSm9iTWF0Y2hpbmcoKTtcclxuICAgIGZvciAobGV0IGpvYiBvZiBqb2JQcm9maWxlcykge1xyXG4gICAgICBmb3IgKGxldCBpdGVtIG9mIGpvYi5jYW5kaWRhdGVfbGlzdCkge1xyXG4gICAgICAgIGlmIChpdGVtLm5hbWUgPT09ICdjYXJ0TGlzdGVkJykge1xyXG4gICAgICAgICAgaWYgKGl0ZW0uaWRzLmluZGV4T2YobmV3IG1vbmdvb3NlLlR5cGVzLk9iamVjdElkKGNhbmRpZGF0ZURldGFpbHMuX2lkKS50b1N0cmluZygpKSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgaXNHb3RJdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgaWYgKCFpc0dvdEl0KSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoaXNHb3RJdCkge1xyXG4gICAgICBjYW5kaWRhdGVEZXRhaWxzLnVzZXJJZC5tb2JpbGVfbnVtYmVyID0gVXRpbGl0eUZ1bmN0aW9uLm1vYmlsZU51bWJlckhpZGVyKGNhbmRpZGF0ZURldGFpbHMudXNlcklkLm1vYmlsZV9udW1iZXIpO1xyXG4gICAgICBjYW5kaWRhdGVEZXRhaWxzLnVzZXJJZC5lbWFpbCA9IFV0aWxpdHlGdW5jdGlvbi5lbWFpbFZhbHVlSGlkZXIoY2FuZGlkYXRlRGV0YWlscy51c2VySWQuZW1haWwpO1xyXG4gICAgICBjYW5kaWRhdGVEZXRhaWxzLmFjYWRlbWljcyA9IFtdO1xyXG4gICAgICBjYW5kaWRhdGVEZXRhaWxzLmVtcGxveW1lbnRIaXN0b3J5ID0gW107XHJcbiAgICAgIGNhbmRpZGF0ZURldGFpbHMuYXJlYU9mV29yayA9IFtdO1xyXG4gICAgICBjYW5kaWRhdGVEZXRhaWxzLnByb2ZpY2llbmNpZXMgPSBbXTtcclxuICAgICAgY2FuZGlkYXRlRGV0YWlscy5hd2FyZHMgPSBbXTtcclxuICAgICAgY2FuZGlkYXRlRGV0YWlscy5wcm9maWNpZW5jaWVzID0gW107XHJcbiAgICAgIGNhbmRpZGF0ZURldGFpbHMucHJvZmVzc2lvbmFsRGV0YWlscy5lZHVjYXRpb24gPSBVdGlsaXR5RnVuY3Rpb24udmFsdWVIaWRlKGNhbmRpZGF0ZURldGFpbHMucHJvZmVzc2lvbmFsRGV0YWlscy5lZHVjYXRpb24pXHJcbiAgICAgIGNhbmRpZGF0ZURldGFpbHMucHJvZmVzc2lvbmFsRGV0YWlscy5leHBlcmllbmNlID0gVXRpbGl0eUZ1bmN0aW9uLnZhbHVlSGlkZShjYW5kaWRhdGVEZXRhaWxzLnByb2Zlc3Npb25hbERldGFpbHMuZXhwZXJpZW5jZSlcclxuICAgICAgY2FuZGlkYXRlRGV0YWlscy5wcm9mZXNzaW9uYWxEZXRhaWxzLmluZHVzdHJ5RXhwb3N1cmUgPSBVdGlsaXR5RnVuY3Rpb24udmFsdWVIaWRlKGNhbmRpZGF0ZURldGFpbHMucHJvZmVzc2lvbmFsRGV0YWlscy5pbmR1c3RyeUV4cG9zdXJlKTtcclxuICAgICAgY2FuZGlkYXRlRGV0YWlscy5wcm9mZXNzaW9uYWxEZXRhaWxzLmN1cnJlbnRTYWxhcnkgPSBVdGlsaXR5RnVuY3Rpb24udmFsdWVIaWRlKGNhbmRpZGF0ZURldGFpbHMucHJvZmVzc2lvbmFsRGV0YWlscy5jdXJyZW50U2FsYXJ5KTtcclxuICAgICAgY2FuZGlkYXRlRGV0YWlscy5wcm9mZXNzaW9uYWxEZXRhaWxzLm5vdGljZVBlcmlvZCA9IFV0aWxpdHlGdW5jdGlvbi52YWx1ZUhpZGUoY2FuZGlkYXRlRGV0YWlscy5wcm9mZXNzaW9uYWxEZXRhaWxzLm5vdGljZVBlcmlvZCk7XHJcbiAgICAgIGNhbmRpZGF0ZURldGFpbHMucHJvZmVzc2lvbmFsRGV0YWlscy5yZWxvY2F0ZSA9IFV0aWxpdHlGdW5jdGlvbi52YWx1ZUhpZGUoY2FuZGlkYXRlRGV0YWlscy5wcm9mZXNzaW9uYWxEZXRhaWxzLnJlbG9jYXRlKTtcclxuICAgIH1cclxuICAgIGNhbmRpZGF0ZURldGFpbHMudXNlcklkLnBhc3N3b3JkID0gJyc7XHJcbiAgICBfY2FuRGV0YWlsc1dpdGhKb2JNYXRjaGluZy5jYW5kaWRhdGVEZXRhaWxzID0gY2FuZGlkYXRlRGV0YWlscztcclxuICAgIF9jYW5EZXRhaWxzV2l0aEpvYk1hdGNoaW5nLmlzU2hvd0NhbmRpZGF0ZURldGFpbHMgPSBpc0dvdEl0O1xyXG4gICAgcmV0dXJuIF9jYW5EZXRhaWxzV2l0aEpvYk1hdGNoaW5nO1xyXG4gIH1cclxufVxyXG5cclxuT2JqZWN0LnNlYWwoU2VhcmNoU2VydmljZSk7XHJcbmV4cG9ydCA9IFNlYXJjaFNlcnZpY2U7XHJcbiJdfQ==
