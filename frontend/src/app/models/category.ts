import { Subcategory } from './subcategory';

// Stamparije biraju iz zadatih kategorija, spiskom upravlja samo admin
export class Category {
    name = '';
    subcategories: Subcategory[] = [];
}
