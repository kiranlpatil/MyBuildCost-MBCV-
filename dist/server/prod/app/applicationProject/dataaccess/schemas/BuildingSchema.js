"use strict";
var DataAccess = require("../../../framework/dataaccess/dataaccess");
var mongoose = DataAccess.mongooseInstance;
var mongooseConnection = DataAccess.mongooseConnection;
var BuildingSchema = (function () {
    function BuildingSchema() {
    }
    Object.defineProperty(BuildingSchema, "schema", {
        get: function () {
            var schema = mongoose.Schema({
                name: {
                    type: String
                },
                totalSlabArea: {
                    type: Number
                },
                totalCarperAreaOfUnit: {
                    type: Number
                },
                totalSaleableAreaOfUnit: {
                    type: Number
                },
                plinthArea: {
                    type: Number
                },
                totalNoOfFloors: {
                    type: Number
                },
                noOfParkingFloors: {
                    type: Number
                },
                carpetAreaOfParking: {
                    type: Number
                },
                noOfOneBHK: {
                    type: Number
                },
                noOfTwoBHK: {
                    type: Number
                },
                noOfThreeBHK: {
                    type: Number
                },
                noOfFourBHK: {
                    type: Number
                },
                noOfFiveBHK: {
                    type: Number
                },
                noOfLift: {
                    type: Number
                },
                costHead: [{}],
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
    return BuildingSchema;
}());
var schema = mongooseConnection.model('Building', BuildingSchema.schema);
module.exports = schema;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3QvZGF0YWFjY2Vzcy9zY2hlbWFzL0J1aWxkaW5nU2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxRUFBd0U7QUFJeEUsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDO0FBQzNDLElBQUksa0JBQWtCLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixDQUFDO0FBRXZEO0lBQUE7SUEwREEsQ0FBQztJQXpEQyxzQkFBVyx3QkFBTTthQUFqQjtZQUVFLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBRTNCLElBQUksRUFBRTtvQkFDSixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxhQUFhLEVBQUU7b0JBQ2IsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QscUJBQXFCLEVBQUU7b0JBQ3JCLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNDLHVCQUF1QixFQUFFO29CQUN6QixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDQyxVQUFVLEVBQUM7b0JBQ1gsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0MsZUFBZSxFQUFDO29CQUNoQixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDQyxpQkFBaUIsRUFBQztvQkFDbEIsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0MsbUJBQW1CLEVBQUM7b0JBQ3BCLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNELFVBQVUsRUFBRTtvQkFDVixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDRCxVQUFVLEVBQUU7b0JBQ1YsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0QsWUFBWSxFQUFFO29CQUNaLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNDLFdBQVcsRUFBRTtvQkFDYixJQUFJLEVBQUUsTUFBTTtpQkFDYjtnQkFDQyxXQUFXLEVBQUU7b0JBQ2IsSUFBSSxFQUFFLE1BQU07aUJBQ2I7Z0JBQ0MsUUFBUSxFQUFFO29CQUNWLElBQUksRUFBRSxNQUFNO2lCQUNiO2dCQUNELFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDZCxlQUFlLEVBQUU7b0JBQ2YsSUFBSSxFQUFFLElBQUk7aUJBQ1g7YUFDRixFQUNDO2dCQUNFLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixVQUFVLEVBQUMsSUFBSTthQUNoQixDQUFDLENBQUM7WUFDTCxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ2hCLENBQUM7OztPQUFBO0lBQ0gscUJBQUM7QUFBRCxDQTFEQSxBQTBEQyxJQUFBO0FBQ0QsSUFBSSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFXLFVBQVUsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkYsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6ImFwcC9hcHBsaWNhdGlvblByb2plY3QvZGF0YWFjY2Vzcy9zY2hlbWFzL0J1aWxkaW5nU2NoZW1hLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IERhdGFBY2Nlc3MgPSByZXF1aXJlKCcuLi8uLi8uLi9mcmFtZXdvcmsvZGF0YWFjY2Vzcy9kYXRhYWNjZXNzJyk7XHJcbmltcG9ydCBCdWlsZGluZyA9IHJlcXVpcmUoJy4uL21vbmdvb3NlL0J1aWxkaW5nJyk7XHJcbmltcG9ydCBDYXRlZ29yeSA9IHJlcXVpcmUoJy4uL21vbmdvb3NlL0Nvc3RIZWFkJyk7XHJcblxyXG5sZXQgbW9uZ29vc2UgPSBEYXRhQWNjZXNzLm1vbmdvb3NlSW5zdGFuY2U7XHJcbmxldCBtb25nb29zZUNvbm5lY3Rpb24gPSBEYXRhQWNjZXNzLm1vbmdvb3NlQ29ubmVjdGlvbjtcclxuXHJcbmNsYXNzIEJ1aWxkaW5nU2NoZW1hIHtcclxuICBzdGF0aWMgZ2V0IHNjaGVtYSgpIHtcclxuXHJcbiAgICBsZXQgc2NoZW1hID0gbW9uZ29vc2UuU2NoZW1hKHtcclxuXHJcbiAgICAgIG5hbWU6IHtcclxuICAgICAgICB0eXBlOiBTdHJpbmdcclxuICAgICAgfSxcclxuICAgICAgdG90YWxTbGFiQXJlYToge1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICB0b3RhbENhcnBlckFyZWFPZlVuaXQ6IHtcclxuICAgICAgICB0eXBlOiBOdW1iZXJcclxuICAgICAgfSxcclxuICAgICAgICB0b3RhbFNhbGVhYmxlQXJlYU9mVW5pdDoge1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICAgIHBsaW50aEFyZWE6e1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICAgIHRvdGFsTm9PZkZsb29yczp7XHJcbiAgICAgICAgdHlwZTogTnVtYmVyXHJcbiAgICAgIH0sXHJcbiAgICAgICAgbm9PZlBhcmtpbmdGbG9vcnM6e1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICAgIGNhcnBldEFyZWFPZlBhcmtpbmc6e1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICBub09mT25lQkhLOiB7XHJcbiAgICAgICAgdHlwZTogTnVtYmVyXHJcbiAgICAgIH0sXHJcbiAgICAgIG5vT2ZUd29CSEs6IHtcclxuICAgICAgICB0eXBlOiBOdW1iZXJcclxuICAgICAgfSxcclxuICAgICAgbm9PZlRocmVlQkhLOiB7XHJcbiAgICAgICAgdHlwZTogTnVtYmVyXHJcbiAgICAgIH0sXHJcbiAgICAgICAgbm9PZkZvdXJCSEs6IHtcclxuICAgICAgICB0eXBlOiBOdW1iZXJcclxuICAgICAgfSxcclxuICAgICAgICBub09mRml2ZUJISzoge1xyXG4gICAgICAgIHR5cGU6IE51bWJlclxyXG4gICAgICB9LFxyXG4gICAgICAgIG5vT2ZMaWZ0OiB7XHJcbiAgICAgICAgdHlwZTogTnVtYmVyXHJcbiAgICAgIH0sXHJcbiAgICAgIGNvc3RIZWFkOiBbe31dLFxyXG4gICAgICBhY3RpdmF0aW9uX2RhdGU6IHtcclxuICAgICAgICB0eXBlOiBEYXRlLFxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgdmVyc2lvbktleTogZmFsc2UsXHJcbiAgICAgICAgdGltZXN0YW1wczp0cnVlXHJcbiAgICAgIH0pO1xyXG4gICAgcmV0dXJuIHNjaGVtYTtcclxuICB9XHJcbn1cclxubGV0IHNjaGVtYSA9IG1vbmdvb3NlQ29ubmVjdGlvbi5tb2RlbDxCdWlsZGluZz4oJ0J1aWxkaW5nJywgQnVpbGRpbmdTY2hlbWEuc2NoZW1hKTtcclxuZXhwb3J0ID0gc2NoZW1hO1xyXG4iXX0=
