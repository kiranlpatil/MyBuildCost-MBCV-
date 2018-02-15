"use strict";
var DataAccess = require("../../../framework/dataaccess/dataaccess");
var mongoose_1 = require("mongoose");
var mongoose = DataAccess.mongooseInstance;
var mongooseConnection = DataAccess.mongooseConnection;
var ProjectSchema = (function () {
    function ProjectSchema() {
    }
    Object.defineProperty(ProjectSchema, "schema", {
        get: function () {
            var schema = mongoose.Schema({
                name: {
                    type: String,
                    required: true
                },
                region: {
                    type: String
                },
                building: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Building' }],
                address: {
                    city: String,
                    state: String,
                    country: String,
                    pin: String
                },
                plotArea: {
                    type: Number
                },
                slabArea: {
                    type: Number
                },
                podiumArea: {
                    type: Number
                },
                openSpace: {
                    type: Number
                },
                poolCapacity: {
                    type: Number
                },
                totalNoOfBuildings: {
                    type: Number
                },
                plotPeriphery: {
                    type: Number
                },
                costHead: [{}],
                rate: [{}],
                projectDuration: {
                    type: Number
                },
                activation_date: {
                    type: Date,
                }
            }, {
                versionKey: false,
                timestamps: true
            });
            return schema;
        },
        enumerable: true,
        configurable: true
    });
    return ProjectSchema;
}());
var schema = mongooseConnection.model('Project', ProjectSchema.schema);
module.exports = schema;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3QvZGF0YWFjY2Vzcy9zY2hlbWFzL1Byb2plY3RTY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFFQUF3RTtBQUd4RSxxQ0FBa0M7QUFFbEMsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDO0FBQzNDLElBQUksa0JBQWtCLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixDQUFDO0FBR3ZEO0lBQUE7SUF1REEsQ0FBQztJQXREQyxzQkFBVyx1QkFBTTthQUFqQjtZQUVFLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBRTNCLElBQUksRUFBRTtvQkFDSixJQUFJLEVBQUUsTUFBTTtvQkFDWixRQUFRLEVBQUUsSUFBSTtpQkFDZjtnQkFDRCxNQUFNLEVBQUU7b0JBQ04sSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsUUFBUSxFQUFFLENBQUMsRUFBQyxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUMsQ0FBQztnQkFDMUQsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxNQUFNO29CQUNaLEtBQUssRUFBRSxNQUFNO29CQUNiLE9BQU8sRUFBRSxNQUFNO29CQUNmLEdBQUcsRUFBRSxNQUFNO2lCQUNaO2dCQUNELFFBQVEsRUFBRTtvQkFDUixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDQyxRQUFRLEVBQUU7b0JBQ1YsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0MsVUFBVSxFQUFFO29CQUNaLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNDLFNBQVMsRUFBRTtvQkFDWCxJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDQyxZQUFZLEVBQUU7b0JBQ2QsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0Msa0JBQWtCLEVBQUU7b0JBQ3BCLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNELGFBQWEsRUFBRTtvQkFDYixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNWLGVBQWUsRUFBRTtvQkFDZixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxlQUFlLEVBQUU7b0JBQ2YsSUFBSSxFQUFFLElBQUk7aUJBQ1g7YUFDRixFQUNDO2dCQUNFLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixVQUFVLEVBQUMsSUFBSTthQUNoQixDQUFDLENBQUM7WUFDTCxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ2hCLENBQUM7OztPQUFBO0lBQ0gsb0JBQUM7QUFBRCxDQXZEQSxBQXVEQyxJQUFBO0FBQ0QsSUFBSSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFVLFNBQVMsRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDaEYsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6ImFwcC9hcHBsaWNhdGlvblByb2plY3QvZGF0YWFjY2Vzcy9zY2hlbWFzL1Byb2plY3RTY2hlbWEuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRGF0YUFjY2VzcyA9IHJlcXVpcmUoJy4uLy4uLy4uL2ZyYW1ld29yay9kYXRhYWNjZXNzL2RhdGFhY2Nlc3MnKTtcclxuaW1wb3J0IFByb2plY3QgPSByZXF1aXJlKCcuLi9tb25nb29zZS9Qcm9qZWN0Jyk7XHJcbmltcG9ydCBCdWlsZGluZyA9IHJlcXVpcmUoJy4uL21vbmdvb3NlL0J1aWxkaW5nJyk7XHJcbmltcG9ydCB7IFNjaGVtYSB9IGZyb20gJ21vbmdvb3NlJztcclxuXHJcbmxldCBtb25nb29zZSA9IERhdGFBY2Nlc3MubW9uZ29vc2VJbnN0YW5jZTtcclxubGV0IG1vbmdvb3NlQ29ubmVjdGlvbiA9IERhdGFBY2Nlc3MubW9uZ29vc2VDb25uZWN0aW9uO1xyXG5cclxuXHJcbmNsYXNzIFByb2plY3RTY2hlbWEge1xyXG4gIHN0YXRpYyBnZXQgc2NoZW1hKCkge1xyXG5cclxuICAgIGxldCBzY2hlbWEgPSBtb25nb29zZS5TY2hlbWEoe1xyXG5cclxuICAgICAgbmFtZToge1xyXG4gICAgICAgIHR5cGU6IFN0cmluZyxcclxuICAgICAgICByZXF1aXJlZDogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICByZWdpb246IHtcclxuICAgICAgICB0eXBlOiBTdHJpbmdcclxuICAgICAgfSxcclxuICAgICAgYnVpbGRpbmc6IFt7dHlwZTogU2NoZW1hLlR5cGVzLk9iamVjdElkLCByZWY6ICdCdWlsZGluZyd9XSxcclxuICAgICAgYWRkcmVzczoge1xyXG4gICAgICAgIGNpdHk6IFN0cmluZyxcclxuICAgICAgICBzdGF0ZTogU3RyaW5nLFxyXG4gICAgICAgIGNvdW50cnk6IFN0cmluZyxcclxuICAgICAgICBwaW46IFN0cmluZ1xyXG4gICAgICB9LFxyXG4gICAgICBwbG90QXJlYToge1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICAgIHNsYWJBcmVhOiB7XHJcbiAgICAgICAgdHlwZTogTnVtYmVyXHJcbiAgICAgIH0sXHJcbiAgICAgICAgcG9kaXVtQXJlYToge1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICAgIG9wZW5TcGFjZToge1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICAgIHBvb2xDYXBhY2l0eToge1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICAgIHRvdGFsTm9PZkJ1aWxkaW5nczoge1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICBwbG90UGVyaXBoZXJ5OiB7XHJcbiAgICAgICAgdHlwZTogTnVtYmVyXHJcbiAgICAgIH0sXHJcbiAgICAgIGNvc3RIZWFkOiBbe31dLFxyXG4gICAgICByYXRlOiBbe31dLFxyXG4gICAgICBwcm9qZWN0RHVyYXRpb246IHtcclxuICAgICAgICB0eXBlOiBOdW1iZXJcclxuICAgICAgfSxcclxuICAgICAgYWN0aXZhdGlvbl9kYXRlOiB7XHJcbiAgICAgICAgdHlwZTogRGF0ZSxcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIHZlcnNpb25LZXk6IGZhbHNlLFxyXG4gICAgICAgIHRpbWVzdGFtcHM6dHJ1ZVxyXG4gICAgICB9KTtcclxuICAgIHJldHVybiBzY2hlbWE7XHJcbiAgfVxyXG59XHJcbmxldCBzY2hlbWEgPSBtb25nb29zZUNvbm5lY3Rpb24ubW9kZWw8UHJvamVjdD4oJ1Byb2plY3QnLCBQcm9qZWN0U2NoZW1hLnNjaGVtYSk7XHJcbmV4cG9ydCA9IHNjaGVtYTtcclxuIl19
