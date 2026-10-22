import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
test('production PWA precaches app, launches offline and activates an updated shell',async({page,context})=>{
 await page.goto('/my-home-finance/');
 await expect(page.locator('.bc-hero h1')).toBeVisible();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await page.reload();
 const info=await page.evaluate(async()=>{const manifest=await fetch('/my-home-finance/manifest.webmanifest').then(r=>r.json());const names=await caches.keys();const cache=await caches.open(names.find(n=>n.startsWith('my-home-finance-blueprint-c-'))!);return {manifest,keys:(await cache.keys()).map(r=>r.url),controller:!!navigator.serviceWorker.controller}});
 expect(info.controller).toBe(true);expect(info.manifest.display).toBe('standalone');expect(info.manifest.scope).toBe('/my-home-finance/');expect(info.keys.some(x=>x.endsWith('.js'))).toBe(true);expect(info.keys.some(x=>x.endsWith('.css'))).toBe(true);expect(info.keys.some(x=>x.endsWith('/heroes/home/home-01.webp'))).toBe(true);
 const original=readFileSync('dist/sw.js','utf8');
 try {
  // Exercise a real waiting-worker activation and version-cache replacement.
  writeFileSync('dist/sw.js',original.replace(/(const CACHE = '[^']+)';/,"$1-upgrade';"));
  await page.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;await reg.update()});
  await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);
  await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await new Promise<void>(resolve=>{navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true});reg!.waiting!.postMessage({type:'ACTIVATE_UPDATE'})})});
  await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).filter(n=>n.startsWith('my-home-finance-')))).toEqual([expect.stringContaining('-upgrade')]);
  await context.setOffline(true);await page.reload();expect(await page.evaluate(async()=> (await fetch('/my-home-finance/assets/heroes/home/home-01.webp')).ok)).toBe(true);await expect(page.locator('.bc-hero h1')).toBeVisible();
  await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Spending',exact:true}).click();await expect(page.getByRole('heading',{name:'Spending',exact:true})).toBeVisible();
 } finally {writeFileSync('dist/sw.js',original);await context.setOffline(false)}
});

test('RC2 local hero video and ambient music reload from IndexedDB while offline',async({page,context})=>{
 await page.goto('/my-home-finance/');
 await expect(page.locator('.bc-hero h1')).toBeVisible();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByLabel('Home hero image or video',{exact:true}).setInputFiles('tests/fixtures/rc2-hero.webm');
 await expect(page.locator('.bc-media-settings').getByText('rc2-hero.webm',{exact:true})).toBeVisible();
 await page.getByLabel('Local MP3',{exact:true}).setInputFiles('tests/fixtures/rc2-ambient.mp3');
 await expect(page.locator('.bc-media-settings').getByText('rc2-ambient.mp3',{exact:true})).toBeVisible();
 await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Home',exact:true}).click();
 await expect.poll(()=>page.locator('.bc-hero video').evaluate((v:HTMLVideoElement)=>v.readyState>=2&&v.muted)).toBe(true);
 await context.setOffline(true);
 try {
  await page.reload();
  await expect(page.locator('.bc-hero h1')).toBeVisible();
  await expect(page.locator('.bc-hero video')).toHaveAttribute('src',/^blob:/);
  await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);
  await expect.poll(()=>page.locator('.bc-hero video').evaluate((v:HTMLVideoElement)=>v.readyState>=2&&v.muted)).toBe(true);
  await page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Spending',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Spending',exact:true})).toBeVisible();
 } finally {await context.setOffline(false)}
});
