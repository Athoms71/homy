import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
	getShoppingLists,
	createShoppingList,
	archiveShoppingList,
	deleteShoppingList,
	getShoppingItems,
	addShoppingItem,
	toggleShoppingItem,
	deleteShoppingItem,
	clearCheckedItems,
} from "@/services/shopping.service";
import type { ShoppingCategory } from "@homy/shared-types";

// ─── Listes ───────────────────────────────────────────────────────────────────

export function useShoppingLists(householdId: string | null) {
	return useQuery({
		queryKey: ["shopping-lists", householdId],
		queryFn: () => getShoppingLists(householdId!),
		enabled: !!householdId,
	});
}

export function useCreateShoppingList(householdId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (name: string) => createShoppingList(householdId, name),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists", householdId] }),
	});
}

export function useArchiveShoppingList(householdId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (listId: string) => archiveShoppingList(listId),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists", householdId] }),
	});
}

export function useDeleteShoppingList(householdId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (listId: string) => deleteShoppingList(listId),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-lists", householdId] }),
	});
}

// ─── Articles + temps réel ────────────────────────────────────────────────────

export function useShoppingItems(listId: string | null) {
	const qc = useQueryClient();

	// Abonnement temps réel Supabase
	useEffect(() => {
		if (!listId) return;
		const supabase = createClient();

		const channel = supabase
			.channel(`shopping_items:${listId}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `list_id=eq.${listId}` }, () => {
				qc.invalidateQueries({ queryKey: ["shopping-items", listId] });
			})
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [listId, qc]);

	return useQuery({
		queryKey: ["shopping-items", listId],
		queryFn: () => getShoppingItems(listId!),
		enabled: !!listId,
	});
}

export function useAddShoppingItem(listId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (item: { name: string; quantity: number; unit?: string; category: ShoppingCategory; is_urgent?: boolean }) => addShoppingItem(listId, item),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-items", listId] }),
	});
}

export function useToggleShoppingItem(listId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) => toggleShoppingItem(itemId, checked),
		// Optimistic update
		onMutate: async ({ itemId, checked }) => {
			await qc.cancelQueries({ queryKey: ["shopping-items", listId] });
			const previous = qc.getQueryData(["shopping-items", listId]);
			qc.setQueryData(["shopping-items", listId], (old: any[]) =>
				old?.map((item) => (item.id === itemId ? { ...item, checked_by: checked ? "optimistic" : null, checked_at: checked ? new Date().toISOString() : null } : item)),
			);
			return { previous };
		},
		onError: (_err, _vars, ctx) => {
			qc.setQueryData(["shopping-items", listId], ctx?.previous);
		},
		onSettled: () => qc.invalidateQueries({ queryKey: ["shopping-items", listId] }),
	});
}

export function useDeleteShoppingItem(listId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (itemId: string) => deleteShoppingItem(itemId),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-items", listId] }),
	});
}

export function useClearCheckedItems(listId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => clearCheckedItems(listId),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-items", listId] }),
	});
}
