// Cene su prepisane sa proizvoda u trenutku porucivanja, pa kasnija izmena cene ne menja staru fakturu
export class OrderItem {
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
