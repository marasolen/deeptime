const config = {
    parentElement: "#vis",
    containerWidth: 800,
    containerHeight: 900,
    margin: {
        top: 60,
        right: 60,
        bottom: 60,
        left: 60
    }
};

const data = placeholdersYearOf;

let chart;

const setContainerSize = () => {
    config.containerHeight = window.innerHeight * 0.96;
    config.containerWidth = window.innerWidth * 0.96;

    config.margin.right = 60;
    config.margin.left = 60;

    if (config.containerWidth > config.containerHeight) {
        const lrMargin = (config.containerWidth - config.containerHeight) / 2;
        config.margin.right = lrMargin;
        config.margin.left = lrMargin;
    }
};

window.addEventListener('load', () => {
    globalLogBook.addLog(logLevel.Info, "page loaded");
    setContainerSize();
    chart = new AlignedMultiTieredTimeline(config, data);
});

window.addEventListener('resize', (event) => {
    globalLogBook.addLog(logLevel.Info, "resize");
    setContainerSize();
    chart.config = config;
    chart.updateVis();
});