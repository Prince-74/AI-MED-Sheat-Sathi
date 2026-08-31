// src/service/httpService.ts

let resolvedBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");
if (!resolvedBaseUrl.endsWith("/api")) {
  resolvedBaseUrl += "/api";
}

export const BASE_URL = resolvedBaseUrl;

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: any;
}

interface RequestOptions {
  headers?: Record<string, string>;
  _isRetry?: boolean;
}

class HttpService {
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private getAuthHeaders(isFormData: boolean = false): Record<string, string> {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async tryRefreshToken(): Promise<string | null> {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        return null;
      }

      const json = await response.json();
      const newToken = json?.data?.token;
      if (newToken) {
        localStorage.setItem("token", newToken);
        return newToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async makeRequest<T = any>(
    endPoint: string,
    method: string,
    body?: any,
    auth: boolean = true,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const cleanEndpoint = endPoint.startsWith("/") ? endPoint : `/${endPoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

    const headers = {
      ...(auth ? this.getAuthHeaders(isFormData) : (isFormData ? {} : { "Content-Type": "application/json" })),
      ...options?.headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        credentials: "include",
        body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      });

      // 401 Unauthorized handling for authenticated requests
      if (response.status === 401 && auth && !options?._isRetry && cleanEndpoint !== "/auth/refresh" && cleanEndpoint !== "/auth/login") {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          const newToken = await this.tryRefreshToken();
          this.isRefreshing = false;

          if (newToken) {
            this.onRefreshed(newToken);
            return this.makeRequest<T>(endPoint, method, body, auth, { ...options, _isRetry: true });
          } else {
            localStorage.removeItem("token");
          }
        } else {
          // Wait for active refresh
          const retryPromise = new Promise<ApiResponse<T>>((resolve, reject) => {
            this.subscribeTokenRefresh(async (newToken) => {
              if (newToken) {
                try {
                  const res = await this.makeRequest<T>(endPoint, method, body, auth, {
                    ...options,
                    _isRetry: true,
                  });
                  resolve(res);
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(new Error("Session expired. Please log in again."));
              }
            });
          });
          return retryPromise;
        }
      }

      const contentType = response.headers.get("Content-Type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { success: response.ok, message: text, data: text };
      }

      if (!response.ok) {
        const errorMsg =
          data?.message ||
          (Array.isArray(data?.errors) ? data.errors.map((e: any) => e.msg || e).join(", ") : "") ||
          `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (cleanEndpoint !== "/auth/refresh") {
        console.error(`API Error [${method} ${cleanEndpoint}] ?`, errorMsg);
      }
      throw error;
    }
  }

  // ---- Authenticated Requests ----
  getWithAuth<T = any>(endPoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "GET", undefined, true, options);
  }

  postWithAuth<T = any, B = any>(endPoint: string, body: B, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "POST", body, true, options);
  }

  putWithAuth<T = any, B = any>(endPoint: string, body: B, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "PUT", body, true, options);
  }

  deleteWithAuth<T = any>(endPoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "DELETE", undefined, true, options);
  }

  // ---- Public Requests ----
  postWithoutAuth<T = any, B = any>(endPoint: string, body: B, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "POST", body, false, options);
  }

  getWithoutAuth<T = any>(endPoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "GET", undefined, false, options);
  }

  // File Upload
  uploadWithAuth<T = any>(endPoint: string, formData: FormData): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "POST", formData, true);
  }
}

export const httpService = new HttpService();

export const getWithAuth = httpService.getWithAuth.bind(httpService);
export const postWithAuth = httpService.postWithAuth.bind(httpService);
export const putWithAuth = httpService.putWithAuth.bind(httpService);
export const deleteWithAuth = httpService.deleteWithAuth.bind(httpService);
export const postWithoutAuth = httpService.postWithoutAuth.bind(httpService);
export const getWithoutAuth = httpService.getWithoutAuth.bind(httpService);
export const uploadWithAuth = httpService.uploadWithAuth.bind(httpService);
