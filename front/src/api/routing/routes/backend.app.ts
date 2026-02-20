import { url } from '../url';

export const scopeUrl = (path: string) => url(path);

export const LOGIN = scopeUrl('/auth/login_check');
export const LOGOUT = scopeUrl('/auth/logout');
export const AUTH_INFO = scopeUrl('/auth/info');
export const FORGOT_PASSWORD = scopeUrl('/auth/forgot-password');
export const RESET_PASSWORD = scopeUrl('/auth/reset-password');
export const UPDATE_LOCALE = scopeUrl('/locale');

export const AUTH_LOGOUT = scopeUrl('/auth/logout');

export const PRODUCT_LIST = scopeUrl('/products');
export const PRODUCT_KEYWORDS = scopeUrl('/admin/product/keywords');
export const PRODUCT_QUANTITIES = scopeUrl('/admin/product/quantities');
export const PRODUCT_CREATE = scopeUrl('/products');
export const PRODUCT_GET = scopeUrl('/products/:id');
export const PRODUCT_UPLOAD = scopeUrl('/products/import');
export const PRODUCT_DOWNLOAD = scopeUrl('/admin/product/export');
export const PRODUCT_VARIANT = scopeUrl('/product_variants');
export const PRODUCT_VARIANT_GET = scopeUrl('/product_variants/:id');

export const BARCODE_LIST = scopeUrl('/barcodes');
export const BARCODE_CREATE = scopeUrl('/barcodes');
export const BARCODE_GET = scopeUrl('/barcodes/:id');

export const ORDERS_LIST = scopeUrl('/orders');
export const ORDER_LIST = scopeUrl('/admin/order/list');
export const ORDER_CREATE = scopeUrl('/admin/order/create');
export const ORDER_GET = scopeUrl('/admin/order/:id');
export const ORDER_EDIT = scopeUrl('/admin/order/edit/:id');
export const ORDER_DISPATCH = scopeUrl('/admin/order/dispatch/:id');
export const ORDER_RESTORE = scopeUrl('/admin/order/restore/:id');
export const ORDER_REFUND = scopeUrl('/admin/order/refund/:id');

export const ORDER_PRODUCTS_LIST = scopeUrl('/order_products/');

export const DISCOUNT_LIST = scopeUrl('/discounts');
export const DISCOUNT_CREATE = scopeUrl('/discounts');
export const DISCOUNT_GET = scopeUrl('/discounts/:id');

export const TAX_LIST = scopeUrl('/taxes');
export const TAX_CREATE = scopeUrl('/taxes');
export const TAX_GET = scopeUrl('/taxes/:id');

export const PAYMENT_TYPE_LIST = scopeUrl('/payments');
export const PAYMENT_TYPE_CREATE = scopeUrl('/payments');
export const PAYMENT_TYPE_GET = scopeUrl('/payments/:id');

export const CUSTOMER_LIST = scopeUrl('/customers');
export const CUSTOMER_CREATE = scopeUrl('/customers');
export const CUSTOMER_EDIT = scopeUrl('/customers/:id');

export const CUSTOMER_PAYMENT_CREATE = scopeUrl('/customer_payments');

export const CATEGORY_LIST = scopeUrl('/categories');
export const CATEGORY_CREATE = scopeUrl('/categories');
export const CATEGORY_GET = scopeUrl('/categories/:id');

export const DEVICE_LIST = scopeUrl('/devices');
export const DEVICE_CREATE = scopeUrl('/devices');

export const EXPENSE_LIST = scopeUrl('/admin/expense/list');
export const EXPENSE_CREATE = scopeUrl('/admin/expense/create');

export const SUPPLIER_LIST = scopeUrl('/suppliers');
export const SUPPLIER_CREATE = scopeUrl('/suppliers');
export const SUPPLIER_EDIT = scopeUrl('/suppliers/:id');

export const SUPPLIER_PAYMENT_LIST = scopeUrl('/suppliers/:id/payments');
export const SUPPLIER_PURCHASE_LIST = scopeUrl('/suppliers/:id/purchases');
export const SUPPLIER_PURCHASE_ORDER_LIST = scopeUrl('/suppliers/:id/purchase_orders');

export const SUPPLIER_PAYMENT_CREATE = scopeUrl('/supplier_payments');

export const BRAND_LIST = scopeUrl('/brands');
export const BRAND_CREATE = scopeUrl('/brands');
export const BRAND_EDIT = scopeUrl('/brands/:id');

export const PURCHASE_LIST = scopeUrl('/purchases');
export const PURCHASE_CREATE = scopeUrl('/purchases');
export const PURCHASE_EDIT = scopeUrl('/purchases/:id');
export const PURCHASE_DELETE = scopeUrl('/purchases/:id');

export const PURCHASE_ITEM_LIST = scopeUrl('/purchase_items');
export const PURCHASE_ITEM_CREATE = scopeUrl('/purchase_items');
export const PURCHASE_ITEM_EDIT = scopeUrl('/purchase_items/:id');
export const PURCHASE_ITEM_DELETE = scopeUrl('/purchase_items/:id');

export const PURCHASE_ORDER_LIST = scopeUrl('/purchase_orders');
export const PURCHASE_ORDER_CREATE = scopeUrl('/purchase_orders');
export const PURCHASE_ORDER_EDIT = scopeUrl('/purchase_orders/:id');
export const PURCHASE_ORDER_DELETE = scopeUrl('/purchase_orders/:id');

export const PURCHASE_ORDER_ITEM_LIST = scopeUrl('/purchase_order_items');
export const PURCHASE_ORDER_ITEM_CREATE = scopeUrl('/purchase_order_items');
export const PURCHASE_ORDER_ITEM_EDIT = scopeUrl('/purchase_order_items/:id');
export const PURCHASE_ORDER_ITEM_DELETE = scopeUrl('/purchase_order_items/:id');

export const STORE_LIST = scopeUrl('/stores');
export const STORE_CREATE = scopeUrl('/stores');
export const STORE_EDIT = scopeUrl('/stores/:id');

export const USER_LIST = scopeUrl('/users');
export const USER_GET = scopeUrl('/users/:id');
export const USER_CREATE = scopeUrl('/admin/user/create');
export const USER_EDIT = scopeUrl('/admin/user/:id');

export const CLOSING_EDIT = scopeUrl('/admin/closing/:id');
export const CLOSING_OPENED = scopeUrl('/admin/closing/opened');

export const DEPARTMENT_LIST = scopeUrl('/departments');
export const DEPARTMENT_CREATE = scopeUrl('/departments');
export const DEPARTMENT_GET = scopeUrl('/departments/:id');

export const SETTING_LIST = scopeUrl('/settings');
export const SETTING_GET = scopeUrl('/settings/:id');
export const SETTING_CREATE = scopeUrl('/settings');

export const TERMINAL_LIST = scopeUrl('/terminals');
export const TERMINAL_GET = scopeUrl('/terminals/:id');
export const TERMINAL_CREATE = scopeUrl('/admin/terminal/create');
export const TERMINAL_EDIT = scopeUrl('/admin/terminal/:id');

export const REPORT_SALES = scopeUrl('/admin/report/sales');
export const REPORT_PROFIT = scopeUrl('/admin/report/profit');
export const REPORT_DAILY = scopeUrl('/admin/report/daily');

export const STOCK_ALERTS = scopeUrl('/admin/stock/alerts');

export const CLOSING_CLOSE = scopeUrl('/admin/closing/:id/close');
export const CLOSING_ZREPORT_DATA = scopeUrl('/admin/closing/:id/z-report-data');
export const CLOSING_LIST = scopeUrl('/admin/closing/list');
export const REPORT_VENDOR = scopeUrl('/admin/report/vendor');
export const REPORT_CATEGORY = scopeUrl('/admin/report/category');

export const MEDIA_UPLOAD = scopeUrl('/admin/media/upload');
export const MEDIA_CONTENT = scopeUrl('/media/:id/content');

export const RETURN_REQUEST_LIST = scopeUrl('/admin/return-requests');
export const RETURN_REQUEST_CREATE = scopeUrl('/admin/return-requests');
export const RETURN_REQUEST_GET = scopeUrl('/admin/return-requests/:id');
export const RETURN_REQUEST_APPROVE = scopeUrl('/admin/return-requests/:id/approve');
export const RETURN_REQUEST_REJECT = scopeUrl('/admin/return-requests/:id/reject');
