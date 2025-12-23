-- Fix tip leaderboard column ambiguity and include VerseCoins tips
-- VerseCoins tips: stored as VerseCoins (1 VC = 1 cent) in orders.tip_amount_cents
-- Stripe tips: stored as cents in tips.amount_cents
-- Display: Convert both to character currency (e.g., Charms = VerseCoins amount)

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
  WITH combined_tips AS (
    -- Stripe tips from tips table (stored in cents)
    SELECT
      t.user_id,
      COALESCE(
        t.display_name,
        udn.display_name,
        'Anonymous'
      ) as tip_display_name,
      t.amount_cents::integer as amount_cents,
      1 as single_tip_count
    FROM tips t
    LEFT JOIN user_display_names udn ON t.user_id = udn.user_id
    WHERE
      t.character_key = p_character_key
      AND t.status = 'completed'
      AND EXTRACT(year FROM t.created_at) = p_year
      AND EXTRACT(month FROM t.created_at) = p_month

    UNION ALL

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
      user_id,
      tip_display_name,
      SUM(amount_cents) as total_amount_cents,
      SUM(single_tip_count) as total_tip_count
    FROM combined_tips
    GROUP BY user_id, tip_display_name
  )
  SELECT
    at.tip_display_name,
    at.total_amount_cents::integer,
    at.total_tip_count::integer,
    ROW_NUMBER() OVER (ORDER BY at.total_amount_cents DESC, at.total_tip_count DESC)::integer as rank
  FROM aggregated_tips at
  ORDER BY at.total_amount_cents DESC, at.total_tip_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the user position function to fix column ambiguity
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
    -- Stripe tips from tips table (stored in cents)
    SELECT
      t.user_id,
      COALESCE(
        t.display_name,
        udn.display_name,
        'Anonymous'
      ) as tip_display_name,
      t.amount_cents::integer as amount_cents,
      1 as single_tip_count
    FROM tips t
    LEFT JOIN user_display_names udn ON t.user_id = udn.user_id
    WHERE
      t.character_key = p_character_key
      AND t.status = 'completed'
      AND EXTRACT(year FROM t.created_at) = p_year
      AND EXTRACT(month FROM t.created_at) = p_month

    UNION ALL

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
      user_id,
      tip_display_name,
      SUM(amount_cents) as total_amount_cents,
      SUM(single_tip_count) as total_tip_count
    FROM combined_tips
    GROUP BY user_id, tip_display_name
  ),
  ranked_tips AS (
    SELECT
      user_id,
      tip_display_name,
      total_amount_cents,
      total_tip_count,
      ROW_NUMBER() OVER (ORDER BY total_amount_cents DESC, total_tip_count DESC) as rank
    FROM aggregated_tips
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_monthly_leaderboard(text, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_leaderboard_position(uuid, text, integer, integer) TO authenticated;