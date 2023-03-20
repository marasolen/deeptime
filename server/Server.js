const http = require("http");
const schedule = require('node-schedule');
const fs = require("fs");
const path = require('path');

const host = '127.0.0.1';
const port = 5000;

const data = [];

const requestListener = function (request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    response.setHeader('Access-Control-Max-Age', 2592000);
    response.setHeader("Access-Control-Allow-Headers",
        "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    console.log(request.method)
    if (request.method === "POST") {
        console.log("received");

        let log = "";

        request.on('data', function (temp) {
            log += temp;

            if (log.length > 1e6) {
                request.connection.destroy();
            }
        });

        request.on('end', function () {
            data.push(JSON.parse(log));
            console.log(data);
        });
    }

    response.writeHead(200);
    response.end("received");
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

schedule.scheduleJob("* */30 * * * *", () => {
    let date = new Date();
    const offset = date.getTimezoneOffset();
    date = new Date(date.getTime() - (offset*60*1000));
    const dateString = date.toISOString()
        .replaceAll(":", "-")
        .replaceAll("T", "_")
        .replaceAll("Z", "")
        .split(".")[0];
    console.log(dateString);
    if (!fs.existsSync(path.join(__dirname, "data"))) {
        fs.mkdirSync(path.join(__dirname, "data"));
    }
    fs.writeFileSync(path.join(__dirname, "data", "data_" + dateString + ".json"),
        JSON.stringify(data));
});