/**
 * Offline Order Queue — stores orders in IndexedDB when offline,
 * syncs them when connectivity is restored.
 */

const DB_NAME = 'pos-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-orders';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface QueuedOrder {
  id?: number;
  payload: any; // The order creation payload
  createdAt: string;
}

/** Add an order to the offline queue */
export async function enqueueOrder(payload: any): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      payload,
      createdAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all pending orders */
export async function getPendingOrders(): Promise<QueuedOrder[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Get count of pending orders */
export async function getPendingCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Remove a synced order from the queue */
export async function removeOrder(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Sync all pending orders — call this when online */
export async function syncPendingOrders(
  submitOrder: (payload: any) => Promise<boolean>
): Promise<{ synced: number; failed: number }> {
  const orders = await getPendingOrders();
  let synced = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      const ok = await submitOrder(order.payload);
      if (ok && order.id) {
        await removeOrder(order.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

/** Hook into online/offline events for auto-sync */
export function setupAutoSync(
  submitOrder: (payload: any) => Promise<boolean>,
  onSyncComplete?: (result: { synced: number; failed: number }) => void,
): () => void {
  const handler = async () => {
    if (!navigator.onLine) return;
    const count = await getPendingCount();
    if (count === 0) return;
    const result = await syncPendingOrders(submitOrder);
    onSyncComplete?.(result);
  };

  window.addEventListener('online', handler);
  // Also try on page visibility change (user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      handler();
    }
  });

  return () => {
    window.removeEventListener('online', handler);
  };
}
