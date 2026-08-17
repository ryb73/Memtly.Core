import { listQueuedUploads, removeQueuedUpload, updateQueuedUploadStatus } from '@modules/upload-queue';

const LOCK_NAME = 'memtly-upload-queue-flush';

function groupByGallerySession(items) {
    const groups = new Map();

    items.forEach((item) => {
        const key = `${item.galleryId}|${item.collectionId}|${item.secretKey}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(item);
    });

    return [...groups.values()];
}

async function uploadQueuedItem(item) {
    const formData = new FormData();
    formData.append('CollectionId', item.collectionId ?? '');
    formData.append('GalleryId', item.galleryId ?? '');
    formData.append('SecretKey', item.secretKey ?? '');
    formData.append(item.fileName, item.fileBlob, item.fileName);

    const response = await fetch(item.uploadUrl, {
        method: 'POST',
        body: formData
    });

    return response.json();
}

async function notifyUploadCompleted({ galleryId, collectionId, secretKey }, count) {
    const formData = new FormData();
    formData.append('CollectionId', collectionId ?? '');
    formData.append('GalleryId', galleryId ?? '');
    formData.append('SecretKey', secretKey ?? '');
    formData.append('Count', count);

    const response = await fetch('/Gallery/UploadCompleted', {
        method: 'POST',
        body: formData
    });

    return response.json();
}

async function flushGroup(items) {
    const summary = { flushed: 0, failed: 0 };
    const { galleryId, collectionId, secretKey } = items[0];

    for (const item of items) {
        try {
            const result = await uploadQueuedItem(item);
            if (result?.success) {
                await removeQueuedUpload(item.id);
                summary.flushed++;
            } else {
                summary.failed++;
                await updateQueuedUploadStatus(item.id, 'failed', result?.errors?.[0] ?? 'Upload failed');
            }
        } catch (error) {
            summary.failed++;
            await updateQueuedUploadStatus(item.id, 'failed', String(error));
        }
    }

    if (summary.flushed > 0) {
        try {
            await notifyUploadCompleted({ galleryId, collectionId, secretKey }, summary.flushed);
        } catch (error) {
            console.warn('Failed to notify upload completion for queued uploads', error);
        }
    }

    return summary;
}

async function runFlush() {
    const items = await listQueuedUploads();
    if (!items.length) {
        return { flushed: 0, failed: 0 };
    }

    const groups = groupByGallerySession(items);
    const totals = { flushed: 0, failed: 0 };

    for (const group of groups) {
        const result = await flushGroup(group);
        totals.flushed += result.flushed;
        totals.failed += result.failed;
    }

    return totals;
}

export async function flushQueue() {
    if ('locks' in navigator) {
        return navigator.locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
            if (!lock) {
                return { flushed: 0, failed: 0 };
            }
            return runFlush();
        });
    }

    return runFlush();
}
