import { QCard } from './q-card';
export class CandidateCard extends QCard {
  private first_name: string;
  private last_name: string;
  private salary: string;
  private experience: string;
  private picture: string;

  constructor(first_name : string, last_name : string,
              salary : string, experience : string,
              picture : string, _id : string, above_one_step_matching : number,
              exact_matching : number, location : string, proficiencies : string[]) {
    super(_id,above_one_step_matching,exact_matching,location,proficiencies);
    this.first_name= first_name;
    this.last_name = last_name;
    this.salary = salary;
    this.experience = experience;
    this.picture = picture;
  }
}
