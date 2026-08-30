import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { InboxThread } from '../utils/outboxData.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Search,
  Send,
  Mail,
  Calendar,
  Paperclip,
  Sparkles
} from 'lucide-react';

export const InboxPage: React.FC = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replyText, setReplyText] = useState<string>('');

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || threads[0];

  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      t.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = filterTag === 'All' || t.tag === filterTag;
    return matchesSearch && matchesTag;
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThread) return;

    const updatedThreads = threads.map((t) => {
      if (t.id === selectedThread.id) {
        return {
          ...t,
          unread: false,
          messages: [
            ...t.messages,
            {
              sender: user?.name || 'Sender',
              timestamp: 'Just now',
              body: replyText.trim(),
              isUser: true
            }
          ]
        };
      }
      return t;
    });

    setThreads(updatedThreads);
    setReplyText('');
  };

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Unified Inbox</h1>
            <p>Track, categorize, and reply to prospect emails in real-time</p>
          </div>
        </div>

        {threads.length === 0 ? (
          <div className="outbox-card" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Mail size={40} color="var(--primary)" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              No conversations in inbox yet
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 16px auto', lineHeight: '1.5' }}>
              Incoming prospect replies and response threads will appear here automatically when contacts respond to your outreach campaigns.
            </p>
          </div>
        ) : (
          <div className="inbox-main-layout">
          {/* LEFT PANE: THREADS LIST */}
          <div className="outbox-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search inbox..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                  backgroundColor: 'var(--bg-card-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            {/* Filter Tags */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['All', 'Interested', 'Question', 'Meeting Booked'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: filterTag === tag ? 'var(--primary)' : 'var(--bg-card-secondary)',
                    color: filterTag === tag ? '#ffffff' : 'var(--text-muted)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Thread Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
              {filteredThreads.map((thread) => {
                const isSelected = selectedThread?.id === thread.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      setThreads((prev) =>
                        prev.map((t) => (t.id === thread.id ? { ...t, unread: false } : t))
                      );
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-card)'}`,
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-card-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: thread.unread ? 800 : 600, color: 'var(--text-main)' }}>
                        {thread.senderName}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{thread.time}</span>
                    </div>

                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {thread.company}
                    </span>

                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-body)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {thread.snippet}
                    </span>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span
                        className={`badge ${
                          thread.tag === 'Interested'
                            ? 'badge-active'
                            : thread.tag === 'Meeting Booked'
                            ? 'badge-completed'
                            : thread.tag === 'Question'
                            ? 'badge-tag-followup'
                            : 'badge-draft'
                        }`}
                      >
                        {thread.tag}
                      </span>

                      {thread.unread && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: CONVERSATION THREAD */}
          {selectedThread ? (
            <div className="outbox-card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Thread Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-card)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedThread.subject}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span>{selectedThread.senderName} ({selectedThread.senderEmail})</span>
                    <span>•</span>
                    <span>{selectedThread.company}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    <Calendar size={14} />
                    <span>Book Meeting</span>
                  </button>
                </div>
              </div>

              {/* Messages Body */}
              <div style={{ flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
                {selectedThread.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      backgroundColor: msg.isUser ? 'var(--bg-card-secondary)' : 'var(--bg-hover)',
                      border: '1px solid var(--border-card)',
                      alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '85%'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '20px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {msg.sender}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{msg.timestamp}</span>
                    </div>

                    <p style={{ fontSize: '0.88rem', color: 'var(--text-body)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {msg.body}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} style={{ paddingTop: '16px', borderTop: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  rows={3}
                  placeholder={`Reply to ${selectedThread.senderName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-card)',
                    backgroundColor: 'var(--bg-card-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    resize: 'none'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" className="btn-icon-toggle"><Paperclip size={16} /></button>
                    <button
                      type="button"
                      onClick={() => setReplyText("Sounds great! I'll send over a calendar invite for Thursday 2:00 PM EST right away.")}
                      style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: '6px' }}
                    >
                      <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Quick AI Suggestion
                    </button>
                  </div>

                  <button className="btn btn-primary" type="submit">
                    <Send size={15} />
                    <span>Send Reply</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="outbox-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a conversation to view messages
            </div>
          )}
        </div>
        )}
      </div>
    </AppLayout>
  );
};
