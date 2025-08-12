import { config } from 'dotenv';
import { z } from 'zod';

config();

const ConfigSchema = z.object({
  // API Configuration - Customize for your service
  apiKey: z.string().min(1, 'API_KEY environment variable is required'),
  apiEndpoint: z.string().url().default('https://api.example.com'),
  
  // General Configuration
  cacheTtlSeconds: z.number().int().positive().default(300),
  timeout: z.number().int().positive().default(30000),
  
  // Optional Configuration
  defaultLimit: z.number().int().positive().default(100),
  debug: z.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  try {
    const rawConfig = {
      apiKey: process.env.API_KEY,
      apiEndpoint: process.env.API_ENDPOINT,
      cacheTtlSeconds: process.env.CACHE_TTL_SECONDS ? parseInt(process.env.CACHE_TTL_SECONDS, 10) : undefined,
      timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT, 10) : undefined,
      defaultLimit: process.env.DEFAULT_LIMIT ? parseInt(process.env.DEFAULT_LIMIT, 10) : undefined,
      debug: process.env.DEBUG === 'true',
    };

    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }
    throw error;
  }
}