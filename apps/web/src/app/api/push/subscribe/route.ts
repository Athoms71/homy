import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/push/subscribe — enregistre une nouvelle subscription
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();

		// Vérifier l'authentification
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
		}

		const body = await request.json();
		const { endpoint, p256dh, auth, userAgent } = body;

		if (!endpoint || !p256dh || !auth) {
			return NextResponse.json({ error: "Champs manquants : endpoint, p256dh, auth requis" }, { status: 400 });
		}

		// Upsert — si l'endpoint existe déjà pour cet user, on met à jour
		const { error } = await supabase.from("push_subscriptions").upsert(
			{
				user_id: user.id,
				endpoint,
				p256dh,
				auth,
				user_agent: userAgent ?? null,
			},
			{ onConflict: "user_id,endpoint" },
		);

		if (error) throw error;

		return NextResponse.json({ success: true }, { status: 201 });
	} catch (err) {
		console.error("[API push/subscribe POST]", err);
		return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
	}
}

// DELETE /api/push/subscribe — supprime une subscription
export async function DELETE(request: NextRequest) {
	try {
		const supabase = await createClient();

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
		}

		const body = await request.json();
		const { endpoint } = body;

		if (!endpoint) {
			return NextResponse.json({ error: "endpoint requis" }, { status: 400 });
		}

		const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);

		if (error) throw error;

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[API push/subscribe DELETE]", err);
		return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
	}
}
