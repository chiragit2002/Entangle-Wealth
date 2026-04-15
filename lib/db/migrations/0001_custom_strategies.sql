-- Migration: Custom Strategy Builder
-- Creates tables for user-defined trading strategies and backtest history

CREATE TABLE IF NOT EXISTS custom_strategies (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  type TEXT NOT NULL,
  assets JSONB NOT NULL DEFAULT '[]',
  timeframes JSONB NOT NULL DEFAULT '[]',
  parameters JSONB NOT NULL DEFAULT '{}',
  logic JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  backtest_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_strategies_user_id ON custom_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_strategies_is_active ON custom_strategies(is_active);

CREATE TABLE IF NOT EXISTS strategy_backtest_runs (
  id SERIAL PRIMARY KEY,
  strategy_id INTEGER REFERENCES custom_strategies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assets JSONB NOT NULL DEFAULT '[]',
  timeframe TEXT NOT NULL DEFAULT '1Day',
  win_rate TEXT,
  avg_return TEXT,
  max_drawdown TEXT,
  total_trades TEXT,
  equity_curve JSONB,
  raw_results JSONB,
  ran_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_backtest_runs_strategy_id ON strategy_backtest_runs(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_backtest_runs_user_id ON strategy_backtest_runs(user_id);
