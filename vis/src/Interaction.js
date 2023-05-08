let settingsOpen = true;

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
    logEvents.push({ datetime: (new Date()).toISOString(), event: event});

    if (logEvents.length >= 1000) {
        downloadLogs();
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

const backEvent = () => {
    let groupIndex = currentGroupIndex - backGroupAmount;
    let eventIndex = (groupIndex === currentGroupIndex ? currentEventIndex : data[groupIndex].events.length - 1) - backEventAmount;

    if (eventIndex > 0) {
        backEventAmount += 1;
        eventIndex -= 1;
    } else if (groupIndex > 0) {
        backGroupAmount += 1;
        groupIndex -= 1;

        backEventAmount = 0;
        eventIndex = data[groupIndex].events.length - 1;
    }

    const event = data[groupIndex].events[eventIndex];
    timeline.nextTime(event);
    tieredTimeline.setBoldedEvent(groupIndex, eventIndex);
    setMedia(event.label, event.description, event.image);

    updateURL();
};

const nextEvent = () => {
    tieredTimeline.clearBoldedEvent();

    if (backGroupAmount > 0 || backEventAmount > 0) {
        if (backEventAmount > 0) {
            backEventAmount -= 1;
        } else {
            backGroupAmount -= 1;
            backEventAmount = backGroupAmount === 0 ? currentEventIndex : (data[currentGroupIndex - backGroupAmount].events.length - 1);
        }

        const numEventsInGroup = backGroupAmount === 0 ? currentEventIndex : data[currentGroupIndex - backGroupAmount].events.length - 1;

        const event = data[currentGroupIndex - backGroupAmount].events[numEventsInGroup - backEventAmount];
        timeline.nextTime(event);
        tieredTimeline.setBoldedEvent(currentGroupIndex - backGroupAmount, numEventsInGroup - backEventAmount);
        setMedia(event.label, event.description, event.image);
    } else if (currentEventIndex + 1 < data[currentGroupIndex].events.length) {
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
    tieredTimeline.clearBoldedEvent();
    backGroupAmount = 0;
    backEventAmount = 0;

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

    backEventAmount = 0;
    backGroupAmount = 0;

    tieredTimeline.clearBoldedEvent();

    updateURL();

    const dataCopy = getSlicedData();

    tieredTimeline.updateData(dataCopy);
    timeline.updateData(
        {
            label: data[data.length - 1].label,
            time: data[data.length - 1].time
        },
        {
            label: data[0].events[0].label,
            time: data[0].events[0].time
        });
};

const startAnimation = (first) => {
    backGroupAmount = 0;
    backEventAmount = 0;

    if (interactionMode === "dynamic") {
        document.getElementById("automation-happening").style.display = "block";
        document.getElementById("automation-begins-warning").style.display = "none";
        document.getElementById("interaction-container").style.display = "none";
    }

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

const startAnimationCountdown = () => {
    document.getElementById("automation-happening").style.display = "none";
    document.getElementById("automation-begins-warning").style.display = "block";
    document.getElementById("interaction-container").style.display = "none";
    dynamicTimeout = setTimeout(() => {
        storeEvent("automatic animation starting");
        startAnimation(true);
    }, 1000 * 5)
};

const initializeDynamicAnimation = () => {
    dynamicTimeout = setTimeout(() => {
        storeEvent("automatic animation prompted");
        startAnimationCountdown();
    }, 1000 * dynamicWait);
};

const updateButtonStatuses = () => {
    if (backGroupAmount === 0 && backEventAmount === 0 &&
        currentGroupIndex === data.length - 1 &&
        currentEventIndex === data[currentGroupIndex].events.length - 1) {
        document.getElementById("next-button").classList.toggle("enabled-button", false)
        document.getElementById("next-button").classList.toggle("disabled-button", true)
    } else {
        document.getElementById("next-button").classList.toggle("enabled-button", true)
        document.getElementById("next-button").classList.toggle("disabled-button", false)
    }

    if ((backGroupAmount === 0 ? backEventAmount === currentEventIndex :
        backEventAmount === data[currentGroupIndex - backGroupAmount].events.length - 1) &&
        backGroupAmount === currentGroupIndex) {
        document.getElementById("back-button").classList.toggle("enabled-button", false)
        document.getElementById("back-button").classList.toggle("disabled-button", true)
    } else {
        document.getElementById("back-button").classList.toggle("enabled-button", true)
        document.getElementById("back-button").classList.toggle("disabled-button", false)
    }
};

const endAnimation = () => {
    document.getElementById("automation-happening").style.display = "none";
    document.getElementById("automation-begins-warning").style.display = "none";
    document.getElementById("interaction-container").style.display = "block";
    interactionHandler("button: end animation");
}

const cancelAnimation = () => {
    document.getElementById("automation-happening").style.display = "none";
    document.getElementById("automation-begins-warning").style.display = "none";
    document.getElementById("interaction-container").style.display = "block";
    interactionHandler("button: cancel animation");
}