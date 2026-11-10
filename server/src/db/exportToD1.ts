import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

function escapeSqlVal(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? '1' : '0';
  const escaped = String(val).replace(/'/g, "''");
  return `'${escaped}'`;
}

async function main() {
  const dbPath = path.resolve(__dirname, '../../data/roscopal.sqlite');
  if (!fs.existsSync(dbPath)) {
    console.error('Source SQLite DB not found at:', dbPath);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Insertion order respecting foreign key dependencies:
  // 1. users
  // 2. circles (depends on users)
  // 3. circle_policies (depends on circles)
  // 4. circle_members (depends on circles, users)
  // 5. cycles (depends on circles, circle_members)
  // 6. contributions (depends on circles, cycles, circle_members)
  // 7. payouts (depends on circles, cycles, circle_members)
  // 8. payment_requests
  // 9. messages
  // 10. agent_decisions
  // 11. approvals
  // 12. reminders
  // 13. ledger_entries
  // 14. webhook_events
  // 15. user_sessions (valid user_id only)
  // 16. invitations (valid circle_id and user_id only)

  const tablesWithQueries: Array<{ name: string; query: string }> = [
    { name: 'users', query: 'SELECT * FROM users' },
    { name: 'circles', query: 'SELECT * FROM circles WHERE organizer_id IN (SELECT id FROM users)' },
    { name: 'circle_policies', query: 'SELECT * FROM circle_policies WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'circle_members', query: 'SELECT * FROM circle_members WHERE circle_id IN (SELECT id FROM circles) AND user_id IN (SELECT id FROM users)' },
    { name: 'cycles', query: 'SELECT * FROM cycles WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'contributions', query: 'SELECT * FROM contributions WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'payouts', query: 'SELECT * FROM payouts WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'payment_requests', query: 'SELECT * FROM payment_requests WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'messages', query: 'SELECT * FROM messages WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'agent_decisions', query: 'SELECT * FROM agent_decisions WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'approvals', query: 'SELECT * FROM approvals WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'reminders', query: 'SELECT * FROM reminders WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'ledger_entries', query: 'SELECT * FROM ledger_entries WHERE circle_id IN (SELECT id FROM circles)' },
    { name: 'webhook_events', query: 'SELECT * FROM webhook_events' },
    { name: 'user_sessions', query: 'SELECT * FROM user_sessions WHERE user_id IN (SELECT id FROM users)' },
    { name: 'invitations', query: 'SELECT * FROM invitations WHERE circle_id IN (SELECT id FROM circles) AND created_by IN (SELECT id FROM users)' }
  ];

  let sqlStatements: string[] = [
    '-- ============================================================',
    '-- DATA IMPORT FROM LOCAL SQLITE TO CLOUDFLARE D1',
    '-- ============================================================',
    'PRAGMA defer_foreign_keys = ON;'
  ];

  const recordCounts: Record<string, number> = {};

  for (const item of tablesWithQueries) {
    try {
      const res = db.exec(item.query);
      if (!res || res.length === 0 || !res[0].values || res[0].values.length === 0) {
        recordCounts[item.name] = 0;
        continue;
      }

      const columns = res[0].columns;
      const rows = res[0].values;
      recordCounts[item.name] = rows.length;

      sqlStatements.push(`\n-- Table: ${item.name} (${rows.length} valid records)`);
      for (const row of rows) {
        const valList = row.map(v => escapeSqlVal(v)).join(', ');
        sqlStatements.push(`INSERT OR IGNORE INTO ${item.name} (${columns.join(', ')}) VALUES (${valList});`);
      }
    } catch (err) {
      console.warn(`Error querying table ${item.name}:`, err);
    }
  }

  const outputPath = path.resolve(__dirname, '../../migrations/0002_import_existing_data.sql');
  fs.writeFileSync(outputPath, sqlStatements.join('\n'));

  console.log('Generated referentially intact migration file:', outputPath);
  console.log('Migrated Record Counts:');
  console.table(recordCounts);
}

main().catch(console.error);
