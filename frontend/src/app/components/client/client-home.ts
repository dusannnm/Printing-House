import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderClient } from '../headers/header-client';
import { AppFooter } from '../headers/app-footer';
import { AuthService } from '../../services/auth-service';

// Pocetna stranica klijentskog dela sistema
@Component({
  selector: 'app-client-home',
  imports: [RouterLink, HeaderClient, AppFooter],
  templateUrl: './client-home.html'
})
export class ClientHome {

  private auth = inject(AuthService);

  user = this.auth.user;
  isLegalEntity = this.auth.isLegalEntity;
}
