import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RevenueRow } from '../models/revenue-row';
import { ProductShare } from '../models/product-share';
import { RatingSeries } from '../models/rating-series';

@Injectable({
  providedIn: 'root',
})
export class StatsService {

  private http = inject(HttpClient);

  private url = 'http://localhost:4000/stats';

  // Promet svake stamparije u zadnja tri meseca, od najveceg
  getRevenue() {
    return this.http.get<{ from: string, rows: RevenueRow[] }>(`${this.url}/revenue`);
  }

  // Najporucivaniji proizvodi zadnjeg meseca, sa udelom u ukupnom
  getTopProducts() {
    return this.http.get<{ from: string, total: number, rows: ProductShare[] }>(`${this.url}/top-products`);
  }

  // Kretanje ocene kroz vreme, jedna linija po proizvodu
  getRatings() {
    return this.http.get<RatingSeries[]>(`${this.url}/ratings`);
  }
}
