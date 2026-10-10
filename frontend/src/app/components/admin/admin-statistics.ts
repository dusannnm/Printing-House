import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, Legend,
  LineController, LineElement, LinearScale, PieController, PointElement, Tooltip
} from 'chart.js';
import { HeaderAdmin } from '../headers/header-admin';
import { AppFooter } from '../headers/app-footer';
import { StatsService } from '../../services/stats-service';
import { RevenueRow } from '../../models/revenue-row';
import { ProductShare } from '../../models/product-share';
import { RatingSeries } from '../../models/rating-series';

// Chart.js isporucuje delove odvojeno i u build ulaze samo registrovani
// Registrujemo tacno tri vrste grafika koje se ovde koriste, da bundle ne raste bez potrebe
Chart.register(
  BarController, BarElement,        // promet po stampariji
  PieController, ArcElement,        // udeo porucenih proizvoda
  LineController, LineElement, PointElement,   // ocena kroz vreme
  CategoryScale, LinearScale,       // ose koje ti grafici traze
  Tooltip, Legend
);

// Boje za pie chart i linijski grafik
const COLORS = [
  '#1b4a7a', '#e07b1f', '#1e7a45', '#b3261e', '#6b4a9a',
  '#0e7c86', '#a2560d', '#7a1b4a', '#4a7a1b', '#5b6675'
];

// Tri grafika, crtaju se nad celom bazom
@Component({
  selector: 'app-admin-statistics',
  imports: [HeaderAdmin, AppFooter],
  templateUrl: './admin-statistics.html'
})
export class AdminStatistics implements AfterViewInit, OnDestroy {

  @ViewChild('revenueCanvas') revenueCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productsCanvas') productsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ratingsCanvas') ratingsCanvas!: ElementRef<HTMLCanvasElement>;

  revenueRows: RevenueRow[] = [];
  productRows: ProductShare[] = [];
  ratingSeries: RatingSeries[] = [];

  revenueFrom = '';
  productsFrom = '';
  productsTotal = 0;

  // Koje linije su trenutno prikazane - svaki proizvod ima svoje polje za stikliranje
  hidden = new Set<string>();

  colors = COLORS;
  loaded = false;

  private charts: Chart[] = [];
  private statsService = inject(StatsService);

  // Canvas elementi postoje tek kad je pogled tu, pa se podaci dovlace ovde
  ngAfterViewInit() {
    this.statsService.getRevenue().subscribe({
      next: (result) => {
        this.revenueRows = result.rows;
        this.revenueFrom = result.from;
        this.drawRevenue();
      },
      error: () => this.revenueRows = []
    });

    this.statsService.getTopProducts().subscribe({
      next: (result) => {
        this.productRows = result.rows;
        this.productsFrom = result.from;
        this.productsTotal = result.total;
        this.drawProducts();
      },
      error: () => this.productRows = []
    });

    this.statsService.getRatings().subscribe({
      next: (series) => {
        this.ratingSeries = series;
        this.loaded = true;
        this.drawRatings();
      },
      error: () => {
        this.ratingSeries = [];
        this.loaded = true;
      }
    });
  }

  // Grafik radi dok mu se ne kaze da stane, pa se pri napustanju stranice sva tri unistavaju umesto da ostanu zakacena za nepostojece canvas elemente
  ngOnDestroy() {
    this.charts.forEach((chart) => chart.destroy());
  }

  isHidden(code: string): boolean {
    return this.hidden.has(code);
  }

  toggle(code: string) {
    if (this.hidden.has(code)) {
      this.hidden.delete(code);
    } else {
      this.hidden.add(code);
    }

    // Grafik drzi svaki proizvod kao poseban dataset, pa se jedna linija pali i gasi na mestu
    const chart = this.charts[2];
    const index = this.ratingSeries.findIndex((one) => one.code === code);

    if (chart && index >= 0) {
      chart.setDatasetVisibility(index, !this.hidden.has(code));
      chart.update();
    }
  }

  // ------------------------------------grafici---------------------------------

  private drawRevenue() {
    this.replace(0, () => new Chart(this.revenueCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.revenueRows.map((row) => row.printer_name),
        datasets: [{
          label: 'Turnover in RSD',
          data: this.revenueRows.map((row) => row.total),
          backgroundColor: COLORS[0]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    }));
  }

  private drawProducts() {
    this.replace(1, () => new Chart(this.productsCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: this.productRows.map((row) => `${row.product_name} (${row.share}%)`),
        datasets: [{
          data: this.productRows.map((row) => row.quantity),
          backgroundColor: this.productRows.map((row, index) => COLORS[index % COLORS.length])
        }]
      },
      options: { responsive: true }
    }));
  }

  private drawRatings() {
    // Svi datumi kad je bilo koji proizvod ocenjen, da sve linije dele istu osu
    const dates = [...new Set(this.ratingSeries.flatMap((one) => one.points.map((p) => p.date)))].sort();

    this.replace(2, () => new Chart(this.ratingsCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: dates,
        // Gasenje proizvoda ga samo obelezi kao sakrivenog, pa jedna linija moze da se menja bez diranja ostalih
        datasets: this.ratingSeries.map((series, index) => ({
          label: series.name,
          // Ocena se menja samo na dane kad je bilo reakcija, pa linija izmedju nosi poslednju vrednost umesto da padne na nulu
          data: this.carryForward(series, dates),
          borderColor: COLORS[index % COLORS.length],
          backgroundColor: COLORS[index % COLORS.length],
          tension: 0.2,
          spanGaps: true,
          hidden: this.hidden.has(series.code)
        }))
      },
      options: {
        responsive: true,
        scales: { y: { title: { display: true, text: 'likes minus dislikes' } } }
      }
    }));
  }

  // Od retkih tacaka proizvoda pravi vrednost za svaki datum na osi
  private carryForward(series: RatingSeries, dates: string[]): (number | null)[] {
    let last: number | null = null;

    return dates.map((date) => {
      const point = series.points.find((one) => one.date === date);
      if (point) {
        last = point.score;
      }
      return last;
    });
  }

  // Chart.js ne dozvoljava drugi grafik na canvasu koji jos drzi jedan, pa se stari prvo unistava
  private replace(slot: number, build: () => Chart) {
    this.charts[slot]?.destroy();
    this.charts[slot] = build();
  }
}
