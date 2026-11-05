import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { loggerProvider } from "@/instrumentation";

// This dedicated logger is the only logger routed to the PostHog OTLP exporter.
const logger = logs.getLogger("builder-matchmaker-posthog");

export function logPostHogAction(body, attributes) {
  logger.emit({
    body,
    severityNumber: SeverityNumber.INFO,
    attributes,
  });
}

// Server actions can finish before the batch processor exports their log record.
export async function flushPostHogLogs() {
  try {
    await loggerProvider?.forceFlush();
  } catch {
    // Log delivery must not change the outcome of a successful action.
  }
}
