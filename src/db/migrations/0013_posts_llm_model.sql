-- Add llm_model column to posts table to store the model used for each agent response
ALTER TABLE posts ADD COLUMN llm_model TEXT;
