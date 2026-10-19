import { useEffect, useRef, useState } from 'react';
import { getMedia, setMedia } from '../../core/media';
type Asset = {
    url: string;
    name: string;
    type: string;
};
export function useLocalMedia({ home, muted, volume, onMuted, onError }: {
    home: boolean;
    muted: boolean;
    volume: number;
    onMuted: (m: boolean) => void;
    onError: (e: string) => void;
}) {
    const [track, setTrack] = useState<Asset | null>(null), [hero, setHero] = useState<Asset | null>(null), [source, setSource] = useState<'ambient' | 'video'>('ambient'), [playing, setPlaying] = useState(false), [blocked, setBlocked] = useState(false), [pending, setPending] = useState(0);
    const audio = useRef<HTMLAudioElement>(null), video = useRef<HTMLVideoElement>(null), urls = useRef(new Set<string>());
    const asset = (blob: Blob, fallback: string) => { const url = URL.createObjectURL(blob); urls.current.add(url); return { url, name: blob instanceof File ? blob.name : fallback, type: blob.type }; };
    const release = (a: Asset | null) => { if (a) {
        URL.revokeObjectURL(a.url);
        urls.current.delete(a.url);
    } };
    useEffect(() => { let live = true; Promise.all([getMedia('track'), getMedia('hero'), getMedia('artwork'), getMedia('sound-source')]).then(async ([t, h, old, selected]) => { const saved = selected ? await selected.text() : 'ambient'; if (!live)
        return; if (t)
        setTrack(asset(t, 'Your ambient track')); if (h || old)
        setHero(asset((h || old)!, 'Your hero visual')); if (saved === 'video')
        setSource('video'); }).catch(e => onError(String(e))); return () => { live = false; urls.current.forEach(u => URL.revokeObjectURL(u)); urls.current.clear(); }; }, []);
    const isVideo = !!hero?.type.startsWith('video/');
    const effective = source === 'video' && !isVideo ? 'ambient' : source === 'ambient' && !track && isVideo ? 'video' : source;
    useEffect(() => { const a = audio.current, v = video.current; let live = true; if (a) {
        a.volume = volume;
        a.muted = muted || effective !== 'ambient';
        if (effective === 'ambient' && track) {
            a.play().then(() => { if (live) {
                setPlaying(true);
                setBlocked(false);
            } }).catch(() => { if (live) {
                setPlaying(false);
                setBlocked(true);
            } });
        }
        else
            a.pause();
    } if (v) {
        v.volume = volume;
        v.muted = muted || effective !== 'video' || !home;
        if (!home)
            v.pause();
        else if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
            v.play().then(() => { if (live && effective === 'video') {
                setPlaying(true);
                setBlocked(false);
            } }).catch(() => { if (live && effective === 'video') {
                setPlaying(false);
                setBlocked(true);
            } });
    } return () => { live = false; }; }, [track?.url, hero?.url, source, muted, volume, home]);
    useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const listener=()=>{if(query.matches){video.current?.pause();if(effective==='video')setPlaying(false)}};query.addEventListener('change',listener);return()=>query.removeEventListener('change',listener)},[effective]);
    const selectSource = async (next: 'ambient' | 'video') => {
        setPending(n=>n+1);onError(''); if (next === 'video') {
        if (audio.current) {
            audio.current.muted = true;
            audio.current.pause();
        }
    }
    else if (video.current)
        video.current.muted = true; setSource(next); try {
        await setMedia('sound-source', new Blob([next], { type: 'text/plain' }));
    }
    catch (e) {
        onError(String(e));
    } finally {setPending(n=>n-1)} };
    const toggle = () => { const next = blocked ? false : !muted; onMuted(next); const a = audio.current, v = video.current; if (effective === 'video') {
        if (a) {
            a.muted = true;
            a.pause();
        }
        if (v) {
            v.muted = next || !home;
            v.play().then(() => { setPlaying(true); setBlocked(false); }).catch(() => { setBlocked(true); setPlaying(false); });
        }
    }
    else {
        if (v)
            v.muted = true;
        if (a) {
            a.muted = next;
            a.play().then(() => { setPlaying(true); setBlocked(false); }).catch(() => { setBlocked(true); setPlaying(false); });
        }
    } };
    const upload = async (key: 'track' | 'hero', file: File) => { setPending(n => n + 1); onError(''); try {
        if (key === 'track' && !(/audio\//.test(file.type) || /\.mp3$/i.test(file.name)))
            throw Error('Choose an audio file.');
        if (key === 'hero' && !/^(image|video)\//.test(file.type))
            throw Error('Choose an image or video supported by your browser.');
        await setMedia(key, file);
        if (key === 'track') {
            release(track);
            setTrack(asset(file, file.name));
        }
        else {
            release(hero);
            setHero(asset(file, file.name));
        }
    }
    catch (e) {
        onError(String(e));
    }
    finally {
        setPending(n => n - 1);
    } };
    const remove = async (key: 'track' | 'hero') => { setPending(n => n + 1); onError(''); try {
        await setMedia(key);
        if (key === 'hero') {
            await setMedia('artwork');
            release(hero);
            setHero(null);
            if (video.current)
                video.current.pause();
        }
        else {
            audio.current?.pause();
            release(track);
            setTrack(null);
        }
        setPlaying(false);
        setBlocked(false);
    }
    catch (e) {
        onError(String(e));
    }
    finally {
        setPending(n => n - 1);
    } };
    const fail = (kind: 'audio' | 'video') => { setPlaying(false); setBlocked(true); onError(`This ${kind} could not be played. Choose a file supported by this browser.`); };
    return { audio, video, track, hero, isVideo, source, effective, playing, blocked, busy: pending > 0, selectSource, toggle, upload, remove, fail };
}
export type MediaController = ReturnType<typeof useLocalMedia>;
