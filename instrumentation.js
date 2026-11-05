import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const missingVariable = !token
  ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
  : !host
    ? "NEXT_PUBLIC_POSTHOG_HOST"
    : null;

if (missingVariable && process.env.NODE_ENV === "development") {
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

export const loggerProvider = token && host
  ? new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name": "try-my-thing",
        "deployment.environment": process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      }),
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${host.replace(/\/$/, "")}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        }),
      ],
    })
  : null;

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && loggerProvider) {
    logs.setGlobalLoggerProvider(loggerProvider);
  }
}

// Any error Next.js catches on the server (server components, server actions, route handlers)
// goes to PostHog Error tracking. Imported lazily so the edge runtime never loads posthog-node.
export async function onRequestError(error, request, context) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureServerError } = await import("@/lib/posthog-server");
  await captureServerError(error, {
    path: request.path,
    method: request.method,
    route: context.routePath,
    route_type: context.routeType, // "render" | "action" | "route" | "proxy"
    digest: error?.digest,
    code: error?.code, // Supabase error code, when it came from lib/data/supabase.js
  });
}
