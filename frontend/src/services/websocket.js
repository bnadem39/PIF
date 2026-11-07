import { Client } from '@stomp/stompjs';

const WS_ENDPOINT = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

/**
 * Creates and manages a WebSocket STOMP client for an active Arena Room.
 */
export function createArenaWebSocket({
  roomId,
  onTick,
  onLeaderboard,
  onOrder,
  onStatusChange,
  onError,
  onConnect
}) {
  const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('token');

  // Convert http/https to ws/wss if needed
  let brokerURL = WS_ENDPOINT;
  if (brokerURL.startsWith('http://')) {
    brokerURL = brokerURL.replace('http://', 'ws://');
  } else if (brokerURL.startsWith('https://')) {
    brokerURL = brokerURL.replace('https://', 'wss://');
  }

  const client = new Client({
    brokerURL,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {}, // silent in prod
    onConnect: () => {
      if (onConnect) onConnect();

      // Subscribe to real-time market ticks
      if (onTick) {
        client.subscribe(`/topic/room/${roomId}/tick`, (message) => {
          try {
            const data = JSON.parse(message.body);
            onTick(data);
          } catch (e) {
            console.error('[WS] Parse tick error', e);
          }
        });
      }

      // Subscribe to live leaderboard rankings
      if (onLeaderboard) {
        client.subscribe(`/topic/room/${roomId}/leaderboard`, (message) => {
          try {
            const data = JSON.parse(message.body);
            onLeaderboard(data);
          } catch (e) {
            console.error('[WS] Parse leaderboard error', e);
          }
        });
      }

      // Subscribe to executed orders feed
      if (onOrder) {
        client.subscribe(`/topic/room/${roomId}/orders`, (message) => {
          try {
            const data = JSON.parse(message.body);
            onOrder(data);
          } catch (e) {
            console.error('[WS] Parse order error', e);
          }
        });
      }

      // Subscribe to room status changes (WAITING -> RUNNING -> PAUSED -> FINISHED)
      if (onStatusChange) {
        client.subscribe(`/topic/room/${roomId}/status`, (message) => {
          try {
            const data = JSON.parse(message.body);
            onStatusChange(data);
          } catch (e) {
            console.error('[WS] Parse status error', e);
          }
        });
      }
    },
    onStompError: (frame) => {
      console.warn('[WS STOMP] Broker reported error:', frame.headers['message']);
      if (onError) onError(frame);
    },
    onWebSocketClose: () => {
      // Automatic reconnect handles it
    }
  });

  client.activate();

  return {
    client,
    disconnect: () => {
      try {
        client.deactivate();
      } catch (_) {}
    },
    sendOrder: (orderPayload) => {
      if (client.connected) {
        client.publish({
          destination: `/app/room/${roomId}/order`,
          body: JSON.stringify(orderPayload)
        });
      }
    }
  };
}

/**
 * Subscribes to real-time invitations for a specific user.
 */
export function subscribeToInvitations(username, onInvitation) {
  if (!username) return { disconnect: () => {} };
  const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('token');
  let brokerURL = WS_ENDPOINT;
  if (brokerURL.startsWith('http://')) {
    brokerURL = brokerURL.replace('http://', 'ws://');
  } else if (brokerURL.startsWith('https://')) {
    brokerURL = brokerURL.replace('https://', 'wss://');
  }

  const client = new Client({
    brokerURL,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      client.subscribe(`/topic/invitations/${username}`, (message) => {
        try {
          const inv = JSON.parse(message.body);
          if (onInvitation) onInvitation(inv);
        } catch (e) {
          console.error('[WS] Parse invitation error', e);
        }
      });
    }
  });

  client.activate();

  return {
    client,
    disconnect: () => {
      try {
        client.deactivate();
      } catch (_) {}
    }
  };
}

/**
 * Abonnement générique à un topic STOMP avec retour d'une fonction de désabonnement.
 */
export function subscribeToTopic(topic, onMessage) {
  const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('token');
  let brokerURL = WS_ENDPOINT;
  if (brokerURL.startsWith('http://')) {
    brokerURL = brokerURL.replace('http://', 'ws://');
  } else if (brokerURL.startsWith('https://')) {
    brokerURL = brokerURL.replace('https://', 'wss://');
  }

  const client = new Client({
    brokerURL,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      client.subscribe(topic, (message) => {
        try {
          const payload = JSON.parse(message.body);
          if (onMessage) onMessage(payload);
        } catch (e) {
          if (onMessage) onMessage(message.body);
        }
      });
    }
  });

  client.activate();

  return () => {
    try {
      client.deactivate();
    } catch (_) {}
  };
}

