import { test, expect, type Page } from '@playwright/test';
const fixture='tests/fixtures/';
const home=(page:Page)=>page.getByRole('navigation',{name:'Primary'}).getByRole('button',{name:'Home',exact:true}).click();
const settings=(page:Page)=>page.getByRole('button',{name:'Settings',exact:true}).click();
test.beforeEach(async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-22T14:00:00Z'));
 await page.goto('/my-home-finance/');await expect(page.locator('.home01-hero')).toBeVisible();
});
test('empty Home has no default artwork or music and makes no audio play attempts',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).audioAttempts=0;const original=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){if(this instanceof HTMLAudioElement)(window as any).audioAttempts++;return original.call(this)};
 });
 await page.reload();await expect(page.locator('.home01-hero [role=status]')).toContainText('No music configured');
 await expect(page.getByRole('button',{name:'Play music'})).toBeDisabled();
 await expect(page.locator('.home01-hero img, .home01-hero video')).toHaveCount(0);
 expect(await page.locator('.bc-hero-visual').evaluate(e=>getComputedStyle(e).backgroundImage)).not.toContain('url(');
 expect(await page.evaluate(()=>(window as any).audioAttempts)).toBe(0);
});
test('local artwork and MP3 persist; replace/remove release old source; navigation never duplicates or resumes audio',async({page})=>{
 await settings(page);await page.getByLabel('Add artwork',{exact:true}).setInputFiles(fixture+'rc2-hero.png');
 await page.getByLabel('Add music',{exact:true}).setInputFiles(fixture+'rc2-ambient.mp3');
 await home(page);await page.reload();await expect(page.locator('.bc-hero img')).toHaveAttribute('src',/^blob:/);
 await expect(page.locator('audio')).toHaveAttribute('src',/^blob:/);await expect(page.locator('audio')).toHaveJSProperty('paused',true);
 const first=await page.locator('audio').getAttribute('src');
 await page.getByRole('button',{name:'Play music'}).focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:'Pause music'})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('audio')).toHaveJSProperty('paused',false);
 await page.getByRole('button',{name:'Pause music'}).click();await expect(page.locator('audio')).toHaveJSProperty('paused',true);
 await page.getByRole('button',{name:'Play music'}).click();await settings(page);await expect(page.locator('audio')).toHaveJSProperty('paused',true);
 await page.getByLabel('Change music',{exact:true}).setInputFiles({name:'replacement.mp3',mimeType:'audio/mpeg',buffer:await (await import('node:fs/promises')).readFile(fixture+'rc2-ambient.mp3')});
 await expect.poll(()=>page.locator('audio').getAttribute('src')).not.toBe(first);
 expect(await page.evaluate(async url=>{try{await fetch(url!);return false}catch{return true}},first)).toBe(true);
 await home(page);await expect(page.locator('audio')).toHaveJSProperty('paused',true);
 for(let i=0;i<3;i++){
  await page.getByRole('button',{name:'Play music'}).click();await expect(page.locator('audio')).toHaveCount(1);
  expect(await page.locator('audio,video').evaluateAll(els=>els.filter(e=>{const a=e as HTMLMediaElement;return !a.paused&&!a.muted}).length)).toBe(1);
  await settings(page);await expect(page.locator('audio')).toHaveJSProperty('paused',true);await home(page);
 }
 await settings(page);await page.getByRole('button',{name:'Remove music',exact:true}).click();
 await expect(page.locator('audio')).not.toHaveAttribute('src',/./);
 await page.getByRole('button',{name:'Remove artwork',exact:true}).click();await page.reload();
 await expect(page.locator('.bc-hero img')).toHaveCount(0);await expect(page.getByRole('button',{name:'Play music'})).toBeDisabled();
});
test('legacy video source becomes silent artwork without deleting legacy records or changing financial settings',async({page})=>{
 await settings(page);await page.getByLabel('Add artwork',{exact:true}).setInputFiles(fixture+'rc2-hero.webm');
 await page.getByLabel('Add music',{exact:true}).setInputFiles(fixture+'rc2-ambient.mp3');
 await page.evaluate(()=>{const key='my-home-finance-financial-core';const state=JSON.parse(localStorage.getItem(key)!);state.preferences.muted=false;localStorage.setItem(key,JSON.stringify(state))});
 const before=await page.evaluate(()=>localStorage.getItem('my-home-finance-financial-core'));
 await page.evaluate(async()=>{await new Promise<void>((resolve,reject)=>{
  const r=indexedDB.open('mhf-blueprint-c-media',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('media','readwrite');tx.objectStore('media').put(new Blob(['video']),'sound-source');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};
 })});
 await page.reload();await expect(page.locator('video')).toHaveJSProperty('muted',true);
 await expect(page.locator('audio')).toHaveJSProperty('paused',true);await page.getByRole('button',{name:'Play music'}).click();
 await expect(page.locator('audio')).toHaveJSProperty('paused',false);await expect(page.locator('video')).toHaveJSProperty('muted',true);
 expect(await page.evaluate(()=>localStorage.getItem('my-home-finance-financial-core'))).toBe(before);
 const legacy=await page.evaluate(async()=>new Promise<string>((resolve)=>{const r=indexedDB.open('mhf-blueprint-c-media',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('media');const q=tx.objectStore('media').get('sound-source');q.onsuccess=async()=>resolve(await q.result.text());tx.oncomplete=()=>db.close()}}));expect(legacy).toBe('video');
 await settings(page);await page.getByRole('button',{name:'Remove music',exact:true}).click();await home(page);
 await expect(page.getByRole('button',{name:'Play music'})).toBeDisabled();await expect(page.locator('video')).toHaveJSProperty('muted',true);
});
test('reduced motion stops record rotation but preserves accessible playback state',async({page})=>{
 await settings(page);await page.getByLabel('Add music',{exact:true}).setInputFiles(fixture+'rc2-ambient.mp3');await home(page);
 await page.getByRole('button',{name:'Play music'}).click();await expect(page.getByRole('button',{name:'Pause music'})).toHaveAttribute('aria-pressed','true');
 expect(await page.locator('.bc-orbit-disc').evaluate(e=>getComputedStyle(e).animationPlayState)).toBe('running');
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.bc-orbit-disc').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 await expect(page.locator('.bc-hero [role=status]')).toHaveText('Music playing');await page.getByRole('button',{name:'Pause music'}).click();await expect(page.locator('audio')).toHaveJSProperty('paused',true);
});
for(const width of [320,390,768,1440])test(`artwork and compact record fit ${width}px with no overlap`,async({page})=>{
 await page.setViewportSize({width,height:900});await settings(page);await page.getByLabel('Add artwork',{exact:true}).setInputFiles(fixture+'rc2-hero.png');await home(page);
 const hero=page.locator('.bc-hero'),text=page.locator('.bc-hero-context'),player=page.locator('.bc-orbit-player');
 const h=(await hero.boundingBox())!,t=(await text.boundingBox())!,p=(await player.boundingBox())!;
 expect(h.height).toBeLessThanOrEqual(240);expect(p.width).toBeGreaterThanOrEqual(44);expect(p.height).toBeGreaterThanOrEqual(44);
 expect(t.x+t.width).toBeLessThan(p.x);expect(t.y+t.height).toBeLessThan(h.y+h.height);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.locator('.bc-hero-context').evaluate(e=>getComputedStyle(e).backdropFilter)).toBe('none');
 await page.screenshot({path:`qa-output/home-01/artwork-${width}.png`});
});
test('greeting follows device timezone across day boundaries',async({browser})=>{
 for(const [timezoneId,greeting,weekday,date] of [['Pacific/Honolulu','Good Evening','Wednesday','October 21, 2026'],['Asia/Tokyo','Good Afternoon','Thursday','October 22, 2026']]){
  const context=await browser.newContext({timezoneId});const p=await context.newPage();await p.clock.setFixedTime(new Date('2026-10-22T06:00:00Z'));await p.goto('/my-home-finance/');
  await expect(p.locator('.bc-hero .bc-eyebrow')).toHaveText(greeting);await expect(p.locator('.bc-hero h1')).toHaveText(weekday);await expect(p.locator('.bc-hero-date')).toHaveText(date);await context.close();
 }
});

test('late playback completion and a restarted document cannot resume music',async({page,context})=>{
 await settings(page);await page.getByLabel('Add music',{exact:true}).setInputFiles(fixture+'rc2-ambient.mp3');await home(page);
 await page.evaluate(()=>{
  const original=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){const started=original.call(this);return new Promise<void>((resolve,reject)=>{(window as any).finishPlay=()=>started.then(resolve,reject)})};
 });
 await page.getByRole('button',{name:'Play music'}).click();await settings(page);
 await page.evaluate(()=>(window as any).finishPlay());await home(page);
 await expect(page.locator('audio')).toHaveJSProperty('paused',true);await expect(page.getByRole('button',{name:'Play music'})).toHaveAttribute('aria-pressed','false');
 const restarted=await context.newPage();await restarted.goto('/my-home-finance/');await expect(restarted.locator('audio')).toHaveAttribute('src',/^blob:/);await expect(restarted.locator('audio')).toHaveJSProperty('paused',true);await restarted.close();
});
test('browser pause is reflected and the next Play action resumes once',async({page})=>{
 await settings(page);await page.getByLabel('Add music',{exact:true}).setInputFiles(fixture+'rc2-ambient.mp3');await home(page);
 await page.getByRole('button',{name:'Play music'}).click();await expect(page.locator('audio')).toHaveJSProperty('paused',false);
 await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.pause());await expect(page.getByRole('button',{name:'Play music'})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'Play music'}).click();await expect(page.locator('audio')).toHaveJSProperty('paused',false);await expect(page.locator('audio')).toHaveCount(1);
});
