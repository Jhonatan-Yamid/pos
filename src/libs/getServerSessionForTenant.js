import { getServerSession } from "next-auth/next";
import { authOptions } from "@/libs/authOptions";

/**
 * Thin wrapper over getServerSession using the shared authOptions.
 * Kept as a named export so callers don't import authOptions directly
 * and future changes to session config are isolated here.
 *
 * @returns {Promise<import("next-auth").Session|null>}
 */
export async function getServerSessionForTenant() {
  return getServerSession(authOptions);
}
