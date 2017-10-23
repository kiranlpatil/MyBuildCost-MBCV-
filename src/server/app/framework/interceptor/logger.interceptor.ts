import LoggerService = require("../shared/logger/LoggerService");
var logger = require('../shared/logger/logger');

export function logDetail(req: any, res: any, next: any) {
  let _loggerService: LoggerService = new LoggerService("ENTRY LOGGER");
    var loggerObject = {
      'method': req.originalMethod,
      'url':req.originalUrl,
      'body':req.body,
      'params':req.params,
      'query':req.query,
      'inTime':new Date()
    };
    var responseObject = JSON.stringify(loggerObject);
  _loggerService.logInfo(responseObject);
  next();
}


