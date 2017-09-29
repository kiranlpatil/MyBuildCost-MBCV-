"use strict";
var DataAccess = require("../dataaccess");
var mongoose = DataAccess.mongooseInstance;
var mongooseConnection = DataAccess.mongooseConnection;
var JobProfileSchema = (function () {
    function JobProfileSchema() {
    }
    Object.defineProperty(JobProfileSchema, "schema", {
        get: function () {
            var schema = mongoose.Schema({
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
                experience: {
                    type: String
                },
                salary: {
                    type: String
                },
                proficiencies: {
                    names: [String]
                },
                mandatoryProficiencies: {
                    names: [String]
                },
                industry: {
                    name: String,
                    roles: [{
                            name: String,
                            capabilities: [{
                                    complexities: [{
                                            scenarios: {
                                                isChecked: Boolean,
                                                name: String,
                                                code: String
                                            },
                                            name: String
                                        }],
                                    name: String
                                }]
                        }]
                },
                competencies: {
                    type: String
                },
                isJobPosted: {
                    type: Boolean,
                    default: false
                },
                isJobPostExpired: {
                    type: Boolean,
                    default: false
                },
                isJobShared: {
                    type: Boolean,
                    default: false
                },
                responsibility: {
                    type: String
                },
                postingDate: {
                    type: Date
                },
                daysRemainingForExpiring: {
                    type: Number
                },
                interestedIndustries: [{ type: String }]
            }, { versionKey: false });
            return schema;
        },
        enumerable: true,
        configurable: true
    });
    return JobProfileSchema;
}());
var schema = mongooseConnection.model("JobProfile", JobProfileSchema.schema);
module.exports = schema;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvZGF0YWFjY2Vzcy9zY2hlbWFzL2pvYi1wcm9maWxlLnNjaGVtYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMENBQTZDO0FBVzdDLElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztBQUMzQyxJQUFJLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQztBQUV2RDtJQUFBO0lBMEVBLENBQUM7SUF6RUMsc0JBQVcsMEJBQU07YUFBakI7WUFDRSxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO2dCQUMzQixRQUFRLEVBQUU7b0JBQ1IsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsYUFBYSxFQUFFO29CQUNiLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNELFVBQVUsRUFBRTtvQkFDVixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsVUFBVSxFQUFFO29CQUNWLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNELE1BQU0sRUFBRTtvQkFDTixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxhQUFhLEVBQUU7b0JBQ2IsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDO2lCQUNoQjtnQkFDRCxzQkFBc0IsRUFBRTtvQkFDdEIsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDO2lCQUNoQjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsSUFBSSxFQUFFLE1BQU07b0JBQ1osS0FBSyxFQUFFLENBQUM7NEJBQ04sSUFBSSxFQUFFLE1BQU07NEJBQ1osWUFBWSxFQUFFLENBQUM7b0NBQ2IsWUFBWSxFQUFFLENBQUM7NENBQ2IsU0FBUyxFQUFFO2dEQUNULFNBQVMsRUFBRSxPQUFPO2dEQUNsQixJQUFJLEVBQUUsTUFBTTtnREFDWixJQUFJLEVBQUUsTUFBTTs2Q0FDYjs0Q0FDRCxJQUFJLEVBQUUsTUFBTTt5Q0FDYixDQUFDO29DQUNGLElBQUksRUFBRSxNQUFNO2lDQUNiLENBQUM7eUJBQ0gsQ0FBQztpQkFDSDtnQkFDRCxZQUFZLEVBQUU7b0JBQ1osSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsV0FBVyxFQUFFO29CQUNYLElBQUksRUFBRSxPQUFPO29CQUNiLE9BQU8sRUFBRSxLQUFLO2lCQUNmO2dCQUNELGdCQUFnQixFQUFFO29CQUNoQixJQUFJLEVBQUUsT0FBTztvQkFDYixPQUFPLEVBQUUsS0FBSztpQkFDZjtnQkFDRCxXQUFXLEVBQUU7b0JBQ1gsSUFBSSxFQUFFLE9BQU87b0JBQ2IsT0FBTyxFQUFFLEtBQUs7aUJBQ2Y7Z0JBQ0QsY0FBYyxFQUFFO29CQUNkLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNELFdBQVcsRUFBRTtvQkFDWCxJQUFJLEVBQUUsSUFBSTtpQkFDWDtnQkFDRCx3QkFBd0IsRUFBRTtvQkFDeEIsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0Qsb0JBQW9CLEVBQUUsQ0FBQyxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUMsQ0FBQzthQUV2QyxFQUFFLEVBQUMsVUFBVSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7WUFFeEIsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNoQixDQUFDOzs7T0FBQTtJQUNILHVCQUFDO0FBQUQsQ0ExRUEsQUEwRUMsSUFBQTtBQUNELElBQUksTUFBTSxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBYyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUYsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6ImFwcC9mcmFtZXdvcmsvZGF0YWFjY2Vzcy9zY2hlbWFzL2pvYi1wcm9maWxlLnNjaGVtYS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBEYXRhQWNjZXNzID0gcmVxdWlyZShcIi4uL2RhdGFhY2Nlc3NcIik7XG5pbXBvcnQgVXNlciA9IHJlcXVpcmUoXCIuLi9tb25nb29zZS91c2VyXCIpO1xuaW1wb3J0IElDYW5kaWRhdGUgPSByZXF1aXJlKFwiLi4vbW9uZ29vc2UvY2FuZGlkYXRlXCIpO1xuaW1wb3J0IElDYXBhYmlsaXR5ID0gcmVxdWlyZShcIi4uL21vbmdvb3NlL2NhcGFiaWxpdHlcIik7XG5pbXBvcnQgSUFjYWRlbWljID0gcmVxdWlyZShcIi4uL21vbmdvb3NlL2FjYWRlbWljc1wiKTtcbmltcG9ydCBJUHJvZmljaWVuY3kgPSByZXF1aXJlKFwiLi4vbW9uZ29vc2UvcHJvZmljaWVuY3lcIik7XG5pbXBvcnQgSVByb2Zlc3Npb25hbERldGFpbHMgPSByZXF1aXJlKFwiLi4vbW9uZ29vc2UvcHJvZmVzc2lvbmFsLWRldGFpbHNcIik7XG5pbXBvcnQgSUVtcGxveW1lbnRIaXN0b3J5ID0gcmVxdWlyZShcIi4uL21vbmdvb3NlL2VtcGxveW1lbnQtaGlzdG9yeVwiKTtcbmltcG9ydCBJSm9iUHJvZmlsZSA9IHJlcXVpcmUoXCIuLi9tb25nb29zZS9qb2ItcHJvZmlsZVwiKTtcbmltcG9ydCBJTG9jYXRpb24gPSByZXF1aXJlKFwiLi4vbW9uZ29vc2UvbG9jYXRpb25cIik7XG5pbXBvcnQgSURvbWFpbiA9IHJlcXVpcmUoXCIuLi9tb25nb29zZS9kb21haW5cIik7XG52YXIgbW9uZ29vc2UgPSBEYXRhQWNjZXNzLm1vbmdvb3NlSW5zdGFuY2U7XG52YXIgbW9uZ29vc2VDb25uZWN0aW9uID0gRGF0YUFjY2Vzcy5tb25nb29zZUNvbm5lY3Rpb247XG5cbmNsYXNzIEpvYlByb2ZpbGVTY2hlbWEge1xuICBzdGF0aWMgZ2V0IHNjaGVtYSgpIHtcbiAgICB2YXIgc2NoZW1hID0gbW9uZ29vc2UuU2NoZW1hKHtcbiAgICAgIGpvYlRpdGxlOiB7XG4gICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgfSxcbiAgICAgIGhpcmluZ01hbmFnZXI6IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgZGVwYXJ0bWVudDoge1xuICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgIH0sXG4gICAgICBlZHVjYXRpb246IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgZXhwZXJpZW5jZToge1xuICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgIH0sXG4gICAgICBzYWxhcnk6IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgcHJvZmljaWVuY2llczoge1xuICAgICAgICBuYW1lczogW1N0cmluZ11cbiAgICAgIH0sXG4gICAgICBtYW5kYXRvcnlQcm9maWNpZW5jaWVzOiB7XG4gICAgICAgIG5hbWVzOiBbU3RyaW5nXVxuICAgICAgfSxcbiAgICAgIGluZHVzdHJ5OiB7XG4gICAgICAgIG5hbWU6IFN0cmluZyxcbiAgICAgICAgcm9sZXM6IFt7XG4gICAgICAgICAgbmFtZTogU3RyaW5nLFxuICAgICAgICAgIGNhcGFiaWxpdGllczogW3tcbiAgICAgICAgICAgIGNvbXBsZXhpdGllczogW3tcbiAgICAgICAgICAgICAgc2NlbmFyaW9zOiB7XG4gICAgICAgICAgICAgICAgaXNDaGVja2VkOiBCb29sZWFuLFxuICAgICAgICAgICAgICAgIG5hbWU6IFN0cmluZyxcbiAgICAgICAgICAgICAgICBjb2RlOiBTdHJpbmdcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbmFtZTogU3RyaW5nXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIG5hbWU6IFN0cmluZ1xuICAgICAgICAgIH1dXG4gICAgICAgIH1dXG4gICAgICB9LFxuICAgICAgY29tcGV0ZW5jaWVzOiB7XG4gICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgfSxcbiAgICAgIGlzSm9iUG9zdGVkOiB7XG4gICAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICB9LFxuICAgICAgaXNKb2JQb3N0RXhwaXJlZDoge1xuICAgICAgICB0eXBlOiBCb29sZWFuLFxuICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgfSxcbiAgICAgIGlzSm9iU2hhcmVkOiB7XG4gICAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICB9LFxuICAgICAgcmVzcG9uc2liaWxpdHk6IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgcG9zdGluZ0RhdGU6IHtcbiAgICAgICAgdHlwZTogRGF0ZVxuICAgICAgfSxcbiAgICAgIGRheXNSZW1haW5pbmdGb3JFeHBpcmluZzoge1xuICAgICAgICB0eXBlOiBOdW1iZXJcbiAgICAgIH0sXG4gICAgICBpbnRlcmVzdGVkSW5kdXN0cmllczogW3t0eXBlOiBTdHJpbmd9XVxuXG4gICAgfSwge3ZlcnNpb25LZXk6IGZhbHNlfSk7XG5cbiAgICByZXR1cm4gc2NoZW1hO1xuICB9XG59XG52YXIgc2NoZW1hID0gbW9uZ29vc2VDb25uZWN0aW9uLm1vZGVsPElKb2JQcm9maWxlPihcIkpvYlByb2ZpbGVcIiwgSm9iUHJvZmlsZVNjaGVtYS5zY2hlbWEpO1xuZXhwb3J0ID0gc2NoZW1hO1xuIl19
