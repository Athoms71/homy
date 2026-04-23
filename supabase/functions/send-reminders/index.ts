// supabase/functions/send-reminders/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

Deno.serve(async (_req) => {
	try {
		const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
		const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
		const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
		const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
		const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

		// 1. Initialisation automatique de la cryptographie Web Push
		webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

		const supabase = createClient(supabaseUrl, serviceRoleKey);
		const now = new Date();
		const stats = { checked: 0, sent: 0, skipped: 0, errors: 0 };

		// ── 1. Chercher les événements avec rappels ────────
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
				const reminderTime = new Date(startsAt.getTime() - reminderMin * 60 * 1000);
				const diffMs = reminderTime.getTime() - now.getTime();

				if (diffMs < 0 || diffMs > 60 * 60 * 1000) continue;

				stats.checked++;

				// ── 2. Trouver les users concernés ──────────────────────────────────
				let userIds: string[];
				if (event.participant_ids && event.participant_ids.length > 0) {
					userIds = event.participant_ids;
				} else {
					const { data: members } = await supabase.from("household_members").select("user_id").eq("household_id", event.household_id);
					userIds = (members ?? []).map((m: any) => m.user_id);
				}

				for (const userId of userIds) {
					// ── 3. Vérifier l'idempotence (déjà envoyé ?) ────────────────────
					const { data: existing } = await supabase.from("notification_log").select("id").eq("event_id", event.id).eq("user_id", userId).eq("reminder_min", reminderMin).single();
					if (existing) {
						stats.skipped++;
						continue;
					}

					// ── 4. Récupérer les subscriptions ───────────────
					const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
					if (!subs || subs.length === 0) {
						stats.skipped++;
						continue;
					}

					// ── 5. Construire le payload ──────────────────────────────────────
					const minutesLabel = reminderMin === 0 ? "C'est maintenant !" : reminderMin < 60 ? `Dans ${reminderMin} minutes` : reminderMin < 1440 ? `Dans ${reminderMin / 60}h` : `Demain`;

					const pushPayload = JSON.stringify({
						title: `📅 ${event.title}`,
						body: minutesLabel,
						url: "/calendar",
						tag: `event-${event.id}-${reminderMin}`,
					});

					// ── 6. Envoyer sur tous les devices ──────────────────────────────
					let atLeastOneSent = false;

					for (const sub of subs) {
						try {
							const pushSubscription = {
								endpoint: sub.endpoint,
								keys: { p256dh: sub.p256dh, auth: sub.auth },
							};

							// L'envoi sécurisé via la librairie
							await webpush.sendNotification(pushSubscription, pushPayload);

							stats.sent++;
							atLeastOneSent = true;
						} catch (e: any) {
							console.error(`[send-reminders] Push error for ${userId}:`, e);

							// On supprime la ligne UNIQUEMENT si l'abonnement est vraiment mort (404 ou 410)
							if (e.statusCode === 410 || e.statusCode === 404) {
								await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint).eq("user_id", userId);
							} else {
								stats.errors++;
							}
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
		return new Response(JSON.stringify(stats), { headers: { "Content-Type": "application/json" } });
	} catch (err) {
		console.error("[send-reminders] Fatal error:", err);
		return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
	}
});
