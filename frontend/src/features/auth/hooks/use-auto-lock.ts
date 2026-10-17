'use client';
import { useEffect, useRef } from 'react';
import { KeyStore } from '@/stores/key.store';

export const AUTO_LOCK_SECONDS = Number(process.env.NEXT_PUBLIC_AUTO_LOCK_SECONDS ?? 300);

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

export function useAutoLock(enabled: boolean, seconds: number = AUTO_LOCK_SECONDS): void {
    const timer = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const clear = () => {
            if (timer.current !== null) window.clearTimeout(timer.current);
            timer.current = null;
        };
        const restart = () => {
            clear();
            timer.current = window.setTimeout(() => KeyStore.getState().lock('idle'), seconds * 1000);
        };

        restart();
        ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, restart, { passive: true }));
        return () => {
            clear();
            ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, restart));
        };
    }, [enabled, seconds]);
}