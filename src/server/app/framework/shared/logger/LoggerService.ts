import log4js = require('log4js');
let config = require('config');
var loggerConfig = config.get("logger");
log4js.configure(loggerConfig);
class LoggerService {
  private logger:any;

  constructor(classname:string) {
    this.logger = log4js.getLogger(classname);
  }

  logInfo(statement:any) {
    this.logger.info(statement);
  }

  logError(statement:string) {
    this.logger.error(statement);

  }

}

Object.seal(LoggerService);
export = LoggerService;
