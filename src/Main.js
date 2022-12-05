const config = {
    parentElement: "#vis",
    containerWidth: 800,
    containerHeight: 900,
    margin: {
        top: 100,
        right: 60,
        bottom: 60,
        left: 60
    }
};

const numSteps = 10;

const processData = (data) => {
    const logTimes = data.map(d => Math.log10(d.time.value));
    const minLogTime = Math.min(...logTimes);
    const maxLogTime = Math.max(...logTimes);

    const logDiff = (maxLogTime - minLogTime) / (numSteps - 1);

    let ideals = [];
    for (let i = 0; i < numSteps; i++) {
        ideals.push(Math.pow(10, minLogTime + logDiff * i));
    }

    ideals = [
        100,
        //316,
        1000,
        //3160,
        10000,
        //31600,
        100000,
        //316000,
        1000000,
        //3160000,
        10000000,
        //31600000,
        100000000,
        //316000000,
        1000000000,
        //3160000000,
        10000000000
    ];

    let reals = [];
    ideals.forEach(y => {
        let bestMultDiff = 100;
        let bestEvent;
        data.forEach(d => {
            let multDiff = d.time.value / y;
            multDiff = multDiff >= 1 ? multDiff : 1 / multDiff;
            if (multDiff < bestMultDiff) {
                bestMultDiff = multDiff;
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
            const earlyEnough = d.time.value < e.time.value;
            if (lateEnough && earlyEnough) {
                events.push(d);
            }
        });
        e.events = events;
        lastEvent = e;
    });

    return reals;
}

const data = processData(eoasLabDataRounded);

let chart;

const setButtonFunctions = () => {
    d3.select("#reset").on("click", () => {
        chart.reset();
    })

    d3.select("#back").on("click", () => {
        chart.back();
    })

    d3.select("#next").on("click", () => {
        chart.next();
    })
};

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
    chart = new AlignedMultiTieredTimeline(config, data);
});

window.addEventListener('resize', (event) => {
    setContainerSize();
    chart.config = config;
    chart.setupChart(0);
});
