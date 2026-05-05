
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables missing.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deployMission() {
  const missionData = {
    title: "Operation Arc Flash: Plains Cyclogenesis",
    description: "Multi-day strategic operation targeting a significant severe weather outbreak across the Central Plains. Objectives: Intercept discrete supercells along the dryline and document high-shear storm morphology. Extreme instability forecasted.",
    start_date: "2026-04-27",
    end_date: "2026-04-28",
    status: "active",
    is_global: true,
    global_id: `arc-flash-cyclogenesis-${Date.now()}`,
    user_id: "5e496b73-229b-4105-bfe6-7c6358a6010b" // User ID from metadata
  };

  try {
    const { data, error } = await supabase.from('missions').insert(missionData).select();
    if (error) throw error;
    console.log("Mission deployed successfully:", data);
  } catch (e) {
    console.error("Error deploying mission:", e);
  }
}

deployMission();
