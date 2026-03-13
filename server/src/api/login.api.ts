import { api, ENDPOINTS } from "./api";

/**
 * LOGIN USER
 */
export async function loginUser(payload: LoginPayload) {
  return await api.POST<LoginData>(ENDPOINTS.LOGIN, payload);
}
