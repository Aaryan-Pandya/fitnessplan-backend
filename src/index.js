export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/init") {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          password_hash TEXT,
          display_name TEXT,
          dob TEXT,
          age INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS saved_plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          plan_json TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      return new Response("Database initialized");
    }

    return new Response("FitnessPlan backend live");
  }
}
