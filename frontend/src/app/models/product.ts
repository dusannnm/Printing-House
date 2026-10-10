import { PrintService } from './print-service';
import { Comment } from './comment';

export class Product {
    code = '';
    name = '';
    description = '';
    category = '';
    subcategory = '';
    unit_price = 0;
    stock_quantity = 0;
    colors: string[] = [];
    main_image = '';
    // Proizvod pripada stampariji, a ne zaposlenom koji ga je uneo, pa sve kolege vide i uredjuju isti katalog
    institution_id = '';
    added_by = '';

    print_services: PrintService[] = [];

    // Server ih broji iz sacuvanih reakcija, ne stizu kao polje
    likes = 0;
    dislikes = 0;

    // Pet najnovijih komentara svih klijenata
    comments: Comment[] = [];

    // Server ih dovlaci sa stamparije koja nudi proizvod
    printer_name = '';
    printer_city = '';
    printer_address = '';
}
