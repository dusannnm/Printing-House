// Trazeni proizvod uparen sa onim sto stamparija nudi: stamparija upisuje samo cenu, kolicina dolazi iz same nabavke
export class OfferLine {
    product_name = '';
    quantity = 0;

    // Proizvod stamparije sa tim nazivom, prazno ako ga ona ne nudi
    product_code = '';
    unit_price = 0;          // cenovnik stamparije, sluzi za predpopunjavanje ponude
    stock_quantity = 0;
    enough = false;          // da li stanje pokriva trazenu kolicinu
}
