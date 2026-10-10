import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from '../models/user';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private http = inject(HttpClient);

  private url = 'http://localhost:4000/users';

  // Javna forma, admin nalozi se ovde odbijaju
  login(username: string, password: string) {
    return this.http.post<User>(`${this.url}/login`, { username, password });
  }

  // Forma na zasebnoj admin ruti, prolaze samo admini
  adminLogin(username: string, password: string) {
    return this.http.post<User>(`${this.url}/admin-login`, { username, password });
  }

  getAll() {
    return this.http.get<User[]>(this.url);
  }

  // Zahtevi za registraciju koji jos cekaju admina
  getPending() {
    return this.http.get<User[]>(`${this.url}/pending`);
  }

  // Prihvata (ACTIVE) ili odbija (REJECTED) zahtev za registraciju
  decide(username: string, status: number) {
    return this.http.put<Message>(`${this.url}/${username}/status`, { status });
  }

  // Ono sto je nalog vec uradio ostaje u sistemu
  remove(username: string) {
    return this.http.delete<Message>(`${this.url}/${username}`);
  }

  getProfile(username: string) {
    return this.http.get<User>(`${this.url}/${username}`);
  }

  // Username, tip i status ne mogu da se menjaju
  updateProfile(user: User) {
    return this.http.put<User>(`${this.url}/profile`, user);
  }

  // Koliko je stamparija registrovano, za pocetnu stranicu
  countPrinters() {
    return this.http.get<{ count: number }>(`${this.url}/printer-count`);
  }

  // Pravi zahtev za registraciju koji ceka admina
  register(user: User) {
    return this.http.post<Message>(`${this.url}/register`, user);
  }

  // Prvi korak: cuva fajl i vraca ime pod kojim je sacuvan
  uploadProfileImage(file: File) {
    const data = new FormData();
    data.append('image', file);
    return this.http.post<Message>(`${this.url}/upload-image`, data);
  }

  // Drugi korak: to ime se upisuje na nalog
  setProfileImage(username: string, filename: string) {
    return this.http.put<Message>(`${this.url}/profile-image`, { username, filename });
  }
}
