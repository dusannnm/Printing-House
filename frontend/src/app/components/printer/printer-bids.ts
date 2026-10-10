import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderPrinter } from '../headers/header-printer';
import { AppFooter } from '../headers/app-footer';
import { ProcurementService } from '../../services/procurement-service';
import { AuthService } from '../../services/auth-service';
import { OpenProcurement } from '../../models/open-procurement';

// Nabavke na koje ova stamparija jos moze da se javi
// Jedna ponuda po nabavci, za sve trazene proizvode, unutar deset minuta koliko je otvorena
@Component({
  selector: 'app-printer-bids',
  imports: [FormsModule, HeaderPrinter, AppFooter],
  templateUrl: './printer-bids.html'
})
export class PrinterBids implements OnInit {

  procurements: OpenProcurement[] = [];
  loaded = false;

  // Ponudjena cena po nazivu proizvoda i po nabavci, unapred popunjena cenovnikom stamparije, da se nabavka odgovori bez ponovnog kucanja svega
  prices: { [procurementId: number]: { [productName: string]: number } } = {};

  message = '';
  isError = true;

  private procurementService = inject(ProcurementService);
  private auth = inject(AuthService);

  ngOnInit() {
    this.load();
  }

  // Koliko bi stamparija ukupno naplatila po trenutno unetim cenama
  offerTotal(procurement: OpenProcurement): number {
    return procurement.offer_lines.reduce((sum, line) => {
      const price = this.prices[procurement.procurement_id]?.[line.product_name] ?? 0;
      return sum + price * line.quantity;
    }, 0);
  }

  minutesLeft(procurement: OpenProcurement): number {
    const left = new Date(procurement.closes_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(left / 60000));
  }

  send(procurement: OpenProcurement) {
    const offered = this.prices[procurement.procurement_id] ?? {};

    for (const line of procurement.offer_lines) {
      if (!(offered[line.product_name] > 0)) {
        return this.fail(`Enter a price greater than zero for ${line.product_name}.`);
      }
    }

    this.procurementService.submitBid(procurement.procurement_id, this.auth.username, offered).subscribe({
      next: (result) => {
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The offer could not be sent.')
    });
  }

  private load() {
    this.procurementService.getOpenForPrinter(this.auth.username).subscribe({
      next: (procurements) => {
        this.procurements = procurements;
        this.prices = {};

        // Svaka stavka krece od sopstvene cene, stamparija moze da je spusti
        procurements.forEach((procurement) => {
          this.prices[procurement.procurement_id] = {};
          procurement.offer_lines.forEach((line) => {
            this.prices[procurement.procurement_id][line.product_name] = line.unit_price;
          });
        });

        this.loaded = true;
      },
      error: () => {
        this.procurements = [];
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
