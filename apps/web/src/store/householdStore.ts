import { create } from "zustand";

interface HouseholdStore {
	activeHouseholdId: string | null;
	setActiveHouseholdId: (id: string | null) => void;
}

export const useHouseholdStore = create<HouseholdStore>((set) => ({
	activeHouseholdId: null,
	setActiveHouseholdId: (id) => set({ activeHouseholdId: id }),
}));
