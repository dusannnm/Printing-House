import { Component, inject, OnInit } from '@angular/core';
import { HeaderPrinter } from '../headers/header-printer';
import { AppFooter } from '../headers/app-footer';
import { OrderService } from '../../services/order-service';
import { AuthService } from '../../services/auth-service';
import { Order } from '../../models/order';
import { ORDER_STATUS_LABELS, PRINTER_TRANSITIONS } from '../../constants/order-status';

// Fakture upucene ovoj stampariji. 
// Stamparija ih gura napred: ordered -> in printing-> delivered; prijem potvrdjuje klijent
@Component({
  selector: 'app-printer-orders',
  imports: [HeaderPrinter, AppFooter],
  templateUrl: './printer-orders.html'
})
export class PrinterOrders implements OnInit {

  orders: Order[] = [];
  loaded = false;

  statusLabels = ORDER_STATUS_LABELS;

  message = '';
  isError = true;

  sortColumn = 'ordered_at';
  sortAscending = false;

  private orderService = inject(OrderService);
  private auth = inject(AuthService);

  ngOnInit() {
    this.load();
  }

  // Stamparija pomera samo statuse iz zajednicke tabele, pa faktura koju je klijent vec primio nema dugme
  nextStatusLabel(order: Order): string {
    const next = PRINTER_TRANSITIONS[order.status];
    return next === undefined ? '' : this.statusLabels[next];
  }

  advance(order: Order) {
    this.orderService.advance(order.invoice_id, this.auth.username).subscribe({
      next: (result) => {
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The invoice could not be moved.')
    });
  }

  sortBy(column: keyof Order) {
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = column;
      this.sortAscending = true;
    }

    this.orders.sort((first, second) => {
      const a = first[column];
      const b = second[column];
      const comparison = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a).localeCompare(String(b));
      return this.sortAscending ? comparison : -comparison;
    });
  }

  private load() {
    this.orderService.getForPrinter(this.auth.username).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loaded = true;
      },
      error: () => {
        this.orders = [];
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
