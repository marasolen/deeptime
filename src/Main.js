const config = {
    parentElement: "#multi-tired-timeline",
    containerWidth: 800,
    containerHeight: 900,
    margin: {
        top: 100,
        right: 60,
        bottom: 10,
        left: 100
    }
};

const datasets = {
    "EOASLabAndHomininHallData": [eoasLabAndHomininHallData, eoasLabAndHomininHallDataAnchors],
    "EOASLabData": [EOASLabData, eoasLabDataAnchors],
    "ESBData": [ESBData, esbDataAnchors],
    "GeoTimelineData": [geoTimelineData, geoTimelineDataAnchors],
    "HomininHallData": [homininHallData, homininHallDataAnchors],
    "WalkThroughTimeData": [walkThroughTimeData, walkThroughTimeDataAnchors]
}

let data;

const processData = (data, ideals) => {
    data = data.sort((a, b) => {
        return a.time.value - b.time.value;
    });

    let reals = [];
    ideals.forEach(y => {
        let bestMultiplicativeDiff = 100;
        let bestEvent;
        data.forEach(d => {
            let multiplicativeDiff = d.time.value / y;
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
            const lateEnough = lastEvent ? d.time.value > lastEvent.time.value : true;
            const earlyEnough = d.time.value <= e.time.value;
            const notDuplicate = e.label !== d.label;
            if (lateEnough && earlyEnough && notDuplicate) {
                events.push(d);
            }
        });
        e.events = events;
        lastEvent = e;
    });

    return reals;
}

let chart;

const setButtonFunctions = () => {
    d3.select("#reset").on("click", () => {
        chart.reset();
    });

    d3.select("#back").on("click", () => {
        //chart.back();
    });

    d3.select("#next").on("click", () => {
        chart.next();
    });
};

const changeDataset = () => {
    const selection = document.getElementById('datasets-dropdown');
    const datasetName = selection.options[selection.selectedIndex].value;
    data = processData(datasets[datasetName][0], datasets[datasetName][1]);
    chart.origData = data;
    chart.updateData();
}

const setContainerSize = () => {
    config.containerHeight = document.getElementById("multi-tired-timeline").getBoundingClientRect().height;
    config.containerWidth = document.getElementById("multi-tired-timeline").getBoundingClientRect().width;

    config.margin.right = 60;
    config.margin.left = 110;
};

window.addEventListener('load', () => {
    setButtonFunctions();

    setContainerSize();

    data = processData(eoasLabAndHomininHallData, eoasLabAndHomininHallDataAnchors);
    chart = new AlignedMultiTieredTimeline(config, data);
});

window.addEventListener('resize', () => {
    setContainerSize();
    chart.config = config;
    chart.setupChart(0);
});
