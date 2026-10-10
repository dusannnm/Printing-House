import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Message } from '../models/message';
import { CartItem } from '../models/cart-item';
import { CartGroup } from '../models/cart-group';
import { RequestedItem } from '../models/requested-item';

@Injectable({
  providedIn: 'root',
})
export class CartService {

  private http = inject(HttpClient);

  private url = 'http://localhost:4000/carts';

  // Koristi se i za client_legal i za client_individual
  getCart(username: string) {
    return this.http.get<{ groups: CartGroup[], requested_items: RequestedItem[] }>(`${this.url}/${username}`);
  }

  // Svaki poziv mora da posalje username kroz zahtev, jer su e-kolica licna za svakoga
  addItem(username: string, item: CartItem) {
    return this.http.post<Message>(`${this.url}/add`, { username, ...item });
  }

  // Zahtev za licitaciju
  addRequest(username: string, productName: string, quantity: number) {
    return this.http.post<Message>(`${this.url}/request`, {
      username, product_name: productName, quantity
    });
  }

  removeItem(username: string, index: number) {
    return this.http.delete<Message>(`${this.url}/${username}/item/${index}`);
  }

  // Prihvata se narudzbina, salje se jedna faktua po stampariji
  confirm(username: string) {
    return this.http.post<Message>(`${this.url}/confirm`, { username });
  }
}
