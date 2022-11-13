class LogBook {
    logs;

    constructor() {
        this.logs = [];
    }

    addLog(level, description) {
        this.logs.push(new Log(level, description));
    }
}

const globalLogBook = new LogBook();

const printLogs = () => {
    let logString = "\n";
    globalLogBook.logs.forEach((log) => {
        logString += logLevelToString[log.level] + ": " + log.description + "\n";
    });
    return logString;
};