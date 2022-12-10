const config = {
    parentElement: "#vis",
    containerWidth: 800,
    containerHeight: 900,
    margin: {
        top: 150,
        right: 60,
        bottom: 60,
        left: 60
    }
};

const datasets = {
    "eoasAndHomininHallLabDataRounded": [eoasAndHomininHallLabDataRounded, eoasAndHomininHallLabDataRoundedAnchors],
    "eoasLabDataRounded": [eoasLabDataRounded, eoasLabDataRoundedAnchors],
    "esbDataRounded": [esbDataRounded, esbDataRoundedAnchors],
    "geoTimelineDataRounded": [geoTimelineDataRounded, geoTimelineDataRoundedAnchors],
    "homininHallDataRounded": [homininHallDataRounded, homininHallDataRoundedAnchors],
    "walkThroughTimeDataRounded": [walkThroughTimeDataRounded, walkThroughTimeDataRoundedAnchors]
}

let data;

const processData = (data, ideals) => {
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
    config.containerHeight = window.innerHeight * 0.96;
    config.containerWidth = window.innerWidth * 0.96;

    config.margin.right = 60;
    config.margin.left = 100;

    /*if (config.containerWidth > config.containerHeight) {
        const lrMargin = (config.containerWidth - config.containerHeight) / 2;
        config.margin.right = lrMargin;
        config.margin.left = lrMargin;
    }*/
};

window.addEventListener('load', () => {
    setButtonFunctions();

    setContainerSize();

    data = processData(eoasAndHomininHallLabDataRounded, eoasAndHomininHallLabDataRoundedAnchors);
    chart = new AlignedMultiTieredTimeline(config, data);
});

window.addEventListener('resize', (event) => {
    setContainerSize();
    chart.config = config;
    chart.setupChart(0);
});
