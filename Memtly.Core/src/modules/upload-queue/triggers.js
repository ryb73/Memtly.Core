import { flushQueue } from '@modules/upload-queue/flush';
import { refreshGalleryPage } from '@pages/gallery/gallery';

let flushing = false;

async function tryFlush() {
    if (!navigator.onLine || flushing) return;

    flushing = true;
    try {
        const result = await flushQueue();
        if (result.flushed > 0) {
            refreshGalleryPage();
        }
    } catch (error) {
        console.warn('Failed to flush offline upload queue', error);
    } finally {
        flushing = false;
    }
}

export function initUploadQueueTriggers() {
    window.addEventListener('online', tryFlush);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            tryFlush();
        }
    });

    tryFlush();
}
