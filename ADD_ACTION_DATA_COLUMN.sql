-- Add action_data column to ivr_flow_actions table
-- Run this BEFORE running POPULATE_IVR_FLOW.sql

ALTER TABLE ivr_flow_actions 
ADD COLUMN IF NOT EXISTS action_data JSONB DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN ivr_flow_actions.action_data IS 'JSON data containing db_action (SQL that runs) and description (human readable explanation)';
