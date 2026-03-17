import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { BASE_URL } from './endpoints';

/**
 * API Client for handling HTTP requests
 * Supports GET, POST, PUT, PATCH, DELETE methods
 */
export class APIClient {
  private client: AxiosInstance;
  private token: string = '';

  constructor(baseURL: string = BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * GET request
   */
  async get(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.get(endpoint, config);
  }

  /**
   * POST request
   */
  async post(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.post(endpoint, data, config);
  }

  /**
   * PUT request
   */
  async put(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.put(endpoint, data, config);
  }

  /**
   * PATCH request
   */
  async patch(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.patch(endpoint, data, config);
  }

  /**
   * DELETE request
   */
  async delete(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.client.delete(endpoint, config);
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = '';
    delete this.client.defaults.headers.common['Authorization'];
  }
}
