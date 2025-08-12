import axios, { AxiosInstance, AxiosResponse } from 'axios';
import crypto from 'crypto';
import { Config } from './config.js';
import { Withdrawal, Funding, WithdrawalListResponse, FundingListResponse } from './types.js';
import { createLogger } from './utils/logging.js';

export class BitsoApiClient {
  private client: AxiosInstance;
  private cache = new Map<string, { data: any; expires: number }>();
  private logToFile: (level: string, message: string, data?: any) => void;

  constructor(private config: Config) {
    this.logToFile = createLogger(import.meta.url, 'CLIENT');
    
    this.client = axios.create({
      baseURL: config.apiEndpoint,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupResponseInterceptors();
  }

  private generateSignature(nonce: string, httpMethod: string, requestPath: string, body?: string): string {
    const message = nonce + httpMethod + requestPath + (body || '');
    return crypto.createHmac('sha256', this.config.apiSecret).update(message).digest('hex');
  }

  private createAuthHeaders(httpMethod: string, requestPath: string, body?: string): Record<string, string> {
    const nonce = Date.now().toString();
    const signature = this.generateSignature(nonce, httpMethod, requestPath, body);

    return {
      'Authorization': `Bitso ${this.config.apiKey}:${nonce}:${signature}`,
    };
  }

  private setupResponseInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logToFile('ERROR', 'API request failed', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
        });
        throw error;
      }
    );
  }

  private getCacheKey(url: string, params?: any): string {
    return `${url}${params ? JSON.stringify(params) : ''}`;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      this.logToFile('DEBUG', 'Cache hit', { key });
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
      this.logToFile('DEBUG', 'Cache expired', { key });
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T): void {
    const expires = Date.now() + (this.config.cacheTtlSeconds * 1000);
    this.cache.set(key, { data, expires });
    this.logToFile('DEBUG', 'Cache set', { key, expires: new Date(expires) });
  }

  async testConnection(): Promise<boolean> {
    try {
      this.logToFile('INFO', 'Testing Bitso API connection...');
      
      const requestPath = '/api/v3/withdrawals';
      const authHeaders = this.createAuthHeaders('GET', requestPath);
      
      const response = await this.client.get(requestPath, {
        headers: authHeaders,
        params: { limit: 1 }
      });
      
      const isHealthy = response.status === 200;
      this.logToFile(isHealthy ? 'INFO' : 'WARN', 'Connection test result', { 
        status: response.status, 
        healthy: isHealthy 
      });
      
      return isHealthy;
    } catch (error) {
      this.logToFile('ERROR', 'Connection test failed', error);
      return false;
    }
  }

  async getWithdrawals(params?: {
    currency?: string;
    limit?: number;
    marker?: string;
    method?: string;
    origin_id?: string;
    status?: string;
    wid?: string;
  }): Promise<WithdrawalListResponse> {
    const cacheKey = this.getCacheKey('/api/v3/withdrawals', params);
    const cached = this.getCachedData<WithdrawalListResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const requestPath = '/api/v3/withdrawals';
      const authHeaders = this.createAuthHeaders('GET', requestPath);
      
      this.logToFile('INFO', 'Fetching withdrawals from Bitso API...', params);
      
      const response: AxiosResponse<WithdrawalListResponse> = await this.client.get(requestPath, {
        headers: authHeaders,
        params
      });
      
      this.setCachedData(cacheKey, response.data);
      
      this.logToFile('INFO', 'Withdrawals fetched successfully', { count: response.data.payload?.length || 0 });
      return response.data;
    } catch (error) {
      this.logToFile('ERROR', 'Failed to fetch withdrawals', error);
      throw error;
    }
  }

  async getWithdrawal(wid: string): Promise<Withdrawal> {
    const cacheKey = this.getCacheKey(`/api/v3/withdrawals/${wid}`);
    const cached = this.getCachedData<Withdrawal>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const requestPath = `/api/v3/withdrawals/${wid}`;
      const authHeaders = this.createAuthHeaders('GET', requestPath);
      
      this.logToFile('INFO', 'Fetching withdrawal from Bitso API...', { wid });
      
      const response: AxiosResponse<{ success: boolean; payload: Withdrawal }> = await this.client.get(requestPath, {
        headers: authHeaders
      });
      
      if (!response.data.success) {
        throw new Error('API request failed');
      }

      const withdrawal = response.data.payload;
      this.setCachedData(cacheKey, withdrawal);
      
      this.logToFile('INFO', 'Withdrawal fetched successfully', { wid });
      return withdrawal;
    } catch (error) {
      this.logToFile('ERROR', 'Failed to fetch withdrawal', { wid, error });
      throw error;
    }
  }

  async getFundings(params?: {
    limit?: number;
    marker?: string;
    method?: string;
    status?: string;
    fids?: string;
  }): Promise<FundingListResponse> {
    const cacheKey = this.getCacheKey('/api/v3/fundings', params);
    const cached = this.getCachedData<FundingListResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const requestPath = '/api/v3/fundings';
      const authHeaders = this.createAuthHeaders('GET', requestPath);
      
      this.logToFile('INFO', 'Fetching fundings from Bitso API...', params);
      this.logToFile('DEBUG', 'Request details', { 
        path: requestPath, 
        params: params,
        serializedParams: new URLSearchParams(params as any).toString()
      });
      
      const response: AxiosResponse<FundingListResponse> = await this.client.get(requestPath, {
        headers: authHeaders,
        params
      });
      
      this.setCachedData(cacheKey, response.data);
      
      this.logToFile('INFO', 'Fundings fetched successfully', { 
        count: response.data.payload?.length || 0,
        requestedLimit: params?.limit,
        actualCount: response.data.payload?.length || 0
      });
      return response.data;
    } catch (error) {
      this.logToFile('ERROR', 'Failed to fetch fundings', error);
      throw error;
    }
  }

  async getFunding(fid: string): Promise<Funding> {
    const cacheKey = this.getCacheKey(`/api/v3/fundings/${fid}`);
    const cached = this.getCachedData<Funding>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const requestPath = `/api/v3/fundings/${fid}`;
      const authHeaders = this.createAuthHeaders('GET', requestPath);
      
      this.logToFile('INFO', 'Fetching funding from Bitso API...', { fid });
      
      const response: AxiosResponse<{ success: boolean; payload: Funding }> = await this.client.get(requestPath, {
        headers: authHeaders
      });
      
      if (!response.data.success) {
        throw new Error('API request failed');
      }

      const funding = response.data.payload;
      this.setCachedData(cacheKey, funding);
      
      this.logToFile('INFO', 'Funding fetched successfully', { fid });
      return funding;
    } catch (error) {
      this.logToFile('ERROR', 'Failed to fetch funding', { fid, error });
      throw error;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.logToFile('INFO', 'Cache cleared');
  }
}