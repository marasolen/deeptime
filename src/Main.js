const config = {
    parentElement: "#vis",
    containerWidth: 800,
    containerHeight: 900,
    margin: {
        top: 180,
        right: 180,
        bottom: 180,
        left: 140
    }
};

const data = placeholdersYearOf;

let chart;

window.addEventListener('load', () => {
    globalLogBook.addLog(logLevel.Info, "page loaded");

    config.containerWidth = window.innerWidth * 0.96;
    config.containerHeight = window.innerHeight * 0.96;

    chart = new AlignedMultiTieredTimeline(config, data);
});

window.addEventListener('resize', (event) => {
    globalLogBook.addLog(logLevel.Info, "resize");

    config.containerWidth = window.innerWidth * 0.96;
    config.containerHeight = window.innerHeight * 0.96;

    chart.config = config;

    chart.updateVis();
});
