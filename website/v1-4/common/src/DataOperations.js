let data;

const errorMessage = "Error with provided Google Sheets ID. Check that it is a valid ID and that the" +
    "Sheet is viewable by anyone with the link.";
const successMessage = "The dataset was successfully parsed."

const getTimeInYears = (unit, value) => {
    switch (unit) {
        case "year":
            return (new Date()).getFullYear() - value;
        default:
            return value;
    }
};

const processData = async (sheetsId) => {
    const parser = new PublicGoogleSheetsParser();

    const uploadStatus = $("#upload-status");

    let events;
    await parser.parse(sheetsId).then(temporaryData => {
        temporaryData.forEach(d => {
            d.time = getTimeInYears(d.timeunit, +d.timevalue);
            d.anchor = d["anchor?"];
        });
        events = temporaryData;
    }).catch(error => {
        console.log(error);
        uploadStatus.text(errorMessage);
        uploadStatus.css("color", "red");
        return null;
    });

    if (!events || events.length === 0) {
        uploadStatus.text(errorMessage);
        uploadStatus.css("color", "red");
        return null;
    }

    uploadStatus.text("");

    events = events.sort((a, b) => {
        return a.time - b.time;
    });

    let reals;
    if (events.map(e => e.anchor).includes(true)) {
        reals = [...new Set(events.filter(e => e.anchor))];
    } else {
        const times = events.map(e => e.time);
        const minTime = Math.ceil(Math.log10(Math.min(...times)));
        const maxTime = Math.log10(Math.max(...times));
        const numGroups = Math.round(maxTime - minTime);

        let ideals = []
        for (let i = 0; i < numGroups - 1; i++) {
            ideals.push(minTime + i);
        }
        ideals.push(maxTime);
        ideals = ideals.map(i => Math.pow(10, +i));

        reals = [];
        ideals.forEach(y => {
            let bestMultiplicativeDiff = 100;
            let bestEvent;
            events.forEach(d => {
                let multiplicativeDiff = d.time / y;
                multiplicativeDiff = multiplicativeDiff >= 1 ? multiplicativeDiff : 1 / multiplicativeDiff;
                if (multiplicativeDiff < bestMultiplicativeDiff) {
                    bestMultiplicativeDiff = multiplicativeDiff;
                    bestEvent = d;
                }
            });
            reals.push(bestEvent);
        });

        reals = [...new Set(reals)];
    }

    let lastEvent;
    reals.sort((a, b) => a.time - b.time);
    reals.forEach(e => {
        let subEvents = [];
        events.forEach(d => {
            const lateEnough = lastEvent ? d.time > lastEvent.time : true;
            const earlyEnough = d.time <= e.time;
            if (lateEnough && earlyEnough) {
                subEvents.push(JSON.parse(JSON.stringify(d)));
            }
        });
        subEvents.sort((a, b) => a.time - b.time);
        e.eventgroupname = !e.eventgroupname ? e.label : e.eventgroupname;
        e.events = subEvents;
        lastEvent = e;

    });

    reals.forEach((r, i) => {
        r.events.forEach((e, j) => {
            e.group = i;
            e.index = j;
        });
    });

    uploadStatus.text(successMessage);
    uploadStatus.css("color", "green");

    return reals;
};

const getSlicedData = () => {
    const dataCopy = JSON.parse(JSON.stringify(data)).slice(0, currentGroupIndex + 1);
    dataCopy[currentGroupIndex].events = dataCopy[currentGroupIndex].events.slice(0, currentEventIndex + 1);
    dataCopy[currentGroupIndex].label = dataCopy[currentGroupIndex].events[currentEventIndex].label;
    dataCopy[currentGroupIndex].time = dataCopy[currentGroupIndex].events[currentEventIndex].time;
    dataCopy[currentGroupIndex].description = dataCopy[currentGroupIndex].events[currentEventIndex].description;
    dataCopy[currentGroupIndex].image = dataCopy[currentGroupIndex].events[currentEventIndex].image;

    return dataCopy;
};

const getData = async () => {
    const sheetsId = await loadURLSettings(processData);
    if (!sheetsId) {
        return;
    }

    data = await processData(sheetsId);
    if (!data) {
        return;
    }

    if (currentGroupIndex >= data.length) {
        currentGroupIndex = data.length - 1;
    }

    if (currentEventIndex >= data[currentGroupIndex].events.length) {
        currentEventIndex = data[currentGroupIndex].events.length - 1;
    }

    if (backGroupAmount > currentGroupIndex) {
        backGroupAmount = currentGroupIndex;
    }

    if (backEventAmount > currentEventIndex) {
        backEventAmount = backGroupAmount === 0 ? currentEventIndex : (data[currentGroupIndex - backGroupAmount].events.length - 1);
    }

    updateURL();
};