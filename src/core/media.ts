function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const r = indexedDB.open('mhf-blueprint-c-media', 1); r.onupgradeneeded = () => r.result.createObjectStore('media'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
export async function getMedia(key: string): Promise<Blob | undefined> { const db = await database(); return new Promise((resolve, reject) => { const tx = db.transaction('media'); const r = tx.objectStore('media').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); tx.oncomplete = () => db.close(); }); }
export async function setMedia(key: string, blob?: Blob) { const db = await database(); return new Promise<void>((resolve, reject) => { const tx = db.transaction('media', 'readwrite'); if (blob)
    tx.objectStore('media').put(blob, key);
else
    tx.objectStore('media').delete(key); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }); }
