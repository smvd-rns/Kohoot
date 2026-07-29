const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const key = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(url, key);

(async () => {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_string: `
      DROP POLICY IF EXISTS "System manages custom field responses" ON custom_field_responses;
      CREATE POLICY "System manages custom field responses" ON custom_field_responses FOR ALL USING (true);
    `
  });
  console.log('Error:', error);
})();
