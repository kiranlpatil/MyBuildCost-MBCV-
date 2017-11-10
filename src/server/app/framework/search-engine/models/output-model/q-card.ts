export class QCard {
  _id: string;
  above_one_step_matching: number = 0;
  exact_matching: number = 0;
  location: string;
  proficiencies: string[];
  constructor(_id? : string, above_one_step_matching : number = 0,
              exact_matching : number = 0, location? : string, proficiencies? : string[] ) {
    this._id =_id;
    this.above_one_step_matching= above_one_step_matching;
    this.exact_matching = exact_matching;
    this.location = location;
    this.proficiencies = proficiencies;
  }
}
