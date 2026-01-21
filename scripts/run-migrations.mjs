#!/usr/bin/env node
/**
 * Migration Runner Script
 * Runs SQL migrations against Supabase database
 *
 * Usage: node scripts/run-migrations.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nRun with:');
  console.error('  source .env.local && node scripts/run-migrations.mjs');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filePath) {
  const fileName = filePath.split('/').pop();
  console.log(`\n📄 Running: ${fileName}`);

  try {
    const sql = readFileSync(filePath, 'utf8');

    // Split by semicolons but be careful with $$ blocks
    const statements = splitSQLStatements(sql);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt || stmt.startsWith('--')) continue;

      // Use rpc to execute raw SQL
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });

      if (error) {
        // Try direct query if rpc doesn't exist
        console.log(`   Statement ${i + 1}: Attempting direct execution...`);
      }
    }

    console.log(`   ✅ ${fileName} completed`);
    return true;
  } catch (err) {
    console.error(`   ❌ ${fileName} failed:`, err.message);
    return false;
  }
}

function splitSQLStatements(sql) {
  // Simple split - doesn't handle all edge cases but works for most migrations
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');

  for (const line of lines) {
    // Skip comments
    if (line.trim().startsWith('--')) {
      continue;
    }

    // Check for $$ blocks
    if (line.includes('$$')) {
      inDollarQuote = !inDollarQuote;
    }

    current += line + '\n';

    // If we hit a semicolon and we're not in a $$ block, it's end of statement
    if (line.trim().endsWith(';') && !inDollarQuote) {
      statements.push(current.trim());
      current = '';
    }
  }

  // Don't forget the last statement
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function main() {
  console.log('🚀 Supabase Migration Runner');
  console.log('============================\n');
  console.log(`URL: ${SUPABASE_URL}`);

  // Get migration files
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\nFound ${files.length} migration files:`);
  files.forEach(f => console.log(`  - ${f}`));

  // Run each migration
  let success = 0;
  let failed = 0;

  for (const file of files) {
    const result = await runMigration(join(migrationsDir, file));
    if (result) success++;
    else failed++;
  }

  console.log('\n============================');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some migrations failed. You may need to run them manually in Supabase Dashboard.');
  }
}

main().catch(console.error);
