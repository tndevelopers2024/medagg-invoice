
-- Fix function search_path for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix overly permissive RLS policies on invoice_items
DROP POLICY IF EXISTS "Authenticated users can insert invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can update invoice items" ON public.invoice_items;

-- Create proper RLS policies for invoice_items based on invoice ownership
CREATE POLICY "Users can insert invoice items for their invoices" ON public.invoice_items 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices 
    WHERE invoices.id = invoice_id AND invoices.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update invoice items for their invoices" ON public.invoice_items 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.invoices 
    WHERE invoices.id = invoice_id AND invoices.created_by = auth.uid()
  )
);
