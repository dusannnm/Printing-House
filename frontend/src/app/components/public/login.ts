import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth-service';
import { HOME_ROUTE } from '../../constants/user-type';

// Kartica za prijavu na pocetnoj stranici
// Ovde se prijavljuju klijenti i stamparije, a admin koristi zasebnu formu na svojoj ruti
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class Login {

  username = '';
  password = '';
  message = '';

  private userService = inject(UserService);
  private auth = inject(AuthService);
  private router = inject(Router);

  login() {
    this.message = '';

    this.userService.login(this.username, this.password).subscribe({
      next: (user) => {
        this.auth.save(user);
        this.router.navigate([this.homeRouteFor(user.type)]);
      },
      error: (err) => this.message = err.error?.message ?? 'Login failed.'
    });
  }

  // Gde ova uloga pocinje, iz iste tabele koju koristi guest guard
  private homeRouteFor(type: string): string {
    return HOME_ROUTE[type] ?? '/';
  }

  register() {
    this.router.navigate(['register']);
  }
}
