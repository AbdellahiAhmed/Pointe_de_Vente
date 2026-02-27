/**
 * open routes
 */
const staticRoute = (route: string) => route;

export const LOGIN = staticRoute('/');
export const SETUP = staticRoute('/setup');
export const FORGOT_PASSWORD = staticRoute('/forgot-password');

/**
 * protected routes
 */
export const DASHBOARD = staticRoute('/dashboard');

export const USERS = staticRoute('/users');
export const USERS_CREATE = staticRoute('/users/create');
export const USERS_EDIT = staticRoute('/users/edit/:id');

export const PROFILE = staticRoute('/profile');

export const REPORTS = staticRoute('/reports');
export const REPORTS_SALES = staticRoute('/reports/sales');
export const REPORTS_PROFIT = staticRoute('/reports/profit');
export const REPORTS_DAILY = staticRoute('/reports/daily');
export const REPORTS_VENDOR = staticRoute('/reports/vendor');
export const REPORTS_CATEGORY = staticRoute('/reports/category');
export const Z_REPORTS = staticRoute('/reports/z-reports');

export const INVENTORY_ALERTS = staticRoute('/inventory/alerts');

export const RETURN_REQUESTS = staticRoute('/returns');
export const CUSTOMERS_REPORT = staticRoute('/customers');

export const BANK_JOURNAL = staticRoute('/bank-journal');

export const SYSTEM_HEALTH = staticRoute('/system/health');
