import { Routes } from '@angular/router';
import { Home } from './components/public/home';
import { Register } from './components/public/register';
import { AdminLogin } from './components/public/admin-login';
import { ProductDetails } from './components/public/product-details';
import { ClientHome } from './components/client/client-home';
import { ClientProfile } from './components/client/client-profile';
import { ClientSearch } from './components/client/client-search';
import { ClientProduct } from './components/client/client-product';
import { ClientPrepare } from './components/client/client-prepare';
import { ClientCart } from './components/client/client-cart';
import { ClientProcurements } from './components/client/client-procurements';
import { ClientRequestSearch } from './components/client/client-request-search';
import { ClientRequestDetails } from './components/client/client-request-details';
import { ClientArchive } from './components/client/client-archive';
import { PrinterHome } from './components/printer/printer-home';
import { PrinterProfile } from './components/printer/printer-profile';
import { PrinterProducts } from './components/printer/printer-products';
import { PrinterStock } from './components/printer/printer-stock';
import { PrinterOrders } from './components/printer/printer-orders';
import { PrinterBids } from './components/printer/printer-bids';
import { AdminHome } from './components/admin/admin-home';
import { AdminUsers } from './components/admin/admin-users';
import { AdminRequests } from './components/admin/admin-requests';
import { AdminCategories } from './components/admin/admin-categories';
import { AdminStatistics } from './components/admin/admin-statistics';
import { adminGuard, clientGuard, guestGuard, legalClientGuard, printerGuard } from './guards/role-guard';

export const routes: Routes = [
    // Javno vidljive stranice
    { path: '', component: Home },
    { path: 'product/:code', component: ProductDetails },

    // Stranice vidljive samo kada niko nije ulogovan
    { path: 'register', component: Register, canActivate: [guestGuard] },

    // Stranica za login administratora
    { path: 'admin-login', component: AdminLogin, canActivate: [guestGuard] },

    // Role protected
    { path: 'client', component: ClientHome, canActivate: [clientGuard] },
    { path: 'client/profile', component: ClientProfile, canActivate: [clientGuard] },
    { path: 'client/search', component: ClientSearch, canActivate: [clientGuard] },
    { path: 'client/product/:code', component: ClientProduct, canActivate: [clientGuard] },
    { path: 'client/prepare/:code', component: ClientPrepare, canActivate: [clientGuard] },
    { path: 'client/cart', component: ClientCart, canActivate: [clientGuard] },
    { path: 'client/archive', component: ClientArchive, canActivate: [clientGuard] },
    { path: 'client/request-search', component: ClientRequestSearch, canActivate: [legalClientGuard] },
    { path: 'client/request/:name', component: ClientRequestDetails, canActivate: [legalClientGuard] },

    // Procurement (Javna nabavka) samo za klijente koji su client_legal
    { path: 'client/procurements', component: ClientProcurements, canActivate: [legalClientGuard] },
    { path: 'printer', component: PrinterHome, canActivate: [printerGuard] },
    { path: 'printer/profile', component: PrinterProfile, canActivate: [printerGuard] },
    { path: 'printer/products', component: PrinterProducts, canActivate: [printerGuard] },
    { path: 'printer/stock', component: PrinterStock, canActivate: [printerGuard] },
    { path: 'printer/orders', component: PrinterOrders, canActivate: [printerGuard] },
    { path: 'printer/bids', component: PrinterBids, canActivate: [printerGuard] },
    { path: 'admin', component: AdminHome, canActivate: [adminGuard] },
    { path: 'admin/users', component: AdminUsers, canActivate: [adminGuard] },
    { path: 'admin/requests', component: AdminRequests, canActivate: [adminGuard] },
    { path: 'admin/categories', component: AdminCategories, canActivate: [adminGuard] },
    { path: 'admin/statistics', component: AdminStatistics, canActivate: [adminGuard] },

    // Bilo sta drugo, ide na home page
    { path: '**', redirectTo: '' }
];
