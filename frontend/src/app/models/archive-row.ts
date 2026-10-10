// Arhiva prikazuje proizvode, a ne fakture, pa se jedna faktura javlja u vise redova
export class ArchiveRow {
    invoice_id = 0;
    status = 0;              // OrderStatus fakture kojoj red pripada
    ordered_at = '';
    product_code = '';
    product_name = '';
    quantity = 0;
    printer_name = '';
    printer_city = '';

    // Ranija reakcija ovog usera: 1 lajk, -1 dislajk, 0 jos nije ocenio
    my_reaction = 0;
    has_commented = false;
}
