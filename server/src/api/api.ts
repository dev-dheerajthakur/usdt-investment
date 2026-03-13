import axios from 'axios';
const serverUrl = 'http://localhost:5000/api/v1';

export const ENDPOINTS = {
  LOGIN: 'auth/login',
  REGISTER: 'auth/register',
};

/**
 * CLASS API
 */
class Api {
  private api: axios.AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: serverUrl,
      withCredentials: true,
      validateStatus: () => true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async GET<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const res = await this.api.get<ApiResponse<T>>(url);
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error',
        data: null as any,
      };
    }
  }

  async POST<T>(
    url: string,
    payload: Record<string, unknown>,
  ): Promise<ApiResponse<T>> {
    try {
      const res = await this.api.post<ApiResponse<T>>(url, payload);
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error',
        data: null as any,
      };
    }
  }
}

/**
 * INITIALIZE API
 */
export const api = new Api();
