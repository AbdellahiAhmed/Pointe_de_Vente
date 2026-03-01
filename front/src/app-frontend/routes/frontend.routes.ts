/**
 * open routes
 */
const staticRoute = (route: string) => route;

export const LOGIN = staticRoute('/');
export const SETUP = staticRoute('/setup');
export const FORGOT_PASSWORD = staticRoute('/forgot-password');
export const RESET_PASSWORD = staticRoute('/reset-password/*');

export const POS = staticRoute('/pos');
export const DASHBOARD = staticRoute('/pos/dashboard');
export const DEBT_MANAGEMENT = staticRoute('/pos/debts');
export const STOCK_ALERTS_PAGE = staticRoute('/pos/stock-alerts');
