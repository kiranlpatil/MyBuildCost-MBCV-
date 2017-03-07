
export class ValidationService {
  static getValidatorErrorMessage(validatorName:string, validatorValue?:any) {
    let config:any = {
      'required': 'Required',
      'requiredname': 'Name is required',
      'invalidEmailAddress': 'Email is invalid ',
      'invalidPassword': 'Invalid password. Password must be at least 8 characters long, and contain a number.',
      'maxlength': `Maximum ${validatorValue.requiredLength} charcters`,
      'minlength': `Minimum ${validatorValue.requiredLength} charcters`,
      'invalidMobile': 'Maximum 10 numbers ',
    };
    return config[validatorName];
  }

  static emailValidator(control:any) {
    if (control.value) {
      if (control.value.match(
          /[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?/)) {
        return null;
      } else {
        return {'invalidEmailAddress': true};
      }
    }
    return null;
  }

  static passwordValidator(control:any) {
    if (control.value.match(/^(?=.*[0-9])[a-zA-Z0-9!@#$%^&*]{6,100}$/)) {
      return null;
    } else {
      return {'invalidPassword': true};
    }
  }
  static mobileNumberValidator(control:any) {
    var mobileNumber = control.value;
    var count = 0;

    while (mobileNumber > 1) {
      mobileNumber = (mobileNumber / 10);
      count += 1;
    }
    if (count <= 10) {
      return null;
    } else {
      return {'invalidMobile': true};
    }
  }
}
