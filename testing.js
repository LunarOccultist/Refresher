const { createClient } = require('@supabase/supabase-js');
const config = require('./config.json');

const supabase = createClient(
  config.supabase.url,
  config.supabase.anon_key
);

async function testDb() {
  try {
    const { data, error } = await supabase
      .from('project')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('No projects found in the DB.');
      return;
    }

    console.log('Projects in DB:');
    data.forEach((project, index) => {
      console.log(`${index + 1}:`, project);
    });
  } catch (err) {
    console.error('Error fetching projects:', err.message);
  }
}

testDb();
