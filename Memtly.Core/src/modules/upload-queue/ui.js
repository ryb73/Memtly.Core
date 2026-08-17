import './upload-queue.css';
import { listQueuedUploads, removeQueuedUpload, onQueueChanged } from '@modules/upload-queue';

async function renderBadge() {
    const badge = document.getElementById('upload-queue-badge');
    if (!badge) return;

    const galleryId = badge.getAttribute('data-gallery-id');
    const items = await listQueuedUploads(galleryId);

    const countEl = badge.querySelector('.upload-queue-count');
    const listEl = badge.querySelector('.upload-queue-list');

    if (!items.length) {
        badge.classList.add('d-none');
        if (listEl) listEl.innerHTML = '';
        return;
    }

    badge.classList.remove('d-none');
    if (countEl) countEl.textContent = items.length;

    if (listEl) {
        listEl.innerHTML = items.map((item) => `
            <div class="upload-queue-item" data-id="${item.id}">
                <span class="upload-queue-item-name">${item.fileName}</span>
                ${item.status === 'failed' ? '<span class="upload-queue-item-status text-danger">Needs attention</span>' : ''}
                <button type="button" class="upload-queue-item-remove" data-id="${item.id}" aria-label="Remove">&times;</button>
            </div>
        `).join('');
    }
}

export function initUploadQueueUi() {
    const badge = document.getElementById('upload-queue-badge');
    if (!badge) return;

    badge.querySelector('.upload-queue-toggle')?.addEventListener('click', () => {
        badge.querySelector('.upload-queue-list')?.classList.toggle('d-none');
    });

    badge.addEventListener('click', async (event) => {
        const removeBtn = event.target.closest('.upload-queue-item-remove');
        if (removeBtn) {
            await removeQueuedUpload(removeBtn.getAttribute('data-id'));
        }
    });

    onQueueChanged(renderBadge);
    renderBadge();
}
