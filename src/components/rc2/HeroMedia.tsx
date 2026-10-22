import { useEffect, useState } from "react";
import { Play, Pause, Disc3 } from "lucide-react";
import type { MediaController } from "./useLocalMedia";
export default function HeroMedia({
  media,
  home,
  muted,
}: {
  media: MediaController;
  home: boolean;
  muted: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const playing = media.playing && !muted && !media.blocked;
  const lines = [
    "Make today count.",
    "Small steps. Strong future.",
    "Keep moving forward.",
    "Build your future.",
  ];
  return (
    <section className="bc-hero" hidden={!home} aria-label="Home hero">
      <div className="bc-hero-visual" aria-hidden="true">
        {media.hero &&
          (media.isVideo ? (
            <video
              ref={media.video}
              src={media.hero.url}
              muted={muted || media.effective !== "video" || !home}
              loop
              playsInline
              preload="metadata"
              onError={() => media.fail("video")}
            />
          ) : (
            <img src={media.hero.url} alt="" />
          ))}
        <div className="bc-hero-shade" />
      </div>
      <div className="bc-hero-context">
        <p className="bc-eyebrow">{greeting}</p>
        <h1>{now.toLocaleDateString("en-US", { weekday: "long" })}</h1>
        <p className="bc-hero-date">
          {now.toLocaleDateString("en-US", { month: "long", day: "numeric" })} ·{" "}
          {now.getFullYear()}
        </p>
        <p className="bc-motivation">
          {
            lines[
              Math.floor(
                new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
                ).getTime() / 86400000,
              ) % lines.length
            ]
          }
        </p>
      </div>
      <button
        className={`bc-orbit-player ${playing ? "is-playing" : ""}`}
        aria-label={playing ? "Pause sound" : "Play sound"}
        aria-pressed={playing}
        disabled={!media.track && !media.isVideo}
        onClick={media.toggle}
      >
        <span className="bc-orbit-disc" aria-hidden="true">
          <Disc3 size={36} />
        </span>
        <span className="bc-orbit-action" aria-hidden="true">
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </span>
      </button>
      <span className="bc-sr-only" role="status">
        {media.blocked
          ? "Playback needs a tap."
          : playing
            ? "Sound playing"
            : "Sound paused"}
      </span>
    </section>
  );
}
export function MediaSettings({
  media,
  volume,
  onVolume,
}: {
  media: MediaController;
  volume: number;
  onVolume: (v: number) => void;
}) {
  return (
    <section className="bc-card bc-media-settings">
      <p className="bc-eyebrow">SET THE ATMOSPHERE</p>
      <h2>Music & Artwork</h2>
      <p>
        Choose your hero visual and ambient track independently. Files stay on
        this device.
      </p>
      <div className="bc-form-grid">
        <div className="bc-field">
          <label htmlFor="bc-hero-upload">Home hero image or video</label>
          <input
            id="bc-hero-upload"
            disabled={media.busy}
            type="file"
            accept="image/*,video/mp4,video/webm,video/ogg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void media.upload("hero", file);
              e.target.value = "";
            }}
          />
          <small>{media.hero?.name || "No custom hero selected"}</small>
          <button
            disabled={!media.hero || media.busy}
            onClick={() => void media.remove("hero")}
          >
            Remove hero visual
          </button>
        </div>
        <div className="bc-field">
          <label htmlFor="bc-track-upload">Local MP3</label>
          <input
            id="bc-track-upload"
            disabled={media.busy}
            type="file"
            accept="audio/*,.mp3"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void media.upload("track", file);
              e.target.value = "";
            }}
          />
          <small>{media.track?.name || "No ambient music selected"}</small>
          <button
            disabled={!media.track || media.busy}
            onClick={() => void media.remove("track")}
          >
            Remove music
          </button>
        </div>
        <div className="bc-field">
          <label htmlFor="bc-sound-source">Sound source</label>
          <select
            disabled={media.busy}
            id="bc-sound-source"
            value={media.effective}
            onChange={(e) =>
              void media.selectSource(e.target.value as "ambient" | "video")
            }
          >
            <option value="ambient" disabled={!media.track || media.busy}>
              Ambient music
            </option>
            <option value="video" disabled={!media.isVideo}>
              Hero video
            </option>
          </select>
          <small>
            Only the selected source can produce sound. Hero video is silent
            away from Home.
          </small>
        </div>
        <div className="bc-field">
          <label htmlFor="bc-volume">Volume</label>
          <input
            id="bc-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
          />
        </div>
      </div>
      {media.busy && <p role="status">Saving media on this device…</p>}
      <p className="bc-help">
        Video loops silently by default. Your browser may require a tap on the
        sound control to start playback. Reduced-motion settings pause automatic
        hero motion. Large media is stored in IndexedDB and excluded from
        financial backups.
      </p>
    </section>
  );
}
