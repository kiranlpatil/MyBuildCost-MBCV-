import Category = require('./Category');


class CategoriesListWithRates {
  categories : Array<Category>;
  categoriesAmount : number;

  constructor() {
    this.categories = new Array<Category>();
    this.categoriesAmount = 0;
  }
}

export  = CategoriesListWithRates;
