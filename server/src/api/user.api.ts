import { api } from "./api";

/**
 * GET USER PROFILE
 */
export async function getProfile() {
  return await api.GET<UserProfile>('auth/profile');
}