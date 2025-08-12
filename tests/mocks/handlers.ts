import { http, HttpResponse } from 'msw';
import { Funding, Withdrawal, FundingListResponse, WithdrawalListResponse, FundingStatus, FundingMethod } from '../../src/types.js';

// Mock Bitso data
const mockFundings: Funding[] = [
  {
    fid: 'f1234567890abcdef',
    status: FundingStatus.COMPLETE,
    created_at: '2025-08-12T01:54:02+00:00',
    currency: 'usd',
    method: FundingMethod.USDC_TRF,
    amount: '29.99',
    details: { 
      transaction_hash: '0x123abc456def',
      network: 'ethereum'
    }
  },
  {
    fid: 'f2234567890abcdef',
    status: FundingStatus.COMPLETE,
    created_at: '2025-08-03T18:56:49+00:00',
    currency: 'usd',
    method: FundingMethod.USDC_TRF,
    amount: '371.21',
    details: {
      transaction_hash: '0x789ghi012jkl',
      network: 'ethereum'
    }
  },
  {
    fid: 'f3234567890abcdef',
    status: FundingStatus.PENDING,
    created_at: '2025-08-12T10:00:00+00:00',
    currency: 'mxn',
    method: FundingMethod.PRAXIS,
    amount: '500.00',
    details: {
      bank_account: '**** 1234',
      reference: 'REF123456'
    }
  },
  {
    fid: 'f4234567890abcdef',
    status: FundingStatus.FAILED,
    created_at: '2025-08-11T15:30:00+00:00',
    currency: 'btc',
    method: FundingMethod.BTC,
    amount: '0.001',
    details: {
      error_reason: 'Insufficient funds',
      retry_count: 3
    }
  }
];

const mockWithdrawals: Withdrawal[] = [
  {
    wid: 'w1234567890abcdef',
    status: 'complete',
    created_at: '2025-08-12T01:54:02+00:00',
    currency: 'usd',
    method: 'usdc_trf',
    amount: '100.00',
    details: {
      destination_address: '0xabc123def456',
      transaction_hash: '0x999zzz888yyy'
    },
    origin_id: 'client_ref_001'
  },
  {
    wid: 'w2234567890abcdef',
    status: 'pending',
    created_at: '2025-08-12T10:00:00+00:00',
    currency: 'btc',
    method: 'btc',
    amount: '0.005',
    details: {
      destination_address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
    }
  }
];

export const handlers = [
  // Bitso Fundings API - List fundings
  http.get('https://api.bitso.com/api/v3/fundings', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '25');
    const status = url.searchParams.get('status');
    const method = url.searchParams.get('method');
    const fids = url.searchParams.get('fids');
    
    let filteredFundings = [...mockFundings];
    
    // Apply filters
    if (status) {
      filteredFundings = filteredFundings.filter(f => f.status === status);
    }
    if (method) {
      filteredFundings = filteredFundings.filter(f => f.method === method);
    }
    if (fids) {
      const fidList = fids.split(',');
      filteredFundings = filteredFundings.filter(f => fidList.includes(f.fid));
    }
    
    // Apply limit
    filteredFundings = filteredFundings.slice(0, limit);
    
    const response: FundingListResponse = {
      success: true,
      payload: filteredFundings
    };
    return HttpResponse.json(response);
  }),

  // Bitso Fundings API - Get specific funding
  http.get('https://api.bitso.com/api/v3/fundings/:fid', ({ params }) => {
    const { fid } = params;
    const funding = mockFundings.find(f => f.fid === fid);
    
    if (!funding) {
      return HttpResponse.json(
        { success: false, error: { message: `Funding with ID ${fid} not found` } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      payload: funding
    });
  }),

  // Bitso Withdrawals API - List withdrawals  
  http.get('https://api.bitso.com/api/v3/withdrawals', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '25');
    const status = url.searchParams.get('status');
    const method = url.searchParams.get('method');
    const origin_ids = url.searchParams.get('origin_ids');
    const wids = url.searchParams.get('wids');
    
    let filteredWithdrawals = [...mockWithdrawals];
    
    // Apply filters
    if (status) {
      filteredWithdrawals = filteredWithdrawals.filter(w => w.status === status);
    }
    if (method) {
      filteredWithdrawals = filteredWithdrawals.filter(w => w.method === method);
    }
    if (origin_ids) {
      const originIdList = origin_ids.split(',');
      filteredWithdrawals = filteredWithdrawals.filter(w => w.origin_id && originIdList.includes(w.origin_id));
    }
    if (wids) {
      const widList = wids.split(',');
      filteredWithdrawals = filteredWithdrawals.filter(w => widList.includes(w.wid));
    }
    
    // Apply limit
    filteredWithdrawals = filteredWithdrawals.slice(0, limit);
    
    const response: WithdrawalListResponse = {
      success: true,
      payload: filteredWithdrawals
    };
    return HttpResponse.json(response);
  }),

  // Bitso Withdrawals API - Get specific withdrawal
  http.get('https://api.bitso.com/api/v3/withdrawals/:wid', ({ params }) => {
    const { wid } = params;
    const withdrawal = mockWithdrawals.find(w => w.wid === wid);
    
    if (!withdrawal) {
      return HttpResponse.json(
        { success: false, error: { message: `Withdrawal with ID ${wid} not found` } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      payload: withdrawal
    });
  }),

  // Error simulation endpoints for testing error handling
  http.get('https://api.bitso.com/api/v3/error/401', () => {
    return HttpResponse.json(
      { success: false, error: { message: 'Unauthorized' } },
      { status: 401 }
    );
  }),

  http.get('https://api.bitso.com/api/v3/error/500', () => {
    return HttpResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }),
];