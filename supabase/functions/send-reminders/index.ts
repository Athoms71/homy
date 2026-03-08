// supabase/functions/send-reminders/index.ts
// Edge Function Deno — appelée par le cron Supabase toutes les heures
//
// Logique :
//   1. Cherche tous les événements dont un rappel tombe dans la prochaine heure
//   2. Pour chaque (event × user concerné), vérifie qu'on n'a pas déjà envoyé ce rappel
//   3. Récupère les push_subscriptions de l'user
//   4. Envoie le Web Push signé VAPID
//   5. Logue dans notification_log pour éviter les doublons

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Web Push / VAPID — implémentation native Deno (Web Crypto API) ──────────

/** Convertit une clé VAPID base64url en CryptoKey ECDH */
async function importVapidKey(base64url: string, usage: KeyUsage[]): Promise<CryptoKey> {
	const raw = base64UrlToUint8Array(base64url);
	return crypto.subtle.importKey("raw", raw, { name: "ECDH", namedCurve: "P-256" }, true, usage);
}

/** Importe la clé privée VAPID (format PKCS8 depuis base64url) */
async function importVapidPrivateKey(base64url: string): Promise<CryptoKey> {
	// La clé privée VAPID est au format "raw" 32 bytes — on doit la wrapper en PKCS8
	const rawPrivate = base64UrlToUint8Array(base64url);

	// Construire le DER PKCS8 pour P-256
	// Header fixe pour EC P-256 private key
	const pkcs8Header = new Uint8Array([
		0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
		0x01, 0x01, 0x04, 0x20,
	]);
	const pkcs8Footer = new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00]);

	// Récupérer la clé publique depuis la clé privée pour le PKCS8 complet
	const tempKey = await crypto.subtle.importKey("raw", rawPrivate, { name: "ECDH", namedCurve: "P-256" }, true, []).catch(() => null);

	// Fallback : utiliser directement le format JWK
	const jwk = {
		kty: "EC",
		crv: "P-256",
		d: base64url,
		x: "", // sera rempli lors de l'import
		y: "",
	};

	// Import via JWK — Deno supporte ça nativement
	const privateKeyJwk = await crypto.subtle.importKey(
		"jwk",
		{
			kty: "EC",
			crv: "P-256",
			d: base64url,
			// x et y ne sont pas nécessaires pour le signing avec la clé privée seule
			// mais Web Crypto les exige — on passe des valeurs placeholder
			// La vraie clé publique sera dans VAPID_PUBLIC_KEY
			x: Deno.env.get("VAPID_PUBLIC_KEY_X") || "",
			y: Deno.env.get("VAPID_PUBLIC_KEY_Y") || "",
		},
		{ name: "ECDSA", namedCurve: "P-256" },
		false,
		["sign"],
	);

	return privateKeyJwk;
}

/** Signe le JWT VAPID */
async function signVapidJwt(audience: string, subject: string, privateKeyBase64url: string, publicKeyBase64url: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const header = { typ: "JWT", alg: "ES256" };
	const payload = {
		aud: audience,
		exp: now + 43200, // 12h
		sub: subject,
	};

	const encodedHeader = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
	const encodedPayload = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
	const signingInput = `${encodedHeader}.${encodedPayload}`;

	// Décomposer la clé publique P-256 (65 bytes uncompressed: 0x04 + x[32] + y[32])
	const pubKeyBytes = base64UrlToUint8Array(publicKeyBase64url);
	const x = uint8ArrayToBase64url(pubKeyBytes.slice(1, 33));
	const y = uint8ArrayToBase64url(pubKeyBytes.slice(33, 65));

	const privateKey = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", d: privateKeyBase64url, x, y }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

	const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(signingInput));

	return `${signingInput}.${uint8ArrayToBase64url(new Uint8Array(signature))}`;
}

/** Chiffre le payload pour Web Push (HKDF + AES-GCM) */
async function encryptPushPayload(payload: string, p256dhBase64url: string, authBase64url: string): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
	const plaintext = new TextEncoder().encode(payload);
	const clientPublicKey = base64UrlToUint8Array(p256dhBase64url);
	const authSecret = base64UrlToUint8Array(authBase64url);

	// Générer une paire de clés éphémères serveur
	const serverKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);

	// Exporter la clé publique serveur
	const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeyPair.publicKey));

	// Importer la clé publique client
	const clientKey = await crypto.subtle.importKey("raw", clientPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);

	// ECDH shared secret
	const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKeyPair.privateKey, 256));

	// Salt aléatoire 16 bytes
	const salt = crypto.getRandomValues(new Uint8Array(16));

	// HKDF pour dériver la clé de contenu et le nonce
	const prk = await hkdf(authSecret, sharedSecret, buildInfo("auth", clientPublicKey, serverPublicKeyRaw), 32);
	const contentEncryptionKey = await hkdf(salt, prk, buildInfo("aesgcm", clientPublicKey, serverPublicKeyRaw), 16);
	const nonce = await hkdf(salt, prk, buildInfo("nonce", clientPublicKey, serverPublicKeyRaw), 12);

	// Padding (2 bytes longueur + padding)
	const padded = new Uint8Array(2 + plaintext.length);
	padded.set(plaintext, 2);

	// AES-GCM encrypt
	const aesKey = await crypto.subtle.importKey("raw", contentEncryptionKey, "AES-GCM", false, ["encrypt"]);
	const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

	return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
	const keyMaterial = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, keyMaterial, length * 8);
	return new Uint8Array(bits);
}

function buildInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
	const label = new TextEncoder().encode(`Content-Encoding: ${type}\0`);
	const info = new Uint8Array(label.length + 1 + 2 + clientPublicKey.length + 2 + serverPublicKey.length);
	let offset = 0;
	info.set(label, offset);
	offset += label.length;
	info[offset++] = 0x41; // 'A' (receiver)
	info.set(new Uint8Array([0x00, clientPublicKey.length]), offset);
	offset += 2;
	info.set(clientPublicKey, offset);
	offset += clientPublicKey.length;
	info.set(new Uint8Array([0x00, serverPublicKey.length]), offset);
	offset += 2;
	info.set(serverPublicKey, offset);
	return info;
}

/** Envoie un Web Push vers une subscription */
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: object, vapidPublicKey: string, vapidPrivateKey: string, vapidSubject: string): Promise<boolean> {
	const url = new URL(subscription.endpoint);
	const audience = `${url.protocol}//${url.host}`;

	const jwt = await signVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);

	const { ciphertext, salt, serverPublicKey } = await encryptPushPayload(JSON.stringify(payload), subscription.p256dh, subscription.auth);

	const response = await fetch(subscription.endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Encoding": "aesgcm",
			Encryption: `salt=${uint8ArrayToBase64url(salt)}`,
			"Crypto-Key": `dh=${uint8ArrayToBase64url(serverPublicKey)};p256ecdsa=${vapidPublicKey}`,
			Authorization: `WebPush ${jwt}`,
			TTL: "86400",
		},
		body: ciphertext,
	});

	// 201 = succès, 410 = subscription expirée (à supprimer), autres = erreur
	return response.status === 201 || response.status === 200;
}

// ─── Helpers base64url ────────────────────────────────────────────────────────

function base64UrlToUint8Array(base64url: string): Uint8Array {
	const base64 = base64url
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), "=");
	const binary = atob(base64);
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64url(bytes: Uint8Array): string {
	let binary = "";
	bytes.forEach((b) => (binary += String.fromCharCode(b)));
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
		const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
		const vapidSubject = Deno.env.get("VAPID_SUBJECT")!; // ex: mailto:toi@email.com

		const supabase = createClient(supabaseUrl, serviceRoleKey);

		const now = new Date();
		const stats = { checked: 0, sent: 0, skipped: 0, errors: 0 };

		// ── 1. Chercher les événements avec rappels dans la prochaine heure ────────
		// On récupère tous les events futurs (dans les 48h) avec leurs rappels
		const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

		const { data: events, error: eventsError } = await supabase
			.from("calendar_events")
			.select("id, title, starts_at, reminders, participant_ids, household_id")
			.gte("starts_at", now.toISOString())
			.lte("starts_at", in48h);

		if (eventsError) throw eventsError;
		if (!events || events.length === 0) {
			return new Response(JSON.stringify({ ...stats, message: "Aucun événement à venir" }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		for (const event of events) {
			const startsAt = new Date(event.starts_at);

			for (const reminderMin of event.reminders as number[]) {
				// Heure prévue pour ce rappel
				const reminderTime = new Date(startsAt.getTime() - reminderMin * 60 * 1000);

				// Ce rappel tombe-t-il dans la prochaine heure ?
				const diffMs = reminderTime.getTime() - now.getTime();
				if (diffMs < 0 || diffMs > 60 * 60 * 1000) continue;

				stats.checked++;

				// ── 2. Trouver les users concernés ──────────────────────────────────
				let userIds: string[];

				if (event.participant_ids && event.participant_ids.length > 0) {
					userIds = event.participant_ids;
				} else {
					// Tout le foyer
					const { data: members } = await supabase.from("household_members").select("user_id").eq("household_id", event.household_id);

					userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
				}

				for (const userId of userIds) {
					// ── 3. Vérifier l'idempotence (déjà envoyé ?) ────────────────────
					const { data: existing } = await supabase.from("notification_log").select("id").eq("event_id", event.id).eq("user_id", userId).eq("reminder_min", reminderMin).single();

					if (existing) {
						stats.skipped++;
						continue;
					}

					// ── 4. Récupérer les subscriptions push de cet user ───────────────
					const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);

					if (!subs || subs.length === 0) {
						stats.skipped++;
						continue;
					}

					// ── 5. Construire le payload ──────────────────────────────────────
					const minutesLabel = reminderMin === 0 ? "C'est maintenant !" : reminderMin < 60 ? `Dans ${reminderMin} minutes` : reminderMin < 1440 ? `Dans ${reminderMin / 60}h` : `Demain`;

					const pushPayload = {
						title: `📅 ${event.title}`,
						body: minutesLabel,
						url: "/calendar",
						tag: `event-${event.id}-${reminderMin}`,
					};

					// ── 6. Envoyer sur tous les devices ──────────────────────────────
					let atLeastOneSent = false;

					for (const sub of subs) {
						try {
							const ok = await sendWebPush(sub, pushPayload, vapidPublicKey, vapidPrivateKey, vapidSubject);
							if (ok) {
								stats.sent++;
								atLeastOneSent = true;
							} else {
								// Subscription expirée → supprimer
								await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint).eq("user_id", userId);
							}
						} catch (e) {
							stats.errors++;
							console.error(`[send-reminders] Push error for ${userId}:`, e);
						}
					}

					// ── 7. Logger pour éviter les doublons ────────────────────────────
					if (atLeastOneSent) {
						await supabase.from("notification_log").insert({
							event_id: event.id,
							user_id: userId,
							reminder_min: reminderMin,
						});
					}
				}
			}
		}

		console.log("[send-reminders] Done:", stats);
		return new Response(JSON.stringify(stats), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		console.error("[send-reminders] Fatal error:", err);
		return new Response(JSON.stringify({ error: String(err) }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
});
