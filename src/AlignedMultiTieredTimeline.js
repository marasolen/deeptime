class AlignedMultiTieredTimeline {
    config; data;

    width; height;

    svg; chart;

    yScale; xScales = {};

    yAxis; xAxes = {};

    yAxisG; xAxisGs = {};

    nextUuid = 0;

    areaGen; areas = [];


    constructor(config, data) {
        this.config = config;
        this.data = data;

        this.configureVis();
    }

    /**
     * We initialize the arc generator, scales, axes, and append static elements
     */
    configureVis() {
        const vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Error checks
        if (data.length === 0) {
            globalLogBook.addLog(logLevel.Error, "data was empty");
            return;
        }

        // Initialize scales
        let min = vis.getTimeInYears(vis.data[0].time);
        let max = vis.getTimeInYears(vis.data[0].time);

        let lastEvent;
        vis.data.forEach(d => {
            min = Math.min(min, vis.getTimeInYears(d.time));
            max = Math.max(vis.getTimeInYears(d.time));

            d.uuid = vis.nextUuid++;
            vis.xScales[d.uuid] = d3.scaleLinear()
                .domain([vis.getTimeInYears(d.time), 0])
                .range([0, vis.width]);

            if (lastEvent) {
                d.events.push({ label: lastEvent.label, time: lastEvent.time });
            }
            lastEvent = d;
        });

        const minFloor = Math.pow(10, Math.floor(Math.log10(min)));
        const maxCeil = Math.pow(10, Math.ceil(Math.log10(max)));

        vis.yScale = d3.scaleLog()
            .domain([minFloor, maxCeil])
            .range([vis.height, 0]);

        globalLogBook.addLog(logLevel.Info, "min: " + min + ", minFloor: " + minFloor);
        globalLogBook.addLog(logLevel.Info, "max: " + max + ", maxCeil: " + maxCeil);

        // Initialize axes
        data.forEach(d => {
            let ticks = [];
            const time = vis.getTimeInYears(d.time);

            for (let i = 1; i <= 5; i++) {
                ticks.push(time * i / 5);
            }

            vis.xAxes[d.uuid] = d3.axisBottom(vis.xScales[d.uuid])
                .tickValues(ticks)
                .tickFormat(v => {
                    return d3.format(".3s")(v)
                        .replace("M", "m")
                        .replace("G", "b");
                });
        });

        vis.yAxis = d3.axisRight(vis.yScale)
            .ticks(Math.ceil(Math.log10(maxCeil) - Math.log10(minFloor)))
            .tickFormat(v => {
                return d3.format(".3s")(v)
                    .replace("M", "m")
                    .replace("G", "b");
            });

        // Construct area data for showing part to whole relationships
        vis.areaGen = data => {
            let path = "M";
            data.forEach(p => {
                path += p.x + "," + p.y + "L"
            });
            path = path.slice(0, -1) + "Z";
            return path;
        };

        vis.data.forEach((curr, i) => {
            if (i >= vis.data.length - 1) {
                return;
            }

            const currTime = vis.getTimeInYears(curr.time);
            const nextTime = vis.getTimeInYears(vis.data[i + 1].time);

            const currY = vis.yScale(currTime);
            const nextY = vis.yScale(nextTime);

            const data = [
                { x: 0, y: currY },
                { x: vis.xScales[i + 1](currTime), y: nextY },
                { x: vis.width, y: nextY },
                { x: vis.width, y: currY },
                { x: 0, y: currY }
            ];

            vis.areas.push(data);
        });

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Append x-axis group and move it to the bottom of the chart
        vis.data.forEach(d => {
            vis.xAxisGs[d.uuid] = vis.chart.append('g')
                .attr('class', 'axis x-axis-' + d.uuid)
                .attr('transform', `translate(0,${vis.yScale(vis.getTimeInYears(d.time))})`);
        });

        // Append y-axis group and move it to the right of the chart
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis')
            .attr('transform', `translate(${vis.width}, 0)`);

        // Append axis titles
        vis.data.forEach(d => {
            vis.chart.append("text")
                .attr('class', 'axis-title')
                .attr('x', 0)
                .attr('y', vis.yScale(vis.getTimeInYears(d.time)) + 20)
                .attr('dy', '.71em')
                .style('text-anchor', 'start')
                .text(d.label);
        });

        vis.chart.append('text')
            .attr('class', 'axis-title')
            .attr('y', -20)
            .attr('x', vis.width + 30)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text('Years since event');

        vis.renderVis();
    }

    updateVis() {
        const vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        Object.values(vis.xScales).forEach((s) => {
            s.range([0, vis.config.width]);
        });

        vis.yScale.range([0, vis.config.height]);

        vis.renderVis();
    }

    /**
     * Bind data to visual elements (enter-update-exit) and update axes
     */
    renderVis() {
        const vis = this;

        vis.chart.selectAll(".part-to-whole")
            .data(vis.areas)
            .join("path")
            .attr("class", "part-to-whole")
            .attr("d", a => vis.areaGen(a))
            .attr("fill", "blue")
            .attr("stroke", "black")
            .attr("opacity", 0.1);

        vis.data.forEach(d => {
            const xScale = vis.xScales[d.uuid];
            const y = vis.yScale(vis.getTimeInYears(d.time));
            vis.chart.selectAll(".event event-" + d.uuid)
                .data(d.events)
                .join("circle")
                .attr("class", "event event-" + d.uuid)
                .attr("cx", e => xScale(vis.getTimeInYears(e.time)))
                .attr("cy", y)
                .attr("r", 4)
                .attr("fill", "red")
                .attr("stroke", "none");

            vis.chart.selectAll(".event-text event-" + d.uuid)
                .data(d.events)
                .join("text")
                .attr("class", "event-text event-" + d.uuid)
                .attr("x", e => xScale(vis.getTimeInYears(e.time)))
                .attr("y", y - 11)
                .style('text-anchor', 'middle')
                .style("font-size", "11px")
                .text(e => e.label);
        });

        vis.data.forEach(d => {
            vis.xAxisGs[d.uuid].call(vis.xAxes[d.uuid]);
        });
        vis.yAxisG.call(vis.yAxis);
    }

    getTimeInYears({unit: unit, value: value}) {
        switch (unit) {
            case "days":
                return value / 365;
            case "year":
                return 2022.88 - value;
            default:
                return value;
        }
    }
}
