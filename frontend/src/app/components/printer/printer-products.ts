import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderPrinter } from '../headers/header-printer';
import { AppFooter } from '../headers/app-footer';
import { ProductService } from '../../services/product-service';
import { CategoryService } from '../../services/category-service';
import { AuthService } from '../../services/auth-service';
import { Product } from '../../models/product';
import { PrintService } from '../../models/print-service';
import { Category } from '../../models/category';
import { UPLOADS_URL } from '../../constants/validation';

// Katalog stamparije: sta nudi i koje vrste stampe idu na koji proizvod
// Sve se deli sa svim kolegama u stampariji
@Component({
  selector: 'app-printer-products',
  imports: [FormsModule, HeaderPrinter, AppFooter],
  templateUrl: './printer-products.html'
})
export class PrinterProducts implements OnInit {

  products: Product[] = [];
  categories: Category[] = [];
  loaded = false;

  // Proizvod koji se unosi; boje se kucaju u jednom redu, server ih razdvaja
  newProduct: Product = new Product();
  colors = '';
  private selectedFile: File | null = null;

  // Usluga stampe koja se dodaje i proizvod na koji ide
  servicesFor = '';
  newService: PrintService = new PrintService();

  uploadsUrl = UPLOADS_URL;
  message = '';
  isError = true;

  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private auth = inject(AuthService);

  ngOnInit() {
    this.categoryService.getAll().subscribe({
      next: (categories) => this.categories = categories,
      error: () => this.categories = []
    });
    this.load();
  }

  // Potkategorije kategorije izabrane u formi
  get subcategories() {
    return this.categories.find((one) => one.name === this.newProduct.category)?.subcategories ?? [];
  }

  onCategoryChanged() {
    this.newProduct.subcategory = '';      // stara pripada drugoj kategoriji
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  addProduct() {
    const problem = this.checkProduct();
    if (problem) {
      return this.fail(problem);
    }

    this.productService.add(this.newProduct, this.auth.username, this.colors).subscribe({
      next: (result) => {
        const code = this.newProduct.code;
        if (this.selectedFile) {
          this.uploadPicture(code, result.message);
        } else {
          this.finishAdding(result.message);
        }
      },
      error: (err) => this.fail(err.error?.message ?? 'The product could not be added.')
    });
  }

  // -------------------------------usluge stampanja------------------------------

  openServices(product: Product) {
    this.servicesFor = this.servicesFor === product.code ? '' : product.code;
    this.newService = new PrintService();
    this.message = '';
  }

  addService(product: Product) {
    if (!this.newService.print_type.trim()) {
      return this.fail('Name the type of print.');
    }

    this.productService.addService(product.code, this.newService).subscribe({
      next: (result) => {
        this.newService = new PrintService();
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The type of print could not be added.')
    });
  }

  removeService(product: Product, serviceId: string) {
    this.productService.removeService(product.code, serviceId).subscribe({
      next: (result) => {
        this.succeed(result.message);
        this.load();
      },
      error: (err) => this.fail(err.error?.message ?? 'The type of print could not be removed.')
    });
  }

  // ----------------------------------------------------------------------------

  // Slanje u dva koraka: prvo se cuva fajl, pa se ime upisuje na novi proizvod
  private uploadPicture(code: string, addedMessage: string) {
    this.productService.uploadImage(this.selectedFile!).subscribe({
      next: (uploaded) => {
        this.productService.setImage(code, uploaded.filename!).subscribe({
          next: () => this.finishAdding(addedMessage),
          error: () => this.finishAdding(addedMessage + ' The picture could not be attached.')
        });
      },
      error: (err) => this.finishAdding(addedMessage + ' ' + (err.error?.message ?? 'The picture was refused.'))
    });
  }

  private finishAdding(text: string) {
    this.newProduct = new Product();
    this.colors = '';
    this.selectedFile = null;
    this.succeed(text);
    this.load();
  }

  private checkProduct(): string | null {
    const product = this.newProduct;

    if (!product.code.trim() || !product.name.trim() || !product.category) {
      return 'Code, name and category are required.';
    }
    if (!(product.unit_price > 0)) {
      return 'Unit price must be a number greater than zero.';
    }
    if (!Number.isInteger(product.stock_quantity) || product.stock_quantity < 0) {
      return 'Quantity on stock must be a whole number, zero or more.';
    }
    return null;
  }

  private load() {
    this.productService.getForPrinter(this.auth.username).subscribe({
      next: (products) => {
        this.products = products;
        this.loaded = true;
      },
      error: () => {
        this.products = [];
        this.loaded = true;
      }
    });
  }

  private fail(text: string) {
    this.message = text;
    this.isError = true;
  }

  private succeed(text: string) {
    this.message = text;
    this.isError = false;
  }
}
