import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderAdmin } from '../headers/header-admin';
import { AppFooter } from '../headers/app-footer';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth-service';
import { User } from '../../models/user';
import { INSTITUTION_TYPES, USER_TYPE_LABELS, UserType } from '../../constants/user-type';
import { USER_STATUS_LABELS, UserStatus } from '../../constants/user-status';
import { EMAIL_REGEX, PHONE_REGEX, UPLOADS_URL } from '../../constants/validation';

// Pregled, izmena i brisanje naloga
@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, HeaderAdmin, AppFooter],
  templateUrl: './admin-users.html'
})
export class AdminUsers implements OnInit {

  users: User[] = [];
  loaded = false;

  // Suzavanje spiska, jer su sve cetiri vrste naloga u istoj tabeli
  searchText = '';
  filterType = '';

  // Nalog otvoren za izmenu i kopija koja se menja, da odustajanje ostavi red netaknut
  editing = '';
  edited: User = new User();

  // Nalog koji ceka potvrdu brisanja
  confirmingDelete = '';

  typeLabels = USER_TYPE_LABELS;
  statusLabels = USER_STATUS_LABELS;
  uploadsUrl = UPLOADS_URL;
  ADMIN = UserType.ADMIN;
  PENDING = UserStatus.PENDING;

  message = '';
  isError = true;

  private userService = inject(UserService);
  private auth = inject(AuthService);

  ngOnInit() {
    this.load();
  }

  // Sta tabela prikazuje posle pretrage i filtera po tipu
  get visibleUsers(): User[] {
    const text = this.searchText.trim().toLowerCase();

    return this.users.filter((user) => {
      const matchesType = !this.filterType || user.type === this.filterType;
      const matchesText = !text
        || user.username.toLowerCase().includes(text)
        || `${user.name} ${user.surname}`.toLowerCase().includes(text)
        || user.email.toLowerCase().includes(text)
        || (user.institution?.name ?? '').toLowerCase().includes(text);
      return matchesType && matchesText;
    });
  }

  get registrableTypes(): string[] {
    return [...new Set(this.users.map((user) => user.type))];
  }

  isInstitution(user: User): boolean {
    return INSTITUTION_TYPES.includes(user.type);
  }

  // ----------------------------------izmena------------------------------------

  edit(user: User) {
    this.editing = user.username;
    this.confirmingDelete = '';
    this.message = '';

    // Menja se kopija, a ustanova se razvija u ista polja koja koriste forme za registraciju i profil
    this.edited = { ...user };
    if (user.institution) {
      this.edited.institution_name = user.institution.name;
      this.edited.address = user.institution.address;
      this.edited.city = user.institution.city;
    }
  }

  cancelEdit() {
    this.editing = '';
    this.message = '';
  }

  save() {
    const problem = this.checkForm();
    if (problem) {
      return this.fail(problem);
    }

    this.userService.updateProfile(this.edited).subscribe({
      next: () => {
        this.editing = '';
        this.succeed(`Account ${this.edited.username} was saved.`);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The account could not be saved.')
    });
  }

  // --------------------------------brisanje------------------------------------

  askDelete(user: User) {
    this.confirmingDelete = user.username;
    this.editing = '';
    this.message = '';
  }

  cancelDelete() {
    this.confirmingDelete = '';
  }

  confirmDelete(user: User) {
    this.userService.remove(user.username).subscribe({
      next: (result) => {
        this.confirmingDelete = '';
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The account could not be deleted.')
    });
  }

  // ----------------------------------------------------------------------------

  private checkForm(): string | null {
    if (!this.edited.name || !this.edited.surname || !this.edited.phone || !this.edited.email) {
      return 'Name, surname, contact telephone and e-mail address are required.';
    }
    if (!EMAIL_REGEX.test(this.edited.email)) {
      return 'E-mail address is not valid.';
    }
    if (!PHONE_REGEX.test(this.edited.phone)) {
      return 'Contact telephone is not valid.';
    }
    if (this.isInstitution(this.edited)
        && (!this.edited.institution_name || !this.edited.address || !this.edited.city)) {
      return 'Institution name, address and city are required.';
    }
    return null;
  }

  private load() {
    this.userService.getAll().subscribe({
      next: (users) => {
        this.users = users;
        this.loaded = true;
      },
      error: () => {
        this.users = [];
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
