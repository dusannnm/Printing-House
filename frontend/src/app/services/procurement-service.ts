import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Procurement } from '../models/procurement';
import { OpenProcurement } from '../models/open-procurement';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class ProcurementService {

  private http = inject(HttpClient);

  private url = 'http://localhost:4000/procurements';

  // Nabavke ustanove u kojoj nalog radi
  // Trazenje spiska je ujedno i ono sto zatvara one kojima je isteklo deset minuta
  getForClient(username: string) {
    return this.http.get<Procurement[]>(`${this.url}/client/${username}`);
  }

  // Nabavke na koje ova stamparija jos moze da se javi
  getOpenForPrinter(username: string) {
    return this.http.get<OpenProcurement[]>(`${this.url}/open/${username}`);
  }

  // Jedna ponuda po nabavci; salju se samo cene, kolicine dolaze iz same nabavke
  submitBid(procurementId: number, username: string, prices: { [productName: string]: number }) {
    return this.http.post<Message>(`${this.url}/${procurementId}/bid`, { username, prices });
  }
}
