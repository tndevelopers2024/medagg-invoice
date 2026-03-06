-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('website_head', 'user');

-- Create enum for user status
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'inactive');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add status column to profiles
ALTER TABLE public.profiles ADD COLUMN status user_status NOT NULL DEFAULT 'pending';

-- Create page_permissions table for granular access control
CREATE TABLE public.page_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    page_name TEXT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, page_name)
);

-- Enable RLS on page_permissions
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is website head
CREATE OR REPLACE FUNCTION public.is_website_head(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'website_head'
  )
$$;

-- Security definer function to get user status
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id UUID)
RETURNS user_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
-- Only website head can view all roles
CREATE POLICY "Website head can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_website_head(auth.uid()) OR user_id = auth.uid());

-- Only website head can insert/update roles
CREATE POLICY "Website head can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_website_head(auth.uid()))
WITH CHECK (public.is_website_head(auth.uid()));

-- RLS Policies for page_permissions
-- Users can view their own permissions, website head can view all
CREATE POLICY "Users can view own permissions, website head all"
ON public.page_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_website_head(auth.uid()));

-- Only website head can manage permissions
CREATE POLICY "Website head can manage permissions"
ON public.page_permissions
FOR ALL
TO authenticated
USING (public.is_website_head(auth.uid()))
WITH CHECK (public.is_website_head(auth.uid()));

-- Update profiles RLS to allow website head to view and update all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile, website head all"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_website_head(auth.uid()));

CREATE POLICY "Users can update own profile, website head all"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_website_head(auth.uid()));

-- Trigger to update updated_at on user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on page_permissions  
CREATE TRIGGER update_page_permissions_updated_at
BEFORE UPDATE ON public.page_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();