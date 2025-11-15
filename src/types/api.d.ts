interface WebSocketMessage {
  action: string;
  [key: string]: any;
}

interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  errors?: string[];
}

type WebSocketClient = any;
