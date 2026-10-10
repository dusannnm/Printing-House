import { Institution } from './institution';

export class User {
    username = '';
    password = '';
    name = '';
    surname = '';
    phone = '';
    email = '';
    profile_image = '';
    type = '';
    status = 0;
    registered_at = '';        // stize kao ISO string

    // Zaposleni u stampariji i u pravnom licu pripadaju ustanovi, i vise naloga moze da deli istu
    // Prazno za individualne klijente i admina
    institution_id = '';

    // Server je popunjava pri vracanju naloga, da stranice odmah imaju naziv firme
    institution?: Institution;

    // Samo kod zahteva za registraciju: ko vec radi u toj ustanovi, da se nova firma razlikuje od pridruzivanja postojecoj
    colleagues?: string[];

    // Koristi ih samo forma za registraciju, gde se ustanova opisuje preko PIB-a/MB-a
    // Postojecoj se pristupa, nova se pravi
    institution_name = '';
    address = '';
    city = '';
    registration_number = '';
    tax_id = '';
}
