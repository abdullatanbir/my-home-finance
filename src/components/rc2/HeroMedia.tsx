import { useEffect, useId, useState } from 'react';
import { Play, Pause, Disc3 } from 'lucide-react';
import type { MediaController } from './useLocalMedia';

export default function HeroMedia({ media, home }: { media: MediaController; home: boolean }) {
  const [now, setNow] = useState(() => new Date());
  const hint = useId();
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';
  return (
    <section className="bc-hero home01-hero" hidden={!home} aria-label="Daily Focus">
      <div className="bc-hero-visual" aria-hidden="true">
        {media.hero && (media.isVideo ? (
          <video ref={media.video} src={media.hero.url} muted loop playsInline preload="metadata" onError={() => media.fail('video')} />
        ) : <img src={media.hero.url} alt="" />)}
        <div className="bc-hero-shade" />
      </div>
      <div className="bc-hero-context">
        <p className="bc-eyebrow">{greeting}</p>
        <h1>{now.toLocaleDateString('en-US', { weekday: 'long' })}</h1>
        <p className="bc-hero-date"><time dateTime={`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`}>
          {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </time></p>
      </div>
      {!media.track && <span className="home01-empty">Music in Settings</span>}
      <button className={`bc-orbit-player ${media.playing ? 'is-playing' : ''}`}
        aria-label={media.playing ? 'Pause music' : 'Play music'} aria-pressed={media.playing}
        aria-describedby={hint} disabled={!media.track || media.busy} onClick={media.toggle}>
        <span className="bc-orbit-disc" aria-hidden="true"><Disc3 size={38} /></span>
        <span className="bc-orbit-action" aria-hidden="true">{media.playing ? <Pause size={12} /> : <Play size={12} />}</span>
      </button>
      <span className="bc-sr-only" id={hint} role="status">
        {!media.track ? 'No music configured. Add music in Settings.' : media.blocked ? 'Music could not start. Try Play music or choose another file in Settings.' : media.playing ? 'Music playing' : 'Music paused'}
      </span>
    </section>
  );
}

export function MediaSettings({ media, volume, onVolume }: { media: MediaController; volume: number; onVolume: (v: number) => void }) {
  return (
    <section className="bc-card bc-media-settings home01-settings">
      <h2>Music & Artwork</h2>
      <p>Make Home your own. Your files stay on this device.</p>
      <div className="bc-form-grid">
        <div className="bc-field">
          <label htmlFor="bc-hero-upload">{media.hero ? 'Change artwork' : 'Add artwork'}</label>
          <input id="bc-hero-upload" disabled={media.busy} type="file" accept="image/*,video/mp4,video/webm,video/ogg" onChange={e => {
            const file = e.target.files?.[0]; if (file) void media.upload('hero', file); e.target.value = '';
          }} />
          <small>{media.hero?.name || 'No artwork selected'}</small>
          <small>Images or silent video. Video sound is never used.</small>
          <button disabled={!media.hero || media.busy} onClick={() => void media.remove('hero')}>Remove artwork</button>
        </div>
        <div className="bc-field">
          <label htmlFor="bc-track-upload">{media.track ? 'Change music' : 'Add music'}</label>
          <input id="bc-track-upload" disabled={media.busy} type="file" accept="audio/*,.mp3" onChange={e => {
            const file = e.target.files?.[0]; if (file) void media.upload('track', file); e.target.value = '';
          }} />
          <small>{media.track?.name || 'No music configured'}</small>
          <small>Choose a local audio file, including MP3. Play it from Home.</small>
          <button disabled={!media.track || media.busy} onClick={() => void media.remove('track')}>Remove music</button>
        </div>
        <div className="bc-field">
          <label htmlFor="bc-volume">Music volume</label>
          <input id="bc-volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => onVolume(Number(e.target.value))} />
        </div>
      </div>
      {media.busy && <p role="status">Saving media on this device…</p>}
      <p className="bc-help">Music starts only when you press Play on Home. Leaving Home pauses it. Reduced motion stops decorative animation. Media is stored privately in this browser and excluded from financial backups.</p>
    </section>
  );
}
