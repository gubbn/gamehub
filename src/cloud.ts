import { createClient } from "@supabase/supabase-js";
import { db, validateBackup } from "./db";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloud = url && key ? createClient(url, key) : null;
export async function backup() {
  if (!cloud)
    throw new Error(
      "Cloud backup is not connected yet. Export a local backup instead.",
    );
  if (!navigator.onLine)
    throw new Error(
      "You’re offline. Your games are safely saved on this device.",
    );
  const {
    data: { user },
    error: authError,
  } = await cloud.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Sign in to back up your games.");
  const state = await db.state.get("main");
  if (!state) return;
  const { error } = await cloud
    .from("gamehub_backups")
    .upsert(
      {
        id: state.id,
        owner_id: user.id,
        device_name: "Holiday games",
        snapshot: { format: "gamehub", version: 1, state },
        revision: state.revision,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,id" },
    );
  if (error) throw error;
  await db.transaction("rw", db.state, async () => {
    const current = await db.state.get("main");
    if (current && current.id === state.id) {
      current.lastBackupRevision = state.revision;
      current.lastBackupAt = new Date().toISOString();
      await db.state.put(current);
    }
  });
}
export async function listBackups() {
  if (!cloud) return [];
  const { data, error } = await cloud
    .from("gamehub_backups")
    .select("id,device_name,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function restore(id: string) {
  if (!cloud) return;
  const { data, error } = await cloud
    .from("gamehub_backups")
    .select("snapshot")
    .eq("id", id)
    .single();
  if (error) throw error;
  const restored = validateBackup(data.snapshot);
  await db.state.put(restored);
}
