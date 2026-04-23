export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json({});
    }

    try {
      if (url.pathname === "/") {
        return json({ ok: true, message: "FitnessPlan backend live" });
      }

      if (url.pathname === "/init" && request.method === "GET") {
        const db = getDB(env);

        await db.prepare(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            age INTEGER NOT NULL,
            ageBand TEXT NOT NULL,
            parentRequired INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        await db.prepare(`
          CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            userId INTEGER NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        await db.prepare(`
          CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            planName TEXT NOT NULL,
            startDate TEXT NOT NULL,
            planJson TEXT NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        return json({ ok: true, message: "Database initialized" });
      }

      if (url.pathname === "/reset-db" && request.method === "GET") {
        const db = getDB(env);

        await db.prepare(`DROP TABLE IF EXISTS plans`).run();
        await db.prepare(`DROP TABLE IF EXISTS sessions`).run();
        await db.prepare(`DROP TABLE IF EXISTS users`).run();

        return json({ ok: true, message: "Database reset complete. Now open /init." });
      }

      if (url.pathname === "/signup" && request.method === "POST") {
        const body = await request.json();

        const username = String(body.displayName || body.username || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const dob = String(body.dob || "").trim();

        if (!username || !email || !password || !dob) {
          return json({ ok: false, error: "All fields are required." }, 400);
        }

        const dobDate = new Date(`${dob}T12:00:00`);
        if (Number.isNaN(dobDate.getTime())) {
          return json({ ok: false, error: "DOB must be YYYY-MM-DD." }, 400);
        }

        const ageInfo = getAgeInfo(dobDate);

        if (ageInfo.age < 9) {
          return json({ ok: false, error: "This app supports age 9 and up." }, 400);
        }

        const db = getDB(env);

        const existing = await db
          .prepare(`SELECT id FROM users WHERE email = ?1`)
          .bind(email)
          .first();

        if (existing) {
          return json({ ok: false, error: "That email is already registered." }, 409);
        }

        const result = await db
          .prepare(`
            INSERT INTO users (username, email, password, age, ageBand, parentRequired)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
          `)
          .bind(
            username,
            email,
            password,
            ageInfo.age,
            ageInfo.ageBand,
            ageInfo.parentRequired ? 1 : 0
          )
          .run();

        const userId = result.meta.last_row_id;
        const token = crypto.randomUUID();

        await db
          .prepare(`
            INSERT INTO sessions (token, userId)
            VALUES (?1, ?2)
          `)
          .bind(token, userId)
          .run();

        return json({
          ok: true,
          token,
          user: {
            id: userId,
            username,
            email,
            age: ageInfo.age,
            ageBand: ageInfo.ageBand,
            parentRequired: ageInfo.parentRequired
          }
        });
      }

      if (url.pathname === "/login" && request.method === "POST") {
        const body = await request.json();

        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        if (!email || !password) {
          return json({ ok: false, error: "Email and password are required." }, 400);
        }

        const db = getDB(env);

        const user = await db
          .prepare(`
            SELECT id, username, email, password, age, ageBand, parentRequired
            FROM users
            WHERE email = ?1
          `)
          .bind(email)
          .first();

        if (!user) {
          return json({ ok: false, error: "No account found for that email." }, 404);
        }

        if (user.password !== password) {
          return json({ ok: false, error: "Incorrect password." }, 401);
        }

        const token = crypto.randomUUID();

        await db
          .prepare(`
            INSERT INTO sessions (token, userId)
            VALUES (?1, ?2)
          `)
          .bind(token, user.id)
          .run();

        return json({
          ok: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            age: user.age,
            ageBand: user.ageBand,
            parentRequired: !!user.parentRequired
          }
        });
      }

      if (url.pathname === "/me" && request.method === "GET") {
        const user = await requireUser(request, env);

        return json({
          ok: true,
          user
        });
      }

      if (url.pathname === "/save-plan" && request.method === "POST") {
        const user = await requireUser(request, env);
        const body = await request.json();

        const planName = String(body.planName || "FitnessPlan").trim();
        const startDate = String(body.startDate || "").trim();
        const plan = body.plan;

        if (!startDate || !plan) {
          return json({ ok: false, error: "startDate and plan are required." }, 400);
        }

        const db = getDB(env);

        const existing = await db
          .prepare(`
            SELECT id FROM plans
            WHERE userId = ?1
            ORDER BY id DESC
            LIMIT 1
          `)
          .bind(user.id)
          .first();

        if (existing) {
          await db
            .prepare(`
              UPDATE plans
              SET planName = ?1,
                  startDate = ?2,
                  planJson = ?3,
                  updatedAt = CURRENT_TIMESTAMP
              WHERE id = ?4
            `)
            .bind(planName, startDate, JSON.stringify(plan), existing.id)
            .run();
        } else {
          await db
            .prepare(`
              INSERT INTO plans (userId, planName, startDate, planJson)
              VALUES (?1, ?2, ?3, ?4)
            `)
            .bind(user.id, planName, startDate, JSON.stringify(plan))
            .run();
        }

        return json({ ok: true, message: "Plan saved." });
      }

      if (url.pathname === "/my-plan" && request.method === "GET") {
        const user = await requireUser(request, env);
        const db = getDB(env);

        const row = await db
          .prepare(`
            SELECT planJson
            FROM plans
            WHERE userId = ?1
            ORDER BY id DESC
            LIMIT 1
          `)
          .bind(user.id)
          .first();

        if (!row) {
          return json({ ok: true, plan: null });
        }

        return json({
          ok: true,
          plan: JSON.parse(row.planJson)
        });
      }

      if (url.pathname === "/logout" && request.method === "POST") {
        const token = getBearerToken(request);

        if (token) {
          const db = getDB(env);
          await db
            .prepare(`DELETE FROM sessions WHERE token = ?1`)
            .bind(token)
            .run();
        }

        return json({ ok: true, message: "Logged out." });
      }

      return json({ ok: false, error: "Route not found." }, 404);
    } catch (err) {
      return json({
        ok: false,
        error: "Server error",
        details: String(err && err.message ? err.message : err)
      }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });
}

function getDB(env) {
  if (!env.DB || typeof env.DB.prepare !== "function") {
    throw new Error('D1 binding "DB" is missing on this worker.');
  }

  return env.DB;
}

function getAgeInfo(dobDate) {
  const today = new Date();

  let age = today.getFullYear() - dobDate.getFullYear();
  const monthDiff = today.getMonth() - dobDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
    age -= 1;
  }

  let ageBand = "18";
  if (age >= 9 && age <= 12) ageBand = "9-12";
  else if (age >= 13 && age <= 15) ageBand = "13-15";
  else if (age >= 16 && age <= 17) ageBand = "16-17";

  return {
    age,
    ageBand,
    parentRequired: age < 13
  };
}

function getBearerToken(request) {
  const auth = request.headers.get("Authorization") || "";

  if (!auth.startsWith("Bearer ")) {
    return "";
  }

  return auth.slice("Bearer ".length).trim();
}

async function requireUser(request, env) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("Missing login token.");
  }

  const db = getDB(env);

  const row = await db
    .prepare(`
      SELECT users.id, users.username, users.email, users.age, users.ageBand, users.parentRequired
      FROM sessions
      JOIN users ON users.id = sessions.userId
      WHERE sessions.token = ?1
    `)
    .bind(token)
    .first();

  if (!row) {
    throw new Error("Invalid or expired login token.");
  }

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    age: row.age,
    ageBand: row.ageBand,
    parentRequired: !!row.parentRequired
  };
}
