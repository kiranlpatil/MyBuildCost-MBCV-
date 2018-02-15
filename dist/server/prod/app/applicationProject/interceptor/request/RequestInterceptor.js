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
var log4js = require("log4js");
var logger = log4js.getLogger('RequestInterceptor');
var typescript_ioc_1 = require("typescript-ioc");
var RequestInterceptor = (function () {
    function RequestInterceptor() {
    }
    RequestInterceptor.prototype.intercept = function (req, res, next) {
        logger.info('URL => ' + req.baseUrl);
        logger.info('Body => ' + JSON.stringify(req.body));
        logger.info('Params => ' + JSON.stringify(req.params));
        next();
    };
    RequestInterceptor = __decorate([
        typescript_ioc_1.Singleton,
        __metadata("design:paramtypes", [])
    ], RequestInterceptor);
    return RequestInterceptor;
}());
module.exports = RequestInterceptor;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3QvaW50ZXJjZXB0b3IvcmVxdWVzdC9SZXF1ZXN0SW50ZXJjZXB0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLCtCQUFrQztBQUVsQyxJQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDcEQsaURBQThEO0FBSTlEO0lBQ0U7SUFDQSxDQUFDO0lBQ0Qsc0NBQVMsR0FBVCxVQUFVLEdBQW1CLEVBQUUsR0FBcUIsRUFBRSxJQUFTO1FBQzlELE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDdkQsSUFBSSxFQUFFLENBQUM7SUFDUixDQUFDO0lBUkcsa0JBQWtCO1FBRHZCLDBCQUFTOztPQUNKLGtCQUFrQixDQVN2QjtJQUFELHlCQUFDO0NBVEQsQUFTQyxJQUFBO0FBQ0QsaUJBQVMsa0JBQWtCLENBQUMiLCJmaWxlIjoiYXBwL2FwcGxpY2F0aW9uUHJvamVjdC9pbnRlcmNlcHRvci9yZXF1ZXN0L1JlcXVlc3RJbnRlcmNlcHRvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBsb2c0anMgPSByZXF1aXJlKCdsb2c0anMnKTtcclxuLy9pbXBvcnQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XHJcbmxldCBsb2dnZXIgPSBsb2c0anMuZ2V0TG9nZ2VyKCdSZXF1ZXN0SW50ZXJjZXB0b3InKTtcclxuaW1wb3J0IHsgU2luZ2xldG9uLCBJbmplY3QsIEF1dG9XaXJlZCB9IGZyb20gJ3R5cGVzY3JpcHQtaW9jJztcclxuaW1wb3J0ICogYXMgZXhwcmVzcyBmcm9tICdleHByZXNzJztcclxuXHJcbkBTaW5nbGV0b25cclxuY2xhc3MgUmVxdWVzdEludGVyY2VwdG9yIHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICB9XHJcbiAgaW50ZXJjZXB0KHJlcTpleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSwgbmV4dDogYW55KSB7XHJcbiAgIGxvZ2dlci5pbmZvKCdVUkwgPT4gJyArcmVxLmJhc2VVcmwpO1xyXG4gICBsb2dnZXIuaW5mbygnQm9keSA9PiAnICsgSlNPTi5zdHJpbmdpZnkocmVxLmJvZHkpKTtcclxuICAgbG9nZ2VyLmluZm8oJ1BhcmFtcyA9PiAnICsgSlNPTi5zdHJpbmdpZnkocmVxLnBhcmFtcykpO1xyXG4gICBuZXh0KCk7XHJcbiAgfVxyXG59XHJcbmV4cG9ydCA9IFJlcXVlc3RJbnRlcmNlcHRvcjtcclxuIl19
