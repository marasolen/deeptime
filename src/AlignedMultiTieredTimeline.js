const animationDuration = 1000;

class AlignedMultiTieredTimeline {
    config; origData;

    processedData = {}; data;

    width; height;

    svg; chart;

    yScale; xScales = {};

    yAxis; xAxes = {};

    yAxisG; xAxisGs = {};

    axisLines;

    nextUuid = 0;

    areaGen; areas = [];

    minFloor; maxCeil;

    lastEventSet;

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

        vis.xOffsetScale = d3.scaleLog();

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

        vis.updateData();
    }

    updateData() {
        const vis = this;

        // Error checks
        if (vis.origData.length === 0) {
            return;
        }

        vis.processedData.data = vis.origData;
        vis.nextUuid = 0;

        vis.processedData.events = [];
        vis.xScales = {};

        let min = vis.getTimeInYears(vis.processedData.data[0].time);
        let max = vis.getTimeInYears(vis.processedData.data[0].time);

        let lastEvent;
        vis.processedData.data.forEach((d, i) => {
            const set = i + 1;
            vis.lastEventSet = set;

            min = Math.min(min, vis.getTimeInYears(d.time));
            max = Math.max(vis.getTimeInYears(d.time));

            d.uuid = vis.nextUuid++;
            vis.xScales[d.uuid] = d3.scaleLinear()
                .domain([vis.getTimeInYears(d.time), 0]);

            d.set = set;

            if (lastEvent) {
                vis.processedData.events.push({ label: lastEvent.label, time: lastEvent.time, parent: d.uuid,
                    yTime: vis.getTimeInYears(d.time), copy: true, set: set, otherYTime: vis.getTimeInYears(lastEvent.time),
                    realYTime: vis.getTimeInYears(d.time), otherParent: lastEvent.uuid, realParent: d.uuid });

                vis.processedData.events.push(...lastEvent.events.map(e => {
                    return {label: e.label, time: e.time, parent: d.uuid, yTime: vis.getTimeInYears(d.time), copy: true,
                        set: set, otherYTime: vis.getTimeInYears(lastEvent.time), realYTime: vis.getTimeInYears(d.time),
                        otherParent: lastEvent.uuid, realParent: d.uuid}
                }));
            }

            vis.processedData.events.push(...d.events.map((e, i) => {
                return {label: e.label, time: e.time, parent: d.uuid, yTime: vis.getTimeInYears(d.time), copy: false,
                    set: set, labelLevel: vis.processedData.events.length + i};
            }));

            vis.processedData.events.push({label: d.label, time: d.time, parent: d.uuid, yTime: vis.getTimeInYears(d.time),
                copy: false, set: set, labelLevel: vis.processedData.events.length + i})

            lastEvent = d;
        });

        vis.processedData.eventConnectors = [];
        let eventPairs = {};

        vis.processedData.events.forEach(e => {
            if (e.label in eventPairs) {
                eventPairs[e.label].push(e);
            } else {
                eventPairs[e.label] = [e];
            }
        });

        Object.values(eventPairs).forEach(eArr => {
            if (eArr.length === 2) {
                const copy = eArr[0].copy ? eArr[0] : eArr[1];
                const nonCopy = eArr[0].copy ? eArr[1] : eArr[0];

                if (nonCopy.set !== vis.lastEventSet) {
                    nonCopy.otherYTime = copy.yTime;
                    nonCopy.realYTime = nonCopy.yTime;
                    nonCopy.otherParent = copy.parent;
                    nonCopy.realParent = nonCopy.parent;
                }

                vis.processedData.eventConnectors.push({
                    start: nonCopy, end: copy,
                    constStart: nonCopy, constEnd: copy,
                    sets: [nonCopy.set, copy.set]});
            }
        });

        vis.minFloor = Math.pow(10, Math.floor(Math.log10(min)));
        vis.maxCeil = Math.pow(10, Math.ceil(Math.log10(max)));

        vis.yScale
            .domain([vis.minFloor, vis.maxCeil]);

        vis.xOffsetScale
            .domain([vis.minFloor, vis.maxCeil]);

        vis.data = vis.processedData;

        vis.setupChart()
    }

    setupChart(animationDuration) {
        const vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.timelineWidth = 2 * vis.width / 2;
        vis.timelineOffset = vis.width - vis.timelineWidth;

        vis.xAxes = {};

        Object.keys(vis.xScales).forEach(k => {
            vis.xScales[k].range([0, vis.timelineWidth])
        })

        vis.yScale
            .range([vis.height, 0]);

        vis.xOffsetScale
            .range([vis.timelineOffset, 0]);

        // Initialize axes
        let lastTime = null;
        vis.data.data.forEach(d => {
            let ticks = [];
            const thisTime = vis.getTimeInYears(d.time);
            let time;
            let numTicks;

            if (lastTime) {
                numTicks = Math.floor(thisTime / lastTime);
                time = lastTime;
            } else {
                numTicks = 6;
                time = thisTime / numTicks;
            }

            lastTime = thisTime;

            for (let i = 1; i <= numTicks; i++) {
                ticks.push(time * i);
            }

            vis.xAxes[d.uuid] = d3.axisBottom(vis.xScales[d.uuid])
                .ticks(2)
                .tickSize(10)
                .tickFormat(v => {
                    return d3.format(".3s")(v)
                        .replace("M", "m")
                        .replace("G", "b");
                });
        });

        // Construct area data for showing part to whole relationships
        vis.areas = [];
        vis.areaGen = a => {
            let path = "M";
            a.data.forEach(p => {
                path += p.x + "," + p.y + p.t
            });
            path = path.slice(0, -1) + "Z";
            return path;
        };

        let nextInnerPath;

        vis.data.data.forEach((curr, i) => {
            if ((vis.step < 0 && curr.set >= vis.lastEventSet) ||
                (vis.step >= 0 && i >= vis.data.data.length - 1)) {
                return;
            }

            const j = vis.step < 0 ? i + (vis.processedData.data.length - vis.data.data.length) : i;
            const currOffset = vis.xOffsetScale(vis.getTimeInYears(curr.time));
            const nextOffset = vis.xOffsetScale(vis.getTimeInYears(vis.data.data[i + 1].time));

            const currTime = vis.getTimeInYears(curr.time);
            const nextTime = vis.getTimeInYears(vis.data.data[i + 1].time);

            const currY = vis.yScale(currTime);
            const nextY = vis.yScale(nextTime);

            const data = [
                { x: currOffset, y: currY, t: "L" },
            ];

            for (let k = 1; k <= 10; k++) {
                const inverseY = currY - k / 10 * (currY - nextY);

                data.push({
                    x: vis.xOffsetScale(vis.yScale.invert(inverseY)) + (1 - currTime / vis.yScale.invert(inverseY)) * vis.timelineWidth,
                    y: inverseY,
                    t: "L"
                });
            }

            if ((vis.step >= 0 && curr.set < vis.lastEventSet - 1) ||
                (vis.step < 0 && i < vis.data.data.length - 2)) {
                const nextNextTime = vis.getTimeInYears(vis.data.data[i + 2].time);
                const nextNextY = vis.yScale(nextNextTime);
                for (let k = 1; k <= 10; k++) {
                    const inverseY = nextY - k / 10 * (nextY - nextNextY);

                    data.push({
                        x: vis.xOffsetScale(vis.yScale.invert(inverseY)) + (1 - currTime / vis.yScale.invert(inverseY)) * vis.timelineWidth,
                        y: inverseY,
                        t: "L"
                    });
                }

                if ((vis.step >= 0 && curr.set < vis.lastEventSet - 2) ||
                    (vis.step < 0 && i < vis.data.data.length - 3)) {
                    const nextNextNextTime = vis.getTimeInYears(vis.data.data[i + 3].time);
                    const nextNextNextY = vis.yScale(nextNextNextTime);
                    for (let k = 1; k <= 10; k++) {
                        const inverseY = nextNextY - k / 10 * (nextNextY - nextNextNextY);

                        data.push({
                            x: vis.xOffsetScale(vis.yScale.invert(inverseY)) + (1 - currTime / vis.yScale.invert(inverseY)) * vis.timelineWidth,
                            y: inverseY,
                            t: "L"
                        });
                    }

                    data.push(...[
                        { x: vis.xOffsetScale(nextNextNextTime) + vis.timelineWidth, y: nextNextNextY, t: "L" }
                    ]);
                }

                data.push(...[
                    { x: vis.xOffsetScale(nextNextTime) + vis.timelineWidth, y: nextNextY, t: "L" }
                ]);
            }

            data.push(...[
                { x: vis.timelineWidth + nextOffset, y: nextY, t: "L" },
                { x: vis.timelineWidth + currOffset, y: currY, t: "L" },
                { x: vis.xScales[curr.uuid + 1](currTime) + currOffset, y: currY, t: "L" },
                { x: vis.xScales[curr.uuid + 1](currTime) + currOffset, y: currY, t: "L" },
                { x: currOffset, y: currY, t: "L" }
            ]);

            vis.areas.push({data: data, sets: [curr.set, vis.data.data[i + 1].set]});
        });

        if (vis.step < 0) {
            vis.areas.reverse();
        }

        vis.axisLines = [];

        vis.data.data.forEach((d, i) => {
            vis.axisLines.push({
                parent: d.uuid,
                time: d.time,
                colour: i,
            });

            if (i > 0) {
                vis.axisLines.push({
                    parent: d.uuid,
                    time: vis.data.data[i - 1].time,
                    colour: i - 1,
                });
            }

            if (i > 1) {
                vis.axisLines.push({
                    parent: d.uuid,
                    time: vis.data.data[i - 2].time,
                    colour: i - 2,
                });
            }
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

        vis.data.data.forEach((d, i) => {
            const j = vis.step < 0 ? i + (vis.processedData.data.length - vis.data.data.length) : i;
            vis.xAxisGs[d.uuid] = vis.chart.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(${vis.xOffsetScale(vis.getTimeInYears(d.time))},${vis.yScale(vis.getTimeInYears(d.time))})`);
        });

        vis.renderVis(animationDuration);
    }

    /**
     * Bind data to visual elements and update axes
     */
    renderVis(animationDuration) {
        const vis = this;

        let areaColours = d3.scaleOrdinal(d3.schemeCategory10);

        const getEventX = (e) => {
            const parent = vis.step < 0 ? e.parent - (vis.processedData.data.length - vis.data.data.length) : e.parent;
            const offset = vis.xOffsetScale(vis.getTimeInYears(vis.data.data[parent].time));
            const position = vis.xScales[e.parent](vis.getTimeInYears(e.time));
            return offset + position;
        };

        vis.chart.selectAll(".part-to-whole")
            .data(vis.areas)
            .join("path")
            .transition()
            .duration(animationDuration)
            .attr("class", "part-to-whole")
            .attr("d", a => vis.areaGen(a))
            .attr("fill", (_, i) => areaColours(i))
            .attr("stroke", (_, i) => "none")
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 0.4)
            .attr("fill-opacity", 0.3);

        vis.chart.selectAll(".axis-lines-colour")
            .data(vis.axisLines)
            .join("line")
            .transition()
            .duration(animationDuration)
            .attr("class", "axis-lines-colour")
            .attr("x1", getEventX)
            .attr("y1", e => vis.yScale(vis.getTimeInYears(vis.data.data[e.parent].time)))
            .attr("x2", e => getEventX({parent: e.parent, time: {unit: "years", value: 0}}))
            .attr("y2", e => vis.yScale(vis.getTimeInYears(vis.data.data[e.parent].time)))
            .style("stroke", d => areaColours(d.colour))
            .style("stroke-width", "10px")
            .attr("stroke-opacity", 1);

        vis.chart.selectAll(".event-dot")
            .data(vis.data.events)
            .join("circle")
            .transition()
            .duration(animationDuration)
            .attr("class", "event-dot")
            .attr("cx", getEventX)
            .attr("cy", e => vis.yScale(e.yTime))
            .attr("r", 8)
            .attr("fill", "black")
            .attr("stroke", "none")
            .attr("opacity", d => d.copy ? 0.4 : 1);

        vis.chart.selectAll(".event-text")
            .data(vis.data.events.filter(d => !d.copy))
            .join("text")
            .transition()
            .duration(animationDuration)
            .attr("class", "event-text")
            .attr("x", getEventX)
            .attr("y", (e, i) => vis.yScale(e.yTime) - ((i % 4) + 1) * 15)
            .attr("opacity", d => d.hidden ? 0 : 1)
            .style('text-anchor', 'middle')
            .style("font-size", "15px")
            .text(e => e.label);

        vis.chart.selectAll(".event-line")
            .data(vis.data.events.filter(d => !d.copy))
            .join("line")
            .transition()
            .duration(animationDuration)
            .attr("class", "event-line")
            .attr("x1", getEventX)
            .attr("y1", e => vis.yScale(e.yTime))
            .attr("x2", getEventX)
            .attr("y2", (e, i) => vis.yScale(e.yTime) - ((i % 4) + 1) * 15)
            .style("stroke", "red")
            .style("stroke-width", 2)
            .attr("stroke-opacity", d => d.hidden ? 0 : 0.2);

        vis.chart.selectAll(".event-connector")
            .data(vis.data.eventConnectors)
            .join("line")
            .transition()
            .duration(animationDuration)
            .attr("class", "event-connector")
            .attr("x1", e => getEventX(e.start))
            .attr("y1", e => vis.yScale(e.start.yTime))
            .attr("x2", e => getEventX(e.end))
            .attr("y2", e => vis.yScale(e.end.yTime))
            .style("stroke", "red")
            .style("stroke-width", 2)
            .attr("stroke-opacity", 0.2);

        vis.data.data.forEach((d, i) => {
            if ((vis.step < 0 && i < 1) || (vis.step >= 0 && i === vis.data.data.length - 1)) {
                vis.xAxisGs[d.uuid]
                    .transition()
                    .duration(animationDuration)
                    .call(vis.xAxes[d.uuid]);
            } else {
                vis.xAxisGs[d.uuid]
                    .call(vis.xAxes[d.uuid]);
            }
        })
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

    // Animation code
    step = 0;
    currentlyExecuting = false;

    reset() {
        const vis = this;

        if (vis.currentlyExecuting) {
            return;
        }

        vis.updateData();
        vis.step = 0;

        document.getElementById("back").disabled = false;
        document.getElementById("next").disabled = false;
    }

    next() {
        const vis = this;

        if (vis.currentlyExecuting) {
            return;
        }
        vis.currentlyExecuting = true;

        if (vis.step === 0) {
            document.getElementById("back").disabled = true;

            vis.data = {
                data: vis.processedData.data.filter(d => d.set === 1),
                events: vis.processedData.events.filter(e => e.set === 1),
                eventConnectors: []
            };

            vis.step = 1;
            vis.setupChart(0);
            vis.currentlyExecuting = false;
        } else if (vis.step > 0 && vis.step < vis.lastEventSet) {
            vis.step++;
            vis.stepAnimationForward();
        }
    }

    stepAnimationForward() {
        const vis = this;

        const funcMap = [
            vis.copyDotsAndLinesAppearForward,
            vis.timelineAppearsDotsMoveLinesExtendForward,
            vis.dotsAppearForward
        ];

        for (let i = 0; i < funcMap.length; i++) {
            setTimeout(() => {
                funcMap[i](vis);
                setTimeout(() => {
                    if (vis.step > 0 && vis.step >= vis.lastEventSet) {
                        vis.currentlyExecuting = false;
                        vis.reset();
                    }
                }, animationDuration);
            }, Math.max(0, (i - 1) * animationDuration));
        }
    }

    copyDotsAndLinesAppearForward(vis) {
        let newDots = vis.processedData.events
            .filter(d => d.set === vis.step && d.copy);

        newDots.forEach(d => {
            d.parent = d.otherParent;
            d.yTime = d.otherYTime;
        });

        let newEventConnectors = vis.processedData.eventConnectors
            .filter(d => d.sets[0] === vis.step - 1 && d.sets[1] === vis.step);

        vis.data.events.push(...newDots);
        vis.data.eventConnectors.push(...newEventConnectors);

        vis.setupChart(0);
    }

    timelineAppearsDotsMoveLinesExtendForward(vis) {
        vis.data.data.push(vis.processedData.data[vis.step - 1]);

        vis.data.events.forEach(d => {
            if (d.copy) {
                d.parent = d.realParent;
                d.yTime = d.realYTime;
            }
        });

        vis.setupChart(animationDuration);
    }

    dotsAppearForward(vis) {
        let newDots = vis.processedData.events
            .filter(d => d.set === vis.step && !d.copy);

        vis.data.events.push(...newDots);

        vis.setupChart(0);
        vis.currentlyExecuting = false;
    }

    back() {
        const vis = this;

        if (vis.currentlyExecuting) {
            return;
        }
        vis.currentlyExecuting = true;

        if (vis.step === 0) {
            document.getElementById("next").disabled = true;

            vis.data = {
                data: vis.processedData.data.filter(d => d.set === vis.lastEventSet),
                events: vis.processedData.events.filter(e => e.set === vis.lastEventSet && !e.copy),
                eventConnectors: []
            };

            vis.step = -1;
            vis.setupChart(0);
            vis.currentlyExecuting = false;
        } else if (vis.step < 0 && vis.step > -vis.lastEventSet) {
            vis.stepAnimationBackward();
            vis.step--;
        }
    }

    stepAnimationBackward() {
        const vis = this;

        const funcMap = [
            vis.copyDotsAndLinesAppearBackward,
            vis.timelineAppearsDotsMoveLinesExtendBackward
        ];

        for (let i = 0; i < funcMap.length; i++) {
            setTimeout(() => {
                funcMap[i](vis);
                setTimeout(() => {
                    if (vis.step < 0 && vis.step <= -vis.lastEventSet) {
                        vis.currentlyExecuting = false;
                        vis.reset();
                    }
                }, animationDuration);
            }, Math.max(0, (i - 1) * animationDuration));
        }
    }

    copyDotsAndLinesAppearBackward(vis) {
        const thisStep = vis.step + vis.lastEventSet + 1;
        let newDots = vis.processedData.events
            .filter(d => d.set === thisStep + 1 && d.copy);

        newDots.push(...vis.processedData.events
                .filter(d => d.set === thisStep && !d.copy));

        newDots.forEach(d => {
            if (!d.copy) {
                d.parent = d.otherParent;
                d.yTime = d.otherYTime;
                d.hidden = true;
            }
        });

        let newEventConnectors = vis.processedData.eventConnectors
            .filter(d => d.sets[0] === thisStep && d.sets[1] === thisStep + 1);

        vis.data.events.push(...newDots);
        vis.data.eventConnectors.push(...newEventConnectors);

        vis.setupChart(0);
    }

    timelineAppearsDotsMoveLinesExtendBackward(vis) {
        const thisStep = vis.step + vis.lastEventSet + 1;
        vis.data.data.unshift(vis.processedData.data[thisStep - 1]);

        vis.data.events.forEach(d => {
            if (!d.copy && d.set !== vis.lastEventSet) {
                d.parent = d.realParent;
                d.yTime = d.realYTime;
                d.hidden = false;
            }
        });

        vis.setupChart(animationDuration);
        vis.currentlyExecuting = false;
    }
}
