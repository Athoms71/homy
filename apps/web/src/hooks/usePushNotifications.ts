'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

interface UsePushNotificationsReturn {
  permission: PermissionState
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

// Convertit une clé VAPID base64 en Uint8Array pour l'API Web Push
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Vérifier l'état initial au montage
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Vérifier le support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }

    // Lire la permission actuelle
    setPermission(Notification.permission as PermissionState)

    // Vérifier si déjà abonné
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub)
      })
    })
  }, [])

  const subscribe = useCallback(async () => {
    if (permission === 'unsupported') return

    setIsLoading(true)
    try {
      // 1. Demander la permission si pas encore accordée
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission()
        setPermission(result as PermissionState)
        if (result !== 'granted') return
      }

      // 2. Récupérer le Service Worker actif
      const registration = await navigator.serviceWorker.ready

      // 3. Créer la subscription Web Push avec la clé VAPID publique
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) throw new Error('Clé VAPID publique manquante')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      // 4. Envoyer la subscription à notre API pour la sauvegarder en BDD
      const sub = subscription.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          userAgent: navigator.userAgent,
        }),
      })

      if (!res.ok) throw new Error('Échec de l\'enregistrement en base')

      setIsSubscribed(true)
      setPermission('granted')
    } catch (err) {
      console.error('[Push] Erreur subscribe:', err)
    } finally {
      setIsLoading(false)
    }
  }, [permission])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) return

      // 1. Désabonner côté navigateur
      await subscription.unsubscribe()

      // 2. Supprimer en BDD
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })

      setIsSubscribed(false)
    } catch (err) {
      console.error('[Push] Erreur unsubscribe:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe }
}
