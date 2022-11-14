class AlignedMultiTieredTimeline {
    config; origData; data; events;

    width; height;

    svg; chart;

    yScale; xScales = {};

    yAxis; xAxes = {};

    yAxisG; xAxisGs = {};

    nextUuid = 0;

    areaGen; areas = [];


    constructor(config, data) {
        this.config = config;
        this.origData = data;

        this.configureVis();
    }

    /**
     * We initialize the arc generator, scales, axes, and append static elements
     */
    configureVis() {
        const vis = this;

        vis.yScale = d3.scaleLog();

        vis.yAxis = d3.axisRight(vis.yScale);

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .append('svg')
            .attr('class', 'drawing-area');

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chart = vis.svg.append('g')
            .attr('class', 'chart');

        // Append y-axis group and move it to the right of the chart
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis');

        // Append axis titles
        vis.chart.append('text')
            .attr('class', 'y-axis-title');

        vis.updateVis();
    }

    updateVis() {
        const vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Error checks
        if (data.length === 0) {
            globalLogBook.addLog(logLevel.Error, "data was empty");
            return;
        }

        vis.data = vis.origData;
        vis.nextUuid = 0;

        // Initialize scales
        vis.events = [];
        vis.xScales = {};
        vis.xAxes = {};

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
                vis.events.push({ label: lastEvent.label, time: lastEvent.time, parent: d.uuid,
                    yTime: vis.getTimeInYears(d.time) });
            }
            vis.events.push(...d.events.map(e => {
                return {label: e.label, time: e.time, parent: d.uuid, yTime: vis.getTimeInYears(d.time)};
            }));
            lastEvent = d;
        });

        const minFloor = Math.pow(10, Math.floor(Math.log10(min)));
        const maxCeil = Math.pow(10, Math.ceil(Math.log10(max)));

        vis.yScale
            .domain([minFloor, maxCeil])
            .range([vis.height, 0]);

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

        vis.yAxis.scale(vis.yScale)
            .ticks(Math.ceil(Math.log10(maxCeil) - Math.log10(minFloor)))
            .tickFormat(v => {
                return d3.format(".3s")(v)
                    .replace("M", "m")
                    .replace("G", "b");
            });

        // Construct area data for showing part to whole relationships
        vis.areas = [];
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
                { x: vis.xScales[curr.uuid + 1](currTime), y: nextY },
                { x: vis.width, y: nextY },
                { x: vis.width, y: currY },
                { x: 0, y: currY }
            ];

            vis.areas.push(data);
        });

        // Define size of SVG drawing area
        vis.svg
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chart
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Append x-axis groups and move them to the appropriate y positions
        vis.chart.selectAll('.x-axis').remove();

        vis.data.forEach(d => {
            vis.xAxisGs[d.uuid] = vis.chart.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0,${vis.yScale(vis.getTimeInYears(d.time))})`);
        });

        vis.chart.selectAll('.axis-title')
            .data(vis.data)
            .join("text")
            .attr('class', 'axis-title')
            .attr('x', 0)
            .attr('y', d => vis.yScale(vis.getTimeInYears(d.time)) + 20)
            .attr('dy', '.71em')
            .style('text-anchor', 'start')
            .text(d =>d.label);

        // Append y-axis group and move it to the right of the chart
        vis.yAxisG
            .attr('class', 'axis y-axis')
            .attr('transform', `translate(${vis.width}, 0)`);

        vis.chart.selectAll('.y-axis-title')
            .attr('y', -20)
            .attr('x', vis.width + 30)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text('Years since event');

        vis.renderVis();
    }

    /**
     * Bind data to visual elements (enter-update-exit/join) and update axes
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
            const className = d.label.replaceAll(" ", "").replaceAll(".", "");
        });
        vis.chart.selectAll(".event-dot")
            .data(vis.events)
            .join("circle")
            .attr("class", "event-dot")
            .attr("cx", e => vis.xScales[e.parent](vis.getTimeInYears(e.time)))
            .attr("cy", e => vis.yScale(e.yTime))
            .attr("r", 4)
            .attr("fill", "red")
            .attr("stroke", "none");

        vis.chart.selectAll(".event-text")
            .data(vis.events)
            .join("text")
            .attr("class", "event-text")
            .attr("x", e => vis.xScales[e.parent](vis.getTimeInYears(e.time)))
            .attr("y", e => vis.yScale(e.yTime) - 11)
            .style('text-anchor', 'middle')
            .style("font-size", "11px")
            .text(e => e.label);

        vis.data.forEach(d => {
            vis.xAxisGs[d.uuid].call(vis.xAxes[d.uuid]);
        })
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
