
-- Fix handle_new_user function search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create storage bucket for MOU files
INSERT INTO storage.buckets (id, name, public) VALUES ('mou-files', 'mou-files', true);

-- Create storage policies for MOU files
CREATE POLICY "Authenticated users can upload MOU files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mou-files');

CREATE POLICY "Anyone can view MOU files" ON storage.objects
FOR SELECT
USING (bucket_id = 'mou-files');

CREATE POLICY "Authenticated users can update their MOU files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'mou-files');

CREATE POLICY "Authenticated users can delete MOU files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'mou-files');
