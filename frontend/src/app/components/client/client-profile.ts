import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { UserService } from '../../services/user-service';
import { OrderService } from '../../services/order-service';
import { AuthService } from '../../services/auth-service';
import { User } from '../../models/user';
import { Order } from '../../models/order';
import { INSTITUTION_TYPES } from '../../constants/user-type';
import { ORDER_STATUS_LABELS, OrderStatus } from '../../constants/order-status';
import {
  EMAIL_REGEX, PHONE_REGEX, PROFILE_IMAGE_MAX_PX, PROFILE_IMAGE_MIN_PX, UPLOADS_URL
} from '../../constants/validation';

// Licni podaci prijavljenog klijenta, a ispod njih sve fakture koje sme da vidi
@Component({
  selector: 'app-client-profile',
  imports: [FormsModule, HeaderClient, AppFooter],
  templateUrl: './client-profile.html'
})
export class ClientProfile implements OnInit {

  user: User = new User();
  orders: Order[] = [];

  message = '';
  isError = true;

  uploadsUrl = UPLOADS_URL;
  minPx = PROFILE_IMAGE_MIN_PX;
  maxPx = PROFILE_IMAGE_MAX_PX;
  statusLabels = ORDER_STATUS_LABELS;
  ORDERED = OrderStatus.ORDERED;

  // Faktura cije ponistavanje ceka potvrdu
  cancelling = 0;

  // Po kojoj koloni je tabela porudzbina trenutno sortirana
  sortColumn = 'ordered_at';
  sortAscending = false;

  private selectedFile: File | null = null;

  private userService = inject(UserService);
  private orderService = inject(OrderService);
  private auth = inject(AuthService);

  get isInstitution(): boolean {
    return INSTITUTION_TYPES.includes(this.user.type);
  }

  ngOnInit() {
    const username = this.auth.username;

    this.userService.getProfile(username).subscribe({
      next: (user) => this.showProfile(user),
      error: () => this.fail('Profile could not be loaded.')
    });

    this.loadOrders();
  }

  private loadOrders() {
    this.orderService.getForClient(this.auth.username).subscribe({
      next: (orders) => this.orders = orders,
      error: () => this.orders = []
    });
  }

  save() {
    const problem = this.checkForm();
    if (problem) {
      return this.fail(problem);
    }

    this.userService.updateProfile(this.user).subscribe({
      next: (updated) => {
        this.showProfile(updated);
        // Header i guardovi citaju kopiju iz sesije, pa se i ona osvezava
        this.auth.save(updated);

        if (this.selectedFile) {
          this.uploadPicture();
        } else {
          this.succeed('Profile saved.');
        }
      },
      error: (err) => this.fail(err.error?.message ?? 'Profile could not be saved.')
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  askCancel(order: Order) {
    this.cancelling = order.invoice_id;
    this.message = '';
  }

  cancelCancel() {
    this.cancelling = 0;
  }

  confirmCancel(order: Order) {
    this.orderService.cancel(order.invoice_id, this.auth.username).subscribe({
      next: (result) => {
        this.cancelling = 0;
        this.succeed(result.message);
        this.loadOrders();
      },
      error: (err) => this.fail(err.error?.message ?? 'The order could not be cancelled.')
    });
  }

  // Klik na zaglavlje kolone sortira po njoj, a ponovni klik obrce redosled
  sortBy(column: keyof Order) {
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = column;
      this.sortAscending = true;
    }

    this.orders.sort((first, second) => {
      const a = first[column];
      const b = second[column];
      const comparison = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a).localeCompare(String(b));
      return this.sortAscending ? comparison : -comparison;
    });
  }

  // -------------------------------koraci-------------------------------------

  // Slanje u dva koraka: prvo se cuva fajl, pa se njegovo ime upisuje na nalog
  private uploadPicture() {
    this.userService.uploadProfileImage(this.selectedFile!).subscribe({
      next: (uploaded) => {
        this.userService.setProfileImage(this.user.username, uploaded.filename!).subscribe({
          next: () => {
            this.user.profile_image = uploaded.filename!;
            this.auth.save(this.user);
            this.selectedFile = null;
            this.succeed('Profile and picture saved.');
          },
          error: () => this.succeed('Profile saved, but the picture could not be attached.')
        });
      },
      error: (err) => this.succeed(err.error?.message ?? 'Profile saved, but the picture was refused.')
    });
  }

  private showProfile(user: User) {
    this.user = user;

    // Forma menja ustanovu kroz ista polja koja koristi registracija, pa se ona prepisuju iz ustanove koja je stigla uz nalog
    if (user.institution) {
      this.user.institution_name = user.institution.name;
      this.user.address = user.institution.address;
      this.user.city = user.institution.city;
      this.user.registration_number = user.institution._id;
      this.user.tax_id = user.institution.tax_id;
    }
  }

  private checkForm(): string | null {
    if (!this.user.name || !this.user.surname || !this.user.phone || !this.user.email) {
      return 'Name, surname, contact telephone and e-mail address are required.';
    }
    if (!EMAIL_REGEX.test(this.user.email)) {
      return 'E-mail address is not valid.';
    }
    if (!PHONE_REGEX.test(this.user.phone)) {
      return 'Contact telephone is not valid.';
    }
    if (this.isInstitution && (!this.user.institution_name || !this.user.address || !this.user.city)) {
      return 'Institution name, address and city are required.';
    }
    return null;
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
