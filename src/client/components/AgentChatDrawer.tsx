import React, { useState } from 'react';
import type { AgentMessage } from '@shared/types';
import './AgentChatDrawer.css';

interface AgentChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshPlaylists?: () => void;
  onDownloadTrack?: (query: string) => void;
}

export const AgentChatDrawer: React.FC<AgentChatDrawerProps> = ({
  isOpen,
  onClose,
  onRefreshPlaylists,
  onDownloadTrack,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      sender: 'orchestrator',
      content:
        '¡Hola! Soy tu **SonicVault AI Orchestrator**. ¿Qué deseas hacer hoy con tu biblioteca de música?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();

      if (data.success) {
        const aiMsg: AgentMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'orchestrator',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (onRefreshPlaylists) {
          onRefreshPlaylists();
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'orchestrator',
          content: 'Ocurrió un error al conectar con el Orquestador AI.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="agent-drawer" role="dialog" aria-label="Asistente IA Multiagente">
      <div className="agent-drawer__header">
        <h3 className="agent-drawer__title">🤖 SonicVault AI Orchestrator</h3>
        <button type="button" className="agent-drawer__close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div className="agent-drawer__messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble--user' : 'chat-bubble--ai'}`}
          >
            <div className="chat-bubble__sender">
              {msg.sender === 'user' ? '👤 Tú' : '🤖 SonicVault AI'}
            </div>
            <div className="chat-bubble__content">{msg.content}</div>
            <span className="chat-bubble__time">{msg.timestamp}</span>
          </div>
        ))}
        {loading && <div className="chat-bubble chat-bubble--ai">Pensando...</div>}
      </div>

      <div className="agent-drawer__suggestions">
        <button
          type="button"
          className="sugg-btn"
          onClick={() => handleSend('Armame una playlist de K-Pop')}
        >
          💜 Playlist K-Pop
        </button>
        {onDownloadTrack && (
          <button
            type="button"
            className="sugg-btn sugg-btn--dl"
            onClick={() => onDownloadTrack('Stray Kids - Chk Chk Boom')}
          >
            ⬇ Descargar "Chk Chk Boom"
          </button>
        )}
        <button
          type="button"
          className="sugg-btn"
          onClick={() => handleSend('Limpia metadatos de canciones')}
        >
          🏷️ Limpiar Metadatos
        </button>
      </div>

      <form
        className="agent-drawer__footer"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <input
          type="text"
          className="agent-drawer__input"
          placeholder="Pídele algo al Orquestador..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="agent-drawer__send-btn" disabled={loading}>
          Enviar
        </button>
      </form>
    </div>
  );
};

export default AgentChatDrawer;
