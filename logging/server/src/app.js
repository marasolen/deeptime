const express = require('express');
const fs = require('fs');
const scheduler = require("node-schedule");

const keys = JSON.parse(fs.readFileSync('keys.json'));

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

app.post('/', (request, response) => {
    const newData = request.body;

    if (!("user" in newData && newData.user in keys)) {
        response.status(400).json({ success: false, message: "invalid user/password" });
        return;
    }

    if (!("pass" in newData && keys[newData.user] === newData.pass)) {
        response.status(400).json({ success: false, message: "invalid user/password" });
        return;
    }

    if (!("datetime" in newData && "event" in newData && "ipaddress" in newData)) {
        response.status(400).json({ success: false, message: "invalid data" });
        return;
    }

    data.push({ datetime: newData.datetime, event: newData.event, ipaddress: newData.ipaddress });
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