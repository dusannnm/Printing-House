import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { ProductService } from '../../services/product-service';
import { CartService } from '../../services/cart-service';
import { AuthService } from '../../services/auth-service';
import { ProductRequest } from '../../models/product-request';

// Pretraga za pravno lice
// Jedan red po nazivu, a ne po stampariji, jer potvrda korpe objavljuje nabavku na koju se javlja bilo koja stamparija
@Component({
  selector: 'app-client-request-search',
  imports: [FormsModule, HeaderClient, AppFooter],
  templateUrl: './client-request-search.html'
})
export class ClientRequestSearch implements OnInit {

  searchName = '';
  searchCategory = '';
  categories: string[] = [];

  results: ProductRequest[] = [];
  searched = false;
  sortAscending = true;

  // Kolicina otkucana uz svaki red, cuva se po nazivu proizvoda
  quantities: Record<string, number> = {};

  message = '';
  isError = true;

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.productService.getSearchOptions().subscribe({
      next: (options) => this.categories = options.categories,
      error: () => this.categories = []
    });
  }

  search() {
    this.message = '';

    this.productService.searchByName(this.searchName, this.searchCategory).subscribe({
      next: (products) => {
        this.results = products;
        this.quantities = {};
        products.forEach((product) => this.quantities[product.product_name] = 1);
        this.sortAscending = true;
        this.searched = true;
      },
      error: () => {
        this.results = [];
        this.searched = true;
      }
    });
  }

  addToRequest(product: ProductRequest) {
    const quantity = Number(this.quantities[product.product_name]);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return this.fail('Quantity must be a whole number greater than zero.');
    }
    if (quantity > product.best_stock) {
      return this.fail(`No print shop has ${quantity} pieces on stock. The largest amount available from one shop is ${product.best_stock}.`);
    }

    this.cartService.addRequest(this.auth.username, product.product_name, quantity).subscribe({
      next: (result) => this.succeed(result.message),
      error: (err) => this.fail(err.error?.message ?? 'Product could not be added to the request.')
    });
  }

  resetSearch() {
    this.searchName = '';
    this.searchCategory = '';
    this.results = [];
    this.searched = false;
    this.message = '';
  }

  sortByName() {
    this.sortAscending = !this.sortAscending;
    this.results.sort((first, second) => this.sortAscending
      ? first.product_name.localeCompare(second.product_name)
      : second.product_name.localeCompare(first.product_name));
  }

  // Koje stamparije nude ovaj naziv i po kojoj ceni danas
  openDetails(productName: string) {
    this.router.navigate(['client', 'request', productName]);
  }

  openCart() {
    this.router.navigate(['client', 'cart']);
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
