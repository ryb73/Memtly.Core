const DB_NAME = 'memtly-upload-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-uploads';
const CHANNEL_NAME = 'memtly-upload-queue';

let dbPromise = null;
let broadcastChannel = null;

function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

async function withStore(mode, callback) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const result = callback(store);

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
    });
}

function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getBroadcastChannel() {
    if (broadcastChannel === null && typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
    return broadcastChannel;
}

function notifyQueueChanged() {
    const channel = getBroadcastChannel();
    if (channel) {
        channel.postMessage({ type: 'queue-changed' });
    }

    if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('memtly:queue-changed'));
    }
}

export function onQueueChanged(callback) {
    const channel = getBroadcastChannel();
    if (channel) {
        channel.addEventListener('message', (event) => {
            if (event.data?.type === 'queue-changed') {
                callback();
            }
        });
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('memtly:queue-changed', callback);
    }
}

export async function enqueueUpload({ galleryId, collectionId, secretKey, uploadUrl, fileName, fileType, fileBlob, uploaderName, uploaderEmail }) {
    const item = {
        id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        galleryId,
        collectionId,
        secretKey,
        uploadUrl,
        fileName,
        fileType,
        fileBlob,
        uploaderName,
        uploaderEmail,
        queuedAt: Date.now(),
        status: 'queued',
        lastError: null,
        attempts: 0
    };

    await withStore('readwrite', (store) => store.put(item));
    notifyQueueChanged();

    return item;
}

export async function listQueuedUploads(galleryId) {
    const items = await withStore('readonly', (store) => requestToPromise(store.getAll()));
    if (galleryId === undefined || galleryId === null) return items;

    return items.filter((item) => String(item.galleryId) === String(galleryId));
}

export async function removeQueuedUpload(id) {
    await withStore('readwrite', (store) => store.delete(id));
    notifyQueueChanged();
}

export async function updateQueuedUploadStatus(id, status, error) {
    await withStore('readwrite', (store) => {
        const request = store.get(id);
        request.onsuccess = () => {
            const item = request.result;
            if (!item) return;

            item.status = status;
            item.lastError = error ?? null;
            item.attempts = (item.attempts ?? 0) + (status === 'failed' ? 1 : 0);
            store.put(item);
        };
        return request;
    });
    notifyQueueChanged();
}

export async function countQueuedUploads(galleryId) {
    const items = await listQueuedUploads(galleryId);
    return items.length;
}
