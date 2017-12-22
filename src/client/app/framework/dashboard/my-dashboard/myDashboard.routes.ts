import {Route} from "@angular/router";
import {MyDashboardComponent} from "./my-dashboard.component";
import {DashboardProfileComponent} from "../../../framework/dashboard/user-profile/dashboard-user-profile.component";
import {UserChangePasswordComponent} from "../../../framework/dashboard/user-change-password/user-change-password.component";

export const MyDashboardRoutes: Route[] = [
  {
    path: 'dashboard',
    component: MyDashboardComponent,
    children: [
      {path: 'details', component: DashboardProfileComponent},
      {path: 'change-password', component: UserChangePasswordComponent}
      ]
  }
];



