import { apiGet, apiPost } from './api.js';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
    } catch (e) {
      console.error('Service Worker registration failed', e);
    }
  }
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      let vapidPublicKey;
      try {
        const res = await apiGet('/api/push/vapid-public-key');
        vapidPublicKey = res.publicKey;
      } catch (e) {
        console.warn('Could not fetch VAPID key, push notifications disabled.');
        return;
      }
      
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      
      await apiPost('/api/push/subscribe', subscription);
    }
  } catch (e) {
    console.error('Failed to subscribe to push', e);
  }
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  } catch (e) {
    console.error('Failed to unsubscribe from push', e);
  }
}
