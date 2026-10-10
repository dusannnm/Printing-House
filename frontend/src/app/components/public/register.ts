import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderPublic } from '../headers/header-public';
import { AppFooter } from '../headers/app-footer';
import { UserService } from '../../services/user-service';
import { User } from '../../models/user';
import { INSTITUTION_TYPES, REGISTRABLE_TYPES, USER_TYPE_LABELS } from '../../constants/user-type';
import {
  EMAIL_REGEX, PASSWORD_REGEX, PASSWORD_RULE, PHONE_REGEX,
  PROFILE_IMAGE_MAX_PX, PROFILE_IMAGE_MIN_PX,
  REGISTRATION_NUMBER_REGEX, TAX_ID_REGEX
} from '../../constants/validation';

// Forma za registraciju svih tipova korisnika koji smeju sami da se registruju
@Component({
  selector: 'app-register',
  imports: [FormsModule, HeaderPublic, AppFooter],
  templateUrl: './register.html'
})
export class Register {

  user: User = new User();
  message = '';
  isError = true;
  registered = false;          // sakriva formu kad je zahtev poslat

  // Izabrana slika, proverena u browseru pre nego sto se bilo sta posalje
  private selectedFile: File | null = null;

  registrableTypes = REGISTRABLE_TYPES;
  typeLabels = USER_TYPE_LABELS;
  passwordRule = PASSWORD_RULE;
  minPx = PROFILE_IMAGE_MIN_PX;
  maxPx = PROFILE_IMAGE_MAX_PX;

  private userService = inject(UserService);
  private router = inject(Router);

  // Pravna lica i stamparije popunjavaju dodatna polja o ustanovi
  get isInstitution(): boolean {
    return INSTITUTION_TYPES.includes(this.user.type);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  register() {
    const problem = this.checkForm();
    if (problem) {
      return this.fail(problem);
    }

    // Bez slike nalog prosto zadrzava podrazumevanu
    if (!this.selectedFile) {
      return this.sendRegistration();
    }

    // Slika se prvo meri u pregledacu, da pogresna nikad ne napravi nalog
    this.readImageSize(this.selectedFile).then((size) => {
      if (size.width < this.minPx || size.height < this.minPx ||
          size.width > this.maxPx || size.height > this.maxPx) {
        return this.fail(`Profile picture must be between ${this.minPx}x${this.minPx} and ${this.maxPx}x${this.maxPx} pixels (this one is ${size.width}x${size.height}).`);
      }
      this.sendRegistration();
    }).catch(() => this.fail('That file could not be read as a picture.'));
  }

  backToLogin() {
    this.router.navigate(['']);
  }

  // --------------------------------koraci------------------------------------

  private sendRegistration() {
    this.userService.register(this.user).subscribe({
      next: (res) => this.selectedFile ? this.uploadPicture() : this.succeed(res.message),
      error: (err) => this.fail(err.error?.message ?? 'Registration failed.')
    });
  }

  // Slanje u dva koraka: prvo se cuva fajl, pa se ime upisuje na novi nalog
  private uploadPicture() {
    const pictureFailed = 'Your account was created, but the profile picture could not be saved. The administrator still has to approve the account.';

    this.userService.uploadProfileImage(this.selectedFile!).subscribe({
      next: (uploaded) => {
        this.userService.setProfileImage(this.user.username, uploaded.filename!).subscribe({
          next: () => this.succeed('Registration request sent. The administrator has to approve it before you can log in.'),
          error: () => this.succeed(pictureFailed)
        });
      },
      error: () => this.succeed(pictureFailed)
    });
  }

  // Cita fajl u pregledacu i javlja koliko je slika velika
  private readImageSize(file: File): Promise<{ width: number, height: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve({ width: image.width, height: image.height });
        image.onerror = () => reject();
        image.src = reader.result as string;
      };
      reader.onerror = () => reject();
      reader.readAsDataURL(file);
    });
  }

  // -------------------------------validacija---------------------------------

  // Ista pravila koja proverava server, da se greska prijavi bez slanja zahteva
  private checkForm(): string | null {
    const user = this.user;

    if (!user.type) {
      return 'Choose the type of account.';
    }
    if (!user.username || !user.password || !user.name || !user.surname || !user.phone || !user.email) {
      return 'All fields except the profile picture are required.';
    }
    if (!PASSWORD_REGEX.test(user.password)) {
      return PASSWORD_RULE;
    }
    if (!EMAIL_REGEX.test(user.email)) {
      return 'E-mail address is not valid.';
    }
    if (!PHONE_REGEX.test(user.phone)) {
      return 'Contact telephone is not valid.';
    }

    if (this.isInstitution) {
      if (!user.institution_name || !user.address || !user.city) {
        return 'Institution name, address and city are required.';
      }
      if (!REGISTRATION_NUMBER_REGEX.test(user.registration_number)) {
        return 'Registration number must have exactly 8 digits.';
      }
      if (!TAX_ID_REGEX.test(user.tax_id)) {
        return 'Tax identification number must have 9 digits and cannot start with a zero.';
      }
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
    this.registered = true;
  }
}
