import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderPublic } from '../headers/header-public';
import { AppFooter } from '../headers/app-footer';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth-service';

// Prijava za admina
// Ista polja kao javna forma, ali na svojoj ruti koja nije povezana ni sa jedne javne stranice
@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, HeaderPublic, AppFooter],
  templateUrl: './admin-login.html'
})
export class AdminLogin {

  username = '';
  password = '';
  message = '';

  private userService = inject(UserService);
  private auth = inject(AuthService);
  private router = inject(Router);

  login() {
    this.message = '';

    this.userService.adminLogin(this.username, this.password).subscribe({
      next: (user) => {
        this.auth.save(user);
        this.router.navigate(['/admin']);
      },
      error: (err) => this.message = err.error?.message ?? 'Login failed.'
    });
  }
}
