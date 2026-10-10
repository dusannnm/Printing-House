import { CartLine } from './cart-line';

// Sve poruceno od jedne stamparije - potvrda korpe od svake grupe pravi zasebnu fakturu
export class CartGroup {
    institution_id = '';
    printer_name = '';
    printer_city = '';
    items: CartLine[] = [];
    group_total = 0;
}
