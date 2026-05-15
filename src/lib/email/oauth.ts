import type { EmailProvider, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type EmailOAuthProvider = Extract<EmailProvider, "gmail" | "outlook">;

export type EmailOAuthConfig = {
  provider: EmailOAuthProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizeUrl: string;
  tokenUrl: string;
};

const providerConfig = {
  gmail: {
    clientIdEnv: "GMAIL_OAUTH_CLIENT_ID",
    clientSecretEnv: "GMAIL_OAUTH_CLIENT_SECRET",
    redirectUriEnv: "GMAIL_OAUTH_REDIRECT_URI",
    defaultRedirectPath: "/api/email/oauth/gmail/callback",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  },
  outlook: {
    clientIdEnv: "OUTLOOK_OAUTH_CLIENT_ID",
    clientSecretEnv: "OUTLOOK_OAUTH_CLIENT_SECRET",
    redirectUriEnv: "OUTLOOK_OAUTH_REDIRECT_URI",
    defaultRedirectPath: "/api/email/oauth/outlook/callback",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["offline_access", "User.Read", "Mail.Read"],
  },
} satisfies Record<EmailOAuthProvider, {
  clientIdEnv: string;
  clientSecretEnv: string;
  redirectUriEnv: string;
  defaultRedirectPath: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
}>;

export function emailOAuthConfig(provider: EmailOAuthProvider, origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"): EmailOAuthConfig {
  const config = providerConfig[provider];
  const clientId = process.env[config.clientIdEnv]?.trim() ?? "";
  const clientSecret = process.env[config.clientSecretEnv]?.trim() ?? "";
  const redirectUri = process.env[config.redirectUriEnv]?.trim() ?? `${origin.replace(/\/+$/, "")}${config.defaultRedirectPath}`;

  return {
    provider,
    clientId,
    clientSecret,
    redirectUri,
    scopes: config.scopes,
    authorizeUrl: config.authorizeUrl,
    tokenUrl: config.tokenUrl,
  };
}

export function emailOAuthConfigured(provider: EmailOAuthProvider) {
  const config = emailOAuthConfig(provider);
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

export function buildEmailOAuthAuthorizeUrl(input: {
  provider: EmailOAuthProvider;
  state: string;
  origin?: string;
}) {
  const config = emailOAuthConfig(input.provider, input.origin);
  if (!config.clientId || !config.clientSecret) throw new Error(`${input.provider} OAuth is not configured.`);

  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", input.state);
  if (input.provider === "gmail") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  return url.toString();
}

export async function saveEmailOAuthConnection(input: {
  userId: string;
  provider: EmailOAuthProvider;
  accessToken: string;
  refreshToken?: string | null;
  expiresInSeconds?: number | null;
  scopes?: string[];
  emailAddress?: string | null;
}) {
  const expiresAt = input.expiresInSeconds ? new Date(Date.now() + input.expiresInSeconds * 1000) : null;
  const scopes = input.scopes ?? emailOAuthConfig(input.provider).scopes;

  return prisma.emailOAuthConnection.upsert({
    where: {
      userId_provider: {
        userId: input.userId,
        provider: input.provider,
      },
    },
    create: {
      userId: input.userId,
      provider: input.provider,
      emailAddress: input.emailAddress ?? null,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      expiresAt,
      scopes: scopes as Prisma.InputJsonValue,
      status: "CONNECTED",
    },
    update: {
      emailAddress: input.emailAddress ?? undefined,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? undefined,
      expiresAt,
      scopes: scopes as Prisma.InputJsonValue,
      status: "CONNECTED",
    },
  });
}

export function normalizeEmailOAuthProvider(value: string): EmailOAuthProvider | null {
  if (value === "gmail" || value === "outlook") return value;
  return null;
}
