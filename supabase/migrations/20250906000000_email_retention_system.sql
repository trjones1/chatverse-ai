-- Email Retention System Migration
-- Creates tables and functions for user retention email campaigns

-- Email logs table to track all email communications
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    campaign_type TEXT NOT NULL DEFAULT 'retention',
    subject TEXT NOT NULL,
    message_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email unsubscribes table to track users who opt out
CREATE TABLE IF NOT EXISTS email_unsubscribes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_type ON email_logs(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON email_logs(message_id);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_user_id ON email_unsubscribes(user_id);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email_address);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_token ON email_unsubscribes(token);

-- Add updated_at trigger for email_logs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_email_logs_updated_at BEFORE UPDATE ON email_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get inactive users for retention campaigns
CREATE OR REPLACE FUNCTION get_inactive_users(
    days_inactive INTEGER DEFAULT 7,
    email_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    user_id UUID,
    email_address TEXT,
    first_name TEXT,
    last_seen_at TIMESTAMPTZ,
    conversation_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            u.id,
            u.email,
            u.raw_user_meta_data->>'first_name' as first_name,
            COALESCE(u.last_sign_in_at, u.created_at) as last_seen_at,
            COALESCE(conv_counts.count, 0) as conversation_count
        FROM auth.users u
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as count
            FROM conversations
            GROUP BY user_id
        ) conv_counts ON u.id = conv_counts.user_id
        WHERE u.email IS NOT NULL
            AND COALESCE(u.last_sign_in_at, u.created_at) < NOW() - INTERVAL '1 day' * days_inactive
    )
    SELECT 
        us.id,
        us.email,
        us.first_name,
        us.last_seen_at,
        us.conversation_count::INTEGER
    FROM user_stats us
    LEFT JOIN email_unsubscribes eu ON us.id = eu.user_id
    LEFT JOIN email_logs el ON us.id = el.user_id 
        AND el.campaign_type = 'retention' 
        AND el.sent_at > NOW() - INTERVAL '7 days'
    WHERE eu.id IS NULL -- Not unsubscribed
        AND el.id IS NULL -- No recent retention emails
    ORDER BY us.last_seen_at ASC
    LIMIT email_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely unsubscribe users
CREATE OR REPLACE FUNCTION unsubscribe_user(
    unsubscribe_token TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Check if token exists and get user info
    SELECT u.id, u.email INTO user_record
    FROM auth.users u
    WHERE u.id IN (
        SELECT user_id FROM email_unsubscribes WHERE token = unsubscribe_token
    );
    
    IF NOT FOUND THEN
        -- Create unsubscribe record if token doesn't exist but user does
        SELECT u.id, u.email INTO user_record
        FROM auth.users u
        WHERE u.email = (
            SELECT email_address FROM email_logs 
            WHERE message_id = unsubscribe_token 
            ORDER BY sent_at DESC LIMIT 1
        );
        
        IF FOUND THEN
            INSERT INTO email_unsubscribes (user_id, email_address, token)
            VALUES (user_record.id, user_record.email, unsubscribe_token)
            ON CONFLICT (token) DO NOTHING;
            RETURN TRUE;
        END IF;
        
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Email logs policies
CREATE POLICY "Users can view their own email logs" ON email_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage email logs" ON email_logs
    FOR ALL USING (
        -- Allow service role full access
        auth.jwt() ->> 'role' = 'service_role'
        OR
        -- Allow authenticated users to view their own
        (auth.uid() = user_id AND current_setting('request.method', true) = 'GET')
    );

-- Email unsubscribes policies  
CREATE POLICY "Users can view their own unsubscribes" ON email_unsubscribes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert unsubscribes" ON email_unsubscribes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can manage unsubscribes" ON email_unsubscribes
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON email_logs TO authenticated;
GRANT SELECT ON email_unsubscribes TO authenticated;
GRANT INSERT ON email_unsubscribes TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_inactive_users(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION unsubscribe_user(TEXT) TO authenticated, anon;