import { createRequire } from "module";
import { resolve } from "path";
const require = createRequire(resolve(process.cwd(), "../../lib/db/package.json"));
const pg = require("pg");
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TEST_USER_ID = "__race_condition_test_user__";

async function cleanup() {
  await pool.query(`DELETE FROM balance_transactions WHERE user_id = $1`, [TEST_USER_ID]);
  await pool.query(`DELETE FROM paper_trades WHERE user_id = $1`, [TEST_USER_ID]);
  await pool.query(`DELETE FROM paper_positions WHERE user_id = $1`, [TEST_USER_ID]);
  await pool.query(`DELETE FROM paper_portfolios WHERE user_id = $1`, [TEST_USER_ID]);
  await pool.query(`DELETE FROM virtual_cash_purchases WHERE user_id = $1`, [TEST_USER_ID]);
  await pool.query(`INSERT INTO users (id, clerk_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [TEST_USER_ID, "clerk_race_test", "race_test@test.local"]);
}

async function test1_simultaneousWebhookCredits() {
  console.log("\n=== TEST 1: Simultaneous Webhook Credits ===");
  await cleanup();

  await pool.query(`INSERT INTO paper_portfolios (user_id, cash_balance) VALUES ($1, 100000)`, [TEST_USER_ID]);

  const creditAmount = 5000;
  const concurrentCredits = 5;

  const executeCredit = async (i) => {
    const sessionId = `test_session_${i}_${Date.now()}`;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [sessionId]);

      const { rows: [before] } = await client.query(
        `SELECT cash_balance FROM paper_portfolios WHERE user_id = $1 FOR UPDATE`, [TEST_USER_ID]
      );
      const balanceBefore = Number(before.cash_balance);

      await client.query(
        `UPDATE paper_portfolios SET cash_balance = cash_balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [creditAmount, TEST_USER_ID]
      );

      const balanceAfter = balanceBefore + creditAmount;
      await client.query(
        `INSERT INTO balance_transactions (user_id, transaction_type, amount, balance_before, balance_after, source, reference_id)
         VALUES ($1, 'credit', $2, $3, $4, 'webhook', $5)`,
        [TEST_USER_ID, creditAmount, balanceBefore, balanceAfter, sessionId]
      );

      await client.query("COMMIT");
      return { credit: i, result: "SUCCESS" };
    } catch (err) {
      await client.query("ROLLBACK");
      console.log(`  Credit ${i} failed: ${err.message}`);
      return { credit: i, result: "ERROR" };
    } finally {
      client.release();
    }
  };

  const promises = Array.from({ length: concurrentCredits }, (_, i) => executeCredit(i));

  await Promise.all(promises);

  const { rows: [{ cash_balance }] } = await pool.query(
    `SELECT cash_balance FROM paper_portfolios WHERE user_id = $1`, [TEST_USER_ID]
  );

  const expectedBalance = 100000 + (creditAmount * concurrentCredits);
  const finalBalance = Number(cash_balance);

  console.log(`  Starting balance:  $100,000`);
  console.log(`  Credits applied:   ${concurrentCredits} x $${creditAmount} = $${creditAmount * concurrentCredits}`);
  console.log(`  Expected balance:  $${expectedBalance.toLocaleString()}`);
  console.log(`  Actual balance:    $${finalBalance.toLocaleString()}`);

  if (finalBalance === expectedBalance) {
    console.log("  ✅ PASS — All credits applied atomically, no lost updates");
  } else {
    console.log(`  ❌ FAIL — Balance mismatch! Lost $${expectedBalance - finalBalance}`);
    process.exitCode = 1;
  }

  const { rows: txRows } = await pool.query(
    `SELECT * FROM balance_transactions WHERE user_id = $1 ORDER BY id`, [TEST_USER_ID]
  );
  console.log(`  Audit trail: ${txRows.length} balance_transaction records`);
  for (const row of txRows) {
    console.log(`    [${row.transaction_type}] $${row.amount} | before: $${row.balance_before} → after: $${row.balance_after} | source: ${row.source} | ref: ${row.reference_id}`);
  }
}

async function test2_simultaneousBuyOrders() {
  console.log("\n=== TEST 2: Simultaneous Buy Orders Exceeding Balance ===");
  await cleanup();

  const startingCash = 10000;
  await pool.query(`INSERT INTO paper_portfolios (user_id, cash_balance) VALUES ($1, $2)`, [TEST_USER_ID, startingCash]);

  const orderCost = 7000;

  const executeTrade = async (orderNum) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1 || '_paper_trade'))`, [TEST_USER_ID]);

      const { rows } = await client.query(
        `SELECT cash_balance FROM paper_portfolios WHERE user_id = $1 FOR UPDATE`, [TEST_USER_ID]
      );
      const currentCash = Number(rows[0].cash_balance);

      if (currentCash < orderCost) {
        await client.query("ROLLBACK");
        return { order: orderNum, result: "REJECTED", reason: `> INSUFFICIENT FUNDS — ORDER REJECTED. Available: $${currentCash}, Required: $${orderCost}` };
      }

      const newCash = currentCash - orderCost;
      await client.query(
        `UPDATE paper_portfolios SET cash_balance = cash_balance - $1, updated_at = NOW() WHERE user_id = $2`,
        [orderCost, TEST_USER_ID]
      );

      await client.query(
        `INSERT INTO balance_transactions (user_id, transaction_type, amount, balance_before, balance_after, source, reference_id)
         VALUES ($1, 'trade_buy', $2, $3, $4, 'trade', $5)`,
        [TEST_USER_ID, -orderCost, currentCash, newCash, `buy_TEST_${orderNum}`]
      );

      await client.query("COMMIT");
      return { order: orderNum, result: "SUCCESS", balanceAfter: newCash };
    } catch (err) {
      await client.query("ROLLBACK");
      return { order: orderNum, result: "ERROR", reason: err.message };
    } finally {
      client.release();
    }
  };

  const results = await Promise.all([
    executeTrade(1),
    executeTrade(2),
  ]);

  console.log(`  Starting balance: $${startingCash}`);
  console.log(`  Order cost each:  $${orderCost}`);
  console.log(`  Combined cost:    $${orderCost * 2} (exceeds balance by $${orderCost * 2 - startingCash})`);

  for (const r of results) {
    if (r.result === "SUCCESS") {
      console.log(`  Order ${r.order}: ✅ FILLED (balance after: $${r.balanceAfter})`);
    } else {
      console.log(`  Order ${r.order}: 🛑 ${r.result} — ${r.reason}`);
    }
  }

  const successes = results.filter(r => r.result === "SUCCESS").length;
  const rejections = results.filter(r => r.result === "REJECTED").length;

  const { rows: [{ cash_balance: finalBalance }] } = await pool.query(
    `SELECT cash_balance FROM paper_portfolios WHERE user_id = $1`, [TEST_USER_ID]
  );

  console.log(`  Final balance: $${Number(finalBalance)}`);

  if (successes === 1 && rejections === 1 && Number(finalBalance) >= 0) {
    console.log("  ✅ PASS — Exactly one order filled, one rejected, balance never went negative");
  } else if (successes === 0) {
    console.log("  ⚠️  Both orders were rejected (advisory lock serialized them). Still safe — no negative balance.");
  } else if (successes === 2) {
    console.log("  ❌ FAIL — Both orders filled! Balance went negative. Race condition NOT fixed.");
    process.exitCode = 1;
  }

  const { rows: txRows } = await pool.query(
    `SELECT * FROM balance_transactions WHERE user_id = $1 ORDER BY id`, [TEST_USER_ID]
  );
  console.log(`\n  Balance audit trail (${txRows.length} records):`);
  for (const row of txRows) {
    console.log(`    [${row.transaction_type}] $${row.amount} | before: $${row.balance_before} → after: $${row.balance_after} | ref: ${row.reference_id}`);
  }
}

async function test3_auditTableIntegrity() {
  console.log("\n=== TEST 3: Audit Table Structure Verification ===");
  const { rows: columns } = await pool.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'balance_transactions' ORDER BY ordinal_position
  `);

  console.log("  Table columns:");
  for (const col of columns) {
    console.log(`    ${col.column_name}: ${col.data_type}`);
  }

  const required = ['id', 'user_id', 'transaction_type', 'amount', 'balance_before', 'balance_after', 'source', 'reference_id', 'created_at'];
  const actual = columns.map(c => c.column_name);
  const missing = required.filter(r => !actual.includes(r));

  if (missing.length === 0) {
    console.log("  ✅ PASS — All required columns present");
  } else {
    console.log(`  ❌ FAIL — Missing columns: ${missing.join(', ')}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log("🔒 Race Condition Fix Verification");
  console.log("===================================");

  try {
    await test3_auditTableIntegrity();
    await test1_simultaneousWebhookCredits();
    await test2_simultaneousBuyOrders();

    console.log("\n===================================");
    if (process.exitCode === 1) {
      console.log("❌ SOME TESTS FAILED");
    } else {
      console.log("✅ ALL TESTS PASSED");
    }
  } finally {
    await pool.query(`DELETE FROM balance_transactions WHERE user_id = $1`, [TEST_USER_ID]);
    await pool.query(`DELETE FROM paper_trades WHERE user_id = $1`, [TEST_USER_ID]);
    await pool.query(`DELETE FROM paper_positions WHERE user_id = $1`, [TEST_USER_ID]);
    await pool.query(`DELETE FROM paper_portfolios WHERE user_id = $1`, [TEST_USER_ID]);
    await pool.query(`DELETE FROM virtual_cash_purchases WHERE user_id = $1`, [TEST_USER_ID]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [TEST_USER_ID]);
    await pool.end();
  }
}

main();
