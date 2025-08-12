import { http, HttpResponse } from 'msw';
import { ExampleResource, ExampleResourceList, ApiResponse } from '../../src/types.js';

// Mock data
const mockResources: ExampleResourceList = [
  {
    id: '1',
    name: 'Example Resource 1',
    description: 'This is the first example resource',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Example Resource 2',
    description: 'This is the second example resource',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    name: 'Test Resource',
    description: 'A resource for testing purposes',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

export const handlers = [
  // Health check endpoint
  http.get('https://api.example.com/health', () => {
    return HttpResponse.json({ status: 'ok' }, { status: 200 });
  }),

  // List resources endpoint
  http.get('https://api.example.com/resources', () => {
    const response: ApiResponse<ExampleResourceList> = {
      data: mockResources,
      success: true,
      message: 'Resources retrieved successfully',
    };
    return HttpResponse.json(response);
  }),

  // Get specific resource endpoint
  http.get('https://api.example.com/resources/:id', ({ params }) => {
    const { id } = params;
    const resource = mockResources.find(r => r.id === id);
    
    if (!resource) {
      const errorResponse: ApiResponse = {
        data: null,
        success: false,
        message: `Resource with ID ${id} not found`,
      };
      return HttpResponse.json(errorResponse, { status: 404 });
    }

    const response: ApiResponse<ExampleResource> = {
      data: resource,
      success: true,
      message: 'Resource retrieved successfully',
    };
    return HttpResponse.json(response);
  }),

  // Error simulation endpoints for testing error handling
  http.get('https://api.example.com/error/500', () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),

  http.get('https://api.example.com/error/timeout', async () => {
    // Simulate timeout by delaying response beyond client timeout
    await new Promise(resolve => setTimeout(resolve, 35000));
    return HttpResponse.json({ data: [] });
  }),
];