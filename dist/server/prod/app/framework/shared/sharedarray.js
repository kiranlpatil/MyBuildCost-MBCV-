"use strict";
var config = require('config');
var path = require('path');
var MailAttachments = (function () {
    function MailAttachments() {
    }
    MailAttachments.AttachmentArray = [
        {
            path: path.resolve() + config.get('application.publicPath') + 'images/logo/application-logo.png',
            cid: 'unique@application-logo'
        }
    ];
    MailAttachments.ForgetPasswordAttachmentArray = [
        {
            path: path.resolve() + config.get('application.publicPath') + 'images/logo/application-logo.png',
            cid: 'unique@application-logo'
        },
        {
            path: path.resolve() + config.get('application.publicPath') + 'images/banner/password-reset.png',
            cid: 'unique@password-reset'
        },
        {
            path: path.resolve() + config.get('application.publicPath') + 'images/banner/welcome-aboard.png',
            cid: 'unique@welcome-aboard'
        }
    ];
    return MailAttachments;
}());
module.exports = MailAttachments;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9mcmFtZXdvcmsvc2hhcmVkL3NoYXJlZGFycmF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0IsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCO0lBQUE7SUFxQkEsQ0FBQztJQXBCZSwrQkFBZSxHQUFlO1FBQzFDO1lBQ0UsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEdBQUMsa0NBQWtDO1lBQzlGLEdBQUcsRUFBRSx5QkFBeUI7U0FDL0I7S0FDRixDQUFDO0lBQ1ksNkNBQTZCLEdBQWU7UUFDeEQ7WUFDRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsR0FBQyxrQ0FBa0M7WUFDOUYsR0FBRyxFQUFFLHlCQUF5QjtTQUMvQjtRQUNEO1lBQ0UsSUFBSSxFQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEdBQUMsa0NBQWtDO1lBQy9GLEdBQUcsRUFBRSx1QkFBdUI7U0FDN0I7UUFDRDtZQUNFLElBQUksRUFBRyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFDLGtDQUFrQztZQUMvRixHQUFHLEVBQUUsdUJBQXVCO1NBQzdCO0tBQ0YsQ0FBQztJQUNKLHNCQUFDO0NBckJELEFBcUJDLElBQUE7QUFDRCxpQkFBTyxlQUFlLENBQUMiLCJmaWxlIjoiYXBwL2ZyYW1ld29yay9zaGFyZWQvc2hhcmVkYXJyYXkuanMiLCJzb3VyY2VzQ29udGVudCI6WyJsZXQgY29uZmlnID0gcmVxdWlyZSgnY29uZmlnJyk7XHJcbmxldCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG5jbGFzcyBNYWlsQXR0YWNobWVudHMge1xyXG4gIHB1YmxpYyBzdGF0aWMgQXR0YWNobWVudEFycmF5OiBBcnJheTxhbnk+ID0gW1xyXG4gICAge1xyXG4gICAgICBwYXRoOiBwYXRoLnJlc29sdmUoKSArIGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLnB1YmxpY1BhdGgnKSsnaW1hZ2VzL2xvZ28vYXBwbGljYXRpb24tbG9nby5wbmcnLFxyXG4gICAgICBjaWQ6ICd1bmlxdWVAYXBwbGljYXRpb24tbG9nbydcclxuICAgIH1cclxuICBdO1xyXG4gIHB1YmxpYyBzdGF0aWMgRm9yZ2V0UGFzc3dvcmRBdHRhY2htZW50QXJyYXk6IEFycmF5PGFueT4gPSBbXHJcbiAgICB7XHJcbiAgICAgIHBhdGg6IHBhdGgucmVzb2x2ZSgpICsgY29uZmlnLmdldCgnYXBwbGljYXRpb24ucHVibGljUGF0aCcpKydpbWFnZXMvbG9nby9hcHBsaWNhdGlvbi1sb2dvLnBuZycsXHJcbiAgICAgIGNpZDogJ3VuaXF1ZUBhcHBsaWNhdGlvbi1sb2dvJ1xyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgcGF0aDogIHBhdGgucmVzb2x2ZSgpICsgY29uZmlnLmdldCgnYXBwbGljYXRpb24ucHVibGljUGF0aCcpKydpbWFnZXMvYmFubmVyL3Bhc3N3b3JkLXJlc2V0LnBuZycsXHJcbiAgICAgIGNpZDogJ3VuaXF1ZUBwYXNzd29yZC1yZXNldCdcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIHBhdGg6ICBwYXRoLnJlc29sdmUoKSArIGNvbmZpZy5nZXQoJ2FwcGxpY2F0aW9uLnB1YmxpY1BhdGgnKSsnaW1hZ2VzL2Jhbm5lci93ZWxjb21lLWFib2FyZC5wbmcnLFxyXG4gICAgICBjaWQ6ICd1bmlxdWVAd2VsY29tZS1hYm9hcmQnXHJcbiAgICB9XHJcbiAgXTtcclxufVxyXG5leHBvcnQ9TWFpbEF0dGFjaG1lbnRzO1xyXG4iXX0=
