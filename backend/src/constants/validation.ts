// Pravila za unos koja vazi ceo backend. Frontend ogleda ovaj fajl da bi ista
// provera prosla jos pre slanja zahteva

// 8-12 karaktera, pocinje slovom, bar jedno veliko slovo, cifra i specijalni znak.
// Tri lookahead-a su provere "mora da sadrzi", a prvo slovo plus 7-11 znakova bez
// razmaka daju duzinu 8-12
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z]\S{7,11}$/;
export const PASSWORD_RULE = 'Password must be 8-12 characters with no spaces, start with a letter and contain an uppercase letter, a digit and a special character.';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9+\-\s]{6,20}$/;

// Maticni broj: tacno 8 cifara. PIB: 9 cifara koje ne smeju poceti nulom
export const REGISTRATION_NUMBER_REGEX = /^\d{8}$/;
export const TAX_ID_REGEX = /^[1-9]\d{8}$/;

// Profilna slika: JPG/PNG/GIF, izmedju 100x100 i 250x250 piksela
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
export const PROFILE_IMAGE_MIN_PX = 100;
export const PROFILE_IMAGE_MAX_PX = 250;

export const DEFAULT_PROFILE_IMAGE = 'default_profile_image.jpg';
export const DEFAULT_PRODUCT_IMAGE = 'default_product_image.jpg';

// Sifra proizvoda putuje kroz adresu (/client/product/CS-001), pa sme da sadrzi samo slova, cifre i crticu
export const PRODUCT_CODE_REGEX = /^[A-Za-z0-9-]{1,20}$/;

// Najvece dozvoljene duzine teksta
export const MAX_USERNAME = 30;
export const MAX_EMAIL = 100;
export const MAX_NAME = 100;          // ime, prezime, naziv proizvoda, kategorije, vrste stampe
export const MAX_ADDRESS = 200;
export const MAX_DESCRIPTION = 1000;
export const MAX_PRINT_TEXT = 200;    // tekst koji se stampa na proizvodu
export const MAX_COMMENT = 500;

// Gornje granice za brojeve. Cena je u dinarima i ne moze biti manja od jednog
export const MIN_PRICE = 1;
export const MAX_PRICE = 10000000;
export const MAX_STOCK = 1000000;
export const MAX_PRINT_SIZE_MM = 10000;   // 10 metara, dovoljno i za fototapetu
