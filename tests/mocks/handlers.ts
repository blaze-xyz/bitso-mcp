import { http, HttpResponse } from 'msw';
import { WithdrawalListResponse, FundingListResponse } from '../../src/types.js';

export const handlers = [
  // Bitso API withdrawals endpoint for testConnection
  http.get('https://api.bitso.com/api/v3/withdrawals', () => {
    const response: WithdrawalListResponse = {
      success: true,
      payload: []
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  // Bitso API fundings endpoint for export_fundings testing
  http.get('https://api.bitso.com/api/v3/fundings', () => {
    const response: FundingListResponse = {
      success: true,
      payload: [
        {
          fid: 'f1',
          status: 'complete',
          created_at: '2025-06-06T10:22:39Z',
          currency: 'usd',
          method: 'Circle Transfer',
          amount: '198.00',
          details: {}
        },
        {
          fid: 'f2', 
          status: 'complete',
          created_at: '2025-06-02T17:00:07Z',
          currency: 'usd',
          method: 'Circle Transfer',
          amount: '104.10',
          details: {}
        }
      ]
    };
    return HttpResponse.json(response, { status: 200 });
  }),
];
