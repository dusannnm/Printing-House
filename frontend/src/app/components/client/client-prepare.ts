import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { ProductService } from '../../services/product-service';
import { CartService } from '../../services/cart-service';
import { AuthService } from '../../services/auth-service';
import { Product } from '../../models/product';
import { CartItem } from '../../models/cart-item';
import { UPLOADS_URL } from '../../constants/validation';

// Priprema proizvoda pre nego sto udje u korpu: vrsta stampe, tekst i broj komada
@Component({
  selector: 'app-client-prepare',
  imports: [FormsModule, HeaderClient, AppFooter],
  templateUrl: './client-prepare.html'
})
export class ClientPrepare implements OnInit {

  static readonly DEFAULT_COLOR = 'White';

  product: Product | null = null;
  color = ClientPrepare.DEFAULT_COLOR;      // bira se na stranici detalja

  printType = '';
  printText = '';
  quantity = 1;

  message = '';
  isError = true;
  uploadsUrl = UPLOADS_URL;

  private code = '';

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    this.code = this.route.snapshot.paramMap.get('code') ?? '';
    this.color = this.route.snapshot.queryParamMap.get('color') ?? ClientPrepare.DEFAULT_COLOR;

    this.productService.getExtended(this.code).subscribe({
      next: (product) => {
        this.product = product;
        this.reset();
      },
      error: (err) => this.fail(err.error?.message ?? 'Product could not be loaded.')
    });
  }

  addToCart() {
    const problem = this.checkForm();
    if (problem) {
      return this.fail(problem);
    }

    const item = new CartItem();
    item.product_code = this.code;
    item.quantity = this.quantity;
    item.color = this.color;
    item.print_type = this.printType;
    item.print_text = this.printText;

    this.cartService.addItem(this.auth.username, item).subscribe({
      next: (result) => this.succeed(result.message),
      error: (err) => this.fail(err.error?.message ?? 'Product could not be added to the cart.')
    });
  }

  // Vraca stranicu u stanje u kom je bila pri otvaranju
  reset() {
    this.printType = this.product?.print_services[0]?.print_type ?? '';
    this.printText = '';
    this.quantity = 1;
    this.message = '';
  }

  back() {
    this.router.navigate(['client', 'product', this.code]);
  }

  // ----------------------------------------------------------------------------

  // Dimenzija u koju izabrana stampa mora da stane, prikazana uz padajucu listu
  get chosenService() {
    return this.product?.print_services.find((service) => service.print_type === this.printType) ?? null;
  }

  private checkForm(): string | null {
    if (!this.product) {
      return 'Product could not be loaded.';
    }
    if (this.product.print_services.length > 0 && !this.printType) {
      return 'Choose a type of print.';
    }
    if (this.printType && !this.printText.trim()) {
      return 'Enter the text that should be printed.';
    }
    if (!Number.isInteger(this.quantity) || this.quantity < 1) {
      return 'Quantity must be a whole number greater than zero.';
    }
    // Ista provera radi i na serveru, gde se racuna i ono sto je vec u korpi
    if (this.quantity > this.product.stock_quantity) {
      return 'Not enough products currently in stock.';
    }
    return null;
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
