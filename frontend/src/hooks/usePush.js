import { useEffect, useRef } from 'react';
import api from '../services/api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePush() {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.ready;

        // Ask for permission — only prompts once; after that it's 'granted' or 'denied'
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Check if already subscribed
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const { data } = await api.get('/push/vapid-public-key');
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.publicKey),
          });
        }

        await api.post('/push/subscribe', sub.toJSON());
      } catch {
        // Silently fail — push is an enhancement, not core functionality
      }
    }

    setup();
  }, []);
}
