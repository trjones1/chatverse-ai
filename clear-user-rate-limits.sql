-- Clear rate limit data for specific user
-- This will reset all rate limits for the user

-- Replace this with your actual user ID from the debug log
-- From the screenshot: 75bf3083-546f-48de-b3b4-95e57dd8afeb

DELETE FROM rate_limits
WHERE user_id = '75bf3083-546f-48de-b3b4-95e57dd8afeb';

-- Verify deletion
SELECT COUNT(*) as deleted_count
FROM rate_limits
WHERE user_id = '75bf3083-546f-48de-b3b4-95e57dd8afeb';

-- This should return 0
