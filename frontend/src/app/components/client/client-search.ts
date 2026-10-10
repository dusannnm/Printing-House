import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { ProductService } from '../../services/product-service';
import { Product } from '../../models/product';

// Pretraga za prijavljenog klijenta
// Forma je ista kao javna, razlika je samo gde vodi dugme DETAILS
@Component({
  selector: 'app-client-search',
  imports: [FormsModule, HeaderClient, AppFooter],
  templateUrl: './client-search.html'
})
export class ClientSearch implements OnInit {

  searchName = '';
  searchCategory = '';
  searchCity = '';
  categories: string[] = [];
  cities: string[] = [];

  results: Product[] = [];
  searched = false;
  sortAscending = true;

  private productService = inject(ProductService);
  private router = inject(Router);

  ngOnInit() {
    this.productService.getSearchOptions().subscribe({
      next: (options) => {
        this.categories = options.categories;
        this.cities = options.cities;
      },
      error: () => {
        this.categories = [];
        this.cities = [];
      }
    });
  }

  search() {
    this.productService.search(this.searchName, this.searchCategory, this.searchCity).subscribe({
      next: (products) => {
        this.results = products;
        this.sortAscending = true;
        this.searched = true;
      },
      error: () => {
        this.results = [];
        this.searched = true;
      }
    });
  }

  resetSearch() {
    this.searchName = '';
    this.searchCategory = '';
    this.searchCity = '';
    this.results = [];
    this.searched = false;
  }

  sortByName() {
    this.sortAscending = !this.sortAscending;
    this.results.sort((first, second) => this.sortAscending
      ? first.name.localeCompare(second.name)
      : second.name.localeCompare(first.name));
  }

  // Vodi na klijentsku stranicu detalja, koja prikazuje vise od javne
  openDetails(code: string) {
    this.router.navigate(['client', 'product', code]);
  }
}
