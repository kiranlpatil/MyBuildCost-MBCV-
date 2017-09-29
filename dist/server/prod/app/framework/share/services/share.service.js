"use strict";
var share_1 = require("../model/share");
var CandidateRepository = require("../../dataaccess/repository/candidate.repository");
var ShareLinkRepository = require("../../dataaccess/repository/share-link.repository");
var Messages = require("../../shared/messages");
var ShareService = (function () {
    function ShareService() {
        this.shareDetails = new share_1.Share();
        this.candidateRepository = new CandidateRepository();
        this.shareLinkRepository = new ShareLinkRepository();
    }
    ShareService.prototype.buildValuePortraitUrl = function (host, access_token, user, res, callback) {
        var _this = this;
        var actualUrl = 'value-portrait' + '/' + user._id + '?access_token=' + access_token;
        var _date = new Date();
        var _miliSeconds = _date.getTime().toString();
        this.shareDetails.first_name = user.first_name;
        this.shareDetails.last_name = user.last_name;
        this.shareDetails.isVisible = res[0].isVisible;
        var _shortString = _miliSeconds;
        this.shareDetails.shareUrl = host + 'share' + '/' + _shortString;
        var _item = {
            shortUrl: _shortString,
            longUrl: actualUrl
        };
        this.shareLinkRepository.create(_item, function (err, res) {
            if (err) {
                callback(new Error(Messages.MSG_ERROR_IF_STORE_TO_SHARE_LINK_FAILED), null);
            }
            else {
                callback(null, _this.shareDetails);
            }
        });
    };
    ShareService.prototype.buildShareJobUrl = function (host, access_token, user, jobId, callback) {
        var _this = this;
        var actualUrl = 'jobPost' + '/' + user._id + '/' + jobId + '?access_token=' + access_token;
        var _date = new Date();
        var _miliSeconds = _date.getTime().toString();
        var _shortString = _miliSeconds + user._id;
        this.shareDetails.shareUrl = host + 'editJob' + '/' + _shortString;
        var _item = {
            shortUrl: _shortString,
            longUrl: actualUrl,
        };
        this.shareLinkRepository.create(_item, function (err, res) {
            if (err) {
                callback(new Error(Messages.MSG_ERROR_IF_STORE_TO_SHARE_LINK_FAILED), null);
            }
            else {
                callback(null, _this.shareDetails);
            }
        });
    };
    ShareService.prototype.retrieve = function (field, callback) {
        this.candidateRepository.retrieveWithoutLean(field, callback);
    };
    ShareService.prototype.retrieveUrl = function (field, callback) {
        this.shareLinkRepository.retrieveWithoutLean(field, callback);
    };
    return ShareService;
}());
module.exports = ShareService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvc2hhcmUvc2VydmljZXMvc2hhcmUuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsd0NBQXFDO0FBQ3JDLHNGQUF5RjtBQUV6Rix1RkFBMEY7QUFDMUYsZ0RBQW1EO0FBRW5EO0lBS0U7UUFKUSxpQkFBWSxHQUFTLElBQUksYUFBSyxFQUFFLENBQUM7UUFLdkMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUNyRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0lBQ3ZELENBQUM7SUFFRCw0Q0FBcUIsR0FBckIsVUFBc0IsSUFBVyxFQUFFLFlBQW1CLEVBQUUsSUFBUSxFQUFFLEdBQXlCLEVBQUUsUUFBMEM7UUFBdkksaUJBdUJDO1FBdEJDLElBQUksU0FBUyxHQUFVLGdCQUFnQixHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLGdCQUFnQixHQUFHLFlBQVksQ0FBQztRQUczRixJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3ZCLElBQUksWUFBWSxHQUFVLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUVyRCxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQy9DLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDN0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUMvQyxJQUFJLFlBQVksR0FBVSxZQUFZLENBQUM7UUFDdkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEdBQUcsSUFBSSxHQUFHLE9BQU8sR0FBRyxHQUFHLEdBQUcsWUFBWSxDQUFDO1FBQ2pFLElBQUksS0FBSyxHQUFPO1lBQ2QsUUFBUSxFQUFFLFlBQVk7WUFDdEIsT0FBTyxFQUFFLFNBQVM7U0FDbkIsQ0FBQztRQUNGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFVBQUMsR0FBRyxFQUFFLEdBQUc7WUFDOUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDUixRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLHVDQUF1QyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUUsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3BDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFDRCx1Q0FBZ0IsR0FBaEIsVUFBaUIsSUFBVyxFQUFFLFlBQW1CLEVBQUUsSUFBUSxFQUFDLEtBQVksRUFBRSxRQUEwQztRQUFwSCxpQkFpQkM7UUFoQkMsSUFBSSxTQUFTLEdBQVUsU0FBUyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFFLEdBQUcsR0FBRyxLQUFLLEdBQUcsZ0JBQWdCLEdBQUcsWUFBWSxDQUFDO1FBQ2pHLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFDdkIsSUFBSSxZQUFZLEdBQVUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3JELElBQUksWUFBWSxHQUFVLFlBQVksR0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ2hELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxTQUFTLEdBQUcsR0FBRyxHQUFHLFlBQVksQ0FBQztRQUNuRSxJQUFJLEtBQUssR0FBTztZQUNkLFFBQVEsRUFBRSxZQUFZO1lBQ3RCLE9BQU8sRUFBRSxTQUFTO1NBQ25CLENBQUM7UUFDRixJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxVQUFDLEdBQUcsRUFBRSxHQUFHO1lBQzlDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ1IsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyx1Q0FBdUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlFLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNwQyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsK0JBQVEsR0FBUixVQUFTLEtBQVMsRUFBRSxRQUF3QztRQUMxRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxrQ0FBVyxHQUFYLFVBQVksS0FBUyxFQUFFLFFBQXdDO1FBQzdELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVILG1CQUFDO0FBQUQsQ0E3REEsQUE2REMsSUFBQTtBQUVELGlCQUFTLFlBQVksQ0FBQyIsImZpbGUiOiJhcHAvZnJhbWV3b3JrL3NoYXJlL3NlcnZpY2VzL3NoYXJlLnNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1NoYXJlfSBmcm9tIFwiLi4vbW9kZWwvc2hhcmVcIjtcbmltcG9ydCBDYW5kaWRhdGVSZXBvc2l0b3J5ID0gcmVxdWlyZSgnLi4vLi4vZGF0YWFjY2Vzcy9yZXBvc2l0b3J5L2NhbmRpZGF0ZS5yZXBvc2l0b3J5Jyk7XG5pbXBvcnQgQ2FuZGlkYXRlQ2xhc3NNb2RlbCA9IHJlcXVpcmUoJy4uLy4uL2RhdGFhY2Nlc3MvbW9kZWwvY2FuZGlkYXRlLWNsYXNzLm1vZGVsJyk7XG5pbXBvcnQgU2hhcmVMaW5rUmVwb3NpdG9yeSA9IHJlcXVpcmUoXCIuLi8uLi9kYXRhYWNjZXNzL3JlcG9zaXRvcnkvc2hhcmUtbGluay5yZXBvc2l0b3J5XCIpO1xuaW1wb3J0IE1lc3NhZ2VzID0gcmVxdWlyZShcIi4uLy4uL3NoYXJlZC9tZXNzYWdlc1wiKTtcblxuY2xhc3MgU2hhcmVTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBzaGFyZURldGFpbHM6U2hhcmUgPSBuZXcgU2hhcmUoKTtcbiAgcHJpdmF0ZSBjYW5kaWRhdGVSZXBvc2l0b3J5OkNhbmRpZGF0ZVJlcG9zaXRvcnk7XG4gIHByaXZhdGUgc2hhcmVMaW5rUmVwb3NpdG9yeTpTaGFyZUxpbmtSZXBvc2l0b3J5O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuY2FuZGlkYXRlUmVwb3NpdG9yeSA9IG5ldyBDYW5kaWRhdGVSZXBvc2l0b3J5KCk7XG4gICAgdGhpcy5zaGFyZUxpbmtSZXBvc2l0b3J5ID0gbmV3IFNoYXJlTGlua1JlcG9zaXRvcnkoKTtcbiAgfVxuXG4gIGJ1aWxkVmFsdWVQb3J0cmFpdFVybChob3N0OnN0cmluZywgYWNjZXNzX3Rva2VuOnN0cmluZywgdXNlcjphbnksIHJlczpDYW5kaWRhdGVDbGFzc01vZGVsW10sIGNhbGxiYWNrOihlcnJvcjphbnksIHJlc3VsdDpTaGFyZSkgPT4gdm9pZCkge1xuICAgIGxldCBhY3R1YWxVcmw6c3RyaW5nID0gJ3ZhbHVlLXBvcnRyYWl0JyArICcvJyArIHVzZXIuX2lkICsgJz9hY2Nlc3NfdG9rZW49JyArIGFjY2Vzc190b2tlbjtcbiAgICAvL2xldCB1cmxGb3JTaGFyZSA9IGhvc3QgKyAndmFsdWUtcG9ydHJhaXQnICsgJy8nICsgdXNlci5faWQgKyAnP2FjY2Vzc190b2tlbj0nICsgYWNjZXNzX3Rva2VuO1xuXG4gICAgbGV0IF9kYXRlID0gbmV3IERhdGUoKTtcbiAgICBsZXQgX21pbGlTZWNvbmRzOnN0cmluZyA9IF9kYXRlLmdldFRpbWUoKS50b1N0cmluZygpO1xuXG4gICAgdGhpcy5zaGFyZURldGFpbHMuZmlyc3RfbmFtZSA9IHVzZXIuZmlyc3RfbmFtZTtcbiAgICB0aGlzLnNoYXJlRGV0YWlscy5sYXN0X25hbWUgPSB1c2VyLmxhc3RfbmFtZTtcbiAgICB0aGlzLnNoYXJlRGV0YWlscy5pc1Zpc2libGUgPSByZXNbMF0uaXNWaXNpYmxlO1xuICAgIGxldCBfc2hvcnRTdHJpbmc6c3RyaW5nID0gX21pbGlTZWNvbmRzO1xuICAgIHRoaXMuc2hhcmVEZXRhaWxzLnNoYXJlVXJsID0gaG9zdCArICdzaGFyZScgKyAnLycgKyBfc2hvcnRTdHJpbmc7XG4gICAgbGV0IF9pdGVtOmFueSA9IHtcbiAgICAgIHNob3J0VXJsOiBfc2hvcnRTdHJpbmcsXG4gICAgICBsb25nVXJsOiBhY3R1YWxVcmxcbiAgICB9O1xuICAgIHRoaXMuc2hhcmVMaW5rUmVwb3NpdG9yeS5jcmVhdGUoX2l0ZW0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX0lGX1NUT1JFX1RPX1NIQVJFX0xJTktfRkFJTEVEKSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhudWxsLCB0aGlzLnNoYXJlRGV0YWlscyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgYnVpbGRTaGFyZUpvYlVybChob3N0OnN0cmluZywgYWNjZXNzX3Rva2VuOnN0cmluZywgdXNlcjphbnksam9iSWQ6c3RyaW5nICxjYWxsYmFjazooZXJyb3I6YW55LCByZXN1bHQ6U2hhcmUpID0+IHZvaWQpIHtcbiAgICBsZXQgYWN0dWFsVXJsOnN0cmluZyA9ICdqb2JQb3N0JyArICcvJyArIHVzZXIuX2lkICsnLycgKyBqb2JJZCArICc/YWNjZXNzX3Rva2VuPScgKyBhY2Nlc3NfdG9rZW47XG4gICAgbGV0IF9kYXRlID0gbmV3IERhdGUoKTtcbiAgICBsZXQgX21pbGlTZWNvbmRzOnN0cmluZyA9IF9kYXRlLmdldFRpbWUoKS50b1N0cmluZygpO1xuICAgIGxldCBfc2hvcnRTdHJpbmc6c3RyaW5nID0gX21pbGlTZWNvbmRzK3VzZXIuX2lkO1xuICAgIHRoaXMuc2hhcmVEZXRhaWxzLnNoYXJlVXJsID0gaG9zdCArICdlZGl0Sm9iJyArICcvJyArIF9zaG9ydFN0cmluZztcbiAgICBsZXQgX2l0ZW06YW55ID0ge1xuICAgICAgc2hvcnRVcmw6IF9zaG9ydFN0cmluZyxcbiAgICAgIGxvbmdVcmw6IGFjdHVhbFVybCxcbiAgICB9O1xuICAgIHRoaXMuc2hhcmVMaW5rUmVwb3NpdG9yeS5jcmVhdGUoX2l0ZW0sIChlcnIsIHJlcykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoTWVzc2FnZXMuTVNHX0VSUk9SX0lGX1NUT1JFX1RPX1NIQVJFX0xJTktfRkFJTEVEKSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhudWxsLCB0aGlzLnNoYXJlRGV0YWlscyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXRyaWV2ZShmaWVsZDphbnksIGNhbGxiYWNrOihlcnJvcjphbnksIHJlc3VsdDphbnkpID0+IHZvaWQpIHtcbiAgICB0aGlzLmNhbmRpZGF0ZVJlcG9zaXRvcnkucmV0cmlldmVXaXRob3V0TGVhbihmaWVsZCwgY2FsbGJhY2spO1xuICB9XG5cbiAgcmV0cmlldmVVcmwoZmllbGQ6YW55LCBjYWxsYmFjazooZXJyb3I6YW55LCByZXN1bHQ6YW55KSA9PiB2b2lkKSB7XG4gICAgdGhpcy5zaGFyZUxpbmtSZXBvc2l0b3J5LnJldHJpZXZlV2l0aG91dExlYW4oZmllbGQsIGNhbGxiYWNrKTtcbiAgfVxuXG59XG4vL09iamVjdC5zZWFsKFNoYXJlU2VydmljZSk7XG5leHBvcnQgPSBTaGFyZVNlcnZpY2U7XG4iXX0=
