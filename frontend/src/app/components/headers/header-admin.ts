import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

// Glavni meni admin dela sistema
@Component({
  selector: 'app-header-admin',
  imports: [RouterLink],
  templateUrl: './header-admin.html'
})
export class HeaderAdmin {

  private auth = inject(AuthService);

  username = this.auth.username;

  logout() {
    this.auth.logout();
  }
}
