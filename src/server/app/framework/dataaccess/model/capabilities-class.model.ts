import ComplexityClassModel = require('./complexity-class.model');
import ComplexitiesClassModel = require("./complexities-class.model");

class CapabilitiesClassModel {
  complexities: ComplexitiesClassModel[];
  name: string;
  code: string;
  sort_order: number;
  isPrimary: boolean;
  isSecondary: boolean

}
export = CapabilitiesClassModel;
