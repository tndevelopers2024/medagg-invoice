-- Create activity_logs table for tracking user activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only website_head can view all logs
CREATE POLICY "Website head can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (is_website_head(auth.uid()));

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_website_head(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);