import winston from "winston";
const { combine, timestamp, json, errors, cli } = winston.format;

// Extract the transports so they can be re-used within the config.
// We don't bother with managing multiple separate log files for different purposes.
const consoleTransport = new winston.transports.Console({
    format: combine(timestamp(), cli(), errors({ stack: true })),
});
const fileTransport = new winston.transports.File({
    format: combine(timestamp(), json(), errors({ stack: true })),
    filename: "logs/app.log.jsonl",
    maxsize: 1_000_000, // 1 megabyte in bytes
    maxFiles: 5,
    tailable: true,
    lazy: true,
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    transports: [consoleTransport, fileTransport],
    exceptionHandlers: [fileTransport],
    rejectionHandlers: [fileTransport],
});

export default logger;
