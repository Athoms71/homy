"use client";

import { useEffect } from "react";
import { useMyHouseholds } from "@/hooks/useHousehold";
import { useHouseholdStore } from "@/store/householdStore";

export function HouseholdInitializer() {
	const { data: householdsData } = useMyHouseholds();
	const { activeHouseholdId, setActiveHouseholdId } = useHouseholdStore();

	useEffect(() => {
		// Si on a récupéré les foyers, qu'il y en a au moins un, et qu'aucun n'est actif dans le store
		if (householdsData && householdsData.length > 0 && !activeHouseholdId) {
			// On définit le premier foyer comme actif par défaut
			setActiveHouseholdId((householdsData[0] as any).households.id);
		}
	}, [householdsData, activeHouseholdId, setActiveHouseholdId]);

	// Ce composant est "invisible"
	return null;
}
