"use client";

import { useEffect, useRef, useCallback, useState } from "react";

type MessageHandler = (data: Record<string, unknown>) => void;

export function useWebSocket(url: string | null, onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!url || !mountedRef.current) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) {
        setConnected(true);
        setError(null);
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        console.error("WS parse error", event.data);
      }
    };

    ws.onerror = () => {
      if (mountedRef.current) setError("Connection error");
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        setConnected(false);
        reconnectTimeout.current = setTimeout(connect, 3000);
      }
    };
  }, [url, onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, error, send };
}
