const logLevel = {
    "Info": 0,
    "Warning": 1,
    "Error": 2
}

const logLevelToString = [
    "INFO",
    "WARNING",
    "ERROR"
];

class Log {
    level;
    description;

    constructor(level, description) {
        this.level = level;
        this.description = description;
    }
}