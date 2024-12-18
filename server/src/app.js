const express = require('express');
const fs = require('fs');
const scheduler = require("node-schedule");
var path = require('path');

const userPassKeys = JSON.parse(fs.readFileSync('keys.json'));

let data = fs.existsSync("../data/lastData.json") ? JSON.parse(fs.readFileSync("../data/lastData.json")) : [];
let dataToWrite = false;

const backUp = () => {
    console.log('Backing up');
    const stringToWrite = JSON.stringify(data);
    const fileDate = ((date) => date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0"))(new Date());
    fs.writeFileSync('../data/lastData.json', stringToWrite);
    fs.writeFileSync('../data/archive/data-' + fileDate + '.json', stringToWrite);
};

console.log("Number of events loaded: " + data.length + "\n");

const app = express();

app.use(express.json());

const sitePath = path.join(__dirname, '..', '..', 'website');

app.use(express.static(sitePath));

app.get('/ip', (request, response) => {
    const forwardedIpsStr = request.header('x-forwarded-for');
    let ipAddress = '';

    if (forwardedIpsStr) {
        ipAddress = forwardedIpsStr.split(',')[0];
        response.status(200).json({ success: true, ipaddress: ipAddress });
    } else {
        response.status(400).json({ success: false, message: "failed to get IP address" });
    }
});

app.post('/log', (request, response) => {
    const newData = request.body;

    let user;

    if ("user" in newData && newData.user in userPassKeys) {
        if ("pass" in newData && userPassKeys[newData.user] === newData.pass) {
            user = newData.user;
        } else {
            user = "default";
        }
    } else {
        user = "default";
    }

    if (!("datetime" in newData && "event" in newData && "ipaddress" in newData && "version" in newData)) {
        response.status(400).json({ success: false, message: "invalid data" });
        return;
    }

    data.push({ user: user, datetime: newData.datetime, event: newData.event, ipaddress: newData.ipaddress, version: newData.version });
    dataToWrite = true;
    response.status(200).json({ success: true, message: 'data received' });
});

app.post('/backup', (_, response) => {
    if (dataToWrite) {
        backUp();
        dataToWrite = false;
        response.status(200).json({ success: true, message: 'data backed up' });
    } else {
        response.status(200).json({ success: false, message: 'no data to back up' });
    }
});

app.use((_, response) => {
    response.status(404).json({ success: false, message: "invalid request" });
});

scheduler.scheduleJob('*/15 * * * *', () => {
    backUp();
});

module.exports = app;