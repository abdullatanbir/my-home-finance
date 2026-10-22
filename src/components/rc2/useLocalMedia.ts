import { useEffect, useRef, useState } from 'react';
import { getMedia, setMedia } from '../../core/media';
type Asset = { url: string; name: string; type: string };

// One mounted audio element is the only Home sound source. Legacy video and
// sound-source records are retained on disk, but video is always visual-only.
export function useLocalMedia({ home, volume, onError }: {
    home: boolean;
    volume: number;
    onError: (e: string) => void;
}) {
    const [track, setTrack] = useState<Asset | null>(null);
    const [hero, setHero] = useState<Asset | null>(null);
    const [playing, setPlaying] = useState(false), [blocked, setBlocked] = useState(false);
    const [pending, setPending] = useState(0), [loaded, setLoaded] = useState(false);
    const audio = useRef<HTMLAudioElement>(null), video = useRef<HTMLVideoElement>(null);
    const urls = useRef(new Set<string>()), generation = useRef(0), intended = useRef(false);
    const operation = useRef(false);
    const asset = (blob: Blob, fallback: string): Asset => {
        const url = URL.createObjectURL(blob); urls.current.add(url);
        return { url, name: blob instanceof File ? blob.name : fallback, type: blob.type };
    };
    const release = (a: Asset | null) => {
        if (a) { URL.revokeObjectURL(a.url); urls.current.delete(a.url); }
    };
    const stop = () => {
        generation.current++; intended.current = false;
        if (audio.current) { audio.current.pause(); audio.current.muted = true; }
        setPlaying(false); setBlocked(false);
    };
    useEffect(() => {
        let live = true;
        Promise.all([getMedia('track'), getMedia('hero'), getMedia('artwork')]).then(([t, h, old]) => {
            if (!live) return;
            if (t) setTrack(asset(t, 'Your music'));
            if (h || old) setHero(asset((h || old)!, 'Your artwork'));
        }).catch(e => { if (live) onError(String(e)); }).finally(() => { if (live) setLoaded(true); });
        return () => {
            live = false; generation.current++; intended.current = false;
            audio.current?.pause(); video.current?.pause();
            urls.current.forEach(u => URL.revokeObjectURL(u)); urls.current.clear();
        };
    }, []);
    // Loading, refreshing, navigation and media replacement never imply play.
    useEffect(() => { stop(); }, [home, track?.url]);
    useEffect(() => {
        if (audio.current) audio.current.volume = Math.max(0, Math.min(1, volume));
    }, [volume, track?.url]);
    useEffect(() => {
        const v = video.current;
        if (!v) return;
        const query = matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => {
            v.muted = true;
            if (!home || query.matches) v.pause();
            else void v.play().catch(() => { /* A silent still frame is valid. */ });
        };
        sync(); query.addEventListener('change', sync);
        return () => { query.removeEventListener('change', sync); v.pause(); v.muted = true; };
    }, [home, hero?.url]);
    const toggle = () => {
        const a = audio.current;
        if (!home || !track || !a || operation.current) return;
        if (intended.current) { stop(); return; }
        // Explicit user gesture only. A late play promise must not revive a
        // removed/replaced track or resume playback after leaving Home.
        const token = ++generation.current;
        intended.current = true; setBlocked(false);
        if (video.current) video.current.muted = true;
        a.muted = false;
        void a.play().then(() => {
            if (token === generation.current && intended.current) setPlaying(!a.paused);
        }).catch(() => {
            if (token === generation.current) {
                intended.current = false; a.muted = true; setPlaying(false); setBlocked(true);
            }
        });
    };
    const upload = async (key: 'track' | 'hero', file: File) => {
        if (operation.current) return;
        operation.current = true; setPending(n => n + 1); onError('');
        try {
            if (key === 'track' && !(file.type.startsWith('audio/') || /\.mp3$/i.test(file.name))) throw Error('Choose an audio file, such as MP3.');
            if (key === 'hero' && !/^(image|video)\//.test(file.type)) throw Error('Choose an image or silent video supported by your browser.');
            if (key === 'track') stop();
            await setMedia(key, file);
            if (key === 'track') { release(track); setTrack(asset(file, file.name)); }
            else { video.current?.pause(); release(hero); setHero(asset(file, file.name)); }
        } catch (e) { onError(String(e)); }
        finally { operation.current = false; setPending(n => n - 1); }
    };
    const remove = async (key: 'track' | 'hero') => {
        if (operation.current) return;
        operation.current = true; setPending(n => n + 1); onError('');
        try {
            if (key === 'track') stop();
            await setMedia(key);
            if (key === 'hero') {
                await setMedia('artwork'); video.current?.pause(); release(hero); setHero(null);
            } else { release(track); setTrack(null); }
        } catch (e) { onError(String(e)); }
        finally { operation.current = false; setPending(n => n - 1); }
    };
    const fail = (kind: 'audio' | 'video') => {
        if (kind === 'audio') { stop(); setBlocked(true); }
        onError(`This ${kind} could not be played. Choose a file supported by this browser.`);
    };
    const onPause = () => {
        if (audio.current?.paused) { generation.current++; intended.current = false; setPlaying(false); }
    };
    const onPlay = () => {
        if (!intended.current) { audio.current?.pause(); return; }
        setPlaying(true);
    };
    return { audio, video, track, hero, isVideo: !!hero?.type.startsWith('video/'), playing, blocked, busy: !loaded || pending > 0, toggle, upload, remove, fail, onPause, onPlay };
}
export type MediaController = ReturnType<typeof useLocalMedia>;
