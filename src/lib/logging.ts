import winston from "winston";
import {
    AbstractConfigSetColors,
    AbstractConfigSetLevels,
} from "winston/lib/winston/config";
const { combine, timestamp, json, errors, colorize, align, printf } = winston.format;

const myCustomLevels: {
    levels: AbstractConfigSetLevels;
    colors: AbstractConfigSetColors;
} = {
    levels: {
        error: 0,
        dbError: 0,
        warn: 1,
        dbWarn: 1,
        info: 2,
        dbInfo: 2,
        verbose: 3,
        dbVerbose: 3,
        debug: 4,
        dbDebug: 4,
        silly: 5,
        dbSilly: 5,
    },
    colors: {
        error: "red",
        dbError: "redBG white",
        warn: "yellow",
        dbWarn: "yellowBG black",
        info: "green",
        dbInfo: "greenBG white",
        verbose: "blue",
        dbVerbose: "blueBG white",
        debug: "magenta",
        dbDebug: "magentaBG white",
        silly: "grey",
        dbSilly: "greyBG black",
    },
};

winston.addColors(myCustomLevels.colors);

// Extract the transports so they can be re-used within the config.
// We don't bother with managing multiple separate log files for different purposes.
const consoleTransport = new winston.transports.Console({
    format: combine(
        colorize({ all: true }),
        timestamp({
            format: "YYYY-MM-DD hh:mm:ss.SSS A",
        }),
        align(),
        printf(
            (info) =>
                `[${info.timestamp}] ${info.level} (${info.event || info.file}): ${
                    info.message
                }`
        )
    ),
});
const fileTransport = new winston.transports.File({
    format: combine(
        timestamp({
            format: "YYYY-MM-DD hh:mm:ss.SSS A",
        }),
        json(),
        errors({ stack: true })
    ),
    filename: "logs/app.log.jsonl",
    maxsize: 1_000_000, // 1 megabyte in bytes
    maxFiles: 5,
    tailable: true,
    lazy: true,
});

const logger = winston.createLogger({
    levels: myCustomLevels.levels,
    transports: [consoleTransport, fileTransport],
    exceptionHandlers: [fileTransport],
    rejectionHandlers: [fileTransport],
}) as winston.Logger &
    Record<keyof (typeof myCustomLevels)["levels"], winston.LeveledLogMethod>;

export default logger;
