export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  [key: string]: unknown;
}

export interface ToolError extends ToolResult {
  isError: true;
}

export interface Withdrawal {
  wid: string;
  status: string;
  created_at: string;
  currency: string;
  method: string;
  amount: string;
  asset?: string;
  network?: string;
  protocol?: string;
  details: Record<string, any>;
  origin_id?: string;
}

export interface Funding {
  fid: string;
  status: string;
  created_at: string;
  currency: string;
  method: string;
  amount: string;
  details: Record<string, any>;
}

export interface WithdrawalListResponse {
  success: boolean;
  payload: Withdrawal[];
}

export interface FundingListResponse {
  success: boolean;
  payload: Funding[];
}