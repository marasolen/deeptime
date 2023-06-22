let settingsOpen = true;

let pressOpenSettings = false;

let animationTimeout;

let dynamicTimeout;

let ipAddress;

const retrieveIPAddress = () => {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", "https://deeptime.cs.ubc.ca/ip");
        xhr.setRequestHeader("Content-type", "application/json;charset=UTF-8");
        xhr.send();
    
        xhr.onreadystatechange = (e) => {
            if (xhr.readyState === 4) {
                try {
                    res = JSON.parse(xhr.responseText);
                    if (res.success) {
                        resolve(res.ipaddress);
                    } else {
                        reject("Server error: " + res.message);
                    }
                } catch (_) {
                    reject("Server error");
                }
            }
        };
    });
};

const retrieveSheetName = async (id) => {
    try {
        const request = new Request("https://docs.google.com/spreadsheets/d/" + id + "/edit#gid=0", {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/html'
            }
        });
        const response = await fetch(request);
        const html = await response.text();
        let title = '';
        const titleMatches = html.match(/<title.*?>.*?<\/title>/gmi)||[];
        if (titleMatches.length > 0) {
            title = titleMatches[0];
        }
        if (title.search(/<title/gi) !== -1){
            const titleText = title.substring(title.indexOf('>')+1);
            const res = titleText.replace('</title>','');
            return res.slice(0, -16);
        }
        return '';
    } catch (err) {
        console.error(`Failed to retrieve title with error: ${err}`);
        return '';
    }
};

const storeEvent = async (event) => {
    if (!ipAddress) {
        await retrieveIPAddress().then(result => {
            ipAddress = result;
        }).catch(error => {
            console.log(error);
        });
    }

    if (!ipAddress) {
        return;
    }
    
    let logEvent = { 
        datetime: (new Date()).toISOString(), 
        event: event
    };

    if (ipAddress) {
        logEvent.ipaddress = ipAddress;
    }

    if (user && pass) {
        logEvent.user = user;
        logEvent.pass = pass;
    }

    logEvent.version = "v1.5";

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "https://deeptime.cs.ubc.ca/log");
    xhr.setRequestHeader("Content-type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(logEvent));

    xhr.onreadystatechange = (e) => {
        if (xhr.readyState === 4) {
            res = JSON.parse(xhr.responseText);
            if (!res.success) {
                console.log("Server error: " + res.message);
            }
        }
    };
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
    timeline.updateData(event, null, animationDuration);
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
        timeline.updateData(event, null, animationDuration);
        tieredTimeline.setBoldedEvent(currentGroupIndex - backGroupAmount, numEventsInGroup - backEventAmount);
        setMedia(event.label, event.description, event.image);
    } else if (currentEventIndex + 1 < data[currentGroupIndex].events.length) {
        currentEventIndex += 1;

        const dataCopy = getSlicedData();

        tieredTimeline.nextTime(dataCopy[currentGroupIndex], false);
        timeline.updateData(dataCopy[currentGroupIndex], dataCopy, animationDuration);
    } else if (currentGroupIndex + 1 < data.length) {
        currentGroupIndex += 1;
        currentEventIndex = 0;

        const dataCopy = getSlicedData();

        tieredTimeline.nextTime(dataCopy[currentGroupIndex], true);
        timeline.updateData(dataCopy[currentGroupIndex], dataCopy, animationDuration);
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
            label: data[0].events[0].label,
            time: data[0].events[0].time
        },
        dataCopy,
        0);
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