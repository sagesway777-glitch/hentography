type LogLevel = "info" | "warn" | "error" | "debug";

export const logger = {
  log: (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "test") return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    const formattedMessage =
      process.env.NODE_ENV === "production"
        ? JSON.stringify(logEntry)
        : `[${timestamp}] ${level.toUpperCase()}: ${message} ${
            context ? JSON.stringify(context) : ""
          }`;

    switch (level) {
      case "info":
        console.log(formattedMessage);
        break;
      case "warn":
        console.warn(formattedMessage);
        break;
      case "error":
        console.error(formattedMessage);
        break;
      case "debug":
        if (process.env.NODE_ENV !== "production") {
          console.debug(formattedMessage);
        }
        break;
    }
  },

  info: (message: string, context?: Record<string, unknown>) =>
    logger.log("info", message, context),
  
  warn: (message: string, context?: Record<string, unknown>) =>
    logger.log("warn", message, context),
  
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    let errorContext = {};
    if (error instanceof Error) {
      errorContext = {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorContext = { error };
    }
    
    logger.log("error", message, { ...context, ...errorContext });
  },
  
  debug: (message: string, context?: Record<string, unknown>) =>
    logger.log("debug", message, context),
};
