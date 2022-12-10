const animationDuration = 1000;

class AlignedMultiTieredTimeline {
    config; origData;

    processedData = {}; data;

    width; height;

    svg; chart;

    yScale; xScales = {};

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
        vis.chartB = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartA = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartE = vis.svg.append('g')
            .attr('class', 'chart');

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

                vis.processedData.events.push(...lastEvent.events.map((e, i) => {
                    return {label: e.label, time: e.time, parent: d.uuid, yTime: vis.getTimeInYears(d.time), copy: true,
                        set: set, otherYTime: vis.getTimeInYears(lastEvent.time), realYTime: vis.getTimeInYears(d.time),
                        otherParent: lastEvent.uuid, realParent: d.uuid }
                }));
            }

            vis.processedData.events.push(...d.events.map((e, i) => {
                return {label: e.label, time: e.time, parent: d.uuid, yTime: vis.getTimeInYears(d.time), copy: false,
                    set: set, labelLevel: i};
            }));

            vis.processedData.events.push({label: d.label, time: d.time, parent: d.uuid, yTime: vis.getTimeInYears(d.time),
                copy: false, set: set, labelLevel: d.events.length})

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

        vis.setupChart(0)
    }

    setupChart(animationDuration, customAxisLines) {
        const vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.timelineWidth = 2 * vis.width / 2;
        vis.timelineOffset = vis.width - vis.timelineWidth;

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

        const generateArea = (data, currTime, i, num, totNum) => {
            if (num > totNum) {
                return data;
            }

            let nextTime;
            let nextNextTime;

            if ((vis.step >= 0 && i < vis.data.data.length - num) ||
                (vis.step < 0 && i < vis.data.data.length - num)) {
                nextTime = vis.getTimeInYears(vis.data.data[i + num - 1].time)
                nextNextTime = vis.getTimeInYears(vis.data.data[i + num].time);
            } else if ((vis.step >= 0 && i < vis.data.data.length - num + 1) ||
                (vis.step < 0 && i < vis.data.data.length - num + 1)) {
                nextTime = vis.getTimeInYears(vis.data.data[i + num - 1].time)
                nextNextTime = nextTime;
            } else {
                let j = 2;
                while (!vis.getTimeInYears(vis.data.data[i + num - j].time)) {
                    if (num - j === 0) {
                        return data;
                    } else {
                        j++;
                    }
                }
                nextTime = vis.getTimeInYears(vis.data.data[i + num - j].time);
                nextNextTime = nextTime;
            }

            const nextY = vis.yScale(nextTime);
            const nextNextY = vis.yScale(nextNextTime);

            for (let k = 1; k <= 10; k++) {
                const inverseY = nextY - k / 10 * (nextY - nextNextY);

                data.push({
                    x: vis.xOffsetScale(vis.yScale.invert(inverseY)) + (1 - currTime / vis.yScale.invert(inverseY)) * vis.timelineWidth,
                    y: inverseY,
                    t: "L"
                });
            }

            data = generateArea(data, currTime, i, num + 1, totNum);

            for (let k = 10; k > 0; k--) {
                const inverseY = nextY - k / 10 * (nextY - nextNextY);

                data.push({
                    x: vis.xOffsetScale(vis.yScale.invert(inverseY)) + vis.timelineWidth,
                    y: inverseY,
                    t: "L"
                });
            }

            data.push({
                x: vis.xOffsetScale(nextTime) + vis.timelineWidth,
                y: nextNextY,
                t: "L"
            });

            return data;
        }

        vis.data.data.forEach((curr, i) => {
            if ((vis.step < 0 && i >= vis.data.data.length) ||
                (vis.step >= 0 && i >= vis.data.data.length - 1)) {
                return;
            }

            const currOffset = vis.xOffsetScale(vis.getTimeInYears(curr.time));
            const nextOffset = vis.xOffsetScale(vis.getTimeInYears(vis.data.data[i + 1].time));

            const currTime = vis.getTimeInYears(curr.time);
            const nextTime = vis.getTimeInYears(vis.data.data[i + 1].time);

            const currY = vis.yScale(currTime);
            const nextY = vis.yScale(nextTime);

            let data = [
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

            data = generateArea(data, currTime, i, 2, 3);

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

        if (customAxisLines) {
            vis.axisLines = customAxisLines;
        } else {
            vis.axisLines = [];

            vis.data.data.forEach((d, i) => {

                for (let j = 0; j < 10; j++) {
                    vis.axisLines.push({
                        parent: d.uuid,
                        time: {unit: "years", value: (j + 1) * d.time.value / 10},
                        startTime: {unit: "years", value: j * d.time.value / 10},
                        colour: i,
                        yTime: vis.yScale(vis.getTimeInYears(vis.data.data[i].time))
                    });
                }

                if (i > 0) {
                    vis.axisLines.push({
                        parent: d.uuid,
                        time: vis.data.data[i - 1].time,
                        startTime: {unit: "years", value: 0},
                        colour: i - 1,
                        yTime: vis.yScale(vis.getTimeInYears(vis.data.data[i].time))
                    });
                }

                if (i > 1) {
                    vis.axisLines.push({
                        parent: d.uuid,
                        time: vis.data.data[i - 2].time,
                        startTime: {unit: "years", value: 0},
                        colour: i - 2,
                        yTime: vis.yScale(vis.getTimeInYears(vis.data.data[i].time))
                    });
                }
            });
        }

        // Define size of SVG drawing area
        vis.svg
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chartB
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
        vis.chartA
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
        vis.chartE
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

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

        vis.chartB.selectAll(".part-to-whole")
            .data(vis.areas)
            .join("path")
            .transition()
            .duration(animationDuration)
            .attr("class", "part-to-whole")
            .attr("d", a => vis.areaGen(a))
            .attr("fill", (_, i) => areaColours(i))
            .attr("stroke", "none")
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 0.4)
            .attr("fill-opacity", 0.3);

        vis.chartA.selectAll(".axis-lines-colour-background")
            .data(vis.axisLines)
            .join("line")
            .transition()
            .duration(animationDuration)
            .attr("class", "axis-lines-colour-background")
            .attr("x1", e => getEventX(e))
            .attr("y1", e => e.yTime)
            .attr("x2", e => getEventX({parent: e.parent, time: e.startTime}))
            .attr("y2", e => e.yTime)
            .style("stroke", d => "black")
            .style("stroke-width", "10px")
            .attr("stroke-opacity", 1);

        vis.chartA.selectAll(".axis-lines-colour")
            .data(vis.axisLines)
            .join("line")
            .transition()
            .duration(animationDuration)
            .attr("class", "axis-lines-colour")
            .attr("x1", e => getEventX(e) + 1)
            .attr("y1", e => e.yTime)
            .attr("x2", e => getEventX({parent: e.parent, time: e.startTime}))
            .attr("y2", e => e.yTime)
            .style("stroke", d => areaColours(d.colour))
            .style("stroke-width", "10px")
            .attr("stroke-opacity", 1);

        vis.chartE.selectAll(".event-dot")
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

        vis.chartE.selectAll(".event-text")
            .data(vis.data.events.filter(d => !d.copy))
            .join("text")
            .transition()
            .duration(animationDuration)
            .attr("class", "event-text")
            .attr("x", getEventX)
            .attr("y", e => vis.yScale(e.yTime) - ((e.labelLevel % 7) + 1) * 15)
            .attr("opacity", d => d.hidden ? 0 : 1)
            .style('text-anchor', 'middle')
            .style("font-size", "15px")
            .text(e => e.label);

        vis.chartE.selectAll(".event-line")
            .data(vis.data.events.filter(d => !d.copy))
            .join("line")
            .transition()
            .duration(animationDuration)
            .attr("class", "event-line")
            .attr("x1", getEventX)
            .attr("y1", e => vis.yScale(e.yTime))
            .attr("x2", getEventX)
            .attr("y2", e => vis.yScale(e.yTime) - ((e.labelLevel % 7) + 1) * 15)
            .style("stroke", "red")
            .style("stroke-width", 2)
            .attr("stroke-opacity", d => d.hidden ? 0 : 0.2);

        vis.chartE.selectAll(".event-connector")
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

    reset(force) {
        const vis = this;

        if (vis.currentlyExecuting && !force) {
            return;
        }

        vis.updateData();
        vis.step = 0;

        document.getElementById("back").disabled = false;
        document.getElementById("next").disabled = false;
    }

    next(force) {
        const vis = this;

        if (vis.currentlyExecuting && !force) {
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
        } else if (vis.step >= vis.lastEventSet) {
            vis.reset(true);
            vis.next(true);
        }
    }

    stepAnimationForward() {
        const vis = this;

        const funcMap = [
            { func: vis.copyDotsAndLinesAndTimelinesAppearForward, time: 0 },
            { func: vis.timelineAndDotsMoveLinesExtendForward, time: 1 },
            { func: vis.timelineChunksForward, time: 4 },
            { func: vis.dotsAppearForward, time: 0 },
        ];

        let timeSum = 0;
        for (let i = 0; i < funcMap.length; i++) {
            setTimeout(() => {
                funcMap[i].func(vis, funcMap[i].time);
            }, Math.max(timeSum, i * 200));
            timeSum += funcMap[i].time * animationDuration;
        }
    }

    copyDotsAndLinesAndTimelinesAppearForward(vis, time) {
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
        const customAxisLines = vis.axisLines;
        const indexToCopy = customAxisLines.length - 3 + Math.max(0, 4 - vis.step);

        const copyAxis = JSON.parse(JSON.stringify(customAxisLines[indexToCopy]));
        copyAxis.startTime.value = 0;

        for (let i = 0; i < 10; i++) {
            customAxisLines.unshift(JSON.parse(JSON.stringify(copyAxis)));
        }

        vis.setupChart(animationDuration * time, customAxisLines);
    }

    timelineAndDotsMoveLinesExtendForward(vis, time) {
        vis.data.data.push(vis.processedData.data[vis.step - 1]);

        vis.data.events.forEach(d => {
            if (d.copy) {
                d.parent = d.realParent;
                d.yTime = d.realYTime;
            }
        });

        const customAxisLines = vis.axisLines;

        for (let i = 0; i < 10; i++) {
            customAxisLines[i].parent += 1;
            customAxisLines[i].yTime = vis.yScale(vis.getTimeInYears(vis.data.data[customAxisLines[i].parent].time));
        }

        vis.setupChart(animationDuration * time, customAxisLines);
    }

    timelineChunksForward(vis, time) {
        const customAxisLines = vis.axisLines;
        const timeInterval = customAxisLines[9].time.value;
        const realTime = time * animationDuration - 1000;

        for (let i = 1; i < 10; i++) {
            setTimeout(() => {
                customAxisLines[i].yTime -= 40;
                customAxisLines[i].time.value += i * timeInterval;
                customAxisLines[i].startTime.value += i * timeInterval;
                vis.renderVis(realTime / 18);
                customAxisLines[i].yTime += 40;
                setTimeout(() => {
                    vis.renderVis(realTime / 18);
                }, realTime / 18);
            }, i * realTime / 9);
        }
    }

    dotsAppearForward(vis, time) {
        let newDots = vis.processedData.events
            .filter(d => d.set === vis.step && !d.copy);

        vis.data.events.push(...newDots);

        vis.axisLines = [];

        vis.setupChart(animationDuration * time);
        vis.currentlyExecuting = false;
    }

    /*back() {
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
    }*/
}
