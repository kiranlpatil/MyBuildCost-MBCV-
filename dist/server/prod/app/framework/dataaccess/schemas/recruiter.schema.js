"use strict";
var DataAccess = require("../dataaccess");
var mongoose = DataAccess.mongooseInstance;
var mongooseConnection = DataAccess.mongooseConnection;
var RecruiterSchema = (function () {
    function RecruiterSchema() {
    }
    Object.defineProperty(RecruiterSchema, "schema", {
        get: function () {
            var schema = mongoose.Schema({
                userId: {
                    type: mongoose.Schema.Types.ObjectId, ref: 'User'
                },
                company_name: {
                    type: String
                },
                company_size: {
                    type: String
                },
                company_website: {
                    type: String
                },
                company_logo: {
                    type: String
                },
                company_headquarter_country: {
                    type: String
                },
                about_company: {
                    type: String
                },
                isRecruitingForself: {
                    type: Boolean
                },
                setOfDocuments: {
                    type: [String]
                },
                postedJobs: [{
                        isJobPosted: {
                            type: Boolean,
                            default: false
                        },
                        daysRemainingForExpiring: {
                            type: Number
                        },
                        isJobPostExpired: {
                            type: Boolean,
                            default: false
                        },
                        isJobShared: {
                            type: Boolean,
                            default: false
                        },
                        hideCompanyName: {
                            type: Boolean,
                            default: false
                        },
                        capability_matrix: {
                            type: Object
                        },
                        candidate_list: [{
                                name: String,
                                ids: [{
                                        type: String
                                    }]
                            }],
                        location: {
                            city: String,
                            state: String,
                            country: String,
                            pin: String
                        },
                        joiningPeriod: {
                            type: String
                        },
                        jobTitle: {
                            type: String
                        },
                        hiringManager: {
                            type: String
                        },
                        department: {
                            type: String
                        },
                        education: {
                            type: String
                        },
                        experienceMinValue: {
                            type: String
                        },
                        experienceMaxValue: {
                            type: String
                        },
                        salaryMinValue: {
                            type: String
                        },
                        salaryMaxValue: {
                            type: String
                        },
                        proficiencies: {
                            type: [String]
                        },
                        additionalProficiencies: {
                            type: [String]
                        },
                        interestedIndustries: {
                            type: [String]
                        },
                        industry: {
                            name: String,
                            code: String,
                            roles: [{
                                    code: String,
                                    name: String,
                                    sort_order: Number,
                                    capabilities: [{
                                            code: String,
                                            sort_order: Number,
                                            complexities: [{
                                                    code: String,
                                                    sort_order: Number,
                                                    scenarios: [{
                                                            name: String,
                                                            isChecked: Boolean,
                                                            code: String
                                                        }],
                                                    name: String
                                                }],
                                            name: String,
                                            isPrimary: Boolean,
                                            isSecondary: Boolean
                                        }],
                                    default_complexities: [{
                                            code: String,
                                            complexities: [{
                                                    code: String,
                                                    scenarios: [{
                                                            name: String,
                                                            isChecked: Boolean,
                                                            code: String
                                                        }],
                                                    name: String
                                                }],
                                            name: String
                                        }]
                                }]
                        },
                        competencies: {
                            type: String
                        },
                        responsibility: {
                            type: String
                        },
                        postingDate: {
                            type: Date
                        },
                        expiringDate: {
                            type: Date
                        },
                        releventIndustries: [{ type: String }]
                    }]
            }, { versionKey: false });
            return schema;
        },
        enumerable: true,
        configurable: true
    });
    return RecruiterSchema;
}());
var schema = mongooseConnection.model('Recruiter', RecruiterSchema.schema);
module.exports = schema;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvZGF0YWFjY2Vzcy9zY2hlbWFzL3JlY3J1aXRlci5zY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBDQUE2QztBQUk3QyxJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7QUFDM0MsSUFBSSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsa0JBQWtCLENBQUM7QUFFdkQ7SUFBQTtJQXFLQSxDQUFDO0lBcEtDLHNCQUFXLHlCQUFNO2FBQWpCO1lBQ0UsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztnQkFDM0IsTUFBTSxFQUFFO29CQUNOLElBQUksRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE1BQU07aUJBQ2xEO2dCQUNELFlBQVksRUFBRTtvQkFDWixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxZQUFZLEVBQUU7b0JBQ1osSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsZUFBZSxFQUFFO29CQUNmLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNELFlBQVksRUFBRTtvQkFDWixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCwyQkFBMkIsRUFBRTtvQkFDM0IsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsYUFBYSxFQUFFO29CQUNiLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNELG1CQUFtQixFQUFFO29CQUNuQixJQUFJLEVBQUUsT0FBTztpQkFDZDtnQkFDRCxjQUFjLEVBQUU7b0JBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO2lCQUNmO2dCQUNELFVBQVUsRUFBRSxDQUFDO3dCQUNYLFdBQVcsRUFBRTs0QkFDWCxJQUFJLEVBQUUsT0FBTzs0QkFDYixPQUFPLEVBQUUsS0FBSzt5QkFDZjt3QkFDRCx3QkFBd0IsRUFBRTs0QkFDeEIsSUFBSSxFQUFFLE1BQU07eUJBQ2I7d0JBQ0QsZ0JBQWdCLEVBQUU7NEJBQ2hCLElBQUksRUFBRSxPQUFPOzRCQUNiLE9BQU8sRUFBRSxLQUFLO3lCQUNmO3dCQUNELFdBQVcsRUFBRTs0QkFDWCxJQUFJLEVBQUUsT0FBTzs0QkFDYixPQUFPLEVBQUUsS0FBSzt5QkFDZjt3QkFDRCxlQUFlLEVBQUU7NEJBQ2YsSUFBSSxFQUFFLE9BQU87NEJBQ2IsT0FBTyxFQUFFLEtBQUs7eUJBQ2Y7d0JBQ0QsaUJBQWlCLEVBQUU7NEJBQ2pCLElBQUksRUFBRSxNQUFNO3lCQUNiO3dCQUNELGNBQWMsRUFBRSxDQUFDO2dDQUNmLElBQUksRUFBRSxNQUFNO2dDQUNaLEdBQUcsRUFBRSxDQUFDO3dDQUNKLElBQUksRUFBRSxNQUFNO3FDQUNiLENBQUM7NkJBQ0gsQ0FBQzt3QkFDRixRQUFRLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLE1BQU07NEJBQ1osS0FBSyxFQUFFLE1BQU07NEJBQ2IsT0FBTyxFQUFFLE1BQU07NEJBQ2YsR0FBRyxFQUFFLE1BQU07eUJBQ1o7d0JBQ0QsYUFBYSxFQUFFOzRCQUNiLElBQUksRUFBRSxNQUFNO3lCQUNiO3dCQUNELFFBQVEsRUFBRTs0QkFDUixJQUFJLEVBQUUsTUFBTTt5QkFDYjt3QkFDRCxhQUFhLEVBQUU7NEJBQ2IsSUFBSSxFQUFFLE1BQU07eUJBQ2I7d0JBQ0QsVUFBVSxFQUFFOzRCQUNWLElBQUksRUFBRSxNQUFNO3lCQUNiO3dCQUNELFNBQVMsRUFBRTs0QkFDVCxJQUFJLEVBQUUsTUFBTTt5QkFDYjt3QkFJRCxrQkFBa0IsRUFBRTs0QkFDbEIsSUFBSSxFQUFFLE1BQU07eUJBQ2I7d0JBQ0Qsa0JBQWtCLEVBQUU7NEJBQ2xCLElBQUksRUFBRSxNQUFNO3lCQUNiO3dCQUNELGNBQWMsRUFBRTs0QkFDZCxJQUFJLEVBQUUsTUFBTTt5QkFDYjt3QkFDRCxjQUFjLEVBQUU7NEJBQ2QsSUFBSSxFQUFFLE1BQU07eUJBQ2I7d0JBSUQsYUFBYSxFQUFFOzRCQUNiLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQzt5QkFDZjt3QkFDRCx1QkFBdUIsRUFBRTs0QkFDdkIsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO3lCQUNmO3dCQUNELG9CQUFvQixFQUFFOzRCQUNwQixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7eUJBQ2Y7d0JBRUQsUUFBUSxFQUFFOzRCQUNSLElBQUksRUFBRSxNQUFNOzRCQUNaLElBQUksRUFBRSxNQUFNOzRCQUNaLEtBQUssRUFBRSxDQUFDO29DQUNOLElBQUksRUFBRSxNQUFNO29DQUNaLElBQUksRUFBRSxNQUFNO29DQUNaLFVBQVUsRUFBRSxNQUFNO29DQUNsQixZQUFZLEVBQUUsQ0FBQzs0Q0FDYixJQUFJLEVBQUUsTUFBTTs0Q0FDWixVQUFVLEVBQUUsTUFBTTs0Q0FDbEIsWUFBWSxFQUFFLENBQUM7b0RBQ2IsSUFBSSxFQUFFLE1BQU07b0RBQ1osVUFBVSxFQUFFLE1BQU07b0RBQ2xCLFNBQVMsRUFBRSxDQUFDOzREQUNWLElBQUksRUFBRSxNQUFNOzREQUNaLFNBQVMsRUFBRSxPQUFPOzREQUNsQixJQUFJLEVBQUUsTUFBTTt5REFDYixDQUFDO29EQUNGLElBQUksRUFBRSxNQUFNO2lEQUNiLENBQUM7NENBQ0YsSUFBSSxFQUFFLE1BQU07NENBQ1osU0FBUyxFQUFFLE9BQU87NENBQ2xCLFdBQVcsRUFBRSxPQUFPO3lDQUNyQixDQUFDO29DQUNGLG9CQUFvQixFQUFFLENBQUM7NENBQ3JCLElBQUksRUFBRSxNQUFNOzRDQUNaLFlBQVksRUFBRSxDQUFDO29EQUNiLElBQUksRUFBRSxNQUFNO29EQUNaLFNBQVMsRUFBRSxDQUFDOzREQUNWLElBQUksRUFBRSxNQUFNOzREQUNaLFNBQVMsRUFBRSxPQUFPOzREQUNsQixJQUFJLEVBQUUsTUFBTTt5REFDYixDQUFDO29EQUNGLElBQUksRUFBRSxNQUFNO2lEQUNiLENBQUM7NENBQ0YsSUFBSSxFQUFFLE1BQU07eUNBQ2IsQ0FBQztpQ0FDSCxDQUFDO3lCQUNIO3dCQUNELFlBQVksRUFBRTs0QkFDWixJQUFJLEVBQUUsTUFBTTt5QkFDYjt3QkFDRCxjQUFjLEVBQUU7NEJBQ2QsSUFBSSxFQUFFLE1BQU07eUJBQ2I7d0JBQ0QsV0FBVyxFQUFFOzRCQUNYLElBQUksRUFBRSxJQUFJO3lCQUNYO3dCQUNELFlBQVksRUFBRTs0QkFDWixJQUFJLEVBQUUsSUFBSTt5QkFDWDt3QkFDRCxrQkFBa0IsRUFBRSxDQUFDLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBQyxDQUFDO3FCQUNyQyxDQUFDO2FBQ0gsRUFBRSxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1lBRXhCLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDaEIsQ0FBQzs7O09BQUE7SUFDSCxzQkFBQztBQUFELENBcktBLEFBcUtDLElBQUE7QUFDRCxJQUFJLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQWEsV0FBVyxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN2RixpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoiYXBwL2ZyYW1ld29yay9kYXRhYWNjZXNzL3NjaGVtYXMvcmVjcnVpdGVyLnNjaGVtYS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBEYXRhQWNjZXNzID0gcmVxdWlyZSgnLi4vZGF0YWFjY2VzcycpO1xuaW1wb3J0IFVzZXIgPSByZXF1aXJlKCcuLi9tb25nb29zZS91c2VyJyk7XG5pbXBvcnQgSVJlY3J1aXRlciA9IHJlcXVpcmUoJy4uL21vbmdvb3NlL3JlY3J1aXRlcicpO1xuXG5sZXQgbW9uZ29vc2UgPSBEYXRhQWNjZXNzLm1vbmdvb3NlSW5zdGFuY2U7XG5sZXQgbW9uZ29vc2VDb25uZWN0aW9uID0gRGF0YUFjY2Vzcy5tb25nb29zZUNvbm5lY3Rpb247XG5cbmNsYXNzIFJlY3J1aXRlclNjaGVtYSB7XG4gIHN0YXRpYyBnZXQgc2NoZW1hKCkge1xuICAgIGxldCBzY2hlbWEgPSBtb25nb29zZS5TY2hlbWEoe1xuICAgICAgdXNlcklkOiB7XG4gICAgICAgIHR5cGU6IG1vbmdvb3NlLlNjaGVtYS5UeXBlcy5PYmplY3RJZCwgcmVmOiAnVXNlcidcbiAgICAgIH0sXG4gICAgICBjb21wYW55X25hbWU6IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgY29tcGFueV9zaXplOiB7XG4gICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgfSxcbiAgICAgIGNvbXBhbnlfd2Vic2l0ZToge1xuICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgIH0sXG4gICAgICBjb21wYW55X2xvZ286IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgY29tcGFueV9oZWFkcXVhcnRlcl9jb3VudHJ5OiB7XG4gICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgfSxcbiAgICAgIGFib3V0X2NvbXBhbnk6IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgaXNSZWNydWl0aW5nRm9yc2VsZjoge1xuICAgICAgICB0eXBlOiBCb29sZWFuXG4gICAgICB9LFxuICAgICAgc2V0T2ZEb2N1bWVudHM6IHtcbiAgICAgICAgdHlwZTogW1N0cmluZ11cbiAgICAgIH0sXG4gICAgICBwb3N0ZWRKb2JzOiBbe1xuICAgICAgICBpc0pvYlBvc3RlZDoge1xuICAgICAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgZGF5c1JlbWFpbmluZ0ZvckV4cGlyaW5nOiB7XG4gICAgICAgICAgdHlwZTogTnVtYmVyXG4gICAgICAgIH0sXG4gICAgICAgIGlzSm9iUG9zdEV4cGlyZWQ6IHtcbiAgICAgICAgICB0eXBlOiBCb29sZWFuLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIGlzSm9iU2hhcmVkOiB7XG4gICAgICAgICAgdHlwZTogQm9vbGVhbixcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBoaWRlQ29tcGFueU5hbWU6IHtcbiAgICAgICAgICB0eXBlOiBCb29sZWFuLFxuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIGNhcGFiaWxpdHlfbWF0cml4OiB7XG4gICAgICAgICAgdHlwZTogT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGNhbmRpZGF0ZV9saXN0OiBbe1xuICAgICAgICAgIG5hbWU6IFN0cmluZyxcbiAgICAgICAgICBpZHM6IFt7XG4gICAgICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgICAgICB9XVxuICAgICAgICB9XSxcbiAgICAgICAgbG9jYXRpb246IHtcbiAgICAgICAgICBjaXR5OiBTdHJpbmcsXG4gICAgICAgICAgc3RhdGU6IFN0cmluZyxcbiAgICAgICAgICBjb3VudHJ5OiBTdHJpbmcsXG4gICAgICAgICAgcGluOiBTdHJpbmdcbiAgICAgICAgfSxcbiAgICAgICAgam9pbmluZ1BlcmlvZDoge1xuICAgICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgICB9LFxuICAgICAgICBqb2JUaXRsZToge1xuICAgICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgICB9LFxuICAgICAgICBoaXJpbmdNYW5hZ2VyOiB7XG4gICAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICAgIH0sXG4gICAgICAgIGRlcGFydG1lbnQ6IHtcbiAgICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgICAgfSxcbiAgICAgICAgZWR1Y2F0aW9uOiB7XG4gICAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICAgIH0sXG4gICAgICAgIC8qZXhwZXJpZW5jZToge1xuICAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICAgICB9LCovXG4gICAgICAgIGV4cGVyaWVuY2VNaW5WYWx1ZToge1xuICAgICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgICB9LFxuICAgICAgICBleHBlcmllbmNlTWF4VmFsdWU6IHtcbiAgICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgICAgfSxcbiAgICAgICAgc2FsYXJ5TWluVmFsdWU6IHtcbiAgICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgICAgfSxcbiAgICAgICAgc2FsYXJ5TWF4VmFsdWU6IHtcbiAgICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgICAgfSxcbiAgICAgICAgLypzYWxhcnk6IHtcbiAgICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgICAgfSwqL1xuICAgICAgICBwcm9maWNpZW5jaWVzOiB7XG4gICAgICAgICAgdHlwZTogW1N0cmluZ11cbiAgICAgICAgfSxcbiAgICAgICAgYWRkaXRpb25hbFByb2ZpY2llbmNpZXM6IHtcbiAgICAgICAgICB0eXBlOiBbU3RyaW5nXVxuICAgICAgICB9LFxuICAgICAgICBpbnRlcmVzdGVkSW5kdXN0cmllczoge1xuICAgICAgICAgIHR5cGU6IFtTdHJpbmddXG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5kdXN0cnk6IHtcbiAgICAgICAgICBuYW1lOiBTdHJpbmcsXG4gICAgICAgICAgY29kZTogU3RyaW5nLFxuICAgICAgICAgIHJvbGVzOiBbe1xuICAgICAgICAgICAgY29kZTogU3RyaW5nLFxuICAgICAgICAgICAgbmFtZTogU3RyaW5nLFxuICAgICAgICAgICAgc29ydF9vcmRlcjogTnVtYmVyLFxuICAgICAgICAgICAgY2FwYWJpbGl0aWVzOiBbe1xuICAgICAgICAgICAgICBjb2RlOiBTdHJpbmcsXG4gICAgICAgICAgICAgIHNvcnRfb3JkZXI6IE51bWJlcixcbiAgICAgICAgICAgICAgY29tcGxleGl0aWVzOiBbe1xuICAgICAgICAgICAgICAgIGNvZGU6IFN0cmluZyxcbiAgICAgICAgICAgICAgICBzb3J0X29yZGVyOiBOdW1iZXIsXG4gICAgICAgICAgICAgICAgc2NlbmFyaW9zOiBbe1xuICAgICAgICAgICAgICAgICAgbmFtZTogU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgaXNDaGVja2VkOiBCb29sZWFuLFxuICAgICAgICAgICAgICAgICAgY29kZTogU3RyaW5nXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgbmFtZTogU3RyaW5nXG4gICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICBuYW1lOiBTdHJpbmcsXG4gICAgICAgICAgICAgIGlzUHJpbWFyeTogQm9vbGVhbixcbiAgICAgICAgICAgICAgaXNTZWNvbmRhcnk6IEJvb2xlYW5cbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgZGVmYXVsdF9jb21wbGV4aXRpZXM6IFt7XG4gICAgICAgICAgICAgIGNvZGU6IFN0cmluZyxcbiAgICAgICAgICAgICAgY29tcGxleGl0aWVzOiBbe1xuICAgICAgICAgICAgICAgIGNvZGU6IFN0cmluZyxcbiAgICAgICAgICAgICAgICBzY2VuYXJpb3M6IFt7XG4gICAgICAgICAgICAgICAgICBuYW1lOiBTdHJpbmcsXG4gICAgICAgICAgICAgICAgICBpc0NoZWNrZWQ6IEJvb2xlYW4sXG4gICAgICAgICAgICAgICAgICBjb2RlOiBTdHJpbmdcbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICBuYW1lOiBTdHJpbmdcbiAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgIG5hbWU6IFN0cmluZ1xuICAgICAgICAgICAgfV1cbiAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICBjb21wZXRlbmNpZXM6IHtcbiAgICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzcG9uc2liaWxpdHk6IHtcbiAgICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgICAgfSxcbiAgICAgICAgcG9zdGluZ0RhdGU6IHtcbiAgICAgICAgICB0eXBlOiBEYXRlXG4gICAgICAgIH0sXG4gICAgICAgIGV4cGlyaW5nRGF0ZToge1xuICAgICAgICAgIHR5cGU6IERhdGVcbiAgICAgICAgfSxcbiAgICAgICAgcmVsZXZlbnRJbmR1c3RyaWVzOiBbe3R5cGU6IFN0cmluZ31dXG4gICAgICB9XVxuICAgIH0sIHt2ZXJzaW9uS2V5OiBmYWxzZX0pO1xuXG4gICAgcmV0dXJuIHNjaGVtYTtcbiAgfVxufVxubGV0IHNjaGVtYSA9IG1vbmdvb3NlQ29ubmVjdGlvbi5tb2RlbDxJUmVjcnVpdGVyPignUmVjcnVpdGVyJywgUmVjcnVpdGVyU2NoZW1hLnNjaGVtYSk7XG5leHBvcnQgPSBzY2hlbWE7XG4iXX0=
