// Rezultat pretrage po nazivu: koliko stamparija nudi proizvod i koliko drzi ona sa najvecim stanjem
export class ProductRequest {
    product_name = '';
    category = '';
    shops = 0;

    // Celu nabavku isporucuje jedna stamparija, pa je ovo najveca kolicina kod pojedinacne stamparije, a ne zbir svih
    best_stock = 0;
}
