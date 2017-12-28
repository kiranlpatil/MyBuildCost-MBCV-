import Messages=require('../shared/messages');

class ProjectInterceptor {

  constructor(){

  }

  create(req: any, res: any, next: any) {

    if ((req.body.mobile_number === undefined)) {
      next({
        reason: Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
        message: Messages.MSG_ERROR_FIELD_VERIFICATION,
        stackTrace: new Error(),
        code: 400
      });
    } else if ((req.body.mobile_number === '')) {
      next({
        reason: Messages.MSG_ERROR_RSN_INVALID_CREDENTIALS,
        message: Messages.MSG_ERROR_EMPTY_FIELD,
        stackTrace: new Error(),
        code: 401});
    }
    next();

  }

}
export = ProjectInterceptor;
