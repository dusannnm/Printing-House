import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { OrderService } from '../../services/order-service';
import { ProductService } from '../../services/product-service';
import { AuthService } from '../../services/auth-service';
import { ArchiveRow } from '../../models/archive-row';
import { OrderStatus, ORDER_STATUS_LABELS } from '../../constants/order-status';

// Sve isporuceno i primljeno
// Ovde se potvrdjuje prijem, a primljen proizvod moze da se oceni i komentarise
@Component({
  selector: 'app-client-archive',
  imports: [FormsModule, HeaderClient, AppFooter],
  templateUrl: './client-archive.html'
})
export class ClientArchive implements OnInit {

  rows: ArchiveRow[] = [];
  loaded = false;

  statusLabels = ORDER_STATUS_LABELS;
  DELIVERED = OrderStatus.DELIVERED;
  RECEIVED = OrderStatus.RECEIVED;

  // Koji red ima otvoreno polje za komentar i sta je u njemu otkucano
  commentingOn = '';
  commentText = '';

  message = '';
  isError = true;

  sortColumn = 'ordered_at';
  sortAscending = false;

  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    this.load();
  }

  // Podrazumevano po datumu porucivanja, zatim po bilo kojoj drugoj koloni
  sortBy(column: keyof ArchiveRow) {
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = column;
      this.sortAscending = true;
    }

    this.rows.sort((first, second) => {
      const a = first[column];
      const b = second[column];
      const comparison = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a).localeCompare(String(b));
      return this.sortAscending ? comparison : -comparison;
    });
  }

  markReceived(row: ArchiveRow) {
    this.orderService.markReceived(row.invoice_id, this.auth.username).subscribe({
      next: (result) => {
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The invoice could not be confirmed.')
    });
  }

  react(row: ArchiveRow, value: number) {
    this.productService.react(row.product_code, this.auth.username, value).subscribe({
      next: (result) => {
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The rating could not be saved.')
    });
  }

  openComment(row: ArchiveRow) {
    this.commentingOn = row.product_code;
    this.commentText = '';
    this.message = '';
  }

  cancelComment() {
    this.commentingOn = '';
    this.commentText = '';
  }

  saveComment(row: ArchiveRow) {
    if (!this.commentText.trim()) {
      return this.fail('Write the text of the comment.');
    }

    this.productService.addComment(row.product_code, this.auth.username, this.commentText).subscribe({
      next: (result) => {
        this.cancelComment();
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The comment could not be saved.')
    });
  }

  openDetails(row: ArchiveRow) {
    this.router.navigate(['client', 'product', row.product_code]);
  }

  private load() {
    this.orderService.getArchive(this.auth.username).subscribe({
      next: (rows) => {
        this.rows = rows;
        this.loaded = true;
      },
      error: () => {
        this.rows = [];
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
