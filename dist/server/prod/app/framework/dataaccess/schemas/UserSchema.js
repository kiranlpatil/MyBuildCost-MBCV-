"use strict";
var DataAccess = require("../dataaccess");
var mongoose_1 = require("mongoose");
var mongoose = DataAccess.mongooseInstance;
var mongooseConnection = DataAccess.mongooseConnection;
var UserSchema = (function () {
    function UserSchema() {
    }
    Object.defineProperty(UserSchema, "schema", {
        get: function () {
            var schema = mongoose.Schema({
                first_name: {
                    type: String
                },
                state: {
                    type: String
                },
                city: {
                    type: String
                },
                company_name: {
                    type: String
                },
                last_name: {
                    type: String
                },
                email: {
                    type: String,
                    required: true,
                    unique: true
                },
                mobile_number: {
                    type: Number,
                    required: false
                },
                temp_mobile: {
                    type: Number,
                    default: 0
                },
                temp_email: {
                    type: String
                },
                password: {
                    type: String
                },
                isActivated: {
                    type: Boolean,
                    default: false
                },
                otp: {
                    type: Number,
                    default: 0
                },
                picture: {
                    type: String,
                    required: false
                },
                isCandidate: {
                    type: Boolean
                },
                isAdmin: {
                    type: Boolean,
                    default: false
                },
                social_profile_picture: {
                    type: String,
                    required: false
                },
                current_theme: {
                    type: String,
                    required: false
                },
                notifications: [{
                        image: String,
                        title: String,
                        description: String,
                        is_read: Boolean,
                        notification_time: Date
                    }],
                guide_tour: [{ type: String }],
                activation_date: {
                    type: Date,
                },
                created_date: {
                    type: Date,
                    default: new Date()
                },
                project: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Project' }]
            }, { versionKey: false });
            return schema;
        },
        enumerable: true,
        configurable: true
    });
    return UserSchema;
}());
var schema = mongooseConnection.model('User', UserSchema.schema);
module.exports = schema;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvZGF0YWFjY2Vzcy9zY2hlbWFzL1VzZXJTY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBDQUE2QztBQUc3QyxxQ0FBa0M7QUFDbEMsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDO0FBQzNDLElBQUksa0JBQWtCLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixDQUFDO0FBR3ZEO0lBQUE7SUEyRkEsQ0FBQztJQTFGQyxzQkFBVyxvQkFBTTthQUFqQjtZQUNFLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBUTNCLFVBQVUsRUFBRTtvQkFDVixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxLQUFLLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsSUFBSSxFQUFFO29CQUNKLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNELFlBQVksRUFBRTtvQkFDWixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsS0FBSyxFQUFFO29CQUNMLElBQUksRUFBRSxNQUFNO29CQUNaLFFBQVEsRUFBRSxJQUFJO29CQUNkLE1BQU0sRUFBRSxJQUFJO2lCQUNiO2dCQUNELGFBQWEsRUFBRTtvQkFDYixJQUFJLEVBQUUsTUFBTTtvQkFDWixRQUFRLEVBQUUsS0FBSztpQkFDaEI7Z0JBQ0QsV0FBVyxFQUFFO29CQUNYLElBQUksRUFBRSxNQUFNO29CQUNaLE9BQU8sRUFBRSxDQUFDO2lCQUNYO2dCQUNELFVBQVUsRUFBRTtvQkFDVixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsV0FBVyxFQUFFO29CQUNYLElBQUksRUFBRSxPQUFPO29CQUNiLE9BQU8sRUFBRSxLQUFLO2lCQUNmO2dCQUNELEdBQUcsRUFBRTtvQkFDSCxJQUFJLEVBQUUsTUFBTTtvQkFDWixPQUFPLEVBQUUsQ0FBQztpQkFDWDtnQkFFRCxPQUFPLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLE1BQU07b0JBQ1osUUFBUSxFQUFFLEtBQUs7aUJBQ2hCO2dCQUNELFdBQVcsRUFBRTtvQkFDWCxJQUFJLEVBQUUsT0FBTztpQkFDZDtnQkFDRCxPQUFPLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLE9BQU87b0JBQ2IsT0FBTyxFQUFFLEtBQUs7aUJBQ2Y7Z0JBQ0Qsc0JBQXNCLEVBQUU7b0JBQ3RCLElBQUksRUFBRSxNQUFNO29CQUNaLFFBQVEsRUFBRSxLQUFLO2lCQUNoQjtnQkFDRCxhQUFhLEVBQUU7b0JBQ2IsSUFBSSxFQUFFLE1BQU07b0JBQ1osUUFBUSxFQUFFLEtBQUs7aUJBQ2hCO2dCQUNELGFBQWEsRUFBRSxDQUFDO3dCQUNkLEtBQUssRUFBRSxNQUFNO3dCQUNiLEtBQUssRUFBRSxNQUFNO3dCQUNiLFdBQVcsRUFBRSxNQUFNO3dCQUNuQixPQUFPLEVBQUUsT0FBTzt3QkFDaEIsaUJBQWlCLEVBQUUsSUFBSTtxQkFDeEIsQ0FBQztnQkFDRixVQUFVLEVBQUUsQ0FBQyxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUMsQ0FBQztnQkFDNUIsZUFBZSxFQUFFO29CQUNmLElBQUksRUFBRSxJQUFJO2lCQUNYO2dCQUNELFlBQVksRUFBRTtvQkFDWixJQUFJLEVBQUUsSUFBSTtvQkFDVixPQUFPLEVBQUUsSUFBSSxJQUFJLEVBQUU7aUJBQ3BCO2dCQUNELE9BQU8sRUFBRyxDQUFDLEVBQUMsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFDLENBQUM7YUFDMUQsRUFBRSxFQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDaEIsQ0FBQzs7O09BQUE7SUFDSCxpQkFBQztBQUFELENBM0ZBLEFBMkZDLElBQUE7QUFDRCxJQUFJLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQU8sTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN2RSxpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoiYXBwL2ZyYW1ld29yay9kYXRhYWNjZXNzL3NjaGVtYXMvVXNlclNjaGVtYS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBEYXRhQWNjZXNzID0gcmVxdWlyZSgnLi4vZGF0YWFjY2VzcycpO1xuaW1wb3J0IFVzZXIgPSByZXF1aXJlKCcuLi9tb25nb29zZS91c2VyJyk7XG5pbXBvcnQgUHJvamVjdCA9IHJlcXVpcmUoJy4uLy4uLy4uL2FwcGxpY2F0aW9uUHJvamVjdC9kYXRhYWNjZXNzL21vZGVsL3Byb2plY3QvUHJvamVjdCcpO1xuaW1wb3J0IHsgU2NoZW1hIH0gZnJvbSAnbW9uZ29vc2UnO1xubGV0IG1vbmdvb3NlID0gRGF0YUFjY2Vzcy5tb25nb29zZUluc3RhbmNlO1xubGV0IG1vbmdvb3NlQ29ubmVjdGlvbiA9IERhdGFBY2Nlc3MubW9uZ29vc2VDb25uZWN0aW9uO1xuXG5cbmNsYXNzIFVzZXJTY2hlbWEge1xuICBzdGF0aWMgZ2V0IHNjaGVtYSgpIHtcbiAgICBsZXQgc2NoZW1hID0gbW9uZ29vc2UuU2NoZW1hKHtcblxuICAgICAvKiBsb2NhdGlvbjoge1xuICAgICAgICBjaXR5OiBTdHJpbmcsXG4gICAgICAgIHN0YXRlOiBTdHJpbmcsXG4gICAgICAgIGNvdW50cnk6IFN0cmluZyxcbiAgICAgICAgcGluOiBTdHJpbmdcbiAgICAgIH0sKi9cbiAgICAgIGZpcnN0X25hbWU6IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgc3RhdGU6IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgY2l0eToge1xuICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgIH0sXG4gICAgICBjb21wYW55X25hbWU6IHtcbiAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICB9LFxuICAgICAgbGFzdF9uYW1lOiB7XG4gICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgfSxcbiAgICAgIGVtYWlsOiB7XG4gICAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgIHVuaXF1ZTogdHJ1ZVxuICAgICAgfSxcbiAgICAgIG1vYmlsZV9udW1iZXI6IHtcbiAgICAgICAgdHlwZTogTnVtYmVyLFxuICAgICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIH0sXG4gICAgICB0ZW1wX21vYmlsZToge1xuICAgICAgICB0eXBlOiBOdW1iZXIsXG4gICAgICAgIGRlZmF1bHQ6IDBcbiAgICAgIH0sXG4gICAgICB0ZW1wX2VtYWlsOiB7XG4gICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgfSxcbiAgICAgIHBhc3N3b3JkOiB7XG4gICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgfSxcbiAgICAgIGlzQWN0aXZhdGVkOiB7XG4gICAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICB9LFxuICAgICAgb3RwOiB7XG4gICAgICAgIHR5cGU6IE51bWJlcixcbiAgICAgICAgZGVmYXVsdDogMFxuICAgICAgfSxcblxuICAgICAgcGljdHVyZToge1xuICAgICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIGlzQ2FuZGlkYXRlOiB7XG4gICAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICAgIH0sXG4gICAgICBpc0FkbWluOiB7XG4gICAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICB9LFxuICAgICAgc29jaWFsX3Byb2ZpbGVfcGljdHVyZToge1xuICAgICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgfSxcbiAgICAgIGN1cnJlbnRfdGhlbWU6IHtcbiAgICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIH0sXG4gICAgICBub3RpZmljYXRpb25zOiBbe1xuICAgICAgICBpbWFnZTogU3RyaW5nLFxuICAgICAgICB0aXRsZTogU3RyaW5nLFxuICAgICAgICBkZXNjcmlwdGlvbjogU3RyaW5nLFxuICAgICAgICBpc19yZWFkOiBCb29sZWFuLFxuICAgICAgICBub3RpZmljYXRpb25fdGltZTogRGF0ZVxuICAgICAgfV0sXG4gICAgICBndWlkZV90b3VyOiBbe3R5cGU6IFN0cmluZ31dLFxuICAgICAgYWN0aXZhdGlvbl9kYXRlOiB7XG4gICAgICAgIHR5cGU6IERhdGUsXG4gICAgICB9LFxuICAgICAgY3JlYXRlZF9kYXRlOiB7XG4gICAgICAgIHR5cGU6IERhdGUsXG4gICAgICAgIGRlZmF1bHQ6IG5ldyBEYXRlKClcbiAgICAgIH0sXG4gICAgICBwcm9qZWN0IDogW3t0eXBlOiBTY2hlbWEuVHlwZXMuT2JqZWN0SWQsIHJlZjogJ1Byb2plY3QnfV1cbiAgICB9LCB7dmVyc2lvbktleTogZmFsc2V9KTtcbiAgICByZXR1cm4gc2NoZW1hO1xuICB9XG59XG5sZXQgc2NoZW1hID0gbW9uZ29vc2VDb25uZWN0aW9uLm1vZGVsPFVzZXI+KCdVc2VyJywgVXNlclNjaGVtYS5zY2hlbWEpO1xuZXhwb3J0ID0gc2NoZW1hO1xuIl19
