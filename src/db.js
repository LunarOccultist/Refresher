const { createClient } = require('@supabase/supabase-js');
const config = require('./config.json');
const { log } = require('./utility.js');

const status = { connected: false };

const supabase = createClient(
  config.supabase.url,
  config.supabase.anon_key
);

async function connect() {
  const { error } = await supabase
    .from('project')
    .select('id')
    .limit(1);

  if (error) {
    log.error(`Failed to connect to Supabase: ${error.message}`);
    status.connected = false;
  } else {
    status.connected = true;
  }
}

// Select fresh projects (updated <= 1 hour ago OR null)
async function getProjects() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('project')
    .select('*')
    .or(`updated.is.null,updated.lte.${oneHourAgo}`)
    .order('id');

  if (error) throw error;
  return data;
}

// Select all projects
async function getAllProjects() {
  const { data, error } = await supabase
    .from('project')
    .select('*')
    .order('id');

  if (error) throw error;
  return data;
}

// Update project by address
async function updateProject(address, fields) {
  fields.updated = new Date().toISOString();

  const { error } = await supabase
    .from('project')
    .update(fields)
    .eq('address', address);

  if (error) log.error(`DB update failed: ${error.message}`);
}

// Insert a new project if missing
async function insertProject(address) {
  const { data, error } = await supabase
    .from('project')
    .insert([{ address }])
    .select();

  if (error) throw error;

  return data[0]; // returns inserted row
}

module.exports = {
  status,
  connect,
  getProjects,
  getAllProjects,
  updateProject,
  insertProject
};