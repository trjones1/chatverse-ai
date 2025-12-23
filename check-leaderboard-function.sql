-- Check if the leaderboard function needs column ambiguity fixes
CREATE OR REPLACE FUNCTION get_user_leaderboard_position(
  p_user_id uuid,
  p_character_key text,
  p_year integer DEFAULT EXTRACT(year FROM NOW()),
  p_month integer DEFAULT EXTRACT(month FROM NOW())
)
RETURNS TABLE (
  display_name text,
  total_amount_cents integer,
  tip_count integer,
  rank integer
) AS $$
BEGIN
  RETURN QUERY
  WITH combined_tips AS (
    -- VerseCoins tips from orders table (stored as VerseCoins = cents)
    SELECT
      o.user_id,
      COALESCE(
        udn.display_name,
        'Anonymous'
      ) as tip_display_name,
      o.tip_amount_cents::integer as amount_cents, -- Already in VerseCoins (= cents)
      1 as single_tip_count
    FROM orders o
    LEFT JOIN user_display_names udn ON o.user_id = udn.user_id
    WHERE
      o.character_key = p_character_key
      AND o.order_type = 'tip'
      AND o.status = 'completed'
      AND EXTRACT(year FROM COALESCE(o.completed_at, o.created_at)) = p_year
      AND EXTRACT(month FROM COALESCE(o.completed_at, o.created_at)) = p_month
      AND o.tip_amount_cents IS NOT NULL
  ),
  aggregated_tips AS (
    SELECT
      ct.user_id,
      ct.tip_display_name,
      SUM(ct.amount_cents) as total_amount_cents,
      SUM(ct.single_tip_count) as total_tip_count
    FROM combined_tips ct
    GROUP BY ct.user_id, ct.tip_display_name
  ),
  ranked_tips AS (
    SELECT
      at.user_id,
      at.tip_display_name,
      at.total_amount_cents,
      at.total_tip_count,
      ROW_NUMBER() OVER (ORDER BY at.total_amount_cents DESC, at.total_tip_count DESC) as rank
    FROM aggregated_tips at
  )
  SELECT
    rt.tip_display_name,
    rt.total_amount_cents::integer,
    rt.total_tip_count::integer,
    rt.rank::integer
  FROM ranked_tips rt
  WHERE rt.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_leaderboard_position(uuid, text, integer, integer) TO authenticated;