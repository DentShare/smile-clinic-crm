import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/clientRuntime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, User, Phone, CheckCheck, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Conversation {
  id: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  status: string;
  last_message_at: string | null;
  created_at: string;
  assigned_to: string | null;
  channel: string;
  external_chat_id: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: 'visitor' | 'operator';
  sender_id: string | null;
  is_read: boolean;
  created_at: string;
}

const LiveChat = () => {
  const { clinic, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!clinic?.id) return;
    loadConversations();

    const channel = supabase
      .channel('chat-conversations-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => loadConversations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinic?.id]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConvId) return;
    loadMessages(selectedConvId);

    // Mark as read
    supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', selectedConvId)
      .eq('sender_type', 'visitor')
      .eq('is_read', false)
      .then();

    const channel = supabase
      .channel(`chat-msgs-${selectedConvId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConvId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark visitor messages as read
          if (newMsg.sender_type === 'visitor') {
            supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    if (!clinic?.id) return;
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('last_message_at', { ascending: false });
    if (!error && data) setConversations(data);
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data as Message[]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedConvId || !profile || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    const optimistic: Message = {
      id: crypto.randomUUID(),
      conversation_id: selectedConvId,
      content,
      sender_type: 'operator',
      sender_id: profile.id,
      is_read: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    // Store message in DB
    const { error: msgError } = await supabase.from('chat_messages').insert({
      conversation_id: selectedConvId,
      sender_type: 'operator',
      sender_id: profile.id,
      content,
      channel: selectedConv?.channel || 'web',
    });
    if (msgError) console.error('Error sending message:', msgError);

    const { error: convError } = await supabase
      .from('chat_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        status: 'assigned',
        assigned_to: profile.id,
      })
      .eq('id', selectedConvId);
    if (convError) console.error('Error updating conversation:', convError);

    // For external channels, send via edge function
    const channel = selectedConv?.channel;
    if (channel === 'telegram' || channel === 'whatsapp') {
      try {
        await supabase.functions.invoke('send-chat-reply', {
          body: { conversation_id: selectedConvId, content },
        });
      } catch (err) {
        console.error('Failed to send external reply:', err);
      }
    }

    setSending(false);
  };

  const closeConversation = async (convId: string) => {
    await supabase
      .from('chat_conversations')
      .update({ status: 'closed' })
      .eq('id', convId);
    if (selectedConvId === convId) {
      setSelectedConvId(null);
      setMessages([]);
    }
    loadConversations();
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const openConversations = conversations.filter((c) => c.status !== 'closed');
  const closedConversations = conversations.filter((c) => c.status === 'closed');

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4">
      {/* Conversations list */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Чаты
            {openConversations.length > 0 && (
              <Badge variant="default" className="ml-auto">{openConversations.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            {openConversations.length === 0 && closedConversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">
                Нет активных чатов. Когда посетитель сайта напишет, чат появится здесь.
              </p>
            )}
            {openConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b transition-colors hover:bg-accent',
                  selectedConvId === conv.id && 'bg-accent'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">
                    {conv.visitor_name || 'Посетитель'}
                  </span>
                  <div className="flex items-center gap-1">
                    {conv.channel && conv.channel !== 'web' && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        {conv.channel === 'telegram' ? 'TG' : 'WA'}
                      </Badge>
                    )}
                    <Badge variant={conv.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">
                      {conv.status === 'open' ? 'Новый' : 'В работе'}
                    </Badge>
                  </div>
                </div>
                {conv.visitor_phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" /> {conv.visitor_phone}
                  </p>
                )}
                {conv.last_message_at && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(conv.last_message_at), 'dd MMM HH:mm', { locale: ru })}
                  </p>
                )}
              </button>
            ))}
            {closedConversations.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs text-muted-foreground font-medium bg-muted">
                  Закрытые
                </div>
                {closedConversations.slice(0, 10).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={cn(
                      'w-full text-left px-4 py-2 border-b transition-colors hover:bg-accent opacity-60',
                      selectedConvId === conv.id && 'bg-accent opacity-100'
                    )}
                  >
                    <span className="text-sm truncate">{conv.visitor_name || 'Посетитель'}</span>
                    <p className="text-[10px] text-muted-foreground">
                      {conv.last_message_at && format(new Date(conv.last_message_at), 'dd MMM HH:mm', { locale: ru })}
                    </p>
                  </button>
                ))}
              </>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col">
        {!selectedConvId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Выберите чат из списка слева</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{selectedConv?.visitor_name || 'Посетитель'}</p>
                    {selectedConv?.channel && selectedConv.channel !== 'web' && (
                      <Badge variant="outline" className="text-[10px]">
                        {selectedConv.channel === 'telegram' ? 'Telegram' : 'WhatsApp'}
                      </Badge>
                    )}
                  </div>
                  {selectedConv?.visitor_phone && (
                    <p className="text-xs text-muted-foreground">{selectedConv.visitor_phone}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {selectedConv?.status !== 'closed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeConversation(selectedConvId)}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Закрыть
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              <div className="text-center">
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">
                  {selectedConv && format(new Date(selectedConv.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                </span>
              </div>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col max-w-[70%]',
                    msg.sender_type === 'operator' ? 'ml-auto items-end' : 'mr-auto items-start'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-3 py-2 text-sm',
                      msg.sender_type === 'operator'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-secondary text-secondary-foreground rounded-bl-md'
                    )}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1 flex items-center gap-1">
                    {format(new Date(msg.created_at), 'HH:mm')}
                    {msg.sender_type === 'operator' && msg.is_read && (
                      <CheckCheck className="h-3 w-3 text-primary" />
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Input */}
            {selectedConv?.status !== 'closed' ? (
              <div className="border-t px-4 py-3 flex gap-2">
                <Input
                  placeholder="Введите ответ..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!input.trim() || sending}>
                  <Send className="h-4 w-4 mr-1" />
                  Отправить
                </Button>
              </div>
            ) : (
              <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
                Чат закрыт
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default LiveChat;
