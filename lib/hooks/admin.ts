
import useSWR, { mutate } from "swr";

const fetcher = (url: string, opts: any = {}) => fetch(url, opts).then(r => r.json());

export function useAdminUsers() {
  const { data, error } = useSWR("/api/admin/users", fetcher);
  return { users: data?.users || [], loading: !error && !data, error };
}

export function useAdminUser(id?: string) {
  const { data, error } = useSWR(id ? `/api/admin/users/${id}` : null, fetcher);
  return { user: data?.user || null, loading: !error && !data, error };
}

export async function adminCreateUser(payload: any) {
  const res = await fetch("/api/admin/users", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }});
  const json = await res.json();
  mutate("/api/admin/users");
  return json;
}

export async function adminUpdateUser(id: string, payload: any) {
  const res = await fetch(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }});
  const json = await res.json();
  mutate("/api/admin/users");
  return json;
}

export async function adminDeleteUser(id: string) {
  const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
  const json = await res.json();
  mutate("/api/admin/users");
  return json;
}

// Wallets
export function useAdminWallets() {
  const { data, error } = useSWR("/api/admin/wallets", fetcher);
  return { wallets: data?.wallets || [], loading: !error && !data, error };
}
export async function adminAdjustWallet(payload: any) {
  const res = await fetch("/api/admin/wallets", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }});
  const json = await res.json();
  mutate("/api/admin/wallets");
  mutate("/api/admin/users");
  return json;
}

// Transactions
export function useAdminTransactions() {
  const { data, error } = useSWR("/api/admin/transactions", fetcher);
  return { transactions: data?.transactions || [], loading: !error && !data, error };
}
export async function adminDeleteTransaction(id: string) {
  const res = await fetch("/api/admin/transactions", { method: "DELETE", body: JSON.stringify({ id }), headers: { "Content-Type": "application/json" }});
  const json = await res.json();
  mutate("/api/admin/transactions");
  return json;
}

// KYC
export function useAdminKyc() {
  const { data, error } = useSWR("/api/admin/kyc", fetcher);
  return { users: data?.users || [], loading: !error && !data, error };
}
export async function adminKycAction(id: string, action: "approve"|"reject") {
  const res = await fetch(`/api/admin/kyc/${id}`, { method: "POST", body: JSON.stringify({ action }), headers: { "Content-Type": "application/json" }});
  const json = await res.json();
  mutate("/api/admin/kyc");
  return json;
}

// Tickets
export function useAdminTickets() {
  const { data, error } = useSWR("/api/admin/tickets", fetcher);
  return { tickets: data?.tickets || [], loading: !error && !data, error };
}
export async function adminReplyTicket(id: string, payload: any) {
  const res = await fetch(`/api/admin/tickets/${id}`, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }});
  const json = await res.json();
  mutate("/api/admin/tickets");
  return json;
}

// Logs
export function useAdminLogs() {
  const { data, error } = useSWR("/api/admin/logs", fetcher);
  return { logs: data?.logs || [], loading: !error && !data, error };
}

// Settings
export function useAdminSettings() {
  const { data, error } = useSWR("/api/admin/settings", fetcher);
  return { settings: data?.settings || {}, loading: !error && !data, error };
}
export async function adminUpdateSettings(payload: any) {
  const res = await fetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }});
  const json = await res.json();
  mutate("/api/admin/settings");
  return json;
}

