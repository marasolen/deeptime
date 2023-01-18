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
let currentIndex = 1;

let pressNext = false;

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

const setButtonFunctions = () => {
    document.onkeydown = (event) => {
        if (event.key !== "ArrowRight") {
            return;
        }

        pressNext = true;
    };

    document.onkeyup = (event) => {
        if (event.key !== "ArrowRight") {
            return;
        }

        if (pressNext) {
            pressNext = false

            if (currentIndex < data.length) {
                tieredTimeline.nextTime(data[currentIndex]);
                timeline.nextTime({ label: data[currentIndex].label, time: data[currentIndex].time } );
                currentIndex += 1;
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
    console.log(mediaBoxConfig);
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
}

window.addEventListener('load', () => {
    setButtonFunctions();

    setContainerSize();

    data = processData(eoasLabAndHomininHallData, eoasLabAndHomininHallDataAnchors);

    tieredTimeline = new TieredTimeline(tieredTimelineConfig, data.slice(0, currentIndex));
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
