import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderPublic } from '../headers/header-public';
import { AppFooter } from '../headers/app-footer';
import { RouterLink } from '@angular/router';
import { Login } from './login';
import { AuthService } from '../../services/auth-service';
import { HOME_ROUTE, UserType } from '../../constants/user-type';
import { UserService } from '../../services/user-service';
import { ProductService } from '../../services/product-service';
import { Product } from '../../models/product';
import { UPLOADS_URL } from '../../constants/validation';

// Pocetna stranica: opste informacije i pretraga proizvoda dostupna svima, uz karticu za prijavu
@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink, HeaderPublic, AppFooter, Login],
  templateUrl: './home.html'
})
export class Home implements OnInit {

  printerCount = 0;
  topProducts: Product[] = [];
  uploadsUrl = UPLOADS_URL;

  // Svako polje je opcionalno, prazno ne suzava pretragu
  searchName = '';
  searchCategory = '';
  searchCity = '';
  categories: string[] = [];
  cities: string[] = [];

  results: Product[] = [];
  searched = false;              // razlikuje prazan rezultat od "jos nije pretrazivano"
  sortAscending = true;

  private userService = inject(UserService);
  private productService = inject(ProductService);
  private auth = inject(AuthService);

  // Cita se svaki put iznova, a ne pamti jednom, da odjava odmah osvezi stranicu
  get signedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get username(): string {
    return this.auth.username;
  }

  get homeRoute(): string {
    return HOME_ROUTE[this.auth.type] ?? '/';
  }

  logout() {
    this.auth.logout();
  }
  private router = inject(Router);

  ngOnInit() {
    this.userService.countPrinters().subscribe({
      next: (result) => this.printerCount = result.count,
      error: () => this.printerCount = 0
    });

    this.productService.getTop5().subscribe({
      next: (products) => this.topProducts = products,
      error: () => this.topProducts = []
    });

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
        this.results = products;      // server ih je vec sortirao po nazivu
        this.sortAscending = true;
        this.searched = true;
      },
      error: () => {
        this.results = [];
        this.searched = true;
      }
    });
  }

  // Ulogovan klijent dobija svoju stranu sa cenom, opisom i vrstama stampe
  // Pravno lice stranu sa ponudama svih stamparija 
  // Ostali dobijaju javnu stranu.
  openDetails(product: Product) {
    if (this.auth.isLegalEntity) {
      this.router.navigate(['client', 'request', product.name]);
      return;
    }

    if (this.auth.type === UserType.CLIENT_INDIVIDUAL) {
      this.router.navigate(['client', 'product', product.code]);
      return;
    }

    this.router.navigate(['product', product.code]);
  }

  resetSearch() {
    this.searchName = '';
    this.searchCategory = '';
    this.searchCity = '';
    this.results = [];
    this.searched = false;
  }

  // Sortira se ovde, a ne na serveru, jer su rezultati vec u pregledacu pa novi zahtev nije potreban
  sortByName() {
    this.sortAscending = !this.sortAscending;
    this.results.sort((first, second) => this.sortAscending
      ? first.name.localeCompare(second.name)
      : second.name.localeCompare(first.name));
  }
}
