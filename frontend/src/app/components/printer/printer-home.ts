import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderPrinter } from '../headers/header-printer';
import { AppFooter } from '../headers/app-footer';
import { AuthService } from '../../services/auth-service';

// Pocetna stranica dela sistema za stampariju
@Component({
  selector: 'app-printer-home',
  imports: [RouterLink, HeaderPrinter, AppFooter],
  templateUrl: './printer-home.html'
})
export class PrinterHome {

  private auth = inject(AuthService);

  user = this.auth.user;
}
