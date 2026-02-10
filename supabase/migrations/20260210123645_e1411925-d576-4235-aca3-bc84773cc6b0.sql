
-- Add channel and external identifiers to chat_conversations
ALTER TABLE public.chat_conversations
ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'web',
ADD COLUMN IF NOT EXISTS external_chat_id TEXT;

-- Add channel to chat_messages  
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'web';

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_external_chat_id 
ON public.chat_conversations (external_chat_id) WHERE external_chat_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_channel 
ON public.chat_conversations (channel);

-- Allow anonymous inserts for webhook functions (telegram/whatsapp bots)
CREATE POLICY "Allow service role insert chat_conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow service role insert chat_messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);
