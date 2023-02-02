const timelineConfig = {
    parentElement: "#simple-timeline",
    margin: {
        top:    0.0 / 100,
        right:  5.0 / 100,
        bottom: 0.0 / 100,
        left:   5.0 / 100
    }
}

const tieredTimelineConfig = {
    parentElement: "#tiered-timeline",
    margin: {
        top:    16.3 / 100,
        right:   5.0 / 100,
        bottom:  1.8 / 100,
        left:    5.0 / 100
    }
};

const mediaBoxConfig = {
    parentElement: "#media-focus",
    borderWidth:         0.4 / 100,
    headerFontSize:      2.0 / 100,
    descriptionFontSize: 1.3 / 100
}

const uploadBoxConfig = {
    parentElement: "#upload",
    borderWidth:         0.4 / 100,
    headerFontSize:      3.0 / 100,
    descriptionFontSize: 1.8 / 100
}

const instructionsBoxConfig = {
    parentElement: "#instructions",
    borderWidth:         0.4 / 100,
    headerFontSize:      3.0 / 100,
    descriptionFontSize: 1.8 / 100
}

const settingsBoxConfig = {
    parentElement: "#settings",
    borderWidth:         0.4 / 100,
    headerFontSize:      3.0 / 100,
    descriptionFontSize: 1.8 / 100
}

const animationDuration = 2000;

let data;

let currentGroupIndex = 0;
let currentEventIndex = 0;

let pressNextEvent = false;
let pressNextEventGroup = false;
let pressResetDataset = false;
let pressOpenSettings = false;

let settingsOpen = true;

const getTimeInYears = ({unit: unit, value: value}) => {
    switch (unit) {
        case "year":
            return (new Date()).getFullYear() - value;
        default:
            return value;
    }
};

const processCSVData = (csv, zip) => {
    let events = [];

    Papa.parse(csv).data.slice(1).forEach(row => {
        if (row.length === 6) {
            events.push({
                label: row[0],
                description: row[1],
                image: row[2],
                time: {
                    unit: row[3],
                    value: +row[4]
                },
                anchor: row[5] === "TRUE"
            });
        }
    })

    events.forEach(e => {
        e.time = getTimeInYears(e.time);
    });

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

        let ideals = Array(numGroups - 1).map((_, i) => minTime + i);
        ideals.push(maxTime);
        ideals = ideals.map(i => Math.pow(10, i));

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
    reals.forEach(e => {
        let subEvents = [];
        events.forEach(d => {
            const lateEnough = lastEvent ? d.time > lastEvent.time : true;
            const earlyEnough = d.time <= e.time;
            if (lateEnough && earlyEnough) {
                subEvents.push(JSON.parse(JSON.stringify(d)));
            }
        });
        e.events = subEvents;
        lastEvent = e;
    });

    return reals;
};

let tieredTimeline;
let timeline;

const getSlicedData = () => {
    const dataCopy = JSON.parse(JSON.stringify(data)).slice(0, currentGroupIndex + 1);
    dataCopy[currentGroupIndex].events = dataCopy[currentGroupIndex].events.slice(0, currentEventIndex + 1);
    dataCopy[currentGroupIndex].label = dataCopy[currentGroupIndex].events[currentEventIndex].label;
    dataCopy[currentGroupIndex].time = dataCopy[currentGroupIndex].events[currentEventIndex].time;
    dataCopy[currentGroupIndex].description = dataCopy[currentGroupIndex].events[currentEventIndex].description;
    dataCopy[currentGroupIndex].image = dataCopy[currentGroupIndex].events[currentEventIndex].image;

    return dataCopy;
};

const loadZip = async (zipContent) => {
    const eventData = await zipContent.files["events.csv"].async("text");

    data = processCSVData(eventData, zipContent);

    const dataCopy = getSlicedData();

    if (tieredTimeline) {
        tieredTimeline.updateData(dataCopy, zipContent);
        timeline.updateData(
            {
                label: data[data.length - 1].label,
                time: data[data.length - 1].time
            },
            {
                label: data[0].label,
                time: data[0].time
            });
    } else {
        tieredTimeline = new TieredTimeline(tieredTimelineConfig, dataCopy, zipContent);
        timeline = new Timeline(timelineConfig,
            {
                label: data[data.length - 1].label,
                time: data[data.length - 1].time
            },
            {
                label: data[0].label,
                time: data[0].time
            });
    }
};

const setInputFunctions = () => {
    document.getElementById("datasetSubmit").onclick = async () => {
        const uploadedFile = document.getElementById("datasetUpload").files[0];
        const zipContent = await JSZip.loadAsync(uploadedFile);

        loadZip(zipContent);

        document.getElementById("datasetUpload").value = null;
    };
};

const setButtonFunctions = () => {
    document.onkeydown = (event) => {
        if (event.key === "ArrowRight" && !settingsOpen) {
            pressNextEvent = true;
        }

        if (event.key === "ArrowUp" && !settingsOpen) {
            pressNextEventGroup = true;
        }

        if (event.key === "r" && !settingsOpen) {
            pressResetDataset = true;
        }

        if (event.key === "Escape" && tieredTimeline && tieredTimeline.ready) {
            pressOpenSettings = true;
        }
    };

    document.onkeyup = (event) => {
        if (event.key === "ArrowRight" && pressNextEvent && !settingsOpen) {
            pressNextEvent = false

            if (currentEventIndex + 1 < data[currentGroupIndex].events.length) {
                currentEventIndex += 1;

                const dataCopy = getSlicedData();

                tieredTimeline.nextTime(dataCopy[currentGroupIndex], false);
                timeline.nextTime(data[currentGroupIndex]);
            } else if (currentGroupIndex + 1 < data.length) {
                currentGroupIndex += 1;
                currentEventIndex = 0;

                const dataCopy = getSlicedData();

                tieredTimeline.nextTime(dataCopy[currentGroupIndex], true);
                timeline.nextTime({ label: dataCopy[currentGroupIndex].label, time: dataCopy[currentGroupIndex].time });
            }
        }

        if (event.key === "ArrowUp" && pressNextEventGroup && !settingsOpen) {
            pressNextEventGroup = false;

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
        }

        if (event.key === "r" && pressResetDataset && !settingsOpen) {
            pressNextEventGroup = false;

            currentGroupIndex = 0;
            currentEventIndex = 0;

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
        }

        if (event.key === "Escape" && pressOpenSettings) {
            pressOpenSettings = false;

            settingsOpen = !settingsOpen;
            document.getElementById("settings-instructions").style.display = settingsOpen ? "block" : "none";
        }
    };
};

const setContainerSize = (config) => {
    config.containerHeight = document.getElementById(config.parentElement.slice(1)).getBoundingClientRect().height;
    config.containerWidth = document.getElementById(config.parentElement.slice(1)).getBoundingClientRect().width;
};

const resizeStyles = (config) => {
    $(config.parentElement).css("border-width", config.borderWidth * window.innerHeight + "px");
    $(config.parentElement).css("border-radius", 6 * config.borderWidth * window.innerHeight + "px");
    $(config.parentElement).css("padding", 6 * config.borderWidth * window.innerHeight + "px");
    $(config.parentElement).css("font-size", config.descriptionFontSize * window.innerHeight + "px");
    $(config.parentElement + " input").css("font-size", config.descriptionFontSize * window.innerHeight + "px");
    $(config.parentElement + " h1").css("font-size", config.headerFontSize * window.innerHeight + "px");
    $(config.parentElement + " ul").css("padding-left", config.headerFontSize * window.innerHeight + "px");
    $(config.parentElement + " ol").css("padding-left", config.headerFontSize * window.innerHeight + "px");
};

const setContainerSizes = () => {
    setContainerSize(tieredTimelineConfig);
    setContainerSize(timelineConfig);
    setContainerSize(mediaBoxConfig);
    setContainerSize(uploadBoxConfig);
    setContainerSize(instructionsBoxConfig);
    setContainerSize(settingsBoxConfig);

    $("#separator").css("border-width", mediaBoxConfig.borderWidth * mediaBoxConfig.containerWidth + "px");
    resizeStyles(mediaBoxConfig);
    resizeStyles(uploadBoxConfig);
    resizeStyles(instructionsBoxConfig);
    resizeStyles(settingsBoxConfig);
};

window.addEventListener('load', async () => {
    setInputFunctions();
    setButtonFunctions();

    setContainerSizes();

    fetch(window.location.href + "/data/EOASLabAndHomininHallData/EOASLabAndHomininHallData.zip")
        .then(res => res.blob())
        .then(async blob => loadZip(await JSZip.loadAsync(blob)));
});

window.addEventListener('resize', () => {
    setContainerSizes();

    tieredTimeline.config = tieredTimelineConfig;
    tieredTimeline.setupChart(0);

    timeline.config = timelineConfig;
    timeline.setupChart();
});
