import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { CLIENT_TYPES, HOME_ROUTE, UserType } from '../constants/user-type';

// Pravi guard koji propusta samo navedene uloge, ostale vraca na prijavu
// Prikazivanje i skrivanje linkova u meniju samo po sebi nije dovoljno
function allowOnly(types: string[]): CanActivateFn {
    return () => {
        const auth = inject(AuthService);
        const router = inject(Router);

        if (auth.isLoggedIn() && types.includes(auth.type)) {
            return true;
        }
        router.navigate(['']);
        return false;
    };
}

// Prijavljenom korisniku forma za prijavu i registraciju ne trebaju, pa se salje u svoj deo sistema umesto da ostane na stranici bez izlaza
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
        return true;
    }
    router.navigate([HOME_ROUTE[auth.type] ?? '/']);
    return false;
};

export const clientGuard = allowOnly(CLIENT_TYPES);
export const printerGuard = allowOnly([UserType.PRINTER]);
export const adminGuard = allowOnly([UserType.ADMIN]);

// Javne nabavke su samo za klijente koji su pravna lica
export const legalClientGuard = allowOnly([UserType.CLIENT_LEGAL]);
