import type { ShoppingCategory } from "@homy/shared-types";

export const CATEGORIES: {
	value: ShoppingCategory;
	label: string;
	emoji: string;
	color: string;
}[] = [
	{ value: "fruits_vegetables", label: "Fruits & Légumes", emoji: "🥦", color: "bg-green-100 text-green-700" },
	{ value: "meat", label: "Viandes", emoji: "🥩", color: "bg-red-100 text-red-700" },
	{ value: "fish", label: "Poissons", emoji: "🐟", color: "bg-blue-100 text-blue-700" },
	{ value: "dairy", label: "Produits laitiers", emoji: "🧀", color: "bg-yellow-100 text-yellow-700" },
	{ value: "bakery", label: "Boulangerie", emoji: "🥖", color: "bg-orange-100 text-orange-700" },
	{ value: "frozen", label: "Surgelés", emoji: "🧊", color: "bg-blue-100 text-blue-700" },
	{ value: "drinks", label: "Boissons", emoji: "🥤", color: "bg-cyan-100 text-cyan-700" },
	{ value: "snacks", label: "Snacks & Sucreries", emoji: "🍪", color: "bg-pink-100 text-pink-700" },
	{ value: "grocery", label: "Conserves & Épicerie", emoji: "🥫", color: "bg-amber-100 text-amber-700" },
	{ value: "bio", label: "Produits bio", emoji: "♻️", color: "bg-lime-100 text-lime-700" },
	{ value: "condiments", label: "Condiments & Sauces", emoji: "🧂", color: "bg-lime-100 text-lime-700" },
	{ value: "hygiene", label: "Hygiène", emoji: "🧴", color: "bg-purple-100 text-purple-700" },
	{ value: "cleaning", label: "Entretien", emoji: "🧹", color: "bg-teal-100 text-teal-700" },
	{ value: "baby", label: "Bébé", emoji: "🍼", color: "bg-rose-100 text-rose-700" },
	{ value: "pets", label: "Animaux", emoji: "🐾", color: "bg-stone-100 text-stone-700" },
	{ value: "other", label: "Autre", emoji: "🛒", color: "bg-gray-100 text-gray-700" },
];

export function getCategoryInfo(value: ShoppingCategory) {
	return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}
