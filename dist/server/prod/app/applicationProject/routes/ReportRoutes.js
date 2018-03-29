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
var ReportController = require("./../controllers/ReportController");
var AuthInterceptor = require("./../../framework/interceptor/auth.interceptor");
var typescript_ioc_1 = require("typescript-ioc");
var RequestInterceptor = require("../interceptor/request/RequestInterceptor");
var ResponseInterceptor = require("../interceptor/response/ResponseInterceptor");
var router = express.Router();
var ReportRoutes = (function () {
    function ReportRoutes() {
        this._reportController = new ReportController();
        this.authInterceptor = new AuthInterceptor();
    }
    Object.defineProperty(ReportRoutes.prototype, "routes", {
        get: function () {
            var controller = this._reportController;
            router.get('/:reportType/project/:projectId/rate/:costingUnit/area/:costingArea', this.authInterceptor.requiresAuth, this._requestInterceptor.intercept, controller.getProject, this._responseInterceptor.exit);
            router.get('/costHeads', this.authInterceptor.requiresAuth, this._requestInterceptor.intercept, controller.getRateAnalysisCostHeads, this._responseInterceptor.exit);
            router.get('/workItems', this.authInterceptor.requiresAuth, this._requestInterceptor.intercept, controller.getRateAnalysisWorkItems, this._responseInterceptor.exit);
            return router;
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        typescript_ioc_1.Inject,
        __metadata("design:type", RequestInterceptor)
    ], ReportRoutes.prototype, "_requestInterceptor", void 0);
    __decorate([
        typescript_ioc_1.Inject,
        __metadata("design:type", ResponseInterceptor)
    ], ReportRoutes.prototype, "_responseInterceptor", void 0);
    return ReportRoutes;
}());
Object.seal(ReportRoutes);
module.exports = ReportRoutes;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3Qvcm91dGVzL1JlcG9ydFJvdXRlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsaUNBQW9DO0FBQ3BDLG9FQUF1RTtBQUN2RSxnRkFBbUY7QUFFbkYsaURBQXdDO0FBQ3hDLDhFQUFpRjtBQUNqRixpRkFBb0Y7QUFFcEYsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRTlCO0lBU0U7UUFDRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0lBQ0Qsc0JBQUksZ0NBQU07YUFBVjtZQUVFLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztZQUd4QyxNQUFNLENBQUMsR0FBRyxDQUFDLHFFQUFxRSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQ3JKLFVBQVUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBR3pELE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQzVGLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7WUFHdkUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFDNUYsVUFBVSxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2RSxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ2hCLENBQUM7OztPQUFBO0lBeEJEO1FBREMsdUJBQU07a0NBQ3NCLGtCQUFrQjs2REFBQztJQUVoRDtRQURDLHVCQUFNO2tDQUN1QixtQkFBbUI7OERBQUM7SUF1QnBELG1CQUFDO0NBOUJELEFBOEJDLElBQUE7QUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzFCLGlCQUFTLFlBQVksQ0FBQyIsImZpbGUiOiJhcHAvYXBwbGljYXRpb25Qcm9qZWN0L3JvdXRlcy9SZXBvcnRSb3V0ZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZXhwcmVzcyA9IHJlcXVpcmUoJ2V4cHJlc3MnKTtcbmltcG9ydCBSZXBvcnRDb250cm9sbGVyID0gcmVxdWlyZSgnLi8uLi9jb250cm9sbGVycy9SZXBvcnRDb250cm9sbGVyJyk7XG5pbXBvcnQgQXV0aEludGVyY2VwdG9yID0gcmVxdWlyZSgnLi8uLi8uLi9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvYXV0aC5pbnRlcmNlcHRvcicpO1xuaW1wb3J0IExvZ2dlckludGVyY2VwdG9yID0gcmVxdWlyZSgnLi8uLi8uLi9mcmFtZXdvcmsvaW50ZXJjZXB0b3IvTG9nZ2VySW50ZXJjZXB0b3InKTtcbmltcG9ydCB7IEluamVjdCB9IGZyb20gJ3R5cGVzY3JpcHQtaW9jJztcbmltcG9ydCBSZXF1ZXN0SW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvci9yZXF1ZXN0L1JlcXVlc3RJbnRlcmNlcHRvcicpO1xuaW1wb3J0IFJlc3BvbnNlSW50ZXJjZXB0b3IgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvci9yZXNwb25zZS9SZXNwb25zZUludGVyY2VwdG9yJyk7XG5cbnZhciByb3V0ZXIgPSBleHByZXNzLlJvdXRlcigpO1xuXG5jbGFzcyBSZXBvcnRSb3V0ZXMge1xuICBwcml2YXRlIF9yZXBvcnRDb250cm9sbGVyOiBSZXBvcnRDb250cm9sbGVyO1xuICBwcml2YXRlIGF1dGhJbnRlcmNlcHRvcjogQXV0aEludGVyY2VwdG9yO1xuICBwcml2YXRlIGxvZ2dlckludGVyY2VwdG9yOiBMb2dnZXJJbnRlcmNlcHRvcjtcbiAgQEluamVjdFxuICBwcml2YXRlIF9yZXF1ZXN0SW50ZXJjZXB0b3I6IFJlcXVlc3RJbnRlcmNlcHRvcjtcbiAgQEluamVjdFxuICBwcml2YXRlIF9yZXNwb25zZUludGVyY2VwdG9yOiBSZXNwb25zZUludGVyY2VwdG9yO1xuXG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLl9yZXBvcnRDb250cm9sbGVyID0gbmV3IFJlcG9ydENvbnRyb2xsZXIoKTtcbiAgICB0aGlzLmF1dGhJbnRlcmNlcHRvciA9IG5ldyBBdXRoSW50ZXJjZXB0b3IoKTtcbiAgfVxuICBnZXQgcm91dGVzICgpIDogZXhwcmVzcy5Sb3V0ZXIge1xuXG4gICAgdmFyIGNvbnRyb2xsZXIgPSB0aGlzLl9yZXBvcnRDb250cm9sbGVyO1xuXG4gICAgLy9Qcm92aWRlIGFsbCBidWlsZGluZ3MgaW4gYSBQcm9qZWN0IHdpdGggdGh1bWJydWxlIGFuZCBlc3RpbWF0ZSByZXBvcnQgd2l0aCBwYXJ0aWN1bGFyIGFyZWEgYW5kIHVuaXQuXG4gICAgcm91dGVyLmdldCgnLzpyZXBvcnRUeXBlL3Byb2plY3QvOnByb2plY3RJZC9yYXRlLzpjb3N0aW5nVW5pdC9hcmVhLzpjb3N0aW5nQXJlYScsIHRoaXMuYXV0aEludGVyY2VwdG9yLnJlcXVpcmVzQXV0aCwgdGhpcy5fcmVxdWVzdEludGVyY2VwdG9yLmludGVyY2VwdCxcbiAgICAgIGNvbnRyb2xsZXIuZ2V0UHJvamVjdCwgdGhpcy5fcmVzcG9uc2VJbnRlcmNlcHRvci5leGl0KTtcblxuICAgIC8vUHJvdmlkZSBhbGwgY29zdGhlYWRzIGZyb20gcmF0ZSBhbmFseXNpc1xuICAgIHJvdXRlci5nZXQoJy9jb3N0SGVhZHMnLCB0aGlzLmF1dGhJbnRlcmNlcHRvci5yZXF1aXJlc0F1dGgsIHRoaXMuX3JlcXVlc3RJbnRlcmNlcHRvci5pbnRlcmNlcHQsXG4gICAgICBjb250cm9sbGVyLmdldFJhdGVBbmFseXNpc0Nvc3RIZWFkcywgdGhpcy5fcmVzcG9uc2VJbnRlcmNlcHRvci5leGl0KTtcblxuICAgIC8vUHJvdmlkZSBhbGwgd29ya2l0ZW1zIGZyb20gcmF0ZSBhbmFseXNpc1xuICAgIHJvdXRlci5nZXQoJy93b3JrSXRlbXMnLCB0aGlzLmF1dGhJbnRlcmNlcHRvci5yZXF1aXJlc0F1dGgsIHRoaXMuX3JlcXVlc3RJbnRlcmNlcHRvci5pbnRlcmNlcHQsXG4gICAgICBjb250cm9sbGVyLmdldFJhdGVBbmFseXNpc1dvcmtJdGVtcywgdGhpcy5fcmVzcG9uc2VJbnRlcmNlcHRvci5leGl0KTtcbiAgICByZXR1cm4gcm91dGVyO1xuICB9XG59XG5cbk9iamVjdC5zZWFsKFJlcG9ydFJvdXRlcyk7XG5leHBvcnQgPSBSZXBvcnRSb3V0ZXM7XG4iXX0=
