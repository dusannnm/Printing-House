import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderPrinter } from '../headers/header-printer';
import { AppFooter } from '../headers/app-footer';
import { UserService } from '../../services/user-service';
import { AuthService } from '../../services/auth-service';
import { User } from '../../models/user';
import {
  EMAIL_REGEX, PHONE_REGEX, PROFILE_IMAGE_MAX_PX, PROFILE_IMAGE_MIN_PX, UPLOADS_URL
} from '../../constants/validation';

// Licni podaci prijavljenog zaposlenog i podaci same stamparije, koje dele sve kolege
@Component({
  selector: 'app-printer-profile',
  imports: [FormsModule, HeaderPrinter, AppFooter],
  templateUrl: './printer-profile.html'
})
export class PrinterProfile implements OnInit {

  user: User = new User();

  message = '';
  isError = true;

  uploadsUrl = UPLOADS_URL;
  minPx = PROFILE_IMAGE_MIN_PX;
  maxPx = PROFILE_IMAGE_MAX_PX;

  private selectedFile: File | null = null;

  private userService = inject(UserService);
  private auth = inject(AuthService);

  ngOnInit() {
    this.userService.getProfile(this.auth.username).subscribe({
      next: (user) => this.showProfile(user),
      error: () => this.fail('Profile could not be loaded.')
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
        // Header cita kopiju iz sesije, pa se i ona osvezava
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

  // ------------------------------koraci--------------------------------------

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

  // Forma menja stampariju kroz ista polja koja koristi registracija, pa se ona prepisuju iz ustanove kojoj nalog pripada
  private showProfile(user: User) {
    this.user = user;

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
    if (!this.user.institution_name || !this.user.address || !this.user.city) {
      return 'Print shop name, address and city are required.';
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
