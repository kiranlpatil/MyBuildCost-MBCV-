import {Component, Input} from "@angular/core";
import {ValueConstant} from "../../../framework/shared/constants";
import {ProficiencyDomainService} from "./proficiency-domain.service";
import {ProfileCreatorService} from "../profile-creator/profile-creator.service";
import {Candidate} from "../model/candidate";
import {Proficiences} from "../model/proficiency";

@Component({
  moduleId: module.id,
  selector: 'cn-proficiency-doamin',
  templateUrl: 'proficiency-domain.component.html',
  styleUrls: ['proficiency-domain.component.css']
})

export class ProficiencyDomainComponent {
  @Input('type') type: string;
  @Input() candidate: Candidate;
  @Input() proficiencies: Proficiences=new Proficiences();


  private selectedproficiencies = new Array();

  private showAlert: boolean = false;
  private selectedIndustry: string;
  private proficiencyother: string;

  constructor(private proficiencydoaminService: ProficiencyDomainService,
              private profileCreatorService: ProfileCreatorService) {
  }

  ngOnChanges (changes:any) {
    if (changes.proficiencies != undefined) {
      if (changes.proficiencies.currentValue != undefined)
        this.proficiencies = changes.proficiencies.currentValue;
      if(this.candidate.proficiencies.length > 0 ) {
        for (let proficiency of this.candidate.proficiencies) {
          this.deleteSelectedProfeciency(proficiency);
        }
      }
    }
  }

  selectedProficiencyModel(newVal: any) {
    if (this.candidate.proficiencies.length < ValueConstant.MAX_PROFECIENCES) {
      this.candidate.proficiencies.push(newVal);
      this.deleteSelectedProfeciency(newVal);
      this.profileCreatorService.addProfileDetail(this.candidate).subscribe(
        user => {
          console.log(user);
        },
        error => {
          console.log(error);
        });

    } else {
      this.showAlert = true;
    }
  }

  deleteItem(newVal: any) {
    this.showAlert = false;
    for (let i = 0; i < this.candidate.proficiencies.length; i++) {
      if (this.candidate.proficiencies[i] === newVal.currentTarget.innerText.trim()) {
        this.candidate.proficiencies.splice(i, 1);
        this.selectedproficiencies.push(newVal.currentTarget.innerText.trim());
        this.proficiencies.names.push(newVal.currentTarget.innerText.trim());
      }
    }
    this.profileCreatorService.addProfileDetail(this.candidate).subscribe(
      user => {
        console.log(user);
      },
      error => {
        console.log(error);
      });
  }

  deleteSelectedProfeciency(newVal: any) {
    this.proficiencies.names.splice(this.proficiencies.names.indexOf(newVal), 1);
  }


 /* addProficiencyToMasterData() {
    this.proficiencydoaminService.addProficiencyToMasterData(this.proficiencyother, this.selectedIndustry).subscribe(
      data => {
        console.log(data);
      },
      error => {
        console.log(error);
      });
    this.selectedProficiencyModel(this.proficiencyother);
  }*/
}
