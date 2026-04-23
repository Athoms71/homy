"use client";

import { useState, useEffect } from "react";
import { useMyHouseholds, useHouseholdMembers } from "@/hooks/useHousehold";
import { useExpenseGroups, useCreateExpenseGroup, useDeleteExpenseGroup } from "@/hooks/useExpenses";
import { ExpenseGroupView } from "@/components/modules/expenses/ExpenseGroupView";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { X, Settings, DollarSign, Plus, Trash2, Loader2, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ExpensesPage() {
	const { data: householdsData, isLoading: loadingHouseholds } = useMyHouseholds();
	const [householdId, setHouseholdId] = useState<string | null>(null);
	const [activeGroup, setActiveGroup] = useState<{ id: string; name: string } | null>(null);
	const [showCreate, setShowCreate] = useState(false);
	const [newGroupName, setNewGroupName] = useState("");
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	useEffect(() => {
		createClient()
			.auth.getUser()
			.then(({ data }) => setCurrentUserId(data.user?.id ?? null));
	}, []);

	useEffect(() => {
		if (householdsData && householdsData.length > 0 && !householdId) {
			setHouseholdId((householdsData[0] as any).households.id);
		}
	}, [householdsData, householdId]);

	const { data: groups = [], isLoading: loadingGroups } = useExpenseGroups(householdId);
	const { data: membersData = [] } = useHouseholdMembers(householdId);
	const createGroup = useCreateExpenseGroup(householdId ?? "");
	const deleteGroup = useDeleteExpenseGroup(householdId ?? "");

	const members = membersData.map((m: any) => ({ id: m.profiles.id, name: m.profiles.name }));

	function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		if (!newGroupName.trim() || !householdId) return;
		createGroup.mutate(newGroupName.trim(), {
			onSuccess: (group) => {
				setNewGroupName("");
				setShowCreate(false);
				setActiveGroup(group);
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

	if (activeGroup && currentUserId) return <ExpenseGroupView group={activeGroup} members={members} currentUserId={currentUserId} onBack={() => setActiveGroup(null)} />;

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<div className="flex flex-col">
						<h1 className="text-2xl font-bold text-gray-900">💸 Soldes partagés</h1>
						<h2 className="text-gray-500 text-sm mt-1">Gérez vos dépenses en commun</h2>
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

			{loadingGroups ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="animate-spin text-primary-600" size={24} />
				</div>
			) : groups.length === 0 ? (
				<div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
					<DollarSign size={40} className="mx-auto text-gray-300 mb-4" />
					<h2 className="font-semibold text-gray-600 mb-1">Aucun groupe</h2>
					<p className="text-gray-400 text-sm mb-4">Crée un groupe pour suivre vos dépenses.</p>
					<button onClick={() => setShowCreate(true)} className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-700 transition">
						Créer un groupe
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{groups.map((group: any) => (
						<div
							key={group.id}
							onClick={() => setActiveGroup(group)}
							className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center gap-4 hover:border-primary-300 transition cursor-pointer"
						>
							<DollarSign size={22} className="text-primary-400 flex-shrink-0" />
							<div className="flex-1 min-w-0">
								<p className="font-semibold text-gray-800">{group.name}</p>
								<p className="text-gray-400 text-xs mt-0.5">Créé le {new Date(group.created_at).toLocaleDateString("fr-FR")}</p>
							</div>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setConfirmDeleteId(group.id);
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
							<h2 className="text-lg font-bold text-gray-900">💸 Nouveau groupe</h2>
							<div className="flex items-center gap-2">
								<button onClick={() => setShowCreate(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
									<X size={18} />
								</button>
							</div>
						</div>
						<form onSubmit={handleCreate} className="space-y-4">
							<input
								type="text"
								value={newGroupName}
								onChange={(e) => setNewGroupName(e.target.value)}
								placeholder="Vacances, Coloc, Mariage..."
								autoFocus
								required
								className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
							/>
							<button
								type="submit"
								disabled={createGroup.isPending || !newGroupName.trim()}
								className="w-full bg-primary-600 text-white font-semibold py-2.5 rounded-xl hover:bg-primary-700 transition disabled:opacity-50"
							>
								{createGroup.isPending ? "Création..." : "Créer le groupe"}
							</button>
						</form>
					</div>
				</div>
			)}

			{confirmDeleteId && (
				<ConfirmDialog
					message="Supprimer ce groupe et toutes ses dépenses ?"
					confirmLabel="Supprimer"
					onConfirm={() => {
						deleteGroup.mutate(confirmDeleteId);
						setConfirmDeleteId(null);
					}}
					onCancel={() => setConfirmDeleteId(null)}
				/>
			)}
		</div>
	);
}
