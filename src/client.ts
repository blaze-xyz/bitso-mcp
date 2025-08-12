import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Config } from './config.js';
import { ApiResponse, ExampleResource, ExampleResourceList } from './types.js';
import { createLogger } from './utils/logging.js';

export class ApiClient {
  private client: AxiosInstance;
  private cache = new Map<string, { data: any; expires: number }>();
  private logToFile: (level: string, message: string, data?: any) => void;

  constructor(private config: Config) {
    this.logToFile = createLogger(import.meta.url, 'CLIENT');
    
    this.client = axios.create({
      baseURL: config.apiEndpoint,
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.setupResponseInterceptors();
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
      this.logToFile('INFO', 'Testing API connection...');
      
      // Implement your API health check endpoint here
      const response = await this.client.get('/health');
      
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

  async getResources(): Promise<ExampleResourceList> {
    const cacheKey = this.getCacheKey('/resources');
    const cached = this.getCachedData<ExampleResourceList>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      this.logToFile('INFO', 'Fetching resources from API...');
      
      const response: AxiosResponse<ApiResponse<ExampleResourceList>> = await this.client.get('/resources');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'API request failed');
      }

      const resources = response.data.data;
      this.setCachedData(cacheKey, resources);
      
      this.logToFile('INFO', 'Resources fetched successfully', { count: resources.length });
      return resources;
    } catch (error) {
      this.logToFile('ERROR', 'Failed to fetch resources', error);
      throw error;
    }
  }

  async getResource(id: string): Promise<ExampleResource> {
    const cacheKey = this.getCacheKey(`/resources/${id}`);
    const cached = this.getCachedData<ExampleResource>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      this.logToFile('INFO', 'Fetching resource from API...', { id });
      
      const response: AxiosResponse<ApiResponse<ExampleResource>> = await this.client.get(`/resources/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'API request failed');
      }

      const resource = response.data.data;
      this.setCachedData(cacheKey, resource);
      
      this.logToFile('INFO', 'Resource fetched successfully', { id, name: resource.name });
      return resource;
    } catch (error) {
      this.logToFile('ERROR', 'Failed to fetch resource', { id, error });
      throw error;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.logToFile('INFO', 'Cache cleared');
  }
}