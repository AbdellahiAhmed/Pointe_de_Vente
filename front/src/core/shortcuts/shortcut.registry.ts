/**
 * Central registry for all keyboard shortcuts.
 * Each action has a unique ID, default key combo, and category.
 */

export interface ShortcutAction {
  id: string;
  defaultKey: string;
  category: 'pos' | 'cart' | 'sale' | 'panels';
  labelKey: string; // i18n key
}

export const SHORTCUT_ACTIONS: Record<string, ShortcutAction> = {
  // POS Actions
  CHANGE_QUANTITY: { id: 'change_quantity', defaultKey: 'f1', category: 'pos', labelKey: 'Change quantity' },
  CHANGE_PRICE: { id: 'change_price', defaultKey: 'f2', category: 'pos', labelKey: 'Change price' },
  FOCUS_SEARCH: { id: 'focus_search', defaultKey: 'f3', category: 'pos', labelKey: 'Focus search' },
  RETURN_REQUEST: { id: 'return_request', defaultKey: 'f8', category: 'pos', labelKey: 'Return request' },
  TRIGGER_PAY: { id: 'trigger_pay', defaultKey: 'f12', category: 'pos', labelKey: 'Trigger payment' },
  REMOVE_ITEM: { id: 'remove_item', defaultKey: 'del', category: 'pos', labelKey: 'Remove item' },
  CLOSE_MODAL: { id: 'close_modal', defaultKey: 'escape', category: 'pos', labelKey: 'Close/Escape' },

  // Cart Navigation
  CART_UP: { id: 'cart_up', defaultKey: 'ctrl+up', category: 'cart', labelKey: 'Cart: move up' },
  CART_DOWN: { id: 'cart_down', defaultKey: 'ctrl+down', category: 'cart', labelKey: 'Cart: move down' },
  CART_LEFT: { id: 'cart_left', defaultKey: 'ctrl+left', category: 'cart', labelKey: 'Cart: toggle type left' },
  CART_RIGHT: { id: 'cart_right', defaultKey: 'ctrl+right', category: 'cart', labelKey: 'Cart: toggle type right' },
  COPY_LAST_ITEM: { id: 'copy_last_item', defaultKey: 'ctrl+shift+down', category: 'cart', labelKey: 'Copy last cart item' },

  // Sale / Payment
  FOCUS_PAYMENT: { id: 'focus_payment', defaultKey: 'ctrl+enter', category: 'sale', labelKey: 'Focus payment field' },
  SETTLE_ORDER: { id: 'settle_order', defaultKey: 'ctrl+s', category: 'sale', labelKey: 'Settle order' },
  CANCEL_ORDER: { id: 'cancel_order', defaultKey: 'ctrl+x', category: 'sale', labelKey: 'Clear/Cancel order' },

  // Panels
  OPEN_SEARCH: { id: 'open_search', defaultKey: 'ctrl+f', category: 'panels', labelKey: 'Open search' },
  OPEN_EXPENSES: { id: 'open_expenses', defaultKey: 'ctrl+e', category: 'panels', labelKey: 'Open expenses' },
  OPEN_HISTORY: { id: 'open_history', defaultKey: 'ctrl+h', category: 'panels', labelKey: 'Open history' },
  OPEN_TAXES: { id: 'open_taxes', defaultKey: 'ctrl+shift+q', category: 'panels', labelKey: 'Open taxes' },
  OPEN_DISCOUNT: { id: 'open_discount', defaultKey: 'ctrl+shift+d', category: 'panels', labelKey: 'Open discount' },
  OPEN_CUSTOMERS: { id: 'open_customers', defaultKey: 'ctrl+shift+c', category: 'panels', labelKey: 'Open customers' },
  OPEN_HELP: { id: 'open_help', defaultKey: '?', category: 'panels', labelKey: 'Open help' },
  SEARCH_PAYMENT: { id: 'search_payment', defaultKey: '/', category: 'sale', labelKey: 'Focus search (payment mode)' },
};

export const SHORTCUT_CATEGORIES: Record<string, string> = {
  pos: 'POS Actions',
  cart: 'Cart Navigation',
  sale: 'Sale & Payment',
  panels: 'Panels & Modals',
};

export function getActionById(actionId: string): ShortcutAction | undefined {
  return Object.values(SHORTCUT_ACTIONS).find(a => a.id === actionId);
}

export function getActionsByCategory(category: string): ShortcutAction[] {
  return Object.values(SHORTCUT_ACTIONS).filter(a => a.category === category);
}

export function getAllDefaults(): Record<string, string> {
  const defaults: Record<string, string> = {};
  Object.values(SHORTCUT_ACTIONS).forEach(a => {
    defaults[a.id] = a.defaultKey;
  });
  return defaults;
}
