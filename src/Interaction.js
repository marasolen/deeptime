let settingsOpen = true;

let pressNextEvent = false;
let pressNextEventGroup = false;
let pressResetDataset = false;
let pressOpenSettings = false;

let animationTimeout;

let dynamicTimeout;

const pingServer = (event) => {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:5000/");
    xhr.setRequestHeader("Content-type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify({ datetime: (new Date()).toISOString(), event: event}));

    console.log(event);
    xhr.onreadystatechange = (e) => {
        console.log(xhr.readyState);
        if (xhr.readyState === 4) {
            console.log("Server responded");
        }
    };
};

const interactionHandler = (event) => {
    pingServer(event);
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
        pingServer("automatic animation beginning");
        startAnimation(true);
    }, 1000 * dynamicWait);
};