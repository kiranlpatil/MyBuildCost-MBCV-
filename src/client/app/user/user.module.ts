import {NgModule} from "@angular/core";
import {SharedModule} from "../shared/shared.module";
import {LoginComponent} from "./login/login.component";
import {LoginService} from "./login/login.service";
import {UserHeaderComponent} from "./user-header/user-header.component";
import {CommonModule} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {FacebookService} from "./login/facebook/facebook.service";
import {ResetPasswordComponent} from "./forgot-password/reset-password/reset-password.component";
import {ForgotPasswordComponent} from "./forgot-password/forgot-password.component";
import {ForgotPasswordService} from "./forgot-password/forgot-password.service";
import {ResetPasswordService} from "./forgot-password/reset-password/reset-password.service";
import {CandidateSignUpComponent} from "./candidate-sign-up/candidate-sign-up.component";
import {CandidateSignUpService} from "./candidate-sign-up/candidate-sign-up.service";

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedModule],
  declarations: [UserHeaderComponent, LoginComponent, ResetPasswordComponent, ForgotPasswordComponent,
    CandidateSignUpComponent],
  exports: [UserHeaderComponent, LoginComponent, ResetPasswordComponent, ForgotPasswordComponent,
    CandidateSignUpComponent],
  providers: [LoginService, FacebookService, ForgotPasswordService, ResetPasswordService, CandidateSignUpService]
})

export class user {

}
