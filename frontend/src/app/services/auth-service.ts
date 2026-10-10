import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user';
import { UserType } from '../constants/user-type';

// Wrapper oko localStorage kljuceva, tako da komponente/headeri ne citaju localStorage sami
@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private router = inject(Router);

  private static readonly USER_KEY = 'user';
  private static readonly TYPE_KEY = 'type';

  get user(): User | null {
    const stored = localStorage.getItem(AuthService.USER_KEY);
    return stored ? JSON.parse(stored) as User : null;
  }

  get type(): string {
    return localStorage.getItem(AuthService.TYPE_KEY) ?? '';
  }

  get username(): string {
    return this.user?.username ?? '';
  }

  get isLegalEntity(): boolean {
    return this.type === UserType.CLIENT_LEGAL;
  }

  // Kompanija za koju dati korisnik radi
  get institutionId(): string {
    return this.user?.institution_id ?? '';
  }

  get institutionName(): string {
    return this.user?.institution?.name ?? '';
  }

  isLoggedIn(): boolean {
    return this.user !== null;
  }

  // Zove se posle uspesnog login-a
  save(user: User): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
    localStorage.setItem(AuthService.TYPE_KEY, user.type);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['']);
  }
}
