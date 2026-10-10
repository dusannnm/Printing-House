"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_TYPE_LABELS = exports.REGISTRABLE_TYPES = exports.CLIENT_TYPES = exports.INSTITUTION_TYPES = exports.UserType = void 0;
// Uloga naloga, odredjuje kom delu sistema korisnik sme da pristupi
var UserType;
(function (UserType) {
    UserType["CLIENT_INDIVIDUAL"] = "client_individual";
    UserType["CLIENT_LEGAL"] = "client_legal";
    UserType["PRINTER"] = "printer";
    UserType["ADMIN"] = "admin";
})(UserType || (exports.UserType = UserType = {}));
// Pravna lica i stamparije dodatno opisuju ustanovu kojoj pripadaju
exports.INSTITUTION_TYPES = [UserType.CLIENT_LEGAL, UserType.PRINTER];
// Obe vrste klijenata dele sve stranice osim javnih nabavki
exports.CLIENT_TYPES = [UserType.CLIENT_INDIVIDUAL, UserType.CLIENT_LEGAL];
// Admin se nikada ne registruje sam
exports.REGISTRABLE_TYPES = [UserType.CLIENT_INDIVIDUAL, UserType.CLIENT_LEGAL, UserType.PRINTER];
// Isti tekst koji stoji u padajucoj listi na registraciji, da poruka sa servera moze
// da imenuje tacnu opciju (ogledalo USER_TYPE_LABELS sa fronta)
exports.USER_TYPE_LABELS = {
    [UserType.CLIENT_INDIVIDUAL]: 'Client - individual',
    [UserType.CLIENT_LEGAL]: 'Client - legal entity',
    [UserType.PRINTER]: 'Print shop',
    [UserType.ADMIN]: 'Administrator'
};
