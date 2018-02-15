"use strict";
var ReportService = require("./../services/ReportService");
var Response = require("../interceptor/response/Response");
var CostControllException = require("../exception/CostControllException");
var config = require('config');
var log4js = require('log4js');
var logger = log4js.getLogger('Report Controller');
var ReportController = (function () {
    function ReportController() {
        this._reportService = new ReportService();
    }
    ReportController.prototype.getProject = function (req, res, next) {
        try {
            logger.info('Report Controller, getProject has been hit');
            var reportService = new ReportService();
            var user = req.user;
            var projectId_1 = req.params.id;
            var reportType_1 = req.params.type;
            var projectRate_1 = req.params.rate;
            var projectArea_1 = req.params.area;
            reportService.getReport(projectId_1, reportType_1, projectRate_1, projectArea_1, user, function (error, result) {
                if (error) {
                    next(error);
                }
                else {
                    logger.info('Get Project success');
                    logger.debug('Getting Project for Project ID : ' + projectId_1 + ', Report Type : ' + reportType_1 +
                        ', Project Rate : ' + projectRate_1 + ', Project Area : ' + projectArea_1);
                    next(new Response(200, result));
                }
            });
        }
        catch (e) {
            next(new CostControllException(e.message, e.stack));
        }
    };
    ReportController.prototype.getRateAnalysisCostHeads = function (req, res, next) {
        try {
            logger.info('Report Controller, getRateAnalysisCostHeads has been hit');
            var reportService = new ReportService();
            var user = req.user;
            var url = config.get('rateAnalysisAPI.costHeads');
            reportService.getCostHeads(user, url, function (error, result) {
                if (error) {
                    next(error);
                }
                else {
                    logger.info('Get Rate Analysis CostHeads success');
                    next(new Response(200, result));
                }
            });
        }
        catch (e) {
            next(new CostControllException(e.message, e.stack));
        }
    };
    ReportController.prototype.getRateAnalysisWorkItems = function (req, res, next) {
        try {
            logger.info('Report Controller, getRateAnalysisWorkItems has been hit');
            var reportService = new ReportService();
            var user = req.user;
            var url = config.get('rateAnalysisAPI.workItems');
            console.log('URL : ' + url);
            reportService.getWorkItems(user, url, function (error, result) {
                if (error) {
                    next(error);
                }
                else {
                    logger.info('Get Rate Analysis WorkItems success');
                    next(new Response(200, result));
                }
            });
        }
        catch (e) {
            next(new CostControllException(e.message, e.stack));
        }
    };
    return ReportController;
}());
module.exports = ReportController;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3QvY29udHJvbGxlcnMvUmVwb3J0Q29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsMkRBQThEO0FBRzlELDJEQUE4RDtBQUM5RCwwRUFBNkU7QUFFN0UsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLE1BQU0sR0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFakQ7SUFHRTtRQUNFLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztJQUM1QyxDQUFDO0lBRUQscUNBQVUsR0FBVixVQUFXLEdBQW9CLEVBQUUsR0FBcUIsRUFBRSxJQUFTO1FBQy9ELElBQUksQ0FBQztZQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsNENBQTRDLENBQUMsQ0FBQztZQUMxRCxJQUFJLGFBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ3hDLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDcEIsSUFBSSxXQUFTLEdBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDL0IsSUFBSSxZQUFVLEdBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDbEMsSUFBSSxhQUFXLEdBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDbkMsSUFBSSxhQUFXLEdBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFFbkMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxXQUFTLEVBQUUsWUFBVSxFQUFFLGFBQVcsRUFBRSxhQUFXLEVBQUcsSUFBSSxFQUFFLFVBQUMsS0FBSyxFQUFFLE1BQU07Z0JBQzVGLEVBQUUsQ0FBQSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ1QsSUFB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QUFLLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1YsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0gsQ0FBQztJQUVILHVCQUFDO0FBQUQsQ0F6RUEsQUF5RUMsSUFBQTtBQUNELGlCQUFVLGdCQUFnQixDQUFDIiwiZmlsZSI6ImFwcC9hcHBsaWNhdGlvblByb2plY3QvY29udHJvbGxlcnMvUmVwb3J0Q29udHJvbGxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XHJcbmltcG9ydCBSZXBvcnRTZXJ2aWNlID0gcmVxdWlyZSgnLi8uLi9zZXJ2aWNlcy9SZXBvcnRTZXJ2aWNlJyk7XHJcbmltcG9ydCBQcm9qZWN0ID0gcmVxdWlyZSgnLi4vZGF0YWFjY2Vzcy9tb25nb29zZS9Qcm9qZWN0Jyk7XHJcbmltcG9ydCBCdWlsZGluZyA9IHJlcXVpcmUoJy4uL2RhdGFhY2Nlc3MvbW9uZ29vc2UvQnVpbGRpbmcnKTtcclxuaW1wb3J0IFJlc3BvbnNlID0gcmVxdWlyZSgnLi4vaW50ZXJjZXB0b3IvcmVzcG9uc2UvUmVzcG9uc2UnKTtcclxuaW1wb3J0IENvc3RDb250cm9sbEV4Y2VwdGlvbiA9IHJlcXVpcmUoJy4uL2V4Y2VwdGlvbi9Db3N0Q29udHJvbGxFeGNlcHRpb24nKTtcclxuLy9pbXBvcnQgY29uZmlnIGZyb20gXCIuLi8uLi8uLi8uLi8uLi90b29scy9jb25maWdcIjtcclxubGV0IGNvbmZpZyA9IHJlcXVpcmUoJ2NvbmZpZycpO1xyXG52YXIgbG9nNGpzID0gcmVxdWlyZSgnbG9nNGpzJyk7XHJcbnZhciBsb2dnZXI9bG9nNGpzLmdldExvZ2dlcignUmVwb3J0IENvbnRyb2xsZXInKTtcclxuXHJcbmNsYXNzIFJlcG9ydENvbnRyb2xsZXIge1xyXG4gIHByaXZhdGUgX3JlcG9ydFNlcnZpY2UgOiBSZXBvcnRTZXJ2aWNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuX3JlcG9ydFNlcnZpY2UgPSBuZXcgUmVwb3J0U2VydmljZSgpO1xyXG4gIH1cclxuXHJcbiAgZ2V0UHJvamVjdChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlLCBuZXh0OiBhbnkpOiB2b2lkIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdSZXBvcnQgQ29udHJvbGxlciwgZ2V0UHJvamVjdCBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgbGV0IHJlcG9ydFNlcnZpY2UgPSBuZXcgUmVwb3J0U2VydmljZSgpO1xyXG4gICAgICBsZXQgdXNlciA9IHJlcS51c2VyO1xyXG4gICAgICBsZXQgcHJvamVjdElkID0gIHJlcS5wYXJhbXMuaWQ7XHJcbiAgICAgIGxldCByZXBvcnRUeXBlID0gIHJlcS5wYXJhbXMudHlwZTtcclxuICAgICAgbGV0IHByb2plY3RSYXRlID0gIHJlcS5wYXJhbXMucmF0ZTtcclxuICAgICAgbGV0IHByb2plY3RBcmVhID0gIHJlcS5wYXJhbXMuYXJlYTtcclxuXHJcbiAgICAgIHJlcG9ydFNlcnZpY2UuZ2V0UmVwb3J0KHByb2plY3RJZCwgcmVwb3J0VHlwZSwgcHJvamVjdFJhdGUsIHByb2plY3RBcmVhLCAgdXNlciwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICBpZihlcnJvcikge1xyXG4gICAgICAgICAgbmV4dChlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdHZXQgUHJvamVjdCBzdWNjZXNzJyk7XHJcbiAgICAgICAgICBsb2dnZXIuZGVidWcoJ0dldHRpbmcgUHJvamVjdCBmb3IgUHJvamVjdCBJRCA6ICcrcHJvamVjdElkKycsIFJlcG9ydCBUeXBlIDogJytyZXBvcnRUeXBlK1xyXG4gICAgICAgICAgICAnLCBQcm9qZWN0IFJhdGUgOiAnK3Byb2plY3RSYXRlKycsIFByb2plY3QgQXJlYSA6ICcrcHJvamVjdEFyZWEpO1xyXG4gICAgICAgICAgbmV4dChuZXcgUmVzcG9uc2UoMjAwLHJlc3VsdCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoKGUpIHtcclxuICAgICAgbmV4dChuZXcgQ29zdENvbnRyb2xsRXhjZXB0aW9uKGUubWVzc2FnZSxlLnN0YWNrKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRSYXRlQW5hbHlzaXNDb3N0SGVhZHMocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSwgbmV4dDogYW55KTogdm9pZCB7XHJcbiAgICB0cnkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUmVwb3J0IENvbnRyb2xsZXIsIGdldFJhdGVBbmFseXNpc0Nvc3RIZWFkcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgbGV0IHJlcG9ydFNlcnZpY2UgPSBuZXcgUmVwb3J0U2VydmljZSgpO1xyXG4gICAgICBsZXQgdXNlciA9IHJlcS51c2VyO1xyXG4gICAgICBsZXQgdXJsID0gY29uZmlnLmdldCgncmF0ZUFuYWx5c2lzQVBJLmNvc3RIZWFkcycpO1xyXG5cclxuICAgICAgcmVwb3J0U2VydmljZS5nZXRDb3N0SGVhZHMoIHVzZXIsIHVybCwgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICBpZihlcnJvcikge1xyXG4gICAgICAgICAgbmV4dChlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdHZXQgUmF0ZSBBbmFseXNpcyBDb3N0SGVhZHMgc3VjY2VzcycpO1xyXG4gICAgICAgICAgbmV4dChuZXcgUmVzcG9uc2UoMjAwLHJlc3VsdCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoKGUpIHtcclxuICAgICAgbmV4dChuZXcgQ29zdENvbnRyb2xsRXhjZXB0aW9uKGUubWVzc2FnZSxlLnN0YWNrKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRSYXRlQW5hbHlzaXNXb3JrSXRlbXMocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSwgbmV4dDogYW55KTogdm9pZCB7XHJcbiAgICB0cnkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnUmVwb3J0IENvbnRyb2xsZXIsIGdldFJhdGVBbmFseXNpc1dvcmtJdGVtcyBoYXMgYmVlbiBoaXQnKTtcclxuICAgICAgbGV0IHJlcG9ydFNlcnZpY2UgPSBuZXcgUmVwb3J0U2VydmljZSgpO1xyXG4gICAgICBsZXQgdXNlciA9IHJlcS51c2VyO1xyXG4gICAgICBsZXQgdXJsID0gY29uZmlnLmdldCgncmF0ZUFuYWx5c2lzQVBJLndvcmtJdGVtcycpO1xyXG4gICAgICBjb25zb2xlLmxvZygnVVJMIDogJyt1cmwpO1xyXG5cclxuICAgICAgcmVwb3J0U2VydmljZS5nZXRXb3JrSXRlbXModXNlciwgdXJsLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xyXG4gICAgICAgIGlmKGVycm9yKSB7XHJcbiAgICAgICAgICBuZXh0KGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ0dldCBSYXRlIEFuYWx5c2lzIFdvcmtJdGVtcyBzdWNjZXNzJyk7XHJcbiAgICAgICAgICBuZXh0KG5ldyBSZXNwb25zZSgyMDAscmVzdWx0KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2goZSkge1xyXG4gICAgICBuZXh0KG5ldyBDb3N0Q29udHJvbGxFeGNlcHRpb24oZS5tZXNzYWdlLGUuc3RhY2spKTtcclxuICAgIH1cclxuICB9XHJcblxyXG59XHJcbmV4cG9ydCAgPSBSZXBvcnRDb250cm9sbGVyO1xyXG4iXX0=
