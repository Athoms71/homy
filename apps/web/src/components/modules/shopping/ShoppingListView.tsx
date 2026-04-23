"use client";

import { useState } from "react";
import { useShoppingItems, useClearCheckedItems, useDeleteShoppingList } from "@/hooks/useShopping";
import { ShoppingItemRow } from "./ShoppingItemRow";
import { AddItemForm } from "./AddItemForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CATEGORIES } from "@/lib/categories";
import { X, Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
	list: { id: string; name: string };
	householdId: string;
	onBack: () => void;
}

export function ShoppingListView({ list, householdId, onBack }: Props) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [filter, setFilter] = useState<string>("all");
	const [confirmDelete, setConfirmDelete] = useState(false);
	const { data: items = [], isLoading } = useShoppingItems(list.id);
	const clearChecked = useClearCheckedItems(list.id);
	const deleteList = useDeleteShoppingList(householdId);

	const unchecked = items.filter((i) => !i.checked_by);
	const checked = items.filter((i) => i.checked_by);

	const filteredUnchecked = filter === "all" ? unchecked : unchecked.filter((i) => i.category === filter);

	const grouped = CATEGORIES.map((cat) => ({ cat, items: filteredUnchecked.filter((i) => i.category === cat.value) })).filter((g) => g.items.length > 0);

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center gap-3 mb-4">
				<button onClick={onBack} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 transition">
					<ArrowLeft size={18} />
				</button>
				<div className="flex-1">
					<h2 className="font-bold text-gray-900 text-lg">{list.name}</h2>
				</div>
				<div className="flex gap-2 items-center">
					{checked.length > 0 && (
						<button onClick={() => clearChecked.mutate()} className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50">
							<Trash2 size={13} />
							Vider cochés
						</button>
					)}
					{/* Bouton + en haut droite desktop */}
					<button
						onClick={() => setShowAddForm(true)}
						className="hidden sm:flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-primary-700 transition"
					>
						<Plus size={18} />
					</button>
				</div>
			</div>

			{/* Filtres catégories */}
			<div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
				<button
					onClick={() => setFilter("all")}
					className={cn(
						"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition",
						filter === "all" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
					)}
				>
					Tout ({unchecked.length})
				</button>
				{CATEGORIES.filter((cat) => unchecked.some((i) => i.category === cat.value)).map((cat) => (
					<button
						key={cat.value}
						onClick={() => setFilter(cat.value)}
						className={cn(
							"flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition",
							filter === cat.value ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
						)}
					>
						{cat.emoji} {unchecked.filter((i) => i.category === cat.value).length}
					</button>
				))}
			</div>

			{/* Articles */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="animate-spin text-primary-600" size={24} />
				</div>
			) : (
				<div className="flex-1 overflow-y-auto space-y-4 pb-4">
					{grouped.length === 0 && unchecked.length === 0 ? (
						<div className="text-center py-10 text-gray-400">
							<p className="text-4xl mb-3">🛒</p>
							<p className="text-sm">Liste vide — ajoute un article !</p>
						</div>
					) : (
						grouped.map(({ cat, items: catItems }) => (
							<div key={cat.value}>
								<div className="flex items-center gap-2 mb-2 px-1">
									<span className="text-sm">{cat.emoji}</span>
									<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat.label}</span>
									<span className="text-xs text-gray-400">({catItems.length})</span>
								</div>
								<div className="space-y-1">
									{catItems.map((item) => (
										<ShoppingItemRow key={item.id} item={item} listId={list.id} />
									))}
								</div>
							</div>
						))
					)}

					{checked.length > 0 && (
						<div>
							<div className="flex items-center gap-2 mb-2 px-1">
								<span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">✓ Dans le panier ({checked.length})</span>
							</div>
							<div className="space-y-1">
								{checked.map((item) => (
									<ShoppingItemRow key={item.id} item={item} listId={list.id} />
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Bouton + mobile fixe en bas */}
			<button onClick={() => setShowAddForm(true)} className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center z-40">
				<Plus size={24} />
			</button>

			{showAddForm && householdId && (
				<div className="fixed bottom-16 sm:bottom-0 inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
					<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl max-h-[70vh] sm:max-h-[80vh] overflow-y-auto p-6">
						<div className="flex items-center justify-between mb-4 top-0 bg-white z-10">
							<h2 className="text-lg font-bold text-gray-900">🛒 Nouvel article</h2>
							<div className="flex items-center gap-2">
								<button onClick={() => setShowAddForm(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
									<X size={18} />
								</button>
							</div>
						</div>
						<AddItemForm listId={list.id} onClose={() => setShowAddForm(false)} />
					</div>
				</div>
			)}

			{confirmDelete && (
				<ConfirmDialog message={`Supprimer la liste "${list.name}" ?`} onConfirm={() => deleteList.mutate(list.id, { onSuccess: onBack })} onCancel={() => setConfirmDelete(false)} />
			)}
		</div>
	);
}
