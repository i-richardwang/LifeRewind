export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LoggerConfig {
  level: LogLevel;
}

export function createLogger(config: LoggerConfig): Logger {
  const minLevel = LOG_LEVELS[config.level];

  const log = (level: LogLevel, message: string, ...args: unknown[]): void => {
    if (LOG_LEVELS[level] < minLevel) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case 'debug':
      case 'info':
        console.log(fullMessage, ...args);
        break;
      case 'warn':
        console.warn(fullMessage, ...args);
        break;
      case 'error':
        console.error(fullMessage, ...args);
        break;
    }
  };

  return {
    debug: (msg, ...args) => log('debug', msg, ...args),
    info: (msg, ...args) => log('info', msg, ...args),
    warn: (msg, ...args) => log('warn', msg, ...args),
    error: (msg, ...args) => log('error', msg, ...args),
  };
}
