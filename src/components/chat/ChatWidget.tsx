import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { supabase } from '@/integrations/supabase/clientRuntime';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender_type: 'visitor' | 'operator';
  created_at: string;
}

interface ChatWidgetProps {
  clinicId: string;
  clinicName?: string;
}

export const ChatWidget = ({ clinicId, clinicName = 'Клиника' }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore conversation from localStorage
  useEffect(() => {
    const savedConvId = localStorage.getItem(`chat_conv_${clinicId}`);
    if (savedConvId) {
      setConversationId(savedConvId);
      setIsStarted(true);
      loadMessages(savedConvId);
    }
  }, [clinicId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_type === 'operator' && !isOpen) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('id, content, sender_type, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  const startConversation = async () => {
    if (!visitorName.trim()) return;

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        clinic_id: clinicId,
        visitor_name: visitorName.trim(),
        visitor_phone: visitorPhone.trim() || null,
      })
      .select('id')
      .single();

    if (data && !error) {
      setConversationId(data.id);
      setIsStarted(true);
      localStorage.setItem(`chat_conv_${clinicId}`, data.id);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // Optimistic update
    const optimistic: Message = {
      id: crypto.randomUUID(),
      content,
      sender_type: 'visitor',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_type: 'visitor',
      content,
    });

    // Update last_message_at
    await supabase
      .from('chat_conversations')
      .update({ last_message_at: new Date().toISOString(), status: 'open' })
      .eq('id', conversationId);

    setSending(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleOpen}
          className="h-14 w-14 rounded-full shadow-lg relative"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[500px] rounded-2xl border bg-card shadow-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div>
          <p className="font-semibold text-sm">{clinicName}</p>
          <p className="text-xs opacity-80">Онлайн-чат</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => {
              setIsOpen(false);
              setIsStarted(false);
              setMessages([]);
              setConversationId(null);
              localStorage.removeItem(`chat_conv_${clinicId}`);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isStarted ? (
        /* Start form */
        <div className="flex-1 flex flex-col justify-center px-6 gap-4">
          <div className="text-center mb-2">
            <p className="text-lg font-semibold text-foreground">👋 Здравствуйте!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Напишите нам, и мы ответим в ближайшее время
            </p>
          </div>
          <Input
            placeholder="Ваше имя *"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
          />
          <Input
            placeholder="Телефон (необязательно)"
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
          />
          <Button onClick={startConversation} disabled={!visitorName.trim()}>
            Начать чат
          </Button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground mt-8">
                Напишите ваш вопрос, оператор скоро ответит
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col max-w-[80%]',
                  msg.sender_type === 'visitor' ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-3 py-2 text-sm',
                    msg.sender_type === 'visitor'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {formatTime(msg.created_at)}
                </span>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2 flex gap-2">
            <Input
              placeholder="Введите сообщение..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
            />
            <Button size="icon" onClick={sendMessage} disabled={!input.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
