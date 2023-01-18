const timelineConfig = {
    parentElement: "#simple-timeline",
    containerWidth: 1,
    containerHeight: 1,
    margin: {
        top:    0 / 100,
        right:  3 / 100,
        bottom: 0 / 100,
        left:   3 / 100
    }
}

const tieredTimelineConfig = {
    parentElement: "#tiered-timeline",
    containerWidth: 1,
    containerHeight: 1,
    margin: {
        top:    16.3 / 100,
        right:   4.3 / 100,
        bottom:  1.8 / 100,
        left:    4.3 / 100
    }
};

const mediaBoxConfig = {
    parentElement: "#media-focus",
    containerWidth: 1,
    containerHeight: 1,
    borderWidth:         0.5 / 100,
    headerFontSize:      5.5 / 100,
    descriptionFontSize: 2.8 / 100
}

const datasets = {
    "EOASLabAndHomininHallData": [eoasLabAndHomininHallData, eoasLabAndHomininHallDataAnchors],
    "EOASLabData": [EOASLabData, eoasLabDataAnchors],
    "ESBData": [ESBData, esbDataAnchors],
    "GeoTimelineData": [geoTimelineData, geoTimelineDataAnchors],
    "HomininHallData": [homininHallData, homininHallDataAnchors],
    "WalkThroughTimeData": [walkThroughTimeData, walkThroughTimeDataAnchors]
}

const animationDuration = 2000;

let data;

let currentGroupIndex = 0;
let currentEventIndex = 0;

let pressNextEvent = false;
let pressNextEventGroup = false

const processData = (data, ideals) => {
    data = data.sort((a, b) => {
        return a.time.value - b.time.value;
    });

    data.forEach(d => {
        d.time = getTimeInYears(d.time);
    });

    let reals = [];
    ideals.forEach(y => {
        let bestMultiplicativeDiff = 100;
        let bestEvent;
        data.forEach(d => {
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

    let lastEvent;
    reals.forEach(e => {
        let events = [];
        data.forEach(d => {
            const lateEnough = lastEvent ? d.time > lastEvent.time : true;
            const earlyEnough = d.time <= e.time;
            if (lateEnough && earlyEnough) {
                events.push(JSON.parse(JSON.stringify(d)));
            }
        });
        e.events = events;
        lastEvent = e;
    });

    return reals;
}

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

const setButtonFunctions = () => {
    document.onkeydown = (event) => {
        if (event.key === "ArrowRight") {
            pressNextEvent = true;
        }

        if (event.key === "ArrowUp") {
            pressNextEventGroup = true;
        }
    };

    document.onkeyup = (event) => {
        if (event.key === "ArrowRight" && pressNextEvent) {
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

        if (event.key === "ArrowUp" && pressNextEventGroup) {
            pressNextEventGroup = false

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
    };
};

/*
const changeDataset = () => {
    const selection = document.getElementById('datasets-dropdown');
    const datasetName = selection.options[selection.selectedIndex].value;
    data = processData(datasets[datasetName][0], datasets[datasetName][1]);

    currentIndex = 1;

    tieredTimeline.updateData(data.slice(0, 1));

    timeline.updateData(data[data.length - 1].time, data[0].time);
}
*/

const resizeMediaBox = () => {
    $(mediaBoxConfig.parentElement).css("border-width", mediaBoxConfig.borderWidth * mediaBoxConfig.containerWidth + "px");
    $(mediaBoxConfig.parentElement).css("border-radius", 6 * mediaBoxConfig.borderWidth * mediaBoxConfig.containerWidth + "px");
    $(mediaBoxConfig.parentElement + " h1").css("font-size", mediaBoxConfig.headerFontSize * mediaBoxConfig.containerHeight + "px");
    $(mediaBoxConfig.parentElement + " p").css("font-size", mediaBoxConfig.descriptionFontSize * mediaBoxConfig.containerHeight + "px");

    $("#separator").css("border-width", mediaBoxConfig.borderWidth * mediaBoxConfig.containerWidth + "px");
};

const setContainerSize = () => {
    tieredTimelineConfig.containerHeight = document.getElementById("tiered-timeline").getBoundingClientRect().height;
    tieredTimelineConfig.containerWidth = document.getElementById("tiered-timeline").getBoundingClientRect().width;

    timelineConfig.containerHeight = document.getElementById("simple-timeline").getBoundingClientRect().height;
    timelineConfig.containerWidth = document.getElementById("simple-timeline").getBoundingClientRect().width;

    mediaBoxConfig.containerHeight = document.getElementById("media-focus").getBoundingClientRect().height;
    mediaBoxConfig.containerWidth = document.getElementById("media-focus").getBoundingClientRect().width;

    resizeMediaBox();
};

const getTimeInYears = ({unit: unit, value: value}) => {
    switch (unit) {
        case "year":
            return 2023 - value;
        default:
            return value;
    }
};

window.addEventListener('load', () => {
    setButtonFunctions();

    setContainerSize();

    data = processData(eoasLabAndHomininHallData, eoasLabAndHomininHallDataAnchors);

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
    setContainerSize();

    tieredTimeline.config = tieredTimelineConfig;
    tieredTimeline.setupChart(0);

    timeline.config = timelineConfig;
    timeline.setupChart();
});
