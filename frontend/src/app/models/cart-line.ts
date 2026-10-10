// Stavka korpe kakvu server vraca: sirova stavka plus pun naziv i izracunate cene
export class CartLine {
    index = 0;                    // pozicija u korpi, koristi se pri brisanju
    product_code = '';
    product_name = '';
    quantity = 0;
    color = '';
    print_type = '';
    print_text = '';
    unit_price = 0;
    extra_price_per_piece = 0;
    line_total = 0;
}
