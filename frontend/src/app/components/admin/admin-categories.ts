import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderAdmin } from '../headers/header-admin';
import { AppFooter } from '../headers/app-footer';
import { CategoryService } from '../../services/category-service';
import { Category } from '../../models/category';

// Kategorije i potkategorije u koje stamparije svrstavaju proizvode, spiskom
// upravlja samo admin
@Component({
  selector: 'app-admin-categories',
  imports: [FormsModule, HeaderAdmin, AppFooter],
  templateUrl: './admin-categories.html'
})
export class AdminCategories implements OnInit {

  categories: Category[] = [];
  loaded = false;

  newCategory = '';

  // Koja kategorija je otvorena, sta se u nju kuca i sta se preimenuje
  openCategory = '';
  newSubcategory = '';
  renamingCategory = '';
  renamingSubcategory = '';
  renameText = '';

  message = '';
  isError = true;

  private categoryService = inject(CategoryService);

  ngOnInit() {
    this.load();
  }

  // ---------------------------------kategorije-----------------------------------

  add() {
    this.categoryService.add(this.newCategory).subscribe({
      next: (result) => {
        this.newCategory = '';
        this.done(result.message);
      },
      error: (err) => this.fail(err.error?.message ?? 'The category could not be added.')
    });
  }

  startRenameCategory(category: Category) {
    this.renamingCategory = category.name;
    this.renamingSubcategory = '';
    this.renameText = category.name;
    this.message = '';
  }

  saveRenameCategory(category: Category) {
    this.categoryService.rename(category.name, this.renameText).subscribe({
      next: (result) => {
        this.renamingCategory = '';
        this.done(result.message);
      },
      error: (err) => this.fail(err.error?.message ?? 'The category could not be renamed.')
    });
  }

  remove(category: Category) {
    this.categoryService.remove(category.name).subscribe({
      next: (result) => this.done(result.message),
      error: (err) => this.fail(err.error?.message ?? 'The category could not be deleted.')
    });
  }

  // ---------------------------------potkategorije-----------------------------------

  toggle(category: Category) {
    this.openCategory = this.openCategory === category.name ? '' : category.name;
    this.newSubcategory = '';
    this.renamingSubcategory = '';
    this.message = '';
  }

  addSubcategory(category: Category) {
    this.categoryService.addSubcategory(category.name, this.newSubcategory).subscribe({
      next: (result) => {
        this.newSubcategory = '';
        this.done(result.message);
      },
      error: (err) => this.fail(err.error?.message ?? 'The subcategory could not be added.')
    });
  }

  startRenameSubcategory(name: string) {
    this.renamingSubcategory = name;
    this.renamingCategory = '';
    this.renameText = name;
    this.message = '';
  }

  saveRenameSubcategory(category: Category, name: string) {
    this.categoryService.renameSubcategory(category.name, name, this.renameText).subscribe({
      next: (result) => {
        this.renamingSubcategory = '';
        this.done(result.message);
      },
      error: (err) => this.fail(err.error?.message ?? 'The subcategory could not be renamed.')
    });
  }

  removeSubcategory(category: Category, name: string) {
    this.categoryService.removeSubcategory(category.name, name).subscribe({
      next: (result) => this.done(result.message),
      error: (err) => this.fail(err.error?.message ?? 'The subcategory could not be deleted.')
    });
  }

  cancelRename() {
    this.renamingCategory = '';
    this.renamingSubcategory = '';
  }

  // ---------------------------------------------------------------------------

  private done(text: string) {
    this.succeed(text);
    this.load();
  }

  private load() {
    this.categoryService.getAll().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loaded = true;
      },
      error: () => {
        this.categories = [];
        this.loaded = true;
      }
    });
  }

  private fail(text: string) {
    this.message = text;
    this.isError = true;
  }

  private succeed(text: string) {
    this.message = text;
    this.isError = false;
  }
}
