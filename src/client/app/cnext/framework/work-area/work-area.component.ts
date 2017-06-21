import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import { Role } from '../model/role';
import { Section } from '../model/candidate';
import { LocalStorage, ValueConstant } from '../../../framework/shared/constants';
import { LocalStorageService } from '../../../framework/shared/localstorage.service';

@Component({
  moduleId: module.id,
  selector: 'cn-work-area',
  templateUrl: 'work-area.component.html',
  styleUrls: ['work-area.component.css']
})

export class WorkAreaComponent implements OnInit,OnChanges {
  @Input() roles: Role[] = new Array(0);
  @Input() selectedRoles: Role[] = new Array(0);
  @Input() highlightedSection: Section;
  @Output() onComplete = new EventEmitter();
  tooltipCandidateMessage: string =
    '<ul>' +
    '<li><h5> Area Of Work </h5><p>Select those areas of work that describe what you are best at or where you would like to position your career.</p></li>' +
    '</ul>';

  tooltipRecruiterMessage: string =
    '<ul>' +
    '<li><h5> Area Of Work </h5><p>Select those areas of work that describe your requirement the best.</p></li>' +
    '</ul>';
  private savedSelectedRoles: Role[] = new Array(0);
  private isCandidate: boolean = false;
  private disableButton: boolean = true;
  private showModalStyle:boolean = false;
  private showModalStyle2:boolean = false;
  private showButton: boolean = true;


  ngOnInit() {
    if (LocalStorageService.getLocalValue(LocalStorage.IS_CANDIDATE) === 'true') {
      this.isCandidate = true;
    }
  }

    ngOnChanges(changes:any) {
   if(changes.selectedRoles !== undefined && changes.selectedRoles.currentValue !== undefined){
   this.selectedRoles=changes.selectedRoles.currentValue;
     this.savedSelectedRoles= this.selectedRoles.slice();

   }
   }

  selectOption(role: Role, event: any) {
    if (event.target.checked) {
      if (this.savedSelectedRoles.length < ValueConstant.MAX_WORKAREA) {
        let isFound: boolean = false;
        for (let selrole of this.savedSelectedRoles) {
          if (role.name === selrole.name) {
            isFound = true;
          }
        }
        if (!isFound) {
          this.savedSelectedRoles.push(role);
        }
      } else {
        event.target.checked = false;
        this.showHideModal();
      }
    } else {
      let tempRole: Role;
      for (let selrole of this.savedSelectedRoles) {
        if (role.name === selrole.name) {
          tempRole = selrole;
        }
      }
      if (tempRole) {
        this.savedSelectedRoles.splice(this.savedSelectedRoles.indexOf(tempRole), 1);
      }
    }
  }

  onNext() {
    this.selectedRoles=this.savedSelectedRoles;
    this.highlightedSection.name = 'Capabilities';
    this.highlightedSection.isDisable = false;
    this.onComplete.emit(this.selectedRoles);
  }
onSave() {
    var roleId:any[]=new Array(0);
    var goNext:boolean;
    if(this.selectedRoles.length === this.savedSelectedRoles.length ) {
      for (let role of this.selectedRoles) {
        roleId.push(role.name);
    }
      for(let selectedRole of this.savedSelectedRoles){
        if(roleId.indexOf(selectedRole.name)=== -1) {
          goNext=true;
        }
      }
      if(goNext) {
        this.showModalStyle2 = !this.showModalStyle2;
        /*this.onNext();*/
      } else {
        this.highlightedSection.name = 'none';
        this.highlightedSection.isDisable = false;
        this.showButton = true;
      }
    } else {
      this.showModalStyle2 = !this.showModalStyle2;
      /*this.onNext();*/
    }
}
onCancel() {
  this.highlightedSection.name='none';
  this.highlightedSection.isDisable=false;
  this.savedSelectedRoles=this.selectedRoles;
}
  isSelected(value: string) {
    return this.selectedRoles.filter(function (el: Role) {
        return el.name === value;
      }).length !== 0;
  }
  getStyleModal() {
    if (this.showModalStyle) {
      return 'block';
    } else {
      return 'none';
    }
  }

  showHideModal() {
    this.showModalStyle = !this.showModalStyle;
  }

  getStyleModal2() {
    if (this.showModalStyle2) {
      return 'block';
    } else {
      return 'none';
    }
  }

  showHideModal2() {
    this.showModalStyle2 = !this.showModalStyle2;
  }
}
