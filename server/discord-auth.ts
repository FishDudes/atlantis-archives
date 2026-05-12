import crypto from "crypto";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  global_name?: string;
}

interface DiscordGuildMember {
  roles: string[];
  nick?: string;
  user?: DiscordUser;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Discord user: ${res.status}`);
  return res.json();
}

async function fetchGuildMemberRoles(discordUserId: string): Promise<string[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!botToken || !guildId) {
    console.error("Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID");
    return [];
  }

  try {
    const memberRes = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    if (!memberRes.ok) {
      if (memberRes.status === 404) {
        console.log(`User ${discordUserId} is not a member of the guild`);
        return [];
      }
      throw new Error(`Failed to fetch guild member: ${memberRes.status}`);
    }

    const member: DiscordGuildMember = await memberRes.json();
    const roleIds = member.roles;

    const rolesRes = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/roles`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    if (!rolesRes.ok) throw new Error(`Failed to fetch guild roles: ${rolesRes.status}`);
    const allRoles: DiscordRole[] = await rolesRes.json();

    const roleNames = allRoles
      .filter((r) => roleIds.includes(r.id))
      .map((r) => r.name);

    return roleNames;
  } catch (err) {
    console.error("Error fetching guild member roles:", err);
    return [];
  }
}

async function upsertDiscordUser(discordUser: DiscordUser, roles: string[]) {
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
    : null;

  const displayName = discordUser.global_name || discordUser.username;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.discordId, discordUser.id));

  if (existing.length > 0) {
    const [user] = await db
      .update(users)
      .set({
        discordUsername: discordUser.username,
        discordAvatar: avatarUrl,
        discordRoles: roles,
        firstName: displayName,
        email: discordUser.email || existing[0].email,
        profileImageUrl: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.discordId, discordUser.id))
      .returning();
    return user;
  } else {
    const [user] = await db
      .insert(users)
      .values({
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: avatarUrl,
        discordRoles: roles,
        firstName: displayName,
        email: discordUser.email,
        profileImageUrl: avatarUrl,
      })
      .returning();
    return user;
  }
}

function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool as any,
    createTableIfMissing: true,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: true,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

export async function setupDiscordAuth(app: Express) {
  app.set("trust proxy", true);
  app.use(getSession());

  const clientId = process.env.DISCORD_CLIENT_ID!;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!;

  app.get("/api/login", (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    (req.session as any).oauthState = state;
    req.session.save((err) => {
      if (err) {
        console.error("Session save error during login:", err);
        return res.redirect("/?error=session_error");
      }
      const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() || req.protocol;
      const host = req.get("host");
      const redirectUri = `${proto}://${host}/api/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "identify email guilds.members.read",
        state,
      });
      console.log(`[auth] Login redirect — redirectUri: ${redirectUri}, sessionID: ${req.sessionID}`);
      res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
    });
  });

  app.get("/api/callback", async (req, res) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const savedState = (req.session as any)?.oauthState;

    if (!code) {
      return res.redirect("/?error=no_code");
    }

    if (!state || state !== savedState) {
      return res.redirect("/?error=invalid_state");
    }

    delete (req.session as any).oauthState;

    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/callback`;

      const tokenRes = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Discord token exchange failed:", errText);
        return res.redirect("/?error=token_failed");
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const discordUser = await fetchDiscordUser(accessToken);
      const roles = await fetchGuildMemberRoles(discordUser.id);

      const user = await upsertDiscordUser(discordUser, roles);

      (req.session as any).userId = user.id;
      (req.session as any).discordRoles = roles;

      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        res.redirect("/dashboard");
      });
    } catch (err) {
      console.error("Discord auth callback error:", err);
      res.redirect("/?error=auth_failed");
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error("Session destroy error:", err);
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/refresh-roles", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || !user.discordId) {
        return res.status(400).json({ message: "No Discord ID found" });
      }

      const roles = await fetchGuildMemberRoles(user.discordId);
      const [updated] = await db
        .update(users)
        .set({ discordRoles: roles, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      (req.session as any).discordRoles = roles;
      res.json(updated);
    } catch (error) {
      console.error("Error refreshing roles:", error);
      res.status(500).json({ message: "Failed to refresh roles" });
    }
  });

  app.get("/api/auth/available-roles", async (req, res) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!botToken || !guildId) {
      return res.status(500).json({ message: "Discord not configured" });
    }

    try {
      const rolesRes = await fetch(
        `${DISCORD_API_BASE}/guilds/${guildId}/roles`,
        { headers: { Authorization: `Bot ${botToken}` } }
      );

      if (!rolesRes.ok) throw new Error("Failed to fetch roles");
      const allRoles: DiscordRole[] = await rolesRes.json();

      const roleNames = allRoles
        .filter((r) => r.name !== "@everyone")
        .sort((a, b) => b.position - a.position)
        .map((r) => r.name);

      res.json(roleNames);
    } catch (error) {
      console.error("Error fetching available roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
