/**
 * Created by lenovo on 11-09-2016.
 */
import {NgModule} from "@angular/core";
import {MyDashboardComponent} from "./my-dashboard.component";
import { CandidateHeaderComponent} from "../../../user/candidate-header/candidate-header.component"
import {FooterComponent} from "../../../framework/shared/footer/footer.component"
import {AppModule} from "../../../app.module";

@NgModule({
  imports: [AppModule],
  declarations: [MyDashboardComponent, CandidateHeaderComponent, FooterComponent],
  exports: [MyDashboardComponent]
})
export class MyDashboardModule {
}
