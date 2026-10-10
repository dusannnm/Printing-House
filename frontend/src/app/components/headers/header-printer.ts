import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

// Glavni meni dela sistema za stampariju
@Component({
  selector: 'app-header-printer',
  imports: [RouterLink],
  templateUrl: './header-printer.html'
})
export class HeaderPrinter {

  private auth = inject(AuthService);

  username = this.auth.username;
  institutionName = this.auth.institutionName;

  logout() {
    this.auth.logout();
  }
}
