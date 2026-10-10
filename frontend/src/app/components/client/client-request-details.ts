import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { ProductService } from '../../services/product-service';
import { CartService } from '../../services/cart-service';
import { AuthService } from '../../services/auth-service';
import { Comment } from '../../models/comment';
import { Product } from '../../models/product';
import { UPLOADS_URL } from '../../constants/validation';

// Sta sve stamparije nude pod jednim nazivom 
// Cene su okvirne, jer pravu cenu daju ponude tokom licitacije
@Component({
  selector: 'app-client-request-details',
  imports: [FormsModule, HeaderClient, AppFooter],
  templateUrl: './client-request-details.html'
})
export class ClientRequestDetails implements OnInit {

  productName = '';
  offers: Product[] = [];
  quantity = 1;

  message = '';
  isError = true;
  uploadsUrl = UPLOADS_URL;

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Ko cita, da bi se sopstveni komentari uokvirili narandzasto
  username = this.auth.username;

  // Svaka stamparija ima svoje komentare, pa se spajaju u jedan spisak gde svaki nosi stampariju na koju se odnosi
  get allComments(): { shop: string, comment: Comment }[] {
    return this.offers
      .flatMap((offer) => offer.comments.map((comment) => ({ shop: offer.printer_name, comment })))
      .sort((first, second) => second.comment.date.localeCompare(first.comment.date));
  }

  ngOnInit() {
    this.productName = this.route.snapshot.paramMap.get('name') ?? '';

    this.productService.getOffersByName(this.productName).subscribe({
      next: (offers) => this.offers = offers,
      error: (err) => this.fail(err.error?.message ?? 'Product could not be loaded.')
    });
  }

  // Celu nabavku isporucuje jedna stamparija, pa je ovo najveca kolicina koja ima smisla
  get bestStock(): number {
    return this.offers.reduce((most, offer) => Math.max(most, offer.stock_quantity), 0);
  }

  get cheapest(): number {
    return this.offers.reduce((least, offer) => Math.min(least, offer.unit_price), Infinity);
  }

  addToRequest() {
    if (!Number.isInteger(this.quantity) || this.quantity < 1) {
      return this.fail('Quantity must be a whole number greater than zero.');
    }
    if (this.quantity > this.bestStock) {
      return this.fail(`No print shop has ${this.quantity} pieces on stock. The largest amount available from one shop is ${this.bestStock}.`);
    }

    this.cartService.addRequest(this.auth.username, this.productName, this.quantity).subscribe({
      next: (result) => this.succeed(result.message),
      error: (err) => this.fail(err.error?.message ?? 'Product could not be added to the request.')
    });
  }

  back() {
    this.router.navigate(['client', 'request-search']);
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
