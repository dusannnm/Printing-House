import { Component, inject, OnInit } from '@angular/core';
import { HeaderAdmin } from '../headers/header-admin';
import { AppFooter } from '../headers/app-footer';
import { UserService } from '../../services/user-service';
import { User } from '../../models/user';
import { INSTITUTION_TYPES, USER_TYPE_LABELS } from '../../constants/user-type';
import { UserStatus } from '../../constants/user-status';
import { UPLOADS_URL } from '../../constants/validation';

// Zahtevi za registraciju koji cekaju odluku; prihvatanje omogucava prijavu, a odbijanje se javlja osobi pri sledecem pokusaju
@Component({
  selector: 'app-admin-requests',
  imports: [HeaderAdmin, AppFooter],
  templateUrl: './admin-requests.html'
})
export class AdminRequests implements OnInit {

  requests: User[] = [];
  loaded = false;

  typeLabels = USER_TYPE_LABELS;
  uploadsUrl = UPLOADS_URL;

  message = '';
  isError = true;

  private userService = inject(UserService);

  ngOnInit() {
    this.load();
  }

  isInstitution(request: User): boolean {
    return INSTITUTION_TYPES.includes(request.type);
  }

  // True kad nalog hoce da se prikljuci firmi koja vec ima zaposlene, sto je slucaj koji admin mora da approve-uje
  isJoiningExisting(request: User): boolean {
    return (request.colleagues?.length ?? 0) > 0;
  }

  accept(request: User) {
    this.decide(request, UserStatus.ACTIVE);
  }

  reject(request: User) {
    this.decide(request, UserStatus.REJECTED);
  }

  private decide(request: User, status: number) {
    this.userService.decide(request.username, status).subscribe({
      next: (result) => {
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The request could not be decided.')
    });
  }

  private load() {
    this.userService.getPending().subscribe({
      next: (requests) => {
        this.requests = requests;
        this.loaded = true;
      },
      error: () => {
        this.requests = [];
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
