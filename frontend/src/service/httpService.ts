// src/services/httpService.ts

// In React (Vite/CRA), environment variables must start with VITE_ or REACT_APP_
// Example: VITE_API_URL=http://localhost:5000  (for Vite)
// or REACT_APP_API_URL=http://localhost:5000   (for CRA)

const BASE_URL =
  import.meta.env.VITE_API_URL || process.env.REACT_APP_API_URL || https://ai-med-sheat-sathi.onrender.com ;

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: unknown;
}


interface RequestOptions {
  headers?: Record<string, string>;
}

class HttpService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private getHeaders(auth: boolean = true): Record<string, string> {
    return auth ? this.getAuthHeaders() : { "Content-Type": "application/json" };
  }

  private async makeRequest<T = unknown>(
    endPoint: string,
    method: string,
    body?: unknown ,
    auth: boolean = true,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endPoint}`;
    const headers = {
      ...this.getHeaders(auth),
      ...options?.headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) }),
      });

      const contentType = response.headers.get("Content-Type");
      const data = contentType?.includes("application/json")
        ? await response.json()
        : { message: await response.text(), success: response.ok };

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error: unknown) {
      const errorMsg =
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message
          : String(error);
      console.error(`API Error [${method} ${endPoint}] →`, errorMsg);
      throw error;
    }
  }

  // ---- Authenticated Requests ----
  getWithAuth<T = any>(endPoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "GET", null, true, options);
  }

  postWithAuth<T = any, B = any>(endPoint: string, body: B, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "POST", body, true, options);
  }

  putWithAuth<T = unknown, B = unknown>(endPoint: string, body: B, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "PUT", body, true, options);
  }

  deleteWithAuth<T = unknown, B = unknown>(endPoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "DELETE", null, true, options);
  }

  // ---- Public (No Auth) Requests ----
  postWithoutAuth<T = any, B = any>(endPoint: string, body: B, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "POST", body, false, options);
  }

  getWithoutAuth<T = unknown>(endPoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endPoint, "GET", null, false, options);
  }
}

export const httpService = new HttpService();

// Shortcut exports for convenience
export const getWithAuth = httpService.getWithAuth.bind(httpService);
export const postWithAuth = httpService.postWithAuth.bind(httpService);
export const putWithAuth = httpService.putWithAuth.bind(httpService);
export const deleteWithAuth = httpService.deleteWithAuth.bind(httpService);

export const getWithoutAuth = httpService.getWithoutAuth.bind(httpService);
export const postWithoutAuth = httpService.postWithoutAuth.bind(httpService);
