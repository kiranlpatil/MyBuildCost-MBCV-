import {Component,Input } from "@angular/core";
import {Role} from "../../../model/role";

@Component({
  moduleId: module.id,
  selector: 'cn-tabular-list-view',
  templateUrl: 'tabular-list-view.component.html',
  styleUrls: ['tabular-list-view.component.css']
})

export class TabularListViewComponent {

  @Input() roles:Role[]=new Array(0);

}
