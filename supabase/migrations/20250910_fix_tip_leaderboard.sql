-- Fix tip leaderboard to properly use display names from both tables
-- Priority: tips.display_name > user_display_names.display_name > 'Anonymous'

CREATE OR REPLACE FUNCTION get_monthly_leaderboard(
  p_character_key text,
  p_year integer DEFAULT EXTRACT(year FROM NOW()),
  p_month integer DEFAULT EXTRACT(month FROM NOW()),
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  display_name text,
  total_amount_cents integer,
  tip_count integer,
  rank integer
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_tips AS (
    SELECT 
      COALESCE(
        t.display_name, 
        udn.display_name, 
        'Anonymous'
      ) as display_name,
      SUM(t.amount_cents) as total_amount_cents,
      COUNT(*) as tip_count
    FROM tips t
    LEFT JOIN user_display_names udn ON t.user_id = udn.user_id
    WHERE 
      t.character_key = p_character_key
      AND t.status = 'completed'
      AND EXTRACT(year FROM t.created_at) = p_year
      AND EXTRACT(month FROM t.created_at) = p_month
    GROUP BY t.user_id, COALESCE(t.display_name, udn.display_name, 'Anonymous')
  )
  SELECT 
    mt.display_name,
    mt.total_amount_cents::integer,
    mt.tip_count::integer,
    ROW_NUMBER() OVER (ORDER BY mt.total_amount_cents DESC, mt.tip_count DESC)::integer as rank
  FROM monthly_tips mt
  ORDER BY mt.total_amount_cents DESC, mt.tip_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;