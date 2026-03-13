import { api, ENDPOINTS } from "./api";

/**
 * REGISTER USER
 */
export async function registerUser(payload: RegisterPayload) {
  return api.POST<RegisterData>(ENDPOINTS.REGISTER, payload);
}
