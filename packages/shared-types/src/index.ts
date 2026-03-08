// ─── Auth & Users ────────────────────────────────────────────────────────────

export interface User {
	id: string;
	email: string;
	name: string;
	avatar_url?: string;
	created_at: string;
}

// ─── Household ────────────────────────────────────────────────────────────────

export interface Household {
	id: string;
	name: string;
	invite_code: string;
	created_by: string;
	created_at: string;
}

export interface HouseholdMember {
	household_id: string;
	user_id: string;
	role: "admin" | "member";
	joined_at: string;
	user?: User;
}

// ─── Shopping ─────────────────────────────────────────────────────────────────

export type ShoppingCategory = "fruits_vegetables" | "meat_fish" | "dairy" | "bakery" | "frozen" | "drinks" | "hygiene" | "cleaning" | "other";

export interface ShoppingList {
	id: string;
	household_id: string;
	name: string;
	archived_at?: string;
	created_by: string;
	created_at: string;
}

export interface ShoppingItem {
	id: string;
	list_id: string;
	name: string;
	quantity: number;
	unit?: string;
	category: ShoppingCategory;
	is_urgent: boolean;
	checked_by?: string;
	checked_at?: string;
	assigned_to?: string;
	created_at: string;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory = "food" | "transport" | "housing" | "leisure" | "health" | "utilities" | "other";

export interface ExpenseGroup {
	id: string;
	household_id?: string;
	name: string;
	created_by: string;
	created_at: string;
}

export interface Expense {
	id: string;
	group_id: string;
	description: string;
	amount: number;
	paid_by: string;
	category: ExpenseCategory;
	date: string;
	created_at: string;
	splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
	id: string;
	expense_id: string;
	user_id: string;
	amount: number;
	is_paid: boolean;
	paid_at?: string;
}

export interface Balance {
	from_user_id: string;
	to_user_id: string;
	amount: number;
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export type BillCategory = "energy" | "internet" | "rent" | "insurance" | "subscription" | "phone" | "water" | "other";

export type BillFrequency = "monthly" | "quarterly" | "biannual" | "annual" | "one_time";

export interface Bill {
	id: string;
	household_id: string;
	provider: string;
	amount: number;
	category: BillCategory;
	frequency: BillFrequency;
	due_date: string;
	paid_at?: string;
	auto_renew: boolean;
	notes?: string;
	created_at: string;
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export * from "./calendar.types";
