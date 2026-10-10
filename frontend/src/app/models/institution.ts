// Firma - stamparija ili pravno lice; vise naloga moze da pripada istoj ustanovi i da deli njene podatke
export class Institution {
    _id = '';              // maticni broj, ujedno i primarni kljuc
    name = '';
    address = '';
    city = '';
    tax_id = '';           // PIB
    type = '';             // UserType.PRINTER ili UserType.CLIENT_LEGAL
}
