export type WsEnvelope = {
  wsMsgType: string;
  requestId?: string;
  serverTime?: string;
  clientTime?: string;
  [k: string]: unknown;
};
