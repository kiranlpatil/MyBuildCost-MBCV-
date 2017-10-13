"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var RecruiterSchema = require("../schemas/recruiter.schema");
var RepositoryBase = require("./base/repository.base");
var job_q_card_1 = require("../../search/model/job-q-card");
var sharedconstants_1 = require("../../shared/sharedconstants");
var RecruiterRepository = (function (_super) {
    __extends(RecruiterRepository, _super);
    function RecruiterRepository() {
        return _super.call(this, RecruiterSchema) || this;
    }
    RecruiterRepository.prototype.getJobProfileQCard = function (recruiters, candidate, jobProfileIds, isSearchView, callback) {
        var isSend = false;
        var jobs_cards = new Array(0);
        if (recruiters.length === 0) {
            callback(null, jobs_cards);
        }
        for (var _i = 0, recruiters_1 = recruiters; _i < recruiters_1.length; _i++) {
            var recruiter = recruiters_1[_i];
            for (var _a = 0, _b = recruiter.postedJobs; _a < _b.length; _a++) {
                var job = _b[_a];
                var isreleventIndustryMatch = false;
                if (job.releventIndustries.indexOf(candidate.industry.name) !== -1) {
                    isreleventIndustryMatch = true;
                }
                if (!job.isJobPosted || (candidate.industry.code !== job.industry.code && !isreleventIndustryMatch)) {
                    continue;
                }
                var isPresent = false;
                for (var _c = 0, _d = candidate.proficiencies; _c < _d.length; _c++) {
                    var proficiency = _d[_c];
                    if (job.proficiencies.indexOf(proficiency) !== -1) {
                        if (job.interestedIndustries.indexOf('None') !== -1) {
                            isPresent = true;
                            break;
                        }
                        for (var _e = 0, _f = candidate.interestedIndustries; _e < _f.length; _e++) {
                            var industry = _f[_e];
                            if (job.interestedIndustries.indexOf(industry) !== -1) {
                                isPresent = true;
                            }
                        }
                    }
                }
                if (isPresent) {
                    if (jobProfileIds) {
                        if (jobProfileIds.indexOf(job._id) == -1) {
                            continue;
                        }
                    }
                    else {
                        var isFound = false;
                        if (isSearchView !== 'searchView') {
                            for (var _g = 0, _h = candidate.job_list; _g < _h.length; _g++) {
                                var list = _h[_g];
                                if (list.ids.indexOf(job._id) != -1) {
                                    isFound = true;
                                    break;
                                }
                            }
                        }
                        if (isFound) {
                            continue;
                        }
                    }
                    var job_qcard = new job_q_card_1.JobQCard();
                    job_qcard.matching = 0;
                    var count = 0;
                    for (var cap in job.capability_matrix) {
                        if (job.capability_matrix[cap] == -1 || job.capability_matrix[cap] == 0 || job.capability_matrix[cap] == undefined) {
                        }
                        else if (job.capability_matrix[cap] == candidate.capability_matrix[cap]) {
                            job_qcard.exact_matching += 1;
                            count++;
                        }
                        else if (job.capability_matrix[cap] == (Number(candidate.capability_matrix[cap]) - sharedconstants_1.ConstVariables.DIFFERENCE_IN_COMPLEXITY_SCENARIO)) {
                            job_qcard.above_one_step_matching += 1;
                            count++;
                        }
                        else if (job.capability_matrix[cap] == (Number(candidate.capability_matrix[cap]) + sharedconstants_1.ConstVariables.DIFFERENCE_IN_COMPLEXITY_SCENARIO)) {
                            job_qcard.below_one_step_matching += 1;
                            count++;
                        }
                        else {
                            count++;
                        }
                    }
                    job_qcard.above_one_step_matching = (job_qcard.above_one_step_matching / count) * 100;
                    job_qcard.below_one_step_matching = (job_qcard.below_one_step_matching / count) * 100;
                    job_qcard.exact_matching = (job_qcard.exact_matching / count) * 100;
                    job_qcard.matching = job_qcard.above_one_step_matching + job_qcard.below_one_step_matching + job_qcard.exact_matching;
                    job_qcard.company_name = recruiter.company_name;
                    job_qcard.company_size = recruiter.company_size;
                    job_qcard.company_logo = recruiter.company_logo;
                    job_qcard.company_website = recruiter.company_website;
                    job_qcard.salaryMinValue = job.salaryMinValue;
                    job_qcard.salaryMaxValue = job.salaryMaxValue;
                    job_qcard.experienceMinValue = job.experienceMinValue;
                    job_qcard.experienceMaxValue = job.experienceMaxValue;
                    job_qcard.education = job.education;
                    job_qcard.interestedIndustries = job.interestedIndustries;
                    job_qcard.proficiencies = job.proficiencies;
                    job_qcard.location = job.location.city;
                    job_qcard._id = job._id;
                    job_qcard.industry = job.industry.name;
                    job_qcard.jobTitle = job.jobTitle;
                    job_qcard.joiningPeriod = job.joiningPeriod;
                    job_qcard.postingDate = job.postingDate;
                    job_qcard.hideCompanyName = job.hideCompanyName;
                    job_qcard.candidate_list = job.candidate_list;
                    if ((job_qcard.above_one_step_matching + job_qcard.exact_matching) >= sharedconstants_1.ConstVariables.LOWER_LIMIT_FOR_SEARCH_RESULT) {
                        jobs_cards.push(job_qcard);
                    }
                }
            }
            if (recruiters.indexOf(recruiter) == recruiters.length - 1) {
                isSend = true;
                jobs_cards.sort(function (first, second) {
                    if ((first.above_one_step_matching + first.exact_matching) > (second.above_one_step_matching + second.exact_matching)) {
                        return -1;
                    }
                    if ((first.above_one_step_matching + first.exact_matching) < (second.above_one_step_matching + second.exact_matching)) {
                        return 1;
                    }
                    return 0;
                });
                callback(null, jobs_cards);
            }
        }
    };
    return RecruiterRepository;
}(RepositoryBase));
Object.seal(RecruiterRepository);
module.exports = RecruiterRepository;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L3JlY3J1aXRlci5yZXBvc2l0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsNkRBQWdFO0FBQ2hFLHVEQUEwRDtBQUUxRCw0REFBdUQ7QUFDdkQsZ0VBQTREO0FBRzVEO0lBQWtDLHVDQUEwQjtJQUMxRDtlQUNFLGtCQUFNLGVBQWUsQ0FBQztJQUN4QixDQUFDO0lBRUQsZ0RBQWtCLEdBQWxCLFVBQW1CLFVBQWdCLEVBQUUsU0FBd0IsRUFBRSxhQUFzQixFQUFFLFlBQW1CLEVBQUUsUUFBd0M7UUFDbEosSUFBSSxNQUFNLEdBQWEsS0FBSyxDQUFDO1FBQzdCLElBQUksVUFBVSxHQUFlLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFDLEVBQUUsQ0FBQSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixRQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzdCLENBQUM7UUFDRCxHQUFHLENBQUMsQ0FBa0IsVUFBVSxFQUFWLHlCQUFVLEVBQVYsd0JBQVUsRUFBVixJQUFVO1lBQTNCLElBQUksU0FBUyxtQkFBQTtZQUNoQixHQUFHLENBQUMsQ0FBWSxVQUFvQixFQUFwQixLQUFBLFNBQVMsQ0FBQyxVQUFVLEVBQXBCLGNBQW9CLEVBQXBCLElBQW9CO2dCQUEvQixJQUFJLEdBQUcsU0FBQTtnQkFDVixJQUFJLHVCQUF1QixHQUFDLEtBQUssQ0FBQTtnQkFDL0IsRUFBRSxDQUFBLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDaEUsdUJBQXVCLEdBQUMsSUFBSSxDQUFDO2dCQUMvQixDQUFDO2dCQUNELEVBQUUsQ0FBQSxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ25HLFFBQVEsQ0FBQztnQkFDWCxDQUFDO2dCQUNELElBQUksU0FBUyxHQUFZLEtBQUssQ0FBQztnQkFDL0IsR0FBRyxDQUFDLENBQW9CLFVBQXVCLEVBQXZCLEtBQUEsU0FBUyxDQUFDLGFBQWEsRUFBdkIsY0FBdUIsRUFBdkIsSUFBdUI7b0JBQTFDLElBQUksV0FBVyxTQUFBO29CQUNsQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2xELEVBQUUsQ0FBQSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNuRCxTQUFTLEdBQUcsSUFBSSxDQUFDOzRCQUNqQixLQUFLLENBQUM7d0JBQ1IsQ0FBQzt3QkFDRCxHQUFHLENBQUMsQ0FBaUIsVUFBOEIsRUFBOUIsS0FBQSxTQUFTLENBQUMsb0JBQW9CLEVBQTlCLGNBQThCLEVBQTlCLElBQThCOzRCQUE5QyxJQUFJLFFBQVEsU0FBQTs0QkFDZixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDdEQsU0FBUyxHQUFHLElBQUksQ0FBQzs0QkFDbkIsQ0FBQzt5QkFDRjtvQkFDSCxDQUFDO2lCQUNGO2dCQUNELEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ2QsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzt3QkFDbEIsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUN6QyxRQUFRLENBQUM7d0JBQ1gsQ0FBQztvQkFDSCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNOLElBQUksT0FBTyxHQUFZLEtBQUssQ0FBQzt3QkFDN0IsRUFBRSxDQUFDLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUM7NEJBQ2xDLEdBQUcsQ0FBQyxDQUFhLFVBQWtCLEVBQWxCLEtBQUEsU0FBUyxDQUFDLFFBQVEsRUFBbEIsY0FBa0IsRUFBbEIsSUFBa0I7Z0NBQTlCLElBQUksSUFBSSxTQUFBO2dDQUNYLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQ3BDLE9BQU8sR0FBRyxJQUFJLENBQUM7b0NBQ2YsS0FBSyxDQUFDO2dDQUNSLENBQUM7NkJBQ0Y7d0JBQ0gsQ0FBQzt3QkFDRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDOzRCQUNaLFFBQVEsQ0FBQzt3QkFDWCxDQUFDO29CQUNILENBQUM7b0JBQ0QsSUFBSSxTQUFTLEdBQWEsSUFBSSxxQkFBUSxFQUFFLENBQUM7b0JBQ3pDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO29CQUN2QixJQUFJLEtBQUssR0FBWSxDQUFDLENBQUM7b0JBQ3ZCLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7d0JBQ3RDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO3dCQUNySCxDQUFDO3dCQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDMUUsU0FBUyxDQUFDLGNBQWMsSUFBSSxDQUFDLENBQUM7NEJBQzlCLEtBQUssRUFBRSxDQUFDO3dCQUNWLENBQUM7d0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxnQ0FBYyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUN2SSxTQUFTLENBQUMsdUJBQXVCLElBQUksQ0FBQyxDQUFDOzRCQUN2QyxLQUFLLEVBQUUsQ0FBQzt3QkFDVixDQUFDO3dCQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsZ0NBQWMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDdkksU0FBUyxDQUFDLHVCQUF1QixJQUFJLENBQUMsQ0FBQzs0QkFDdkMsS0FBSyxFQUFFLENBQUM7d0JBQ1YsQ0FBQzt3QkFBQyxJQUFJLENBQUMsQ0FBQzs0QkFDTixLQUFLLEVBQUUsQ0FBQzt3QkFDVixDQUFDO29CQUNILENBQUM7b0JBRUQsU0FBUyxDQUFDLHVCQUF1QixHQUFHLENBQUMsU0FBUyxDQUFDLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQztvQkFDdEYsU0FBUyxDQUFDLHVCQUF1QixHQUFHLENBQUMsU0FBUyxDQUFDLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQztvQkFDdEYsU0FBUyxDQUFDLGNBQWMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDO29CQUNwRSxTQUFTLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQyx1QkFBdUIsR0FBRyxTQUFTLENBQUMsdUJBQXVCLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQztvQkFDdEgsU0FBUyxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDO29CQUNoRCxTQUFTLENBQUMsWUFBWSxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUM7b0JBQ2hELFNBQVMsQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQztvQkFDaEQsU0FBUyxDQUFDLGVBQWUsR0FBRSxTQUFTLENBQUMsZUFBZSxDQUFDO29CQUNyRCxTQUFTLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUM7b0JBQzlDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQztvQkFDOUMsU0FBUyxDQUFDLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztvQkFDdEQsU0FBUyxDQUFDLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztvQkFDdEQsU0FBUyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO29CQUNwQyxTQUFTLENBQUMsb0JBQW9CLEdBQUcsR0FBRyxDQUFDLG9CQUFvQixDQUFDO29CQUMxRCxTQUFTLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUM7b0JBQzVDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0JBQ3ZDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztvQkFDeEIsU0FBUyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztvQkFDdkMsU0FBUyxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDO29CQUNsQyxTQUFTLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUM7b0JBQzVDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQztvQkFDeEMsU0FBUyxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDO29CQUNoRCxTQUFTLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUM7b0JBQzlDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLHVCQUF1QixHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxnQ0FBYyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQzt3QkFDbkgsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDN0IsQ0FBQztnQkFDSCxDQUFDO2FBQ0Y7WUFDRCxFQUFFLENBQUEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEQsTUFBTSxHQUFFLElBQUksQ0FBQztnQkFDYixVQUFVLENBQUMsSUFBSSxDQUFDLFVBQUMsS0FBZSxFQUFDLE1BQWlCO29CQUNoRCxFQUFFLENBQUEsQ0FBQyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsR0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUUsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEdBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBRSxDQUFDLENBQUEsQ0FBQzt3QkFDaEgsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNaLENBQUM7b0JBQ0QsRUFBRSxDQUFBLENBQUMsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEdBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLHVCQUF1QixHQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQ2xILE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQ1gsQ0FBQztvQkFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNYLENBQUMsQ0FBQyxDQUFDO2dCQUNILFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDN0IsQ0FBQztTQUNKO0lBRUgsQ0FBQztJQUdILDBCQUFDO0FBQUQsQ0F0SEEsQUFzSEMsQ0F0SGlDLGNBQWMsR0FzSC9DO0FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ2pDLGlCQUFTLG1CQUFtQixDQUFDIiwiZmlsZSI6ImFwcC9mcmFtZXdvcmsvZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L3JlY3J1aXRlci5yZXBvc2l0b3J5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJlY3J1aXRlclNjaGVtYSA9IHJlcXVpcmUoJy4uL3NjaGVtYXMvcmVjcnVpdGVyLnNjaGVtYScpO1xyXG5pbXBvcnQgUmVwb3NpdG9yeUJhc2UgPSByZXF1aXJlKCcuL2Jhc2UvcmVwb3NpdG9yeS5iYXNlJyk7XHJcbmltcG9ydCBJUmVjcnVpdGVyID0gcmVxdWlyZSgnLi4vbW9uZ29vc2UvcmVjcnVpdGVyJyk7XHJcbmltcG9ydCB7Sm9iUUNhcmR9IGZyb20gXCIuLi8uLi9zZWFyY2gvbW9kZWwvam9iLXEtY2FyZFwiO1xyXG5pbXBvcnQge0NvbnN0VmFyaWFibGVzfSBmcm9tIFwiLi4vLi4vc2hhcmVkL3NoYXJlZGNvbnN0YW50c1wiO1xyXG5pbXBvcnQgQ2FuZGlkYXRlTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbC9jYW5kaWRhdGUubW9kZWwnKTtcclxuXHJcbmNsYXNzIFJlY3J1aXRlclJlcG9zaXRvcnkgZXh0ZW5kcyBSZXBvc2l0b3J5QmFzZTxJUmVjcnVpdGVyPiB7XHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcihSZWNydWl0ZXJTY2hlbWEpO1xyXG4gIH1cclxuXHJcbiAgZ2V0Sm9iUHJvZmlsZVFDYXJkKHJlY3J1aXRlcnM6YW55W10sIGNhbmRpZGF0ZTpDYW5kaWRhdGVNb2RlbCwgam9iUHJvZmlsZUlkczpzdHJpbmdbXSwgaXNTZWFyY2hWaWV3OnN0cmluZywgY2FsbGJhY2s6KGVycm9yOmFueSwgcmVzdWx0OmFueSkgPT4gdm9pZCkge1xyXG4gICAgbGV0IGlzU2VuZCA6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGxldCBqb2JzX2NhcmRzOiBKb2JRQ2FyZFtdID0gbmV3IEFycmF5KDApO1xyXG4gICAgaWYocmVjcnVpdGVycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgY2FsbGJhY2sobnVsbCwgam9ic19jYXJkcyk7XHJcbiAgICB9XHJcbiAgICBmb3IgKGxldCByZWNydWl0ZXIgb2YgcmVjcnVpdGVycykge1xyXG4gICAgICBmb3IgKGxldCBqb2Igb2YgcmVjcnVpdGVyLnBvc3RlZEpvYnMpIHtcclxuICAgICAgICBsZXQgaXNyZWxldmVudEluZHVzdHJ5TWF0Y2g9ZmFsc2VcclxuICAgICAgICAgIGlmKGpvYi5yZWxldmVudEluZHVzdHJpZXMuaW5kZXhPZihjYW5kaWRhdGUuaW5kdXN0cnkubmFtZSkhPT0tMSkge1xyXG4gICAgICAgICAgICBpc3JlbGV2ZW50SW5kdXN0cnlNYXRjaD10cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYoIWpvYi5pc0pvYlBvc3RlZCB8fCAoY2FuZGlkYXRlLmluZHVzdHJ5LmNvZGUhPT1qb2IuaW5kdXN0cnkuY29kZSAmJiAhaXNyZWxldmVudEluZHVzdHJ5TWF0Y2gpKSB7XHJcbiAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGlzUHJlc2VudDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGZvciAobGV0IHByb2ZpY2llbmN5IG9mIGNhbmRpZGF0ZS5wcm9maWNpZW5jaWVzKSB7XHJcbiAgICAgICAgICBpZiAoam9iLnByb2ZpY2llbmNpZXMuaW5kZXhPZihwcm9maWNpZW5jeSkgIT09IC0xKSB7XHJcbiAgICAgICAgICAgIGlmKGpvYi5pbnRlcmVzdGVkSW5kdXN0cmllcy5pbmRleE9mKCdOb25lJykgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgaXNQcmVzZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpbmR1c3RyeSBvZiBjYW5kaWRhdGUuaW50ZXJlc3RlZEluZHVzdHJpZXMpIHtcclxuICAgICAgICAgICAgICBpZiAoam9iLmludGVyZXN0ZWRJbmR1c3RyaWVzLmluZGV4T2YoaW5kdXN0cnkpICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgaXNQcmVzZW50ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGlzUHJlc2VudCkge1xyXG4gICAgICAgICAgaWYgKGpvYlByb2ZpbGVJZHMpIHtcclxuICAgICAgICAgICAgaWYgKGpvYlByb2ZpbGVJZHMuaW5kZXhPZihqb2IuX2lkKSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgaXNGb3VuZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAoaXNTZWFyY2hWaWV3ICE9PSAnc2VhcmNoVmlldycpIHtcclxuICAgICAgICAgICAgICBmb3IgKGxldCBsaXN0IG9mIGNhbmRpZGF0ZS5qb2JfbGlzdCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxpc3QuaWRzLmluZGV4T2Yoam9iLl9pZCkgIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgaXNGb3VuZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaXNGb3VuZCkge1xyXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBsZXQgam9iX3FjYXJkOiBKb2JRQ2FyZCA9IG5ldyBKb2JRQ2FyZCgpO1xyXG4gICAgICAgICAgam9iX3FjYXJkLm1hdGNoaW5nID0gMDtcclxuICAgICAgICAgIGxldCBjb3VudCA6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICBmb3IgKGxldCBjYXAgaW4gam9iLmNhcGFiaWxpdHlfbWF0cml4KSB7XHJcbiAgICAgICAgICAgIGlmIChqb2IuY2FwYWJpbGl0eV9tYXRyaXhbY2FwXSA9PSAtMSB8fCBqb2IuY2FwYWJpbGl0eV9tYXRyaXhbY2FwXSA9PSAwIHx8IGpvYi5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGpvYi5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IGNhbmRpZGF0ZS5jYXBhYmlsaXR5X21hdHJpeFtjYXBdKSB7XHJcbiAgICAgICAgICAgICAgam9iX3FjYXJkLmV4YWN0X21hdGNoaW5nICs9IDE7XHJcbiAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChqb2IuY2FwYWJpbGl0eV9tYXRyaXhbY2FwXSA9PSAoTnVtYmVyKGNhbmRpZGF0ZS5jYXBhYmlsaXR5X21hdHJpeFtjYXBdKSAtIENvbnN0VmFyaWFibGVzLkRJRkZFUkVOQ0VfSU5fQ09NUExFWElUWV9TQ0VOQVJJTykpIHtcclxuICAgICAgICAgICAgICBqb2JfcWNhcmQuYWJvdmVfb25lX3N0ZXBfbWF0Y2hpbmcgKz0gMTtcclxuICAgICAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGpvYi5jYXBhYmlsaXR5X21hdHJpeFtjYXBdID09IChOdW1iZXIoY2FuZGlkYXRlLmNhcGFiaWxpdHlfbWF0cml4W2NhcF0pICsgQ29uc3RWYXJpYWJsZXMuRElGRkVSRU5DRV9JTl9DT01QTEVYSVRZX1NDRU5BUklPKSkge1xyXG4gICAgICAgICAgICAgIGpvYl9xY2FyZC5iZWxvd19vbmVfc3RlcF9tYXRjaGluZyArPSAxO1xyXG4gICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGpvYl9xY2FyZC5hYm92ZV9vbmVfc3RlcF9tYXRjaGluZyA9IChqb2JfcWNhcmQuYWJvdmVfb25lX3N0ZXBfbWF0Y2hpbmcgLyBjb3VudCkgKiAxMDA7XHJcbiAgICAgICAgICBqb2JfcWNhcmQuYmVsb3dfb25lX3N0ZXBfbWF0Y2hpbmcgPSAoam9iX3FjYXJkLmJlbG93X29uZV9zdGVwX21hdGNoaW5nIC8gY291bnQpICogMTAwO1xyXG4gICAgICAgICAgam9iX3FjYXJkLmV4YWN0X21hdGNoaW5nID0gKGpvYl9xY2FyZC5leGFjdF9tYXRjaGluZyAvIGNvdW50KSAqIDEwMDtcclxuICAgICAgICAgIGpvYl9xY2FyZC5tYXRjaGluZyA9IGpvYl9xY2FyZC5hYm92ZV9vbmVfc3RlcF9tYXRjaGluZyArIGpvYl9xY2FyZC5iZWxvd19vbmVfc3RlcF9tYXRjaGluZyArIGpvYl9xY2FyZC5leGFjdF9tYXRjaGluZztcclxuICAgICAgICAgIGpvYl9xY2FyZC5jb21wYW55X25hbWUgPSByZWNydWl0ZXIuY29tcGFueV9uYW1lO1xyXG4gICAgICAgICAgam9iX3FjYXJkLmNvbXBhbnlfc2l6ZSA9IHJlY3J1aXRlci5jb21wYW55X3NpemU7XHJcbiAgICAgICAgICBqb2JfcWNhcmQuY29tcGFueV9sb2dvID0gcmVjcnVpdGVyLmNvbXBhbnlfbG9nbztcclxuICAgICAgICAgIGpvYl9xY2FyZC5jb21wYW55X3dlYnNpdGU9IHJlY3J1aXRlci5jb21wYW55X3dlYnNpdGU7XHJcbiAgICAgICAgICBqb2JfcWNhcmQuc2FsYXJ5TWluVmFsdWUgPSBqb2Iuc2FsYXJ5TWluVmFsdWU7XHJcbiAgICAgICAgICBqb2JfcWNhcmQuc2FsYXJ5TWF4VmFsdWUgPSBqb2Iuc2FsYXJ5TWF4VmFsdWU7XHJcbiAgICAgICAgICBqb2JfcWNhcmQuZXhwZXJpZW5jZU1pblZhbHVlID0gam9iLmV4cGVyaWVuY2VNaW5WYWx1ZTtcclxuICAgICAgICAgIGpvYl9xY2FyZC5leHBlcmllbmNlTWF4VmFsdWUgPSBqb2IuZXhwZXJpZW5jZU1heFZhbHVlO1xyXG4gICAgICAgICAgam9iX3FjYXJkLmVkdWNhdGlvbiA9IGpvYi5lZHVjYXRpb247XHJcbiAgICAgICAgICBqb2JfcWNhcmQuaW50ZXJlc3RlZEluZHVzdHJpZXMgPSBqb2IuaW50ZXJlc3RlZEluZHVzdHJpZXM7XHJcbiAgICAgICAgICBqb2JfcWNhcmQucHJvZmljaWVuY2llcyA9IGpvYi5wcm9maWNpZW5jaWVzO1xyXG4gICAgICAgICAgam9iX3FjYXJkLmxvY2F0aW9uID0gam9iLmxvY2F0aW9uLmNpdHk7XHJcbiAgICAgICAgICBqb2JfcWNhcmQuX2lkID0gam9iLl9pZDtcclxuICAgICAgICAgIGpvYl9xY2FyZC5pbmR1c3RyeSA9IGpvYi5pbmR1c3RyeS5uYW1lOyAvL3RvZG8gYWRkIGluZHVzdHJ5IG5hbWVcclxuICAgICAgICAgIGpvYl9xY2FyZC5qb2JUaXRsZSA9IGpvYi5qb2JUaXRsZTtcclxuICAgICAgICAgIGpvYl9xY2FyZC5qb2luaW5nUGVyaW9kID0gam9iLmpvaW5pbmdQZXJpb2Q7XHJcbiAgICAgICAgICBqb2JfcWNhcmQucG9zdGluZ0RhdGUgPSBqb2IucG9zdGluZ0RhdGU7XHJcbiAgICAgICAgICBqb2JfcWNhcmQuaGlkZUNvbXBhbnlOYW1lID0gam9iLmhpZGVDb21wYW55TmFtZTtcclxuICAgICAgICAgIGpvYl9xY2FyZC5jYW5kaWRhdGVfbGlzdCA9IGpvYi5jYW5kaWRhdGVfbGlzdDtcclxuICAgICAgICAgIGlmICgoam9iX3FjYXJkLmFib3ZlX29uZV9zdGVwX21hdGNoaW5nICsgam9iX3FjYXJkLmV4YWN0X21hdGNoaW5nKSA+PSBDb25zdFZhcmlhYmxlcy5MT1dFUl9MSU1JVF9GT1JfU0VBUkNIX1JFU1VMVCkge1xyXG4gICAgICAgICAgICBqb2JzX2NhcmRzLnB1c2goam9iX3FjYXJkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgaWYocmVjcnVpdGVycy5pbmRleE9mKHJlY3J1aXRlcikgPT0gcmVjcnVpdGVycy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICBpc1NlbmQ9IHRydWU7XHJcbiAgICAgICAgICBqb2JzX2NhcmRzLnNvcnQoKGZpcnN0OiBKb2JRQ2FyZCxzZWNvbmQgOiBKb2JRQ2FyZCk6bnVtYmVyPT4ge1xyXG4gICAgICAgICAgICBpZigoZmlyc3QuYWJvdmVfb25lX3N0ZXBfbWF0Y2hpbmcrZmlyc3QuZXhhY3RfbWF0Y2hpbmcpID4oc2Vjb25kLmFib3ZlX29uZV9zdGVwX21hdGNoaW5nK3NlY29uZC5leGFjdF9tYXRjaGluZykgKXtcclxuICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYoKGZpcnN0LmFib3ZlX29uZV9zdGVwX21hdGNoaW5nK2ZpcnN0LmV4YWN0X21hdGNoaW5nKSA8IChzZWNvbmQuYWJvdmVfb25lX3N0ZXBfbWF0Y2hpbmcrc2Vjb25kLmV4YWN0X21hdGNoaW5nKSApIHtcclxuICAgICAgICAgICAgICByZXR1cm4gMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgam9ic19jYXJkcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICB9XHJcblxyXG5cclxufVxyXG5cclxuT2JqZWN0LnNlYWwoUmVjcnVpdGVyUmVwb3NpdG9yeSk7XHJcbmV4cG9ydCA9IFJlY3J1aXRlclJlcG9zaXRvcnk7XHJcbiJdfQ==
