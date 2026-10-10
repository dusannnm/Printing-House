import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

// Glavni meni klijentskog dela sistema
// Javna nabavka se nudi samo pravnim licima
@Component({
  selector: 'app-header-client',
  imports: [RouterLink],
  templateUrl: './header-client.html'
})
export class HeaderClient {

  private auth = inject(AuthService);

  username = this.auth.username;
  isLegalEntity = this.auth.isLegalEntity;
  institutionName = this.auth.institutionName;

  logout() {
    this.auth.logout();
  }
}
