import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Product } from '../models/product';
import { ProductRequest } from '../models/product-request';
import { Message } from '../models/message';
import { PrintService } from '../models/print-service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {

  private http = inject(HttpClient);

  private url = 'http://localhost:4000/products';

  // Pet proizvoda sa najvise lajkova, za pocetnu stranicu
  getTop5() {
    return this.http.get<Product[]>(`${this.url}/top5`);
  }

  // Za javnu stranicu detalja, bez prosirenih podataka
  getByCode(code: string) {
    return this.http.get<Product>(`${this.url}/${code}`);
  }

  // Isti proizvod sa prosirenim podacima koje vidi prijavljen klijent
  getExtended(code: string) {
    return this.http.get<Product>(`${this.url}/${code}/extended`);
  }

  // Pretraga za pravno lice; jedan red po nazivu, bez stamparija, jer nabavka ide svima
  searchByName(name: string, category: string) {
    const params = new HttpParams()
      .set('name', name)
      .set('category', category);

    return this.http.get<ProductRequest[]>(`${this.url}/search-by-name`, { params: params });
  }

  // Sve stamparije koje nude proizvod pod ovim nazivom, od najjeftinije
  getOffersByName(name: string) {
    return this.http.get<Product[]>(`${this.url}/by-name/${encodeURIComponent(name)}`);
  }

  // Ceo katalog jedne stamparije, ukljucujuci i rasprodato
  getForPrinter(username: string) {
    return this.http.get<Product[]>(`${this.url}/printer/${username}`);
  }

  // Stamparija se na serveru uzima sa naloga
  add(product: Product, username: string, colors: string) {
    return this.http.post<Message>(this.url, { ...product, username, colors });
  }

  updateStock(code: string, username: string, quantity: number) {
    return this.http.put<Message>(`${this.url}/${code}/stock`, {
      username, stock_quantity: quantity
    });
  }

  addService(code: string, service: PrintService) {
    return this.http.post<Message>(`${this.url}/${code}/service`, service);
  }

  removeService(code: string, serviceId: string) {
    return this.http.delete<Message>(`${this.url}/${code}/service/${serviceId}`);
  }

  // Slanje slike u dva koraka: prvo se cuva fajl, pa se ime upisuje na proizvod
  uploadImage(file: File) {
    const data = new FormData();
    data.append('image', file);
    return this.http.post<Message>(`${this.url}/upload-image`, data);
  }

  setImage(code: string, filename: string) {
    return this.http.put<Message>(`${this.url}/${code}/image`, { filename });
  }

  // Like (1) ili dislike (-1), samo za primljen proizvod
  react(code: string, username: string, value: number) {
    return this.http.post<Message>(`${this.url}/${code}/reaction`, { username, value });
  }

  addComment(code: string, username: string, text: string) {
    return this.http.post<Message>(`${this.url}/${code}/comment`, { username, text });
  }

  // Kategorije i gradovi koji trenutno imaju robu, za dve liste forme za pretragu
  getSearchOptions() {
    return this.http.get<{ categories: string[], cities: string[] }>(`${this.url}/search-options`);
  }

  // Svaki parametar je opcionalan; moze i prazan parametar
  search(name: string, category: string, city: string) {
    const params = new HttpParams()
      .set('name', name)
      .set('category', category)
      .set('city', city);

    return this.http.get<Product[]>(`${this.url}/search`, { params: params });
  }
}
