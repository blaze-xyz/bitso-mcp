import { http, HttpResponse } from 'msw';
import { WithdrawalListResponse } from '../../src/types.js';

export const handlers = [
  // Bitso API withdrawals endpoint for testConnection
  http.get('https://api.bitso.com/api/v3/withdrawals', () => {
    const response: WithdrawalListResponse = {
      success: true,
      payload: []
    };
    return HttpResponse.json(response, { status: 200 });
  }),
];