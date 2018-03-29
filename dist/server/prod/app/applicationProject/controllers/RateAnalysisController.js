"use strict";
var Response = require("../interceptor/response/Response");
var CostControllException = require("../exception/CostControllException");
var RateAnalysisService = require("../services/RateAnalysisService");
var config = require('config');
var log4js = require('log4js');
var logger = log4js.getLogger('Rate Analysis Controller');
var RateAnalysisController = (function () {
    function RateAnalysisController() {
        this._rateAnalysisService = new RateAnalysisService();
    }
    RateAnalysisController.prototype.getRateAnalysisCostHeads = function (req, res, next) {
        try {
            logger.info('Rate Analysis Controller, getRateAnalysisCostHeads has been hit');
            var rateAnalysisService = new RateAnalysisService();
            var url = config.get('rateAnalysisAPI.costHeads');
            var user = req.user;
            rateAnalysisService.getCostHeads(url, user, function (error, result) {
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
    RateAnalysisController.prototype.getRateAnalysisWorkItems = function (req, res, next) {
        try {
            logger.info('Rate Analysis Controller, getRateAnalysisWorkItems has been hit');
            var rateAnalysisService = new RateAnalysisService();
            var user = req.user;
            var url = config.get('rateAnalysisAPI.workItems');
            rateAnalysisService.getWorkItems(url, user, function (error, result) {
                if (error) {
                    next(error);
                }
                else {
                    logger.info('Get Rate Analysis Work Items success');
                    next(new Response(200, result));
                }
            });
        }
        catch (e) {
            next(new CostControllException(e.message, e.stack));
        }
    };
    RateAnalysisController.prototype.getRateAnalysisWorkItemsByCostHeadId = function (req, res, next) {
        try {
            logger.info('Rate Analysis Controller, getRateAnalysisWorkItemsByCostHeadId has been hit');
            var rateAnalysisService = new RateAnalysisService();
            var user = req.user;
            var costHeadId_1 = req.params.costHeadId;
            var url = config.get('rateAnalysisAPI.workItems');
            rateAnalysisService.getWorkItemsByCostHeadId(url, costHeadId_1, user, function (error, result) {
                if (error) {
                    next(error);
                }
                else {
                    logger.info('Get Rate Analysis Work Items By Cost HeadId success');
                    logger.debug('CostHead ID : ' + costHeadId_1);
                    next(new Response(200, result));
                }
            });
        }
        catch (e) {
            next(new CostControllException(e.message, e.stack));
        }
    };
    RateAnalysisController.prototype.getRate = function (req, res, next) {
        try {
            var rateAnalysisService = new RateAnalysisService();
            var user = req.user;
            var costHeadId = req.params.costHeadId;
            var workItemId = req.params.workItemId;
            rateAnalysisService.getRate(workItemId, function (error, result) {
                if (error) {
                    next(error);
                }
                else {
                    next(new Response(200, result));
                }
            });
        }
        catch (e) {
            next(new CostControllException(e.message, e.stack));
        }
    };
    return RateAnalysisController;
}());
module.exports = RateAnalysisController;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHBsaWNhdGlvblByb2plY3QvY29udHJvbGxlcnMvUmF0ZUFuYWx5c2lzQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsMkRBQThEO0FBQzlELDBFQUE2RTtBQUM3RSxxRUFBd0U7QUFDeEUsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQy9CLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQixJQUFJLE1BQU0sR0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFFeEQ7SUFHRTtRQUNFLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDeEQsQ0FBQztJQUVELHlEQUF3QixHQUF4QixVQUF5QixHQUFvQixFQUFFLEdBQXFCLEVBQUUsSUFBUztRQUM3RSxJQUFJLENBQUM7WUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLGlFQUFpRSxDQUFDLENBQUM7WUFDL0UsSUFBSSxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDcEQsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQ2xELElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDcEIsbUJBQW1CLENBQUMsWUFBWSxDQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBQyxLQUFLLEVBQUUsTUFBTTtnQkFDekQsRUFBRSxDQUFBLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDVCxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2QsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTixNQUFNLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLENBQUM7b0JBQ25ELElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQUMsTUFBTSxDQUFDLENBQUMsQ0FB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WUFDSCxJQUFJLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUNwRCxJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ3BCLElBQUksVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO1lBQ3ZDLElBQUksVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO1lBRXZDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUMsVUFBQyxLQUFLLEVBQUUsTUFBTTtnQkFDbkQsRUFBRSxDQUFBLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDVCxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2QsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTixJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxLQUFLLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1YsSUFBSSxDQUFDLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0gsQ0FBQztJQUVILDZCQUFDO0FBQUQsQ0F2RkEsQUF1RkMsSUFBQTtBQUVELGlCQUFVLHNCQUFzQixDQUFDIiwiZmlsZSI6ImFwcC9hcHBsaWNhdGlvblByb2plY3QvY29udHJvbGxlcnMvUmF0ZUFuYWx5c2lzQ29udHJvbGxlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgUmVzcG9uc2UgPSByZXF1aXJlKCcuLi9pbnRlcmNlcHRvci9yZXNwb25zZS9SZXNwb25zZScpO1xuaW1wb3J0IENvc3RDb250cm9sbEV4Y2VwdGlvbiA9IHJlcXVpcmUoJy4uL2V4Y2VwdGlvbi9Db3N0Q29udHJvbGxFeGNlcHRpb24nKTtcbmltcG9ydCBSYXRlQW5hbHlzaXNTZXJ2aWNlID0gcmVxdWlyZSgnLi4vc2VydmljZXMvUmF0ZUFuYWx5c2lzU2VydmljZScpO1xubGV0IGNvbmZpZyA9IHJlcXVpcmUoJ2NvbmZpZycpO1xudmFyIGxvZzRqcyA9IHJlcXVpcmUoJ2xvZzRqcycpO1xudmFyIGxvZ2dlcj1sb2c0anMuZ2V0TG9nZ2VyKCdSYXRlIEFuYWx5c2lzIENvbnRyb2xsZXInKTtcblxuY2xhc3MgUmF0ZUFuYWx5c2lzQ29udHJvbGxlciB7XG4gIHByaXZhdGUgX3JhdGVBbmFseXNpc1NlcnZpY2UgOiBSYXRlQW5hbHlzaXNTZXJ2aWNlO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX3JhdGVBbmFseXNpc1NlcnZpY2UgPSBuZXcgUmF0ZUFuYWx5c2lzU2VydmljZSgpO1xuICB9XG5cbiAgZ2V0UmF0ZUFuYWx5c2lzQ29zdEhlYWRzKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UsIG5leHQ6IGFueSk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICBsb2dnZXIuaW5mbygnUmF0ZSBBbmFseXNpcyBDb250cm9sbGVyLCBnZXRSYXRlQW5hbHlzaXNDb3N0SGVhZHMgaGFzIGJlZW4gaGl0Jyk7XG4gICAgICBsZXQgcmF0ZUFuYWx5c2lzU2VydmljZSA9IG5ldyBSYXRlQW5hbHlzaXNTZXJ2aWNlKCk7XG4gICAgICBsZXQgdXJsID0gY29uZmlnLmdldCgncmF0ZUFuYWx5c2lzQVBJLmNvc3RIZWFkcycpO1xuICAgICAgbGV0IHVzZXIgPSByZXEudXNlcjtcbiAgICAgIHJhdGVBbmFseXNpc1NlcnZpY2UuZ2V0Q29zdEhlYWRzKCB1cmwsIHVzZXIsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmKGVycm9yKSB7XG4gICAgICAgICAgbmV4dChlcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ0dldCBSYXRlIEFuYWx5c2lzIENvc3RIZWFkcyBzdWNjZXNzJyk7XG4gICAgICAgICAgbmV4dChuZXcgUmVzcG9uc2UoMjAwLHJlc3VsdCkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIG5leHQobmV3IENvc3RDb250cm9sbEV4Y2VwdGlvbihlLm1lc3NhZ2UsZS5zdGFjaykpO1xuICAgIH1cbiAgfVxuXG4gIGdldFJhdGVBbmFseXNpc1dvcmtJdGVtcyhyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlLCBuZXh0OiBhbnkpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLmluZm8oJ1JhdGUgQW5hbHlzaXMgQ29udHJvbGxlciwgZ2V0UmF0ZUFuYWx5c2lzV29ya0l0ZW1zIGhhcyBiZWVuIGhpdCcpO1xuICAgICAgbGV0IHJhdGVBbmFseXNpc1NlcnZpY2UgPSBuZXcgUmF0ZUFuYWx5c2lzU2VydmljZSgpO1xuICAgICAgbGV0IHVzZXIgPSByZXEudXNlcjtcbiAgICAgIGxldCB1cmwgPSBjb25maWcuZ2V0KCdyYXRlQW5hbHlzaXNBUEkud29ya0l0ZW1zJyk7XG5cbiAgICAgIHJhdGVBbmFseXNpc1NlcnZpY2UuZ2V0V29ya0l0ZW1zKCB1cmwsIHVzZXIsKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYoZXJyb3IpIHtcbiAgICAgICAgICBuZXh0KGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIuaW5mbygnR2V0IFJhdGUgQW5hbHlzaXMgV29yayBJdGVtcyBzdWNjZXNzJyk7XG4gICAgICAgICAgbmV4dChuZXcgUmVzcG9uc2UoMjAwLHJlc3VsdCkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIG5leHQobmV3IENvc3RDb250cm9sbEV4Y2VwdGlvbihlLm1lc3NhZ2UsZS5zdGFjaykpO1xuICAgIH1cbiAgfVxuXG4gIGdldFJhdGVBbmFseXNpc1dvcmtJdGVtc0J5Q29zdEhlYWRJZChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlLCBuZXh0OiBhbnkpOiB2b2lkIHtcbiAgICB0cnkge1xuICAgICAgbG9nZ2VyLmluZm8oJ1JhdGUgQW5hbHlzaXMgQ29udHJvbGxlciwgZ2V0UmF0ZUFuYWx5c2lzV29ya0l0ZW1zQnlDb3N0SGVhZElkIGhhcyBiZWVuIGhpdCcpO1xuICAgICAgbGV0IHJhdGVBbmFseXNpc1NlcnZpY2UgPSBuZXcgUmF0ZUFuYWx5c2lzU2VydmljZSgpO1xuICAgICAgbGV0IHVzZXIgPSByZXEudXNlcjtcbiAgICAgIGxldCBjb3N0SGVhZElkID0gcmVxLnBhcmFtcy5jb3N0SGVhZElkO1xuICAgICAgbGV0IHVybCA9IGNvbmZpZy5nZXQoJ3JhdGVBbmFseXNpc0FQSS53b3JrSXRlbXMnKTtcblxuICAgICAgcmF0ZUFuYWx5c2lzU2VydmljZS5nZXRXb3JrSXRlbXNCeUNvc3RIZWFkSWQoIHVybCwgY29zdEhlYWRJZCwgdXNlciwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYoZXJyb3IpIHtcbiAgICAgICAgICBuZXh0KGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dnZXIuaW5mbygnR2V0IFJhdGUgQW5hbHlzaXMgV29yayBJdGVtcyBCeSBDb3N0IEhlYWRJZCBzdWNjZXNzJyk7XG4gICAgICAgICAgbG9nZ2VyLmRlYnVnKCdDb3N0SGVhZCBJRCA6ICcrY29zdEhlYWRJZCk7XG4gICAgICAgICAgbmV4dChuZXcgUmVzcG9uc2UoMjAwLHJlc3VsdCkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIG5leHQobmV3IENvc3RDb250cm9sbEV4Y2VwdGlvbihlLm1lc3NhZ2UsZS5zdGFjaykpO1xuICAgIH1cbiAgfVxuXG4gIGdldFJhdGUocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSwgbmV4dDogYW55KTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIGxldCByYXRlQW5hbHlzaXNTZXJ2aWNlID0gbmV3IFJhdGVBbmFseXNpc1NlcnZpY2UoKTtcbiAgICAgIGxldCB1c2VyID0gcmVxLnVzZXI7XG4gICAgICBsZXQgY29zdEhlYWRJZCA9IHJlcS5wYXJhbXMuY29zdEhlYWRJZDtcbiAgICAgIGxldCB3b3JrSXRlbUlkID0gcmVxLnBhcmFtcy53b3JrSXRlbUlkO1xuXG4gICAgICByYXRlQW5hbHlzaXNTZXJ2aWNlLmdldFJhdGUod29ya0l0ZW1JZCwoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZihlcnJvcikge1xuICAgICAgICAgIG5leHQoZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5leHQobmV3IFJlc3BvbnNlKDIwMCxyZXN1bHQpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBuZXh0KG5ldyBDb3N0Q29udHJvbGxFeGNlcHRpb24oZS5tZXNzYWdlLGUuc3RhY2spKTtcbiAgICB9XG4gIH1cblxufVxuXG5leHBvcnQgID0gUmF0ZUFuYWx5c2lzQ29udHJvbGxlcjtcbiJdfQ==
