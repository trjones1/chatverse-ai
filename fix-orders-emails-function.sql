-- Create function to fix orders emails
CREATE OR REPLACE FUNCTION fix_orders_emails()
RETURNS TABLE(
  order_id UUID,
  character_key TEXT,
  old_email TEXT,
  new_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.orders 
  SET email = auth_users.email
  FROM auth.users auth_users
  WHERE public.orders.user_id = auth_users.id
    AND (public.orders.email = '' OR public.orders.email = 'unknown@example.com')
  RETURNING 
    public.orders.id as order_id,
    public.orders.character_key,
    CASE 
      WHEN public.orders.email = '' THEN '[empty]'
      ELSE public.orders.email
    END as old_email,
    auth_users.email as new_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;