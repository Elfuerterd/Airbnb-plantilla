import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { MessageCircle, Send, ChevronLeft, User, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MessagesPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchConversations();
  }, [isAuthenticated]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
      const conv = conversations.find(c => c.id === conversationId);
      setSelectedConversation(conv);
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/conversations`, { withCredentials: true });
      setConversations(response.data);
      
      // If no conversation selected and we have conversations, select the first one
      if (!conversationId && response.data.length > 0) {
        navigate(`/messages/${response.data[0].id}`);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const response = await axios.get(`${API_URL}/api/conversations/${convId}/messages`, { withCredentials: true });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const recipientId = selectedConversation.other_user?.id;
      await axios.post(`${API_URL}/api/messages`, {
        recipient_id: recipientId,
        property_id: selectedConversation.property_id,
        booking_id: selectedConversation.booking_id,
        content: newMessage.trim()
      }, { withCredentials: true });

      setNewMessage('');
      fetchMessages(conversationId);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white" data-testid="messages-loading">
        <Header />
        <div className="container-app py-8">
          <div className="h-96 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="messages-page">
      <Header />

      <div className="container-app py-6">
        <h1 
          className="text-2xl font-bold text-slate-900 mb-6"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Messages
        </h1>

        <div className="flex h-[calc(100vh-200px)] bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Conversations List */}
          <div className="w-80 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Conversations</h2>
            </div>
            <ScrollArea className="flex-1">
              {conversations.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => navigate(`/messages/${conv.id}`)}
                      className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                        conversationId === conv.id ? 'bg-rose-50' : ''
                      }`}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                          {conv.other_user?.picture ? (
                            <img src={conv.other_user.picture} alt={conv.other_user.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-slate-900 truncate">{conv.other_user?.name}</p>
                            {conv.unread_count > 0 && (
                              <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-xs flex items-center justify-center">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          {conv.property && (
                            <p className="text-xs text-rose-500 truncate mb-1">{conv.property.title}</p>
                          )}
                          <p className="text-sm text-slate-500 truncate">{conv.last_message}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No conversations yet</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                  <button 
                    onClick={() => navigate('/messages')}
                    className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                    {selectedConversation.other_user?.picture ? (
                      <img src={selectedConversation.other_user.picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{selectedConversation.other_user?.name}</p>
                    {selectedConversation.property && (
                      <p className="text-xs text-slate-500">{selectedConversation.property.title}</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isOwn
                                  ? 'bg-rose-500 text-white rounded-br-md'
                                  : 'bg-slate-100 text-slate-900 rounded-bl-md'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <p className={`text-xs text-slate-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                              {format(new Date(message.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-slate-200">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sending}
                      data-testid="message-input"
                    />
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() || sending}
                      className="bg-rose-500 hover:bg-rose-600"
                      data-testid="send-message-btn"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
