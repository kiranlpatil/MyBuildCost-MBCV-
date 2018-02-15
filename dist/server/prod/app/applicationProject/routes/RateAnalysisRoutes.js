"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var express = require("express");
var RateAnalysisController = require("./../controllers/RateAnalysisController");
var AuthInterceptor = require("./../../framework/interceptor/auth.interceptor");
var typescript_ioc_1 = require("typescript-ioc");
var RequestInterceptor = require("../interceptor/request/RequestInterceptor");
var ResponseInterceptor = require("../interceptor/response/ResponseInterceptor");
var router = express.Router();
var RateAnalysisRoutes = (function () {
    function RateAnalysisRoutes() {
        this._rateAnalysisController = new RateAnalysisController();
        this.authInterceptor = new AuthInterceptor();
    }
    Object.defineProperty(RateAnalysisRoutes.prototype, "routes", {
        get: function () {
            var controller = this._rateAnalysisController;
            router.get('/costHeads', this.authInterceptor.requiresAuth, this._requestInterceptor.intercept, controller.getRateAnalysisCostHeads, this._responseInterceptor.exit);
            router.get('/workItems', this.authInterceptor.requiresAuth, this._requestInterceptor.intercept, controller.getRateAnalysisWorkItems, this._responseInterceptor.exit);
            router.get('/costHead/:id/workItems', this.authInterceptor.requiresAuth, this._requestInterceptor.intercept, controller.getRateAnalysisWorkItemsByCostHeadId, this._responseInterceptor.exit);
            router.get('/costHead/:costHeadId/workItem/:workitemId', this.authInterceptor.requiresAuth, this._requestInterceptor.intercept, controller.getRate, this._responseInterceptor.exit);
            return router;
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        typescript_ioc_1.Inject,
        __metadata("design:type", RequestInterceptor)
    ], RateAnalysisRoutes.prototype, "_requestInterceptor", void 0);
    __decorate([
        typescript_ioc_1.Inject,
        __metadata("design:type", ResponseInterceptor)
    ], RateAnalysisRoutes.prototype, "_responseInterceptor", void 0);
    return RateAnalysisRoutes;
}());
Object.seal(RateAnalysisRoutes);
module.exports = RateAnalysisRoutes;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3Qvcm91dGVzL1JhdGVBbmFseXNpc1JvdXRlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsaUNBQW9DO0FBQ3BDLGdGQUFtRjtBQUNuRixnRkFBbUY7QUFFbkYsaURBQXdDO0FBQ3hDLDhFQUFpRjtBQUNqRixpRkFBb0Y7QUFDcEYsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRTlCO0lBU0U7UUFDRSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1FBQzVELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0lBQ0Qsc0JBQUksc0NBQU07YUFBVjtZQUVFLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUM5QyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUM1RixVQUFVLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXZFLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQzVGLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFdkUsTUFBTSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUN6RyxVQUFVLENBQUMsb0NBQW9DLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRW5GLE1BQU0sQ0FBQyxHQUFHLENBQUMsNENBQTRDLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFDNUgsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEQsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNoQixDQUFDOzs7T0FBQTtJQXZCRDtRQURDLHVCQUFNO2tDQUNzQixrQkFBa0I7bUVBQUM7SUFFaEQ7UUFEQyx1QkFBTTtrQ0FDdUIsbUJBQW1CO29FQUFDO0lBc0JwRCx5QkFBQztDQTdCRCxBQTZCQyxJQUFBO0FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ2hDLGlCQUFTLGtCQUFrQixDQUFDIiwiZmlsZSI6ImFwcC9hcHBsaWNhdGlvblByb2plY3Qvcm91dGVzL1JhdGVBbmFseXNpc1JvdXRlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBleHByZXNzID0gcmVxdWlyZSgnZXhwcmVzcycpO1xyXG5pbXBvcnQgUmF0ZUFuYWx5c2lzQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vLi4vY29udHJvbGxlcnMvUmF0ZUFuYWx5c2lzQ29udHJvbGxlcicpO1xyXG5pbXBvcnQgQXV0aEludGVyY2VwdG9yID0gcmVxdWlyZSgnLi8uLi8uLi9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvcicpO1xyXG5pbXBvcnQgTG9nZ2VySW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLy4uLy4uL2ZyYW1ld29yay9pbnRlcmNlcHRvci9Mb2dnZXJJbnRlcmNlcHRvcicpO1xyXG5pbXBvcnQgeyBJbmplY3QgfSBmcm9tICd0eXBlc2NyaXB0LWlvYyc7XHJcbmltcG9ydCBSZXF1ZXN0SW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvci9yZXF1ZXN0L1JlcXVlc3RJbnRlcmNlcHRvcicpO1xyXG5pbXBvcnQgUmVzcG9uc2VJbnRlcmNlcHRvciA9IHJlcXVpcmUoJy4uL2ludGVyY2VwdG9yL3Jlc3BvbnNlL1Jlc3BvbnNlSW50ZXJjZXB0b3InKTtcclxudmFyIHJvdXRlciA9IGV4cHJlc3MuUm91dGVyKCk7XHJcblxyXG5jbGFzcyBSYXRlQW5hbHlzaXNSb3V0ZXMge1xyXG4gIHByaXZhdGUgX3JhdGVBbmFseXNpc0NvbnRyb2xsZXI6IFJhdGVBbmFseXNpc0NvbnRyb2xsZXI7XHJcbiAgcHJpdmF0ZSBhdXRoSW50ZXJjZXB0b3I6IEF1dGhJbnRlcmNlcHRvcjtcclxuICBwcml2YXRlIGxvZ2dlckludGVyY2VwdG9yOiBMb2dnZXJJbnRlcmNlcHRvcjtcclxuICBASW5qZWN0XHJcbiAgcHJpdmF0ZSBfcmVxdWVzdEludGVyY2VwdG9yOiBSZXF1ZXN0SW50ZXJjZXB0b3I7XHJcbiAgQEluamVjdFxyXG4gIHByaXZhdGUgX3Jlc3BvbnNlSW50ZXJjZXB0b3I6IFJlc3BvbnNlSW50ZXJjZXB0b3I7XHJcblxyXG4gIGNvbnN0cnVjdG9yICgpIHtcclxuICAgIHRoaXMuX3JhdGVBbmFseXNpc0NvbnRyb2xsZXIgPSBuZXcgUmF0ZUFuYWx5c2lzQ29udHJvbGxlcigpO1xyXG4gICAgdGhpcy5hdXRoSW50ZXJjZXB0b3IgPSBuZXcgQXV0aEludGVyY2VwdG9yKCk7XHJcbiAgfVxyXG4gIGdldCByb3V0ZXMgKCkgOiBleHByZXNzLlJvdXRlciB7XHJcblxyXG4gICAgdmFyIGNvbnRyb2xsZXIgPSB0aGlzLl9yYXRlQW5hbHlzaXNDb250cm9sbGVyO1xyXG4gICAgcm91dGVyLmdldCgnL2Nvc3RIZWFkcycsIHRoaXMuYXV0aEludGVyY2VwdG9yLnJlcXVpcmVzQXV0aCwgdGhpcy5fcmVxdWVzdEludGVyY2VwdG9yLmludGVyY2VwdCxcclxuICAgICAgY29udHJvbGxlci5nZXRSYXRlQW5hbHlzaXNDb3N0SGVhZHMsIHRoaXMuX3Jlc3BvbnNlSW50ZXJjZXB0b3IuZXhpdCk7XHJcblxyXG4gICAgcm91dGVyLmdldCgnL3dvcmtJdGVtcycsIHRoaXMuYXV0aEludGVyY2VwdG9yLnJlcXVpcmVzQXV0aCwgdGhpcy5fcmVxdWVzdEludGVyY2VwdG9yLmludGVyY2VwdCxcclxuICAgICAgY29udHJvbGxlci5nZXRSYXRlQW5hbHlzaXNXb3JrSXRlbXMsIHRoaXMuX3Jlc3BvbnNlSW50ZXJjZXB0b3IuZXhpdCk7XHJcblxyXG4gICAgcm91dGVyLmdldCgnL2Nvc3RIZWFkLzppZC93b3JrSXRlbXMnLCB0aGlzLmF1dGhJbnRlcmNlcHRvci5yZXF1aXJlc0F1dGgsIHRoaXMuX3JlcXVlc3RJbnRlcmNlcHRvci5pbnRlcmNlcHQsXHJcbiAgICAgIGNvbnRyb2xsZXIuZ2V0UmF0ZUFuYWx5c2lzV29ya0l0ZW1zQnlDb3N0SGVhZElkLCB0aGlzLl9yZXNwb25zZUludGVyY2VwdG9yLmV4aXQpO1xyXG5cclxuICAgIHJvdXRlci5nZXQoJy9jb3N0SGVhZC86Y29zdEhlYWRJZC93b3JrSXRlbS86d29ya2l0ZW1JZCcsIHRoaXMuYXV0aEludGVyY2VwdG9yLnJlcXVpcmVzQXV0aCwgdGhpcy5fcmVxdWVzdEludGVyY2VwdG9yLmludGVyY2VwdCxcclxuICAgICAgY29udHJvbGxlci5nZXRSYXRlLCB0aGlzLl9yZXNwb25zZUludGVyY2VwdG9yLmV4aXQpO1xyXG4gICAgcmV0dXJuIHJvdXRlcjtcclxuICB9XHJcbn1cclxuXHJcbk9iamVjdC5zZWFsKFJhdGVBbmFseXNpc1JvdXRlcyk7XHJcbmV4cG9ydCA9IFJhdGVBbmFseXNpc1JvdXRlcztcclxuIl19
