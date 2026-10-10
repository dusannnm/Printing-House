import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderAdmin } from '../headers/header-admin';
import { AppFooter } from '../headers/app-footer';
import { AuthService } from '../../services/auth-service';

// Pocetna stranica admin dela sistema
@Component({
  selector: 'app-admin-home',
  imports: [RouterLink, HeaderAdmin, AppFooter],
  templateUrl: './admin-home.html'
})
export class AdminHome {

  private auth = inject(AuthService);

  user = this.auth.user;
}
