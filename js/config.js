/*
  config.js
  Supabase connection setup: URL, anon key, and the `db` client.
  Edit SUPABASE_URL / SUPABASE_ANON_KEY here to point at your project.
*/

      // ================= SERVER CONNECTION =================
      // This is the section that points the app at your live/shared database.
      // 1. Create a free project at https://supabase.com
      // 2. Open the SQL Editor in that project and run the schema.sql file that came with this app
      // 3. Go to Project Settings -> API and copy the "Project URL" and the "anon public" key
      // 4. Paste them below, replacing the two placeholder strings, then save and reload this page
      const SUPABASE_URL = "https://yzkmlgscagltuzlhqvun.supabase.co";
      const SUPABASE_ANON_KEY = "sb_publishable_RcXnP6gArzqXS_vlhP53Kg_EAA0EkgJ";

      const isConfigured = !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");
      const db = isConfigured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
      // =======================================================
