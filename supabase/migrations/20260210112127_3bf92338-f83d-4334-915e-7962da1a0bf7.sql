
-- Chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  visitor_name TEXT,
  visitor_phone TEXT,
  visitor_email TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'closed')),
  assigned_to UUID REFERENCES public.profiles(id),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'operator')),
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chat_conversations_clinic ON public.chat_conversations(clinic_id);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Visitors can create conversations and read their own (by conversation_id stored in browser)
CREATE POLICY "Anyone can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read conversations by id"
  ON public.chat_conversations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update conversations"
  ON public.chat_conversations FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Messages policies
CREATE POLICY "Anyone can insert messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read messages"
  ON public.chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can update messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Update timestamp trigger
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
