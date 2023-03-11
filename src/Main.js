const animationDuration = 2000;

let data;

let currentGroupIndex = 0;
let currentEventIndex = 0;

let pressNextEvent = false;
let pressNextEventGroup = false;
let pressResetDataset = false;
let pressOpenSettings = false;

let settingsOpen = true;

let interactive = true;
let animationInterval = 60;
let animationMode = "animation-event";
let animationResetInterval = 60;

let animationTimeout;

let tieredTimeline;
let timeline;

const errorMessage = "Error with provided Google Sheets ID. Check that it is a valid ID and that the" +
    "Sheet is viewable by anyone with the link.";

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

    let events;
    await parser.parse(sheetsId).then(temporaryData => {
        temporaryData.forEach(d => {
            d.time = getTimeInYears(d.timeunit, +d.timevalue);
            d.anchor = d["anchor?"];
        });
        events = temporaryData;
    }).catch(error => {
        console.log(error);
        $("#upload-status").text(errorMessage);
    });

    if (!events || events.length === 0) {
        $("#upload-status").text(errorMessage);
        return null;
    }

    $("#upload-status").text("");

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
    reals.forEach(e => {
        let subEvents = [];
        events.forEach(d => {
            const lateEnough = lastEvent ? d.time > lastEvent.time : true;
            const earlyEnough = d.time <= e.time;
            if (lateEnough && earlyEnough) {
                subEvents.push(JSON.parse(JSON.stringify(d)));
            }
        });
        e.eventgroupname = !e.eventgroupname ? e.label : e.eventgroupname;
        e.events = subEvents;
        lastEvent = e;
    });

    let url = new URL(window.location.href);
    url.searchParams.set('id', sheetsId);
    window.history.pushState("string", "Title", url.href);

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

const setInputFunctions = () => {
    document.getElementById("datasetSubmit").onclick = async () => {
        const sheetsId = document.getElementById("datasetUpload").value;

        const tempData = await processData(sheetsId);
        data = tempData ? tempData : data;

        reset();
    };

    document.getElementById("system-mode").onchange = () => {
        const url = new URL(window.location.href);
        interactive = document.getElementById("system-mode").value === "interactive"
        if (interactive) {
            url.searchParams.set("mode", "i");
            document.getElementById("animation-options").style.display = "none";
        } else {
            url.searchParams.set("mode", "a");
            url.searchParams.set("interval", animationInterval);
            url.searchParams.set("animMode", animationMode);
            url.searchParams.set("resetInterval", animationResetInterval);
            document.getElementById("animation-options").style.display = "block";
        }
        window.history.pushState("string", "Title", url.href);
    };

    document.getElementById("start-animation").onclick = () => {
        animationInterval = +document.getElementById("interval").value;
        animationMode = document.querySelector("input[type='radio'][name='animation-style']:checked").id;
        animationResetInterval = +document.getElementById("reset-delay").value;

        const url = new URL(window.location.href);
        url.searchParams.set("interval", animationInterval);
        url.searchParams.set("animMode", animationMode);
        url.searchParams.set("resetInterval", animationResetInterval);
        window.history.pushState("string", "Title", url.href);

        toggleSettings();

        animationTimeout = startAnimation(true);
    };

    document.getElementById("no-menu-link").onclick = async () => {
        const url = new URL(window.location.href);
        url.searchParams.set("noMenu", url.searchParams.get("noMenu") === "true" ? "false" : "true");
        window.history.pushState("string", "Title", url.href);
        $("#menu-toggle-status").text("Current status: " + (url.searchParams.get("noMenu") === "true" ? "will not show" : "will show"));
    };
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

    let url = new URL(window.location.href);
    url.searchParams.set("gIndex", currentGroupIndex);
    url.searchParams.set("eIndex", currentEventIndex);
    window.history.pushState("string", "Title", url.href);
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

    let url = new URL(window.location.href);
    url.searchParams.set("gIndex", currentGroupIndex);
    url.searchParams.set("eIndex", currentEventIndex);
    window.history.pushState("string", "Title", url.href);
};

const reset = () => {
    currentGroupIndex = 0;
    currentEventIndex = 0;

    let url = new URL(window.location.href);
    url.searchParams.set("gIndex", currentGroupIndex);
    url.searchParams.set("eIndex", currentEventIndex);
    window.history.pushState("string", "Title", url.href);

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
    clearTimeout(animationTimeout);
    settingsOpen = !settingsOpen;
    document.getElementById("settings-instructions").style.display = settingsOpen ? "block" : "none";
}

const setButtonFunctions = () => {
    document.onkeydown = (event) => {
        if (event.key === "ArrowRight" && !settingsOpen && interactive) {
            pressNextEvent = true;
        }

        if (event.key === "ArrowUp" && !settingsOpen && interactive) {
            pressNextEventGroup = true;
        }

        if (event.key === "r" && !settingsOpen && interactive) {
            pressResetDataset = true;
        }

        if (event.key === "Escape") {
            pressOpenSettings = true;
        }
    };

    document.onkeyup = (event) => {
        if (event.key === "ArrowRight" && pressNextEvent && !settingsOpen) {
            pressNextEvent = false

            nextEvent();
        }

        if (event.key === "ArrowUp" && pressNextEventGroup && !settingsOpen) {
            pressNextEventGroup = false;

            nextEventGroup();
        }

        if (event.key === "r" && pressResetDataset && !settingsOpen) {
            pressNextEventGroup = false;

            reset();
        }

        if (event.key === "Escape" && pressOpenSettings) {
            pressOpenSettings = false;

            toggleSettings();
        }
    };

    document.getElementById("reset-button").onclick = reset;
    document.getElementById("next-button").onclick = nextEvent;
    document.getElementById("next-group-button").onclick = nextEventGroup;
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
    $(config.parentElement + " select").css("font-size", config.descriptionFontSize * window.innerHeight + "px");
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

    $("#separator").css("border-width", mediaBoxConfig.borderWidth * window.innerHeight + "px");
    resizeStyles(mediaBoxConfig);
    resizeStyles(uploadBoxConfig);
    resizeStyles(instructionsBoxConfig);
    resizeStyles(settingsBoxConfig);

    $(".interface-button").css("font-size", mediaBoxConfig.headerFontSize * window.innerHeight + "px");
    $(".interface-button").css("border-radius", 2 * mediaBoxConfig.borderWidth * window.innerHeight + "px");
};

window.addEventListener('load', async () => {
    const absorbEvent = event => event.preventDefault()
    document.addEventListener('contextmenu', absorbEvent);

    setInputFunctions();
    setButtonFunctions();

    setContainerSizes();

    let url = new URL(window.location.href);
    let existingId;
    if (url.searchParams.has("id")) {
        existingId = url.searchParams.get("id");
    }

    const sheetsId = existingId ? existingId : "1WTxwt7RjEiNdJqSu6U2L1_CGpbsOwgUYQT3VyrdDoaI";

    const tempData = await processData(sheetsId);
    if (!tempData) {
        return;
    }
    data = tempData;

    url = new URL(window.location.href);

    if (url.searchParams.has("gIndex")) {
        currentGroupIndex = +url.searchParams.get("gIndex");
        if (currentGroupIndex >= data.length) {
            currentGroupIndex = data.length - 1;
        }
    }

    if (url.searchParams.has("eIndex")) {
        currentEventIndex = +url.searchParams.get("eIndex");
        if (currentEventIndex >= data[currentGroupIndex].events.length) {
            currentEventIndex = data[currentGroupIndex].events.length - 1;
        }
    }

    if (url.searchParams.has("mode")) {
        interactive = url.searchParams.get("mode") === "i";
    } else {
        url.searchParams.set("mode", "i");
    }

    if (interactive) {
        $("#system-mode").val("interactive").change();
        document.getElementById("animation-options").style.display = "none";
    } else {
        $("#system-mode").val("animated").change();
        document.getElementById("animation-options").style.display = "block";
    }

    if (url.searchParams.has("interval")) {
        animationInterval = +url.searchParams.get("interval");
    } else {
        url.searchParams.set("interval", animationInterval);
    }

    if (url.searchParams.has("animMode")) {
        animationMode = url.searchParams.get("animMode");
    } else {
        url.searchParams.set("animMode", animationMode);
    }

    if (url.searchParams.has("resetInterval")) {
        animationResetInterval = +url.searchParams.get("resetInterval");
    } else {
        url.searchParams.set("resetInterval", animationResetInterval);
    }

    if (url.searchParams.has("noMenu")) {
        if (url.searchParams.get("noMenu") === "true") {
            toggleSettings();
        }
    } else {
        url.searchParams.set("noMenu", "false");
    }

    $("#menu-toggle-status").text("Current status: " + (url.searchParams.get("noMenu") === "true" ? "will not show" : "will show"));

    $("#interval").val(animationInterval).change();
    $("#reset-delay").val(animationResetInterval).change();

    const radios = $('input:radio[name=animation-style]');
    ["animation-event", "animation-event-group"].forEach(style => {
        radios.filter('[id=' + style + ']').prop("checked", animationMode === style);
    })

    url.searchParams.set("gIndex", currentGroupIndex);
    url.searchParams.set("eIndex", currentEventIndex);
    window.history.pushState("string", "Title", url.href);

    const dataCopy = getSlicedData();

    tieredTimeline = new TieredTimeline(tieredTimelineConfig, dataCopy);
    timeline = new Timeline(timelineConfig,
        {
            label: data[data.length - 1].label,
            time: data[data.length - 1].time
        },
        {
            label: data[0].label,
            time: data[0].time
        });
});

window.addEventListener('resize', () => {
    setContainerSizes();

    tieredTimeline.config = tieredTimelineConfig;
    tieredTimeline.setupChart(0);

    timeline.config = timelineConfig;
    timeline.setupChart();
});
