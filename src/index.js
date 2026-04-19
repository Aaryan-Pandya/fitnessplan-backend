const ALLOWED_ORIGIN = "YOUR_FRONTEND_URL_HERE";

function getCorsHeaders(origin = "") {
  if (origin === ALLOWED_ORIGIN) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
  }

  return {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

function jsonResponse(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(origin)
    }
  });
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(byteLength = 24) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function calculateAgeAndBand(dobText) {
  const dob = new Date(dobText);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }

  let ageBand = "unsupported";
  if (age >= 9 && age <= 12) ageBand = "9-12";
  else if (age >= 13 && age <= 15) ageBand = "13-15";
  else if (age >= 16 && age <= 17) ageBand = "16-17";
  else if (age >= 18) ageBand = "18";

  return { age, ageBand };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: getCorsHeaders(origin)
      });
    }

    if (url.pathname === "/init") {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          display_name TEXT,
          dob TEXT,
          age INTEGER,
          age_band TEXT,
          parent_required INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT NOT NULL UNIQUE,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS saved_plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          plan_name TEXT,
          plan_json TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS progress_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          log_date TEXT NOT NULL,
          notes TEXT,
          progress_json TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      return new Response("Database initialized", {
        headers: getCorsHeaders(origin)
      });
    }

    if (url.pathname === "/signup" && request.method === "POST") {
      try {
        const body = await request.json();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const displayName = String(body.displayName || "").trim();
        const dob = String(body.dob || "").trim();

        if (!email || !password || !displayName || !dob) {
          return jsonResponse({ error: "Missing required fields." }, 400, origin);
        }

        if (password.length < 8) {
          return jsonResponse({ error: "Password must be at least 8 characters." }, 400, origin);
        }

        const { age, ageBand } = calculateAgeAndBand(dob);

        if (ageBand === "unsupported") {
          return jsonResponse({ error: "This app currently supports age 9 and up." }, 400, origin);
        }

        const parentRequired = age < 13 ? 1 : 0;
        const salt = randomToken(16);
        const passwordHash = await sha256(`${salt}:${password}`);

        const result = await env.DB.prepare(`
          INSERT INTO users (
            email,
            password_hash,
            salt,
            display_name,
            dob,
            age,
            age_band,
            parent_required
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(email, passwordHash, salt, displayName, dob, age, ageBand, parentRequired)
          .run();

        const userId = result.meta.last_row_id;
        const sessionToken = randomToken(24);

        await env.DB.prepare(`
          INSERT INTO sessions (user_id, token)
          VALUES (?, ?)
        `)
          .bind(userId, sessionToken)
          .run();

        return jsonResponse({
          ok: true,
          token: sessionToken,
          user: {
            id: userId,
            email,
            displayName,
            age,
            ageBand,
            parentRequired: !!parentRequired
          }
        }, 200, origin);
      } catch (error) {
        return jsonResponse({ error: "Signup failed. Email may already exist." }, 400, origin);
      }
    }

    if (url.pathname === "/login" && request.method === "POST") {
      try {
        const body = await request.json();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        if (!email || !password) {
          return jsonResponse({ error: "Missing email or password." }, 400, origin);
        }

        const userResult = await env.DB.prepare(`
          SELECT id, email, password_hash, salt, display_name, age, age_band, parent_required
          FROM users
          WHERE email = ?
        `)
          .bind(email)
          .first();

        if (!userResult) {
          return jsonResponse({ error: "Invalid login." }, 401, origin);
        }

        const passwordHash = await sha256(`${userResult.salt}:${password}`);

        if (passwordHash !== userResult.password_hash) {
          return jsonResponse({ error: "Invalid login." }, 401, origin);
        }

        const sessionToken = randomToken(24);

        await env.DB.prepare(`
          INSERT INTO sessions (user_id, token)
          VALUES (?, ?)
        `)
          .bind(userResult.id, sessionToken)
          .run();

        return jsonResponse({
          ok: true,
          token: sessionToken,
          user: {
            id: userResult.id,
            email: userResult.email,
            displayName: userResult.display_name,
            age: userResult.age,
            ageBand: userResult.age_band,
            parentRequired: !!userResult.parent_required
          }
        }, 200, origin);
      } catch (error) {
        return jsonResponse({ error: "Login failed." }, 500, origin);
      }
    }

    if (url.pathname === "/me" && request.method === "GET") {
      try {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "").trim();

        if (!token) {
          return jsonResponse({ error: "Missing token." }, 401, origin);
        }

        const sessionResult = await env.DB.prepare(`
          SELECT
            users.id,
            users.email,
            users.display_name,
            users.age,
            users.age_band,
            users.parent_required
          FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.token = ?
        `)
          .bind(token)
          .first();

        if (!sessionResult) {
          return jsonResponse({ error: "Invalid session." }, 401, origin);
        }

        return jsonResponse({
          ok: true,
          user: {
            id: sessionResult.id,
            email: sessionResult.email,
            displayName: sessionResult.display_name,
            age: sessionResult.age,
            ageBand: sessionResult.age_band,
            parentRequired: !!sessionResult.parent_required
          }
        }, 200, origin);
      } catch (error) {
        return jsonResponse({ error: "Failed to load current user." }, 500, origin);
      }
    }

    return new Response("FitnessPlan backend live", {
      headers: getCorsHeaders(origin)
    });
  }
};
