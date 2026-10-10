// Uloga naloga, odredjuje kom delu sistema korisnik sme da pristupi
export enum UserType {
    CLIENT_INDIVIDUAL = 'client_individual',
    CLIENT_LEGAL = 'client_legal',
    PRINTER = 'printer',
    ADMIN = 'admin'
}

// Pravna lica i stamparije dodatno opisuju ustanovu kojoj pripadaju
export const INSTITUTION_TYPES: string[] = [UserType.CLIENT_LEGAL, UserType.PRINTER];

// Obe vrste klijenata dele sve stranice osim javnih nabavki
export const CLIENT_TYPES: string[] = [UserType.CLIENT_INDIVIDUAL, UserType.CLIENT_LEGAL];

// Admin se nikada ne registruje sam
export const REGISTRABLE_TYPES: string[] = [UserType.CLIENT_INDIVIDUAL, UserType.CLIENT_LEGAL, UserType.PRINTER];

// Isti tekst koji stoji u padajucoj listi na registraciji, da poruka sa servera moze
// da imenuje tacnu opciju (ogledalo USER_TYPE_LABELS sa fronta)
export const USER_TYPE_LABELS: Record<string, string> = {
    [UserType.CLIENT_INDIVIDUAL]: 'Client - individual',
    [UserType.CLIENT_LEGAL]: 'Client - legal entity',
    [UserType.PRINTER]: 'Print shop',
    [UserType.ADMIN]: 'Administrator'
};
