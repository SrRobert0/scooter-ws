export interface WebSocketMessage {
  action: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  errors?: string[];
}

export type WebSocketClient = any; // Will be WebSocket from 'ws'
