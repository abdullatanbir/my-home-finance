export type HeroPage =
    | 'Home'
    | 'Expense'
    | 'Income'
    | 'Savings'
    | 'More';

export type HeroTheme = 'light' | 'dark';
export type HeroTarget = 'main' | 'calendar';
export type HeroPositionX = 'left' | 'center' | 'right';
export type HeroPositionY = 'top' | 'center' | 'bottom';

export type HeroImage = {
    id: string;
    page: HeroPage;
    theme: HeroTheme;
    target?: HeroTarget;
    blob: Blob;
    created_at: string;
    position_x?: HeroPositionX;
    position_y?: HeroPositionY;
    presentation?: {
        mobile: HeroPresentation;
        desktop: HeroPresentation;
    };
};

export type HeroPresentation = { scale: number; position_x: number; position_y: number; fit?: boolean };
export const DEFAULT_HERO_PRESENTATION: HeroPresentation = { scale: 1, position_x: 50, position_y: 50, fit: false };
const MIN_HERO_SCALE = 0.65;
const MAX_HERO_SCALE = 2;

const DATABASE = 'mhf-hero-images-v1';
const STORE = 'images';
const MAX_IMAGES_PER_COLLECTION = 5;
const MAX_BYTES = 2 * 1024 * 1024;

/** Works in secure browsers and local/LAN HTTP previews where randomUUID is absent. */
function createHeroImageId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const bytes = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
        ? crypto.getRandomValues(new Uint32Array(3))
        : new Uint32Array([
            Math.floor(Math.random() * 0xffffffff),
            Math.floor(Math.random() * 0xffffffff),
            Math.floor(Math.random() * 0xffffffff)
        ]);
    return `mhf-hero-${Date.now().toString(36)}-${Array.from(bytes, value => value.toString(36)).join('-')}`;
}

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE, 1);
        request.onupgradeneeded = () => {
            const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
            store.createIndex('page_theme', ['page', 'theme']);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function all(): Promise<HeroImage[]> {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        request.onsuccess = () => resolve(request.result as HeroImage[]);
        request.onerror = () => reject(request.error);
    });
}

export async function listHeroImages(page: HeroPage, theme: HeroTheme, target: HeroTarget = 'main') {
    return (await all()).filter(item => item.page === page && item.theme === theme && (item.target || 'main') === target);
}

export async function addHeroImage(page: HeroPage, theme: HeroTheme, file: File, target: HeroTarget = 'main') {
    if (!file.type.startsWith('image/') || file.size > MAX_BYTES) {
        throw new Error('Choose an image up to 2 MB.');
    }
    const existing = await listHeroImages(page, theme, target);
    if (existing.length >= MAX_IMAGES_PER_COLLECTION) {
        throw new Error('A page/theme collection can contain up to 5 images.');
    }
    const database = await openDatabase();
    const image: HeroImage = {
        id: createHeroImageId(), page, theme, target, blob: file, created_at: new Date().toISOString()
    };
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore(STORE).put(image);
    });
}

export async function removeHeroImage(id: string) {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore(STORE).delete(id);
    });
}

export async function updateHeroImagePosition(
    id: string,
    position_x: HeroPositionX,
    position_y: HeroPositionY
) {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        const request = store.get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const image = request.result as HeroImage | undefined;
            if (!image) {
                reject(new Error('The selected hero image no longer exists.'));
                return;
            }
            store.put({ ...image, position_x, position_y });
        };
    });
}

export async function updateHeroImagePresentation(
    id: string,
    mode: 'mobile' | 'desktop',
    presentation: HeroPresentation
) {
    const safe: HeroPresentation = {
        scale: Math.min(MAX_HERO_SCALE, Math.max(MIN_HERO_SCALE, Number(presentation.scale) || 1)),
        position_x: Math.min(100, Math.max(0, Number(presentation.position_x) || 50)),
        position_y: Math.min(100, Math.max(0, Number(presentation.position_y) || 50)),
        fit: presentation.fit === true
    };
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        const request = store.get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const image = request.result as HeroImage | undefined;
            if (!image) { reject(new Error('The selected hero image no longer exists.')); return; }
            const legacy: HeroPresentation = {
                scale: 1,
                position_x: image.position_x === 'left' ? 0 : image.position_x === 'right' ? 100 : 50,
                position_y: image.position_y === 'top' ? 0 : image.position_y === 'bottom' ? 100 : 50
            };
            store.put({ ...image, presentation: { mobile: image.presentation?.mobile || legacy, desktop: image.presentation?.desktop || legacy, [mode]: safe } });
        };
    });
}

export async function clearHeroImageCollection(page: HeroPage, theme: HeroTheme, target: HeroTarget = 'main') {
    const images = await listHeroImages(page, theme, target);
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        images.forEach(image => transaction.objectStore(STORE).delete(image.id));
    });
}

export async function clearAllHeroImages() {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore(STORE).clear();
    });
}

export { MAX_IMAGES_PER_COLLECTION };
