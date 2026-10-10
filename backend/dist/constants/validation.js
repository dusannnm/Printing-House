"use strict";
// Pravila za unos koja vazi ceo backend. Frontend ogleda ovaj fajl da bi ista
// provera prosla jos pre slanja zahteva
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PRINT_SIZE_MM = exports.MAX_STOCK = exports.MAX_PRICE = exports.MIN_PRICE = exports.MAX_COMMENT = exports.MAX_PRINT_TEXT = exports.MAX_DESCRIPTION = exports.MAX_ADDRESS = exports.MAX_NAME = exports.MAX_EMAIL = exports.MAX_USERNAME = exports.PRODUCT_CODE_REGEX = exports.DEFAULT_PRODUCT_IMAGE = exports.DEFAULT_PROFILE_IMAGE = exports.PROFILE_IMAGE_MAX_PX = exports.PROFILE_IMAGE_MIN_PX = exports.IMAGE_EXTENSIONS = exports.TAX_ID_REGEX = exports.REGISTRATION_NUMBER_REGEX = exports.PHONE_REGEX = exports.EMAIL_REGEX = exports.PASSWORD_RULE = exports.PASSWORD_REGEX = void 0;
// 8-12 karaktera, pocinje slovom, bar jedno veliko slovo, cifra i specijalni znak.
// Tri lookahead-a su provere "mora da sadrzi", a prvo slovo plus 7-11 znakova bez
// razmaka daju duzinu 8-12
exports.PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z]\S{7,11}$/;
exports.PASSWORD_RULE = 'Password must be 8-12 characters with no spaces, start with a letter and contain an uppercase letter, a digit and a special character.';
exports.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.PHONE_REGEX = /^[0-9+\-\s]{6,20}$/;
// Maticni broj: tacno 8 cifara. PIB: 9 cifara koje ne smeju poceti nulom
exports.REGISTRATION_NUMBER_REGEX = /^\d{8}$/;
exports.TAX_ID_REGEX = /^[1-9]\d{8}$/;
// Profilna slika: JPG/PNG/GIF, izmedju 100x100 i 250x250 piksela
exports.IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
exports.PROFILE_IMAGE_MIN_PX = 100;
exports.PROFILE_IMAGE_MAX_PX = 250;
exports.DEFAULT_PROFILE_IMAGE = 'default_profile_image.jpg';
exports.DEFAULT_PRODUCT_IMAGE = 'default_product_image.jpg';
// Sifra proizvoda putuje kroz adresu (/client/product/CS-001), pa sme da sadrzi samo slova, cifre i crticu
exports.PRODUCT_CODE_REGEX = /^[A-Za-z0-9-]{1,20}$/;
// Najvece dozvoljene duzine teksta
exports.MAX_USERNAME = 30;
exports.MAX_EMAIL = 100;
exports.MAX_NAME = 100; // ime, prezime, naziv proizvoda, kategorije, vrste stampe
exports.MAX_ADDRESS = 200;
exports.MAX_DESCRIPTION = 1000;
exports.MAX_PRINT_TEXT = 200; // tekst koji se stampa na proizvodu
exports.MAX_COMMENT = 500;
// Gornje granice za brojeve. Cena je u dinarima i ne moze biti manja od jednog
exports.MIN_PRICE = 1;
exports.MAX_PRICE = 10000000;
exports.MAX_STOCK = 1000000;
exports.MAX_PRINT_SIZE_MM = 10000; // 10 metara, dovoljno i za fototapetu
