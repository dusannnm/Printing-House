// Ogledalo backend/src/constants/validation.ts, da se losa vrednost prijavi pre slanja zahteva, pa jos jednom na serveru

export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z]\S{7,11}$/;
export const PASSWORD_RULE = 'Password must be 8-12 characters with no spaces, start with a letter and contain an uppercase letter, a digit and a special character.';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9+\-\s]{6,20}$/;

export const REGISTRATION_NUMBER_REGEX = /^\d{8}$/;
export const TAX_ID_REGEX = /^[1-9]\d{8}$/;

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
export const PROFILE_IMAGE_MIN_PX = 100;
export const PROFILE_IMAGE_MAX_PX = 250;

// Odakle se serviraju poslate slike
export const UPLOADS_URL = 'http://localhost:4000/uploads';

// Sifra proizvoda putuje kroz adresu, pa sme samo slova, cifre i crticu
export const PRODUCT_CODE_REGEX = /^[A-Za-z0-9-]{1,20}$/;

// Najvece dozvoljene duzine teksta, iste kao na serveru
export const MAX_USERNAME = 30;
export const MAX_EMAIL = 100;
export const MAX_NAME = 100;
export const MAX_ADDRESS = 200;
export const MAX_DESCRIPTION = 1000;
export const MAX_PRINT_TEXT = 200;
export const MAX_COMMENT = 500;

// Gornje granice za brojeve
export const MIN_PRICE = 1;
export const MAX_PRICE = 10000000;
export const MAX_STOCK = 1000000;
export const MAX_PRINT_SIZE_MM = 10000;
