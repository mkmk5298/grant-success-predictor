-- ================================================
-- Initial Database Schema for Grant Predictor
-- L10 Distinguished Engineer Architecture
-- ================================================

-- Enable extensions (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- Users Table
-- ================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  picture TEXT,
  google_id VARCHAR(255) UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  
  -- Subscription info
  subscription_status VARCHAR(50) DEFAULT 'free' CHECK (subscription_status IN ('free', 'trial', 'active', 'cancelled', 'expired')),
  subscription_id VARCHAR(255),
  subscription_end_date TIMESTAMP,
  stripe_customer_id VARCHAR(255),
  
  -- Usage tracking
  uploads_used INTEGER DEFAULT 0,
  uploads_limit INTEGER DEFAULT 2,
  last_upload_date TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  
  -- Indexes
  INDEX idx_users_email (email),
  INDEX idx_users_google_id (google_id),
  INDEX idx_users_subscription_status (subscription_status),
  INDEX idx_users_created_at (created_at)
);

-- ================================================
-- Sessions Table (NextAuth)
-- ================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_sessions_token (session_token),
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires (expires)
);

-- ================================================
-- Accounts Table (OAuth Providers)
-- ================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(255),
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(provider, provider_account_id),
  INDEX idx_accounts_user_id (user_id)
);

-- ================================================
-- Grant Analyses Table
-- ================================================
CREATE TABLE IF NOT EXISTS grant_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NOT NULL,
  
  -- Organization info
  organization_name VARCHAR(255) NOT NULL,
  organization_type VARCHAR(50) NOT NULL CHECK (organization_type IN ('nonprofit', 'university', 'startup', 'corporation', 'individual')),
  funding_amount DECIMAL(15, 2) NOT NULL,
  experience_level VARCHAR(50) NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'expert')),
  has_partnership BOOLEAN DEFAULT FALSE,
  has_previous_grants BOOLEAN DEFAULT FALSE,
  
  -- File info
  file_name VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(100),
  file_url TEXT,
  
  -- Analysis results
  success_probability DECIMAL(5, 2),
  recommendations JSONB DEFAULT '[]',
  matching_grants JSONB DEFAULT '[]',
  
  -- AI Processing
  ai_model VARCHAR(100) DEFAULT 'gpt-4',
  processing_time INTEGER,
  token_usage INTEGER,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE,
  tags JSONB DEFAULT '[]',
  
  INDEX idx_analyses_user_id (user_id),
  INDEX idx_analyses_session_id (session_id),
  INDEX idx_analyses_organization_name (organization_name),
  INDEX idx_analyses_created_at (created_at),
  INDEX idx_analyses_success_probability (success_probability)
);

-- ================================================
-- Subscriptions Table (Stripe)
-- ================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'cancelled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')),
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Dates
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancelled_at TIMESTAMP,
  ended_at TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_subscriptions_user_id (user_id),
  INDEX idx_subscriptions_stripe_subscription_id (stripe_subscription_id),
  INDEX idx_subscriptions_status (status)
);

-- ================================================
-- Payments Table
-- ================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Stripe info
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_invoice_id VARCHAR(255),
  
  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  payment_method VARCHAR(100),
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_payments_user_id (user_id),
  INDEX idx_payments_subscription_id (subscription_id),
  INDEX idx_payments_stripe_payment_intent_id (stripe_payment_intent_id),
  INDEX idx_payments_status (status)
);

-- ================================================
-- Upload Sessions Table (Guest Tracking)
-- ================================================
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Tracking
  uploads_count INTEGER DEFAULT 0,
  first_upload_at TIMESTAMP,
  last_upload_at TIMESTAMP,
  
  -- Limits
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_upload_sessions_session_id (session_id),
  INDEX idx_upload_sessions_ip_address (ip_address),
  INDEX idx_upload_sessions_created_at (created_at)
);

-- ================================================
-- Grants Database Table
-- ================================================
CREATE TABLE IF NOT EXISTS grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  funding_organization VARCHAR(255) NOT NULL,
  organization_type VARCHAR(100),
  
  -- Funding details
  min_amount DECIMAL(15, 2),
  max_amount DECIMAL(15, 2),
  average_amount DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Dates
  open_date DATE,
  deadline DATE NOT NULL,
  announcement_date DATE,
  
  -- Eligibility
  eligible_organization_types JSONB DEFAULT '[]',
  eligible_regions JSONB DEFAULT '[]',
  eligible_sectors JSONB DEFAULT '[]',
  required_documents JSONB DEFAULT '[]',
  
  -- URLs
  application_url TEXT,
  guidelines_url TEXT,
  contact_email VARCHAR(255),
  
  -- Statistics
  total_applications INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2),
  average_processing_time INTEGER,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TIMESTAMP,
  
  INDEX idx_grants_deadline (deadline),
  INDEX idx_grants_funding_organization (funding_organization),
  INDEX idx_grants_is_active (is_active),
  INDEX idx_grants_created_at (created_at)
);

-- ================================================
-- API Keys Table
-- ================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Permissions
  scopes JSONB DEFAULT '[]',
  rate_limit INTEGER DEFAULT 60,
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_api_keys_user_id (user_id),
  INDEX idx_api_keys_key (key),
  INDEX idx_api_keys_is_active (is_active)
);

-- ================================================
-- Audit Logs Table
-- ================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  
  -- Action details
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  
  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_entity (entity, entity_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (created_at)
);

-- ================================================
-- Notifications Table
-- ================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_is_read (is_read),
  INDEX idx_notifications_created_at (created_at)
);

-- ================================================
-- Feature Flags Table
-- ================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  
  -- Configuration
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  
  -- Targeting
  target_user_ids JSONB DEFAULT '[]',
  target_user_groups JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  
  INDEX idx_feature_flags_name (name),
  INDEX idx_feature_flags_is_enabled (is_enabled)
);

-- ================================================
-- Triggers for Updated Timestamps
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grant_analyses_updated_at BEFORE UPDATE ON grant_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upload_sessions_updated_at BEFORE UPDATE ON upload_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grants_updated_at BEFORE UPDATE ON grants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Initial Data
-- ================================================

-- Insert default feature flags
INSERT INTO feature_flags (name, description, is_enabled, rollout_percentage)
VALUES 
  ('new_ui', 'New responsive UI design', true, 100),
  ('enhanced_analysis', 'Enhanced AI analysis with GPT-4', true, 100),
  ('stripe_payments', 'Stripe payment integration', true, 100),
  ('guest_uploads', 'Allow guest users to upload', true, 100)
ON CONFLICT (name) DO NOTHING;

-- Insert sample grants (optional)
INSERT INTO grants (
  title, description, funding_organization, min_amount, max_amount, 
  average_amount, deadline, is_active
) VALUES 
  ('Innovation in Sustainability Grant', 'Supporting innovative environmental projects', 
   'Green Future Foundation', 50000, 500000, 250000, '2025-03-15', true),
  ('Community Development Fund', 'Empowering local communities', 
   'Local Impact Initiative', 25000, 200000, 150000, '2025-02-28', true),
  ('Technology Advancement Initiative', 'Advancing technology for social good', 
   'Tech for Good', 100000, 1000000, 500000, '2025-04-30', true)
ON CONFLICT DO NOTHING;

-- ================================================
-- Permissions (if using row-level security)
-- ================================================
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies (example for users table)
CREATE POLICY users_select ON users FOR SELECT USING (true);
CREATE POLICY users_update ON users FOR UPDATE USING (id = current_setting('app.current_user_id')::uuid);
CREATE POLICY users_delete ON users FOR DELETE USING (id = current_setting('app.current_user_id')::uuid);