-- Create whatsapp_labels table
CREATE TABLE IF NOT EXISTS public.whatsapp_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#EFFF00',
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create junction table for labels and conversations
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.whatsapp_labels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(conversation_id, label_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_labels ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Allow all on whatsapp_labels" ON public.whatsapp_labels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on whatsapp_conversation_labels" ON public.whatsapp_conversation_labels FOR ALL USING (true) WITH CHECK (true);

-- Insert some default labels
INSERT INTO public.whatsapp_labels (name, color, priority) VALUES 
('Manutenção', '#0033FF', 1),
('Venda', '#EFFF00', 2),
('Dúvida', '#FFFFFF', 3),
('Garantia', '#FF4444', 4)
ON CONFLICT DO NOTHING;
