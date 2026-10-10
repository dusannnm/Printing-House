import { Component, inject, OnInit } from '@angular/core';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { ProcurementService } from '../../services/procurement-service';
import { AuthService } from '../../services/auth-service';
import { Procurement } from '../../models/procurement';
import { ProcurementStatus, PROCUREMENT_STATUS_LABELS } from '../../constants/procurement-status';

// Javne nabavke ustanove
// Otvaranje ove stranice je ujedno i ono sto zatvara one kojima je isteklo vreme i bira im pobednika
@Component({
  selector: 'app-client-procurements',
  imports: [HeaderClient, AppFooter],
  templateUrl: './client-procurements.html'
})
export class ClientProcurements implements OnInit {

  procurements: Procurement[] = [];
  loaded = false;

  statusLabels = PROCUREMENT_STATUS_LABELS;
  OPEN = ProcurementStatus.OPEN;
  AWARDED = ProcurementStatus.AWARDED;

  private procurementService = inject(ProcurementService);
  private auth = inject(AuthService);

  ngOnInit() {
    this.procurementService.getForClient(this.auth.username).subscribe({
      next: (procurements) => {
        this.procurements = procurements;
        this.loaded = true;
      },
      error: () => {
        this.procurements = [];
        this.loaded = true;
      }
    });
  }

  // Koliko je stamparijama ostalo vremena da posalju ponudu
  minutesLeft(procurement: Procurement): number {
    const remaining = new Date(procurement.closes_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 60000));
  }

  // Ponude od najjeftinije, kojim redom se i bira pobednik
  sortedBids(procurement: Procurement) {
    return [...procurement.bids].sort((a, b) => a.total_amount - b.total_amount);
  }
}
