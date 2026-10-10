import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderPrinter } from '../headers/header-printer';
import { AppFooter } from '../headers/app-footer';
import { ProductService } from '../../services/product-service';
import { AuthService } from '../../services/auth-service';
import { Product } from '../../models/product';

// Koliko komada svakog proizvoda stamparija ima
// Nabraja se ceo katalog, ukljucujuci i rasprodato, jer se rasprodato dopunjava
@Component({
  selector: 'app-printer-stock',
  imports: [FormsModule, HeaderPrinter, AppFooter],
  templateUrl: './printer-stock.html'
})
export class PrinterStock implements OnInit {

  products: Product[] = [];
  loaded = false;

  // Otkucana kolicina po sifri, drzi se odvojeno od sacuvane da bi red mogao da se menja i uporedi pre cuvanja
  quantities: { [code: string]: number } = {};

  message = '';
  isError = true;

  private productService = inject(ProductService);
  private auth = inject(AuthService);

  ngOnInit() {
    this.load();
  }

  // Tacno dok se otkucani broj razlikuje od onog u bazi
  isChanged(product: Product): boolean {
    return this.quantities[product.code] !== product.stock_quantity;
  }

  isValid(product: Product): boolean {
    const quantity = this.quantities[product.code];
    return Number.isInteger(quantity) && quantity >= 0;
  }

  save(product: Product) {
    if (!this.isValid(product)) {
      return this.fail('Quantity on stock must be a whole number, zero or more.');
    }

    this.productService.updateStock(product.code, this.auth.username, this.quantities[product.code]).subscribe({
      next: (result) => {
        // Red se uskladjuje sa bazom umesto ponovnog ucitavanja svega
        product.stock_quantity = this.quantities[product.code];
        this.succeed(result.message);
      },
      error: (err) => this.fail(err.error?.message ?? 'The quantity could not be saved.')
    });
  }

  // Vraca red na sacuvanu kolicinu
  undo(product: Product) {
    this.quantities[product.code] = product.stock_quantity;
    this.message = '';
  }

  private load() {
    this.productService.getForPrinter(this.auth.username).subscribe({
      next: (products) => {
        this.products = products;
        this.quantities = {};
        products.forEach((product) => this.quantities[product.code] = product.stock_quantity);
        this.loaded = true;
      },
      error: () => {
        this.products = [];
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
