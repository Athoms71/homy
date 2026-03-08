const CACHE_NAME = "homy-v2";
const STATIC_ASSETS = ["/", "/dashboard", "/shopping", "/expenses", "/bills", "/calendar", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

// ─── Installation ─────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
	self.skipWaiting();
});

// ─── Activation ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
	event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
	self.clients.claim();
});

// ─── Fetch (inchangé) ─────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	if (url.hostname.includes("supabase.co")) return;
	if (request.method !== "GET") return;

	if (request.destination === "image" || request.destination === "style" || request.destination === "script" || request.destination === "font") {
		event.respondWith(
			caches.match(request).then(
				(cached) =>
					cached ||
					fetch(request).then((response) => {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
						return response;
					}),
			),
		);
		return;
	}

	event.respondWith(
		fetch(request)
			.then((response) => {
				const clone = response.clone();
				caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
				return response;
			})
			.catch(() => caches.match(request)),
	);
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
	if (!event.data) return;

	let payload;
	try {
		payload = event.data.json();
	} catch {
		payload = { title: "Homy", body: event.data.text() };
	}

	const { title, body, url, icon, badge, tag } = payload;

	const options = {
		body: body || "",
		icon: icon || "/icons/icon-192.png",
		badge: badge || "/icons/icon-72.png",
		tag: tag || "homy-notification", // regroupe les notifs du même type
		renotify: true, // vibre même si le tag existe déjà
		requireInteraction: false,
		data: { url: url || "/dashboard" },
		actions: url
			? [
					{ action: "open", title: "Voir" },
					{ action: "dismiss", title: "Ignorer" },
				]
			: [],
	};

	event.waitUntil(self.registration.showNotification(title || "Homy", options));
});

// ─── Clic sur une notification ────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	if (event.action === "dismiss") return;

	const targetUrl = event.notification.data?.url || "/dashboard";

	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
			// Si l'app est déjà ouverte → focus + navigate
			for (const client of clientList) {
				if (client.url.includes(self.location.origin) && "focus" in client) {
					client.focus();
					client.navigate(targetUrl);
					return;
				}
			}
			// Sinon → ouvrir un nouvel onglet
			if (clients.openWindow) {
				return clients.openWindow(targetUrl);
			}
		}),
	);
});

// ─── Push subscription changée (ex: navigateur révoque) ──────────────────────
self.addEventListener("pushsubscriptionchange", (event) => {
	event.waitUntil(
		// Re-subscribe et notifier l'app pour qu'elle mette à jour la BDD
		self.registration.pushManager
			.subscribe({
				userVisibleOnly: true,
				applicationServerKey: self.__VAPID_PUBLIC_KEY__,
			})
			.then((subscription) => {
				return fetch("/api/push/subscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(subscription.toJSON()),
				});
			}),
	);
});
