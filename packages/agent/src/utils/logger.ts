import pino from "pino";
import { getConfig } from "../config.js";

let _logger: pino.Logger | null = null;

export function createLogger(): pino.Logger {
  if (_logger) return _logger;

  let level: string;
  try {
    level = getConfig().LOG_LEVEL;
  } catch {
    level = "info";
  }

  _logger = pino({
    level,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  });

  return _logger;
}

export function getLogger(): pino.Logger {
  if (!_logger) return createLogger();
  return _logger;
}
