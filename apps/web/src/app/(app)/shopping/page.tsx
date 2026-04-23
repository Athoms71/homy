"use client";

import { useState, useEffect } from "react";
import { useMyHouseholds } from "@/hooks/useHousehold";
import { useShoppingLists, useCreateShoppingList, useDeleteShoppingList } from "@/hooks/useShopping";
import { ShoppingListView } from "@/components/modules/shopping/ShoppingListView";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { X, Settings, ShoppingCart, Plus, Trash2, Loader2, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ShoppingPage() {
	const { data: householdsData, isLoading: loadingHouseholds } = useMyHouseholds();
	const [householdId, setHouseholdId] = useState<string | null>(null);
	const [activeList, setActiveList] = useState<{ id: string; name: string } | null>(null);
	const [showCreate, setShowCreate] = useState(false);
	const [newListName, setNewListName] = useState("");
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	useEffect(() => {
		if (householdsData && householdsData.length > 0 && !householdId) {
			setHouseholdId((householdsData[0] as any).households.id);
		}
	}, [householdsData, householdId]);

	const { data: lists = [], isLoading: loadingLists } = useShoppingLists(householdId);
	const createList = useCreateShoppingList(householdId ?? "");
	const deleteList = useDeleteShoppingList(householdId ?? "");

	function handleCreateList(e: React.FormEvent) {
		e.preventDefault();
		if (!newListName.trim() || !householdId) return;
		createList.mutate(newListName.trim(), {
			onSuccess: (list) => {
				setNewListName("");
				setShowCreate(false);
				setActiveList(list);
			},
		});
	}

	if (loadingHouseholds)
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="animate-spin text-primary-600" size={32} />
			</div>
		);

	if (!householdsData || householdsData.length === 0)
		return (
			<div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
				<Home size={40} className="mx-auto text-gray-300 mb-4" />
				<h2 className="font-semibold text-gray-600 mb-1">Aucun foyer</h2>
				<p className="text-gray-400 text-sm mb-4">Tu dois d'abord créer ou rejoindre un foyer.</p>
				<Link href="/household" className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-700 transition">
					Gérer mes foyers
				</Link>
			</div>
		);

	if (activeList && householdId) return <ShoppingListView list={activeList} householdId={householdId} onBack={() => setActiveList(null)} />;

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<div className="flex flex-col">
						<h1 className="text-2xl font-bold text-gray-900">🛒 Courses</h1>
						<h2 className="text-gray-500 text-sm mt-1">Gérez vos listes de courses</h2>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Bouton settings mobile — haut droite */}
					<div className="md:hidden flex">
						<Link href="/settings" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-700 transition shadow-sm">
							<Settings size={20} />
						</Link>
					</div>

					{/* Bouton + en haut droite desktop */}
					<button
						onClick={() => setShowCreate(true)}
						className="hidden sm:flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-primary-700 transition"
					>
						<Plus size={18} />
					</button>
				</div>
			</div>

			{householdsData.length > 1 && (
				<div className="flex gap-2 mb-4 overflow-x-auto pb-1">
					{householdsData.map((item: any) => (
						<button
							key={item.households.id}
							onClick={() => setHouseholdId(item.households.id)}
							className={cn(
								"flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition",
								householdId === item.households.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
							)}
						>
							{item.households.name}
						</button>
					))}
				</div>
			)}

			{loadingLists ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="animate-spin text-primary-600" size={24} />
				</div>
			) : lists.length === 0 && !showCreate ? (
				<div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
					<ShoppingCart size={40} className="mx-auto text-gray-300 mb-4" />
					<h2 className="font-semibold text-gray-600 mb-1">Aucune liste</h2>
					<p className="text-gray-400 text-sm mb-4">Crée ta première liste de courses.</p>
					<button onClick={() => setShowCreate(true)} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-700 transition">
						Créer une liste
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{lists.map((list: any) => (
						<div
							key={list.id}
							className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center gap-4 hover:border-primary-300 transition cursor-pointer"
							onClick={() => setActiveList(list)}
						>
							<ShoppingCart size={22} className="text-primary-400 flex-shrink-0" />
							<div className="flex-1 min-w-0">
								<p className="font-semibold text-gray-800">{list.name}</p>
								<p className="text-gray-400 text-xs mt-0.5">Créée le {new Date(list.created_at).toLocaleDateString("fr-FR")}</p>
							</div>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setConfirmDeleteId(list.id);
								}}
								className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition flex-shrink-0"
							>
								<Trash2 size={16} />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Bouton + mobile fixe en bas */}
			<button onClick={() => setShowCreate(true)} className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center z-40">
				<Plus size={24} />
			</button>

			{/* Modal création */}
			{showCreate && (
				<div className="fixed bottom-16 sm:bottom-0 inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
					<div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl max-h-[70vh] sm:max-h-[80vh] overflow-y-auto p-6">
						<div className="flex items-center justify-between mb-4 top-0 bg-white z-10">
							<h2 className="text-lg font-bold text-gray-900">🛒 Nouvelle liste</h2>
							<div className="flex items-center gap-2">
								<button onClick={() => setShowCreate(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
									<X size={18} />
								</button>
							</div>
						</div>
						<form onSubmit={handleCreateList} className="space-y-4">
							<input
								type="text"
								value={newListName}
								onChange={(e) => setNewListName(e.target.value)}
								placeholder="Courses de la semaine, Fête..."
								autoFocus
								required
								className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
							/>
							<button
								type="submit"
								disabled={createList.isPending || !newListName.trim()}
								className="w-full bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition disabled:opacity-50"
							>
								{createList.isPending ? "Création..." : "Créer la liste"}
							</button>
						</form>
					</div>
				</div>
			)}

			{/* Confirm delete */}
			{confirmDeleteId && (
				<ConfirmDialog
					message="Supprimer cette liste ?"
					confirmLabel="Supprimer"
					onConfirm={() => {
						deleteList.mutate(confirmDeleteId);
						setConfirmDeleteId(null);
					}}
					onCancel={() => setConfirmDeleteId(null)}
				/>
			)}
		</div>
	);
}
