import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Role} from '../model/role';
import {Capability} from '../model/capability';
import {LocalStorage, ValueConstant} from '../../../framework/shared/constants';
import {Section} from '../model/candidate';
import {LocalStorageService} from '../../../framework/shared/localstorage.service';

@Component({
  moduleId: module.id,
  selector: 'cn-capabilities',
  templateUrl: 'capabilities.component.html',
  styleUrls: ['capabilities.component.css']
})

export class CapabilitiesComponent {

  @Input() roles: Role[] = new Array(0);
  @Input() candidateRoles: Role[] = new Array();
  @Output() onComplete = new EventEmitter();
  @Input() highlightedSection: Section;

  private primaryNames: string[] = new Array(0);
  private secondaryNames: string[] = new Array(0);
  private primaryCapabilitiesNumber: number = 0;
  private disableButton: boolean = true;
  private isCandidate: boolean = false;
  tooltipCandidateMessage: string =

    "<ul>" +
    "<li>" +
    "<h5>Capabilities </h5><p class='info'>Select those capabilities which describe what you are best at or where you would like to position your career. " +
    "These Capabilities are going to help you find best job you desire.</p>" +
    "</li>" +
    "</ul>";

  tooltipRecruiterMessage: string =

    "<ul>" +
    "<li>" +
    "<h5>Capabilities </h5><p class='info'>Select those capabilities that are required in the candidate." +
    "These Capabilities are going to help you find best candidate you desire.</p>" +
    "</li>" +
    "</ul>";

  ngOnInit() {
    if (LocalStorageService.getLocalValue(LocalStorage.IS_CANDIDATE) === 'true') {
      this.isCandidate = true;
    }
  }

  ngOnChanges(changes: any) {
    if (this.candidateRoles) {
      this.setPrimaryCapabilitydata();
    }
    this.primaryCapabilitiesNumber = this.primaryNames.length;
  }

  selectedCapability(selectedRole: Role, selectedCapability: Capability, event: any) {
    this.disableButton = false;
    this.roles[0].isAPIForComplexity = true;
    if (event.target.checked) {
      if (this.primaryCapabilitiesNumber < ValueConstant.MAX_CAPABILITIES) {
        this.primaryCapabilitiesNumber++;
        selectedCapability.isPrimary = true;
        this.primaryNames.push(selectedCapability.name);

      } else {
        this.secondaryNames.push(selectedCapability.name);
        selectedCapability.isSecondary = true;
      }
    } else {
      if (selectedCapability.isPrimary) {
        this.primaryCapabilitiesNumber--;
        this.primaryNames.splice(this.primaryNames.indexOf(selectedCapability.name), 1);
        selectedCapability.isPrimary = false;
      } else if (selectedCapability.isSecondary) {
        this.secondaryNames.splice(this.secondaryNames.indexOf(selectedCapability.name), 1);
        selectedCapability.isSecondary = false;
      }
    }
  }

  onNext() {
    this.highlightedSection.name = "Complexities";
    this.highlightedSection.isDisable = false;
    this.disableButton = true;
    var newselectedRoles:Role[]= new Array(0);
    for(let role of this.roles){
      let tempRole =Object.assign({}, role);
      newselectedRoles.push(tempRole);
      tempRole.capabilities= tempRole.capabilities.filter((cap : Capability)=> {
        return cap.isPrimary;
      });
    }
    this.onComplete.emit(newselectedRoles);
  }

  setPrimaryCapabilitydata() {
    this.secondaryNames = new Array(0);
    this.primaryNames = new Array(0);

    for (let role of this.candidateRoles) {
      for (let mainRole of this.roles) {
        if (role.name === mainRole.name) {
          if (role.capabilities) {
            for (let cap of role.capabilities) {
              if (mainRole.capabilities) {
                for (let mainCap of mainRole.capabilities) {
                  if (cap.name === mainCap.name) {
                    cap.isPrimary ? this.primaryNames.push(cap.name) : (cap.isSecondary ? this.secondaryNames.push(cap.name) : console.log(""));
                    mainCap.isPrimary = cap.isPrimary;
                    mainCap.isSecondary = cap.isSecondary;
                    if (cap.complexities && cap.complexities.length > 0) {
                      mainCap.complexities = cap.complexities;
                    }
                  }
                }
              }
            }
          }
          if (role.default_complexities && role.default_complexities.length) {
            mainRole.default_complexities = role.default_complexities;
          }
        }
      }
    }
  }
}
