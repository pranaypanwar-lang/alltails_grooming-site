const DB_NAME = "alltails_groomer_queue";
const DB_VERSION = 1;
const STORE_NAME = "pending_items";

export type OfflineQueueItemType = "upload" | "action";

export type OfflineQueueItem = {
  id: string;
  type: OfflineQueueItemType;
  bookingId: string;
  stepKey: string;
  // For uploads: serialised as base64 data URL. For actions: JSON payload string.
  payload: string;
  mimeType?: string;
  fileName?: string;
  createdAt: number;
  retryCount: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function dataUrlToFile(
  dataUrl: string,
  fileName: string,
  mimeType: string
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: mimeType });
}

export async function enqueueUpload(
  bookingId: string,
  stepKey: string,
  file: File
): Promise<string> {
  const db = await openDb();
  const dataUrl = await fileToDataUrl(file);
  const item: OfflineQueueItem = {
    id: generateId(),
    type: "upload",
    bookingId,
    stepKey,
    payload: dataUrl,
    mimeType: file.type,
    fileName: file.name,
    createdAt: Date.now(),
    retryCount: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).add(item);
    req.onsuccess = () => resolve(item.id);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueAction(
  bookingId: string,
  stepKey: string,
  payload: Record<string, unknown>
): Promise<string> {
  const db = await openDb();
  const item: OfflineQueueItem = {
    id: generateId(),
    type: "action",
    bookingId,
    stepKey,
    payload: JSON.stringify(payload),
    createdAt: Date.now(),
    retryCount: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).add(item);
    req.onsuccess = () => resolve(item.id);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPending(): Promise<OfflineQueueItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as OfflineQueueItem[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeItem(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as OfflineQueueItem | undefined;
      if (!item) { resolve(); return; }
      item.retryCount += 1;
      const putReq = store.put(item);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
