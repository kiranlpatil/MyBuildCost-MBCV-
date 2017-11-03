import { Route } from '@angular/router';
import { RecruiterDashboardComponent } from './index';
import {JobListerComponent} from "./job-lister/job-lister.component";
import {CandidateSearchComponent} from "../candidate-search/candidate-search.component";
import {JobPosterComponent} from "../job-poster/job-poster.component";
import {JobDashboardComponent} from "./job-dashboard/job-dashboard.component";

export const RecruiterDashboard: Route[] = [
  {
    path: 'recruiterdashboard',
    component: RecruiterDashboardComponent,
    children: [
      {path: '', component: JobListerComponent},
      {path: 'applicant_search/:id', component: CandidateSearchComponent},
      {path: 'applicant_search', component: CandidateSearchComponent},
      {path: 'jobpost/:jobId', component: JobPosterComponent},
      {path: 'jobpost', component: JobPosterComponent},
      {path: 'jobdashboard/:jobId', component: JobDashboardComponent}
    ]
  },
  {
    path: 'recruiterdashboard/:id',
    component: RecruiterDashboardComponent
  },
  {
    path: 'recruiterdashboard/edit/:jobid',
    component: RecruiterDashboardComponent
  }
];
