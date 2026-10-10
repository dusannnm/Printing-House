import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { CartService } from '../../services/cart-service';
import { AuthService } from '../../services/auth-service';
import { CartGroup } from '../../models/cart-group';
import { RequestedItem } from '../../models/requested-item';

// client_individual vidi pripremljene proizvode grupisane po stampariji
// client_legal vidi obican spisak proizvoda koje ce njegova javna nabavka traziti
@Component({
  selector: 'app-client-cart',
  imports: [HeaderClient, AppFooter],
  templateUrl: './client-cart.html'
})
export class ClientCart implements OnInit {

  groups: CartGroup[] = [];

  // Nazivi i kolicine - ono sto trazi client_legal i sto ce objavljena nabavka sadrzati
  requestedItems: RequestedItem[] = [];

  loaded = false;
  isLegalEntity = false;

  message = '';
  isError = true;

  private cartService = inject(CartService);
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.isLegalEntity = this.auth.isLegalEntity;
    this.load();
  }

  get total(): number {
    return this.groups.reduce((sum, group) => sum + group.group_total, 0);
  }

  // client_legal nema grupe po stamparijama, nego samo trazene proizvode, pa se broje oba oblika da bi se znalo da li je korpa prazna
  get itemCount(): number {
    return this.isLegalEntity
      ? this.requestedItems.length
      : this.groups.reduce((sum, group) => sum + group.items.length, 0);
  }

  remove(index: number) {
    this.cartService.removeItem(this.auth.username, index).subscribe({
      next: () => {
        this.message = '';
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'Product could not be removed.')
    });
  }

  confirm() {
    this.cartService.confirm(this.auth.username).subscribe({
      next: (result) => {
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The order could not be confirmed.')
    });
  }

  keepShopping() {
    this.router.navigate(['client', this.isLegalEntity ? 'request-search' : 'search']);
  }

  private load() {
    this.cartService.getCart(this.auth.username).subscribe({
      next: (cart) => {
        this.groups = cart.groups;
        this.requestedItems = cart.requested_items;
        this.loaded = true;
      },
      error: () => {
        this.groups = [];
        this.requestedItems = [];
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
