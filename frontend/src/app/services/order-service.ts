import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Order } from '../models/order';
import { ArchiveRow } from '../models/archive-row';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class OrderService {

  private http = inject(HttpClient);

  private url = 'http://localhost:4000/orders';

  // Faktura za jednog klijenta, server odlucuje da li je za individualnog klijenta ili kompaniju
  getForClient(username: string) {
    return this.http.get<Order[]>(`${this.url}/client/${username}`);
  }

  // Poslati i primljeni proizvodi
  getArchive(username: string) {
    return this.http.get<ArchiveRow[]>(`${this.url}/archive/${username}`);
  }

  // Svaka faktura poslata na stampariju gde user sa datim username-om radi
  getForPrinter(username: string) {
    return this.http.get<Order[]>(`${this.url}/printer/${username}`);
  }

  // ordered -> in printing -> delivered.
  advance(invoiceId: number, username: string) {
    return this.http.put<Message>(`${this.url}/${invoiceId}/advance`, { username });
  }

  // Ponistava porudzbinu koja jos nije krenula u stampu
  cancel(invoiceId: number, username: string) {
    return this.http.put<Message>(`${this.url}/${invoiceId}/cancel`, { username });
  }

  // Svi proizvodi sa fakture su pristigli
  markReceived(invoiceId: number, username: string) {
    return this.http.put<Message>(`${this.url}/${invoiceId}/received`, { username });
  }
}
