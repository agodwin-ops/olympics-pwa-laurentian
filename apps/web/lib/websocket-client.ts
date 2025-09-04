interface WebSocketMessage {
  type: string;
  timestamp?: string;
  data?: any;
  message?: string;
}

interface WebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onLeaderboardUpdate?: (data: any) => void;
  onProgressUpdate?: (data: any) => void;
  onAchievementNotification?: (data: any) => void;
  onAwardNotification?: (data: any) => void;
  onSystemAnnouncement?: (data: any) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

class OlympicsWebSocketClient {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private token: string | null = null;
  private options: WebSocketOptions = {};
  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isManualDisconnect: boolean = false;

  constructor(userId: string, token: string, options: WebSocketOptions = {}) {
    this.userId = userId;
    this.token = token;
    this.options = options;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const wsUrl = this.getWebSocketUrl();
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.clearHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_BASE_URL || 'localhost:8080';
    return `${protocol}//${host}/api/realtime/${this.userId}?token=${encodeURIComponent(this.token!)}`;
  }

  private handleOpen(): void {
    console.log('WebSocket connected successfully');
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();
    this.startHeartbeat();
    
    if (this.options.onConnect) {
      this.options.onConnect();
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle different message types
      switch (message.type) {
        case 'connection_established':
          console.log('WebSocket connection established:', message.data);
          break;
          
        case 'leaderboard_update':
          if (this.options.onLeaderboardUpdate) {
            this.options.onLeaderboardUpdate(message.data);
          }
          break;
          
        case 'progress_update':
          if (this.options.onProgressUpdate) {
            this.options.onProgressUpdate(message.data);
          }
          break;
          
        case 'achievement_notification':
          if (this.options.onAchievementNotification) {
            this.options.onAchievementNotification(message.data);
          }
          break;
          
        case 'award_notification':
          if (this.options.onAwardNotification) {
            this.options.onAwardNotification(message.data);
          }
          break;
          
        case 'system_announcement':
          if (this.options.onSystemAnnouncement) {
            this.options.onSystemAnnouncement(message.data);
          }
          break;
          
        case 'ping':
          // Respond to server ping
          this.sendMessage({ type: 'pong', timestamp: message.timestamp });
          break;
          
        case 'pong':
          // Server responded to our ping
          console.log('Received pong from server');
          break;
          
        case 'error':
          console.error('WebSocket server error:', message.message);
          break;
          
        default:
          console.log('Unknown message type:', message.type, message);
      }
      
      // Call general message handler
      if (this.options.onMessage) {
        this.options.onMessage(message);
      }
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    
    if (this.options.onDisconnect) {
      this.options.onDisconnect();
    }
    
    this.clearHeartbeat();
    
    // Attempt to reconnect if not a manual disconnect
    if (!this.isManualDisconnect && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    
    if (this.options.onError) {
      this.options.onError(event);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * this.reconnectAttempts, 30000); // Max 30 seconds
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isManualDisconnect) {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({ 
          type: 'ping', 
          timestamp: new Date().toISOString() 
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  // Convenience methods for common actions
  requestLeaderboard(): void {
    this.sendMessage({ type: 'request_leaderboard' });
  }

  requestProfile(): void {
    this.sendMessage({ type: 'request_profile' });
  }

  joinRoom(roomName: string): void {
    this.sendMessage({ type: 'join_room', room: roomName });
  }

  leaveRoom(roomName: string): void {
    this.sendMessage({ type: 'leave_room', room: roomName });
  }

  getConnectionState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export default OlympicsWebSocketClient;
export type { WebSocketMessage, WebSocketOptions };