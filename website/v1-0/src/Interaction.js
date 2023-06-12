let settingsOpen = true;

let pressNextEvent = false;
let pressNextEventGroup = false;
let pressResetDataset = false;
let pressOpenSettings = false;

let animationTimeout;

let dynamicTimeout;

let logDownloadTimeout;
let logEvents = [];
let lastLogDownload = new Date();

const downloadLogs = () => {
    clearTimeout(logDownloadTimeout);

    if (logEvents.length > 0) {
        const logDate = new Date();

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' +
            encodeURIComponent(JSON.stringify({
                start: lastLogDownload.toISOString(),
                end: logDate.toISOString(),
                data: logEvents
            })));

        const fileName = "log-data_" +
            lastLogDownload.toISOString()
                .replaceAll(" ", "")
                .replaceAll(":", "-") +
            "---" +
            logDate.toISOString()
                .replaceAll(" ", "")
                .replaceAll(":", "-") +
            ".json";

        element.setAttribute('download', fileName);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);

        lastLogDownload = logDate;
        logEvents = [];
    }

    startDownloadTimeout();
};

const startDownloadTimeout = () => {
    logDownloadTimeout = setTimeout(downloadLogs, 1000 * logInterval);
};

const storeEvent = (event) => {
    if (shouldLogEvents) {
        logEvents.push({ datetime: (new Date()).toISOString(), event: event});

        if (logEvents.length >= 1000) {
            downloadLogs();
        }
    }
};

const interactionHandler = (event) => {
    storeEvent(event);
    if (interactionMode === "dynamic") {
        clearTimeout(dynamicTimeout);
        clearTimeout(animationTimeout);
        initializeDynamicAnimation();
    }
};

const nextEvent = () => {
    if (currentEventIndex + 1 < data[currentGroupIndex].events.length) {
        currentEventIndex += 1;

        const dataCopy = getSlicedData();

        tieredTimeline.nextTime(dataCopy[currentGroupIndex], false);
        timeline.nextTime(dataCopy[currentGroupIndex]);
    } else if (currentGroupIndex + 1 < data.length) {
        currentGroupIndex += 1;
        currentEventIndex = 0;

        const dataCopy = getSlicedData();

        tieredTimeline.nextTime(dataCopy[currentGroupIndex], true);
        timeline.nextTime({ label: dataCopy[currentGroupIndex].label, time: dataCopy[currentGroupIndex].time });
    }

    updateURL();
};

const nextEventGroup = () => {
    if (currentEventIndex + 1 < data[currentGroupIndex].events.length) {
        currentEventIndex = data[currentGroupIndex].events.length - 1;

        const dataCopy = getSlicedData();

        tieredTimeline.nextTime(dataCopy[currentGroupIndex], false);
        timeline.nextTime(data[currentGroupIndex]);
    } else if (currentGroupIndex + 1 < data.length) {
        currentGroupIndex += 1;
        currentEventIndex = data[currentGroupIndex].events.length - 1;

        const dataCopy = getSlicedData();

        tieredTimeline.nextTime(dataCopy[currentGroupIndex], true);
        timeline.nextTime({ label: dataCopy[currentGroupIndex].label, time: dataCopy[currentGroupIndex].time });
    }

    updateURL();
};

const reset = () => {
    currentGroupIndex = 0;
    currentEventIndex = 0;

    updateURL();

    const dataCopy = getSlicedData();

    tieredTimeline.updateData(dataCopy);
    timeline.updateData(
        {
            label: data[data.length - 1].label,
            time: data[data.length - 1].time
        },
        {
            label: data[0].label,
            time: data[0].time
        });
};

const toggleSettings = () => {
    clearTimeout(dynamicTimeout);
    clearTimeout(animationTimeout);
    settingsOpen = !settingsOpen;
    if (!settingsOpen) {
        if (interactionMode === "animated") {
            startAnimation(true);
        } else if (interactionMode === "dynamic") {
            initializeDynamicAnimation();
        }
    }
    document.getElementById("settings-instructions").style.display = settingsOpen ? "block" : "none";
};

const startAnimation = (first) => {
    if (currentGroupIndex + 1 === data.length && currentEventIndex + 1 === data[currentGroupIndex].events.length) {
        reset();
        animationTimeout = setTimeout(() => startAnimation(false), 1000 * animationInterval);
        return;
    }

    if (!first && animationMode === "animation-event") {
        nextEvent();
    } else if (!first && animationMode === "animation-event-group") {
        nextEventGroup();
    }

    clearTimeout(animationTimeout);
    if (currentGroupIndex + 1 === data.length && currentEventIndex + 1 === data[currentGroupIndex].events.length) {
        animationTimeout = setTimeout(() => startAnimation(false), 1000 * animationResetInterval);
    } else {
        animationTimeout = setTimeout(() => startAnimation(false), 1000 * animationInterval);
    }
};

const initializeDynamicAnimation = () => {
    dynamicTimeout = setTimeout(() => {
        storeEvent("automatic animation beginning");
        startAnimation(true);
    }, 1000 * dynamicWait);
};