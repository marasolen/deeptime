const numMainLabelLevels = 4;
const numArchiveLabelLevels = 3;
const numAreaExtensions = 5;

class TieredTimeline {

    /**
     * Construct a new Tiered Timeline.
     * @param config - object, information on visualization size and margins
     * @param data - object, unprocessed data
     */
    constructor(config, data) {
        this.config = config;
        this.data = data;

        this.configureVis();
    }

    /**
     * Initialize the scales and append static elements.
     */
    configureVis() {
        const vis = this;

        vis.yScale = d3.scaleLog();

        vis.numberFormatter = (n) => {
            let base = d3.format(".3~s")(n);
            base = base.replaceAll("k", " thousand")
                .replaceAll("M", " million")
                .replaceAll("G", " billion");

            return base;
        }

        vis.areaGen = a => {
            let path = "M";
            a.forEach(p => {
                path += p.x + "," + p.y + p.t
            });
            path = path.slice(0, -1) + "Z";
            return path;
        };

        vis.svg = d3.select(vis.config.parentElement)
            .append('svg')
            .attr('class', 'drawing-area')

        vis.chartTesting = vis.svg.append('g')
            .attr('class', 'chart')
            .append("text")
            .attr("id", "text-tester")
            .attr("opacity", 0);
        vis.chartAreas = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartStandardLines = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartExpandingLine = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartAnnotations = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartClickables = vis.svg.append('g')
            .attr('class', 'chart');

        vis.chartClickables.append("rect")
            .attr("opacity", 0)
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", vis.config.containerWidth)
            .attr("height", vis.config.containerHeight)
            .on("click", () => autoClickButton("next-button"));

        vis.chartClickables = vis.chartClickables.append('g')
            .attr('class', 'chart');

        vis.updateData();
    }

    /**
     * Process the data into a usable format for the visualization. Set up the data side of the visualization.
     * @param data - object, unprocessed data
     */
    updateData(data, animationDuration) {
        const vis = this;

        if (vis.data) {
            vis.oldDataNum = vis.data.length;
        }

        if (data) {
            vis.data = data;
        }

        let min = vis.data[0].time;
        let max = vis.data[0].time;

        vis.xScales = {};
        vis.eventConnectors = [];

        let lastEvent;
        vis.data.forEach((d, i) => {
            min = Math.min(min, d.time);
            max = Math.max(max, d.time);

            vis.processDataItem(d, i, lastEvent);

            lastEvent = d;
        });

        vis.main = JSON.parse(JSON.stringify(vis.data[vis.data.length - 1]));
        vis.main.xScale = vis.data[vis.data.length - 1].xScale;

        vis.min = max === min ? min - 1 : min;
        vis.max = max;

        vis.yScale
            .domain([vis.min, vis.max]);

        vis.setupChart(animationDuration ? animationDuration : 0)
    }

    /**
     * Animate the addition of a new timeline.
     * @param data - object, the new timeline to add
     * @param archive - boolean, true if the function should generate a new archive timeline
     */
    nextTime(data, archive) {
        const vis = this;

        let existingEvents;

        if (archive) {
            vis.data.push(data);
            vis.processDataItem(vis.data[vis.data.length - 1], vis.data.length - 1, vis.data[vis.data.length - 2])

            existingEvents = JSON.parse(JSON.stringify(vis.main.events));
            existingEvents.forEach(e => {
                if (e.copy) {
                    e.hidden = true;
                }

                if (!e.copy && !e.hidden) {
                    e.copy = true;
                }
            });

            existingEvents.push(...JSON.parse(JSON.stringify(vis.data[vis.data.length - 1].events)).filter(s => !s.copy));
        } else {
            vis.data.splice(vis.data.length - 1, 1, data);
            vis.processDataItem(vis.data[vis.data.length - 1], vis.data.length - 1, vis.data[vis.data.length - 2])

            existingEvents = JSON.parse(JSON.stringify(vis.main.events));

            const generateUniqueIdForEvent = (e) => e.label + "--" + e.time;

            const existingEventsLabelsAndTimes = existingEvents.map(generateUniqueIdForEvent);
            const newEvents = vis.data[vis.data.length - 1].events.filter(e => !e.copy && !e.hidden &&
                !existingEventsLabelsAndTimes.includes(generateUniqueIdForEvent(e)));

            existingEvents.push(...newEvents);
        }

        vis.main = JSON.parse(JSON.stringify(vis.data[vis.data.length - 1]));
        vis.main.events = existingEvents;

        vis.main.xScale = vis.data[vis.data.length - 1].xScale;

        if (vis.data.length > 1) {
            vis.min = vis.data[0].time;
        }

        vis.yScale
            .domain([vis.min, data.time]);

        vis.setupChart(animationDuration);
    }

    /**
     * Update a single timeline to contain all necessary information.
     * @param d - object, the data to update
     * @param i - number, the index of the data
     * @param lastEvent - object, the previous timeline
     */
    processDataItem(d, i, lastEvent) {
        const vis = this;

        d.xScale = d3.scaleLinear()
            .domain([d.time, 0]);

        const numExistingEvents = vis.eventConnectors.filter(ec => ec.early.group === i && ec.late.group === i).length;
        const numNewEvents = d.events.length - numExistingEvents;
        vis.eventConnectors.push(...d.events.slice(numExistingEvents).map((e, j) => {
            return { early: { group: i, element: numExistingEvents + j }, late: { group: i, element: numExistingEvents + j } };
        }));

        if (lastEvent) {
            const numNonCopyEvents = d.events.length;
            lastEvent.events.filter(e => !e.copy).forEach(e => {
                d.events.push({ label: e.label, time: e.time, copy: true });
            });

            vis.eventConnectors.forEach(ec => {
                if (ec.early.group === i - 1) {
                    if (ec.late.group === i - 1) {
                        ec.late.group = i;
                        ec.late.element += numNonCopyEvents;
                    } else if (ec.late.group === i) {
                        ec.late.element += numNewEvents;
                    }
                }
            });

            d.segments = JSON.parse(JSON.stringify(lastEvent.segments));
            d.segments.push({ start: d.segments[d.segments.length - 1].end, end: d.time });
        } else {
            d.segments = [{ start: 0, end: d.time }]
        }
    }

    /**
     * Set up the visual side of the visualization.
     * @param animationDuration - number, the length of the animation in ms
     */
    setupChart(animationDuration) {
        const vis = this;

        vis.margin = {};
        vis.margin.top = vis.config.containerHeight * vis.config.margin.top;
        vis.margin.right = vis.config.containerWidth * vis.config.margin.right;
        vis.margin.bottom = vis.config.containerHeight * vis.config.margin.bottom;
        vis.margin.left = vis.config.containerWidth * vis.config.margin.left;

        vis.width = vis.config.containerWidth - vis.margin.left - vis.margin.right;
        vis.height = vis.config.containerHeight - vis.margin.top - vis.margin.bottom;

        vis.yScale
            .range([vis.height, 0]);

        vis.data.forEach((d, i) => {
            d.xScale.range([i < vis.data.length - 1 ? 0.4 * vis.width : 0, vis.width]);
        });

        const areaAnchorSets = [];

        vis.data.forEach((d, i) => {
            const areaAnchorSet = [];
            vis.data.slice(i, i + numAreaExtensions).forEach((f, j) => {
                areaAnchorSet.push({ time: d.time, x: f.xScale(f.time), y: vis.yScale(f.time),
                    w: j + i === vis.data.length - 1 ? vis.width : 0.6 * vis.width });
            });

            areaAnchorSets.push(areaAnchorSet);
        });

        vis.areas = [];
        const generateArea = (anchorSet, lastPositionI, currPositionI, numIterations) => {
            const area = [];

            const lastPosition = anchorSet[lastPositionI];
            const currPosition = anchorSet[currPositionI];

            if (numIterations !== 0) {
                const yDiff = currPosition.y - lastPosition.y;

                const widthScale = d3.scalePow()
                    .exponent(1.5)
                    .domain([0, 10])
                    .range([lastPosition.w, currPosition.w]);

                for (let i = 0; i <= 10; i++) {
                    const yPosition = lastPosition.y + i * yDiff / 10;
                    area.push({ x: vis.width - widthScale(i) * lastPosition.time / vis.yScale.invert(yPosition), y: yPosition, t: "L" })
                }

                area.push(...generateArea(anchorSet,
                    Math.min(anchorSet.length - 1, currPositionI),
                    Math.min(anchorSet.length - 1, currPositionI + 1),
                    numIterations - 1));

                area.push({ x: vis.width, y: currPosition.y, t: "L"})
                area.push({ x: vis.width, y: lastPosition.y, t: "L"})
            }

            return area;
        }

        areaAnchorSets.forEach(as => {
            vis.areas.push(generateArea(as, 0, Math.min(as.length - 1, 1), 5));
        });

        vis.svg
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chartAreas
            .attr('transform', `translate(${vis.margin.left},${vis.margin.top})`);
        vis.chartStandardLines
            .attr('transform', `translate(${vis.margin.left},${vis.margin.top})`);
        vis.chartExpandingLine
            .attr('transform', `translate(${vis.margin.left},${vis.margin.top})`);
        vis.chartAnnotations
            .attr('transform', `translate(${vis.margin.left},${vis.margin.top})`);
        vis.chartClickables
            .attr('transform', `translate(${vis.margin.left},${vis.margin.top})`);

        vis.renderVis(animationDuration);
    }

    /**
     * Bind data to visual elements.
     * @param localAnimationDuration - number, the length of the animation in ms
     */
    async renderVis(localAnimationDuration) {
        const vis = this;

        const colourScale = d3.scaleOrdinal(d3.schemeCategory10);
        let timePeriodColours = x => colourScale(x % 10);

        const connectorLineWidth = 0.1 / 100 * vis.width;

        vis.chartAreas.selectAll(".area")
            .data(vis.areas)
            .join("path")
            .transition()
            .duration(localAnimationDuration)
            .attr("class", "area")
            .attr("d", a => vis.areaGen(a))
            .attr("fill", (_, i) => timePeriodColours(i))
            .attr("stroke", "none")
            .attr("stroke-width", 3)
            .attr("stroke-opacity", 0.4)
            .attr("fill-opacity", 0.3);

        vis.chartAnnotations.selectAll(".event-connector")
            .data(vis.eventConnectors)
            .join("line")
            .transition()
            .duration(localAnimationDuration)
            .attr("class", "event-connector")
            .attr("x1", ec => vis.data[ec.early.group].xScale(vis.data[ec.early.group].events[ec.early.element].time))
            .attr("y1", ec => vis.yScale(vis.data[ec.early.group].time))
            .attr("x2", ec => vis.data[ec.late.group].xScale(vis.data[ec.late.group].events[ec.late.element].time))
            .attr("y2", ec => vis.yScale(vis.data[ec.late.group].time))
            .attr("stroke-width", connectorLineWidth)
            .style("stroke", "black")
            .attr("stroke-opacity", 0.2);

        const archiveLineHeight = 1.5 / 100 * vis.height;
        const archiveFontSize =   1.3 / 100 * vis.height;

        const expandingLineHeight = 4.5 / 100 * vis.height;
        const expandingFontSize =   1.7 / 100 * vis.height;

        vis.data.forEach((d, j) => {
            const rows = Array.from(Array(numArchiveLabelLevels)).map(_ => []);
            d.events.forEach(e => {
                if (e.copy) {
                    return;
                }

                vis.chartTesting
                    .style("font-size", archiveFontSize + "px")
                    .text(_ => e.label);

                const xPosition = d.xScale(e.time);
                const width = 1.1 * vis.chartTesting.node().getBBox().width;
                const leftBound = xPosition - width / 2;
                const rightBound = xPosition + width / 2;
                for (const row of rows) {
                    if (!vis.checkCollision(row, leftBound, rightBound)) {
                        row.push({ leftBound, rightBound });
                        e.labelLevel = rows.indexOf(row);
                        break;
                    }
                }

                if (!e.labelLevel) {
                    e.labelLevel = 0;
                }
            });

            const nonCopyEvents = d.events.filter(d => !d.copy);
            let sliceValue = nonCopyEvents.length;
            if (d.eventgroupname === d.label) {
                sliceValue = -1;
                d.group = nonCopyEvents[nonCopyEvents.length - 1].group;
                d.index = nonCopyEvents[nonCopyEvents.length - 1].index;
            }

            vis.chartStandardLines.selectAll(".segments-" + j)
                .data(d.segments)
                .join("line")
                .transition()
                .duration(localAnimationDuration)
                .attr("class", "segments-" + j)
                .attr("x1", s => d.xScale(s.end))
                .attr("y1", _ => vis.yScale(d.time))
                .attr("x2", s => d.xScale(s.start))
                .attr("y2", _ => vis.yScale(d.time))
                .style("stroke", (_, i) => timePeriodColours(i))
                .style("stroke-width", archiveLineHeight + "px")
                .attr("stroke-opacity", 1);

            vis.chartAnnotations.selectAll(".event-line-" + j)
                .data(d.events.filter(d => !d.copy).slice(0, sliceValue))
                .join("line")
                .transition()
                .duration(localAnimationDuration)
                .attr("class", "event-line-" + j)
                .attr("x1", e => d.xScale(e.time))
                .attr("y1", _ => vis.yScale(d.time))
                .attr("x2", e => d.xScale(e.time))
                .attr("y2", e => vis.yScale(d.time) - (e.labelLevel + 1.5) * 1 * archiveFontSize)
                .style("stroke", "black")
                .attr("stroke-width", connectorLineWidth)
                .attr("stroke-opacity", _ => j === vis.data.length - 1 ? 0 : 0.2);

            vis.chartAnnotations.selectAll(".event-marker-" + j)
                .data(d.events)
                .join("rect")
                .transition()
                .duration(localAnimationDuration)
                .attr("class", "event-marker-" + j)
                .attr("x", e => d.xScale(e.time) - 0.3 * archiveLineHeight)
                .attr("y", _ => vis.yScale(d.time) - 0.5 * 1.1 * archiveLineHeight)
                .attr("width", 0.6 * archiveLineHeight)
                .attr("height", 1.1 * archiveLineHeight)
                .attr("fill", "black")
                .attr("stroke", "none")
                .attr("rx", 0.10 * archiveLineHeight)
                .attr("ry", 0.10 * archiveLineHeight)
                .attr("opacity", e => j === vis.data.length - 1 ? 0 : e.copy ? 0.4 : 1);

            if (j !== vis.data.length - 1) {
                vis.chartClickables.selectAll(".event-marker-container-" + j)
                    .data(d.events.filter(d => !d.copy))
                    .join("rect")
                    .attr("opacity", 0)
                    .attr("width", 2 * 0.6 * archiveLineHeight)
                    .attr("height", 2 * 1.1 * archiveLineHeight)
                    .on("click", (_, e) => goToEvent(e.group, e.index))
                    .transition()
                    .duration(localAnimationDuration)
                    .attr("class", "event-marker-container-" + j)
                    .attr("x", e => d.xScale(e.time) - 2 * 0.3 * archiveLineHeight)
                    .attr("y", _ => vis.yScale(d.time) - 2 * 0.5 * 1.1 * archiveLineHeight);
                vis.chartClickables.selectAll(".event-marker-container-" + j).raise();
            }

            vis.chartAnnotations.selectAll(".event-text-" + j)
                .data(d.events.filter(d => !d.copy).slice(0, sliceValue))
                .join("text")
                .attr("real-x", e => d.xScale(e.time))
                .attr("real-y", e => vis.yScale(d.time) - (e.labelLevel + 1.5) * 1.1 * archiveFontSize)
                .transition()
                .duration(localAnimationDuration)
                .attr("id", d => j === vis.data.length - 1 ? "" : "event-text-" + d.group + "-" + d.index)
                .attr("class", "event-text event-text-" + j)
                .attr("x", e => d.xScale(e.time))
                .attr("y", e => vis.yScale(d.time) - (e.labelLevel + 1.5) * 1.1 * archiveFontSize)
                .attr("opacity", _ => j === vis.data.length - 1 ? 0 : 1)
                .style('text-anchor', 'middle')
                .style("font-size", archiveFontSize + "px")
                .text(e => e.label);

            if (j !== vis.data.length - 1) {
                vis.chartClickables.selectAll(".event-text-container-" + j)
                    .data(d.events.filter(d => !d.copy).slice(0, sliceValue))
                    .join("rect")
                    .attr("opacity", 0)
                    .attr("width", 15 * archiveFontSize)
                    .attr("height", 1.5 * archiveFontSize)
                    .on("click", (_, e) => goToEvent(e.group, e.index))
                    .transition()
                    .duration(localAnimationDuration)
                    .attr("class", "event-text-container-" + j)
                    .attr("x", e => d.xScale(e.time) - 7.5 * archiveFontSize)
                    .attr("y", e => vis.yScale(d.time) - (e.labelLevel + 1.5) * 1.1 * archiveFontSize - 1 * archiveFontSize)
                vis.chartClickables.selectAll(".event-text-container-" + j).raise();
            }

            vis.chartAnnotations.selectAll(".event-group-label-" + j)
                .data([d])
                .join("text")
                .attr("real-x", e => d.xScale(e.time) - expandingFontSize)
                .attr("real-y", e => vis.yScale(d.time) - 0.2 * expandingFontSize)
                .transition()
                .duration(localAnimationDuration)
                .attr("id", d => j === vis.data.length - 1 ? "" : "event-text-" + d.group + "-" + d.index)
                .attr("class", "event-text event-group-label-" + j)
                .attr("x", e => d.xScale(e.time) - expandingFontSize)
                .attr("y", e => vis.yScale(d.time) - 0.2 * expandingFontSize)
                .attr("opacity", _ => j === vis.data.length - 1 ? 0 : 1)
                .style('text-anchor', 'end')
                .style("font-size", expandingFontSize + "px")
                .text(e => e.eventgroupname);

            vis.chartAnnotations.selectAll(".event-group-time-" + j)
                .data([d])
                .join("text")
                .transition()
                .duration(localAnimationDuration)
                .attr("id", d => "event-years-" + d.group + "-" + d.index)
                .attr("class", "event-group-time-" + j)
                .attr("x", e => d.xScale(e.time) - expandingFontSize)
                .attr("y", e => vis.yScale(d.time) + 0.8 * expandingFontSize)
                .attr("opacity", _ => j === vis.data.length - 1 ? 0 : 1)
                .style('text-anchor', 'end')
                .style("font-size", expandingFontSize + "px")
                .text(e => vis.numberFormatter(e.time) + " years");

            if (j !== vis.data.length - 1 && d.eventgroupname === d.label) {
                vis.chartClickables.selectAll(".event-group-container-" + j)
                    .data([d])
                    .join("rect")
                    .attr("opacity", 0)
                    .attr("width", 15 * expandingFontSize)
                    .attr("height", 2.4 * expandingFontSize)
                    .on("click", (_, e) => goToEvent(e.group, e.index))
                    .transition()
                    .duration(localAnimationDuration)
                    .attr("class", "event-group-container-" + j)
                    .attr("x", e => d.xScale(e.time) - 16 * expandingFontSize)
                    .attr("y", e => vis.yScale(d.time) + 0.8 * expandingFontSize - 2 * expandingFontSize)
                vis.chartClickables.selectAll(".event-group-container-" + j).raise();
            }
        });

        for (let j = vis.data.length; j < vis.oldDataNum; j++) {
            vis.chartStandardLines.selectAll(".segments-" + j)
                .data([])
                .join("line");

            vis.chartAnnotations.selectAll(".event-line-" + j)
                .data([])
                .join("line");

            vis.chartAnnotations.selectAll(".event-marker-" + j)
                .data([])
                .join("rect");

            vis.chartAnnotations.selectAll(".event-text-" + j)
                .data([])
                .join("text");

            vis.chartAnnotations.selectAll(".event-group-label-" + j)
                .data([])
                .join("text");

            vis.chartAnnotations.selectAll(".event-group-time-" + j)
                .data([])
                .join("text");
        }

        const generateUniqueIdForEvent = (e) => e.label + "--" + e.time;

        const mainRows = Array.from(Array(numArchiveLabelLevels)).map(_ => []);
        vis.main.events.forEach(e => {
            if (e.copy) {
                e.labelLevel = 0;
                return;
            }

            const labelWidth = 1.1 * vis.chartTesting
                .style("font-size", expandingFontSize + "px")
                .text(_ => e.label).node().getBBox().width;

            const numberWidth = 1.1 * vis.chartTesting
                .style("font-size", expandingFontSize + "px")
                .text(_ => vis.numberFormatter(e.time)).node().getBBox().width;

            const xPosition = vis.main.xScale(e.time);
            const width = Math.max(labelWidth, numberWidth);
            const leftBound = xPosition - width / 2;
            const rightBound = xPosition + width / 2;
            for (const row of mainRows) {
                if (!vis.checkCollision(row, leftBound, rightBound)) {
                    row.push({ leftBound, rightBound });
                    e.labelLevel = mainRows.indexOf(row);
                    break;
                }
            }

            if (!e.labelLevel) {
                e.labelLevel = 0;
            }
        });

        vis.chartExpandingLine.selectAll(".segments-main")
            .data(vis.main.segments)
            .join("line")
            .attr("class", "segments-main")
            .attr("stroke-opacity", 1)
            .style("stroke-width", expandingLineHeight + "px")
            .style("stroke", (_, i) => timePeriodColours(i))
            .transition()
            .duration(localAnimationDuration)
            .attr("x1", s => vis.main.xScale(s.end))
            .attr("y1", _ => vis.yScale(vis.main.time))
            .attr("x2", s => vis.main.xScale(s.start))
            .attr("y2", _ => vis.yScale(vis.main.time));

        vis.chartAnnotations.selectAll(".event-line-main")
            .data(vis.main.events, generateUniqueIdForEvent)
            .join("line")
            .transition()
            .duration(localAnimationDuration)
            .attr("class", "event-line-main")
            .attr("x1", e => vis.main.xScale(e.time))
            .attr("y1", _ => vis.yScale(vis.main.time))
            .attr("x2", e => vis.main.xScale(e.time))
            .attr("y2", e => vis.yScale(vis.main.time) - (e.labelLevel + 0.8) * 2 * expandingFontSize)
            .style("stroke", "black")
            .attr("stroke-width", connectorLineWidth)
            .attr("stroke-opacity", e => (e.hidden || e.copy) ? 0 : 0.2);

        vis.chartAnnotations.selectAll(".event-marker-main")
            .data(vis.main.events, generateUniqueIdForEvent)
            .join("rect")
            .attr("height", 1.1 * expandingLineHeight)
            .attr("y", _ => vis.yScale(vis.main.time) - 1.1 * expandingLineHeight / 2)
            .transition()
            .duration(localAnimationDuration)
            .attr("class", "event-marker-main")
            .attr("x", e => vis.main.xScale(e.time) - 0.125 * expandingLineHeight)
            .attr("width", 0.25 * expandingLineHeight)
            .attr("fill", "black")
            .attr("stroke", "none")
            .attr("rx", 0.10 * expandingLineHeight)
            .attr("ry", 0.10 * expandingLineHeight)
            .attr("opacity", e => e.hidden ? 0 : e.copy ? 0.4 : 1);

        vis.chartClickables.selectAll(".event-marker-container")
            .data(vis.main.events.filter(d => !d.copy), generateUniqueIdForEvent)
            .join("rect")
            .attr("opacity", 0)
            .attr("width", 1.5 * 0.25 * expandingLineHeight)
            .attr("height", 1.2 * 1.1 * expandingLineHeight)
            .on("click", (_, e) => goToEvent(e.group, e.index))
            .transition()
            .duration(localAnimationDuration)
            .attr("class", "event-marker-container")
            .attr("x", e => vis.main.xScale(e.time) - 0.125 * expandingLineHeight - 0.2 * 1.5 * 0.25 * expandingLineHeight)
            .attr("y", _ => vis.yScale(vis.main.time) - 1.1 * expandingLineHeight / 2 - 0.1 * 1.2 * 1.1 * expandingLineHeight)
        vis.chartClickables.selectAll(".event-marker-container").raise();

        vis.chartAnnotations.selectAll(".event-text-main")
            .data(vis.main.events, generateUniqueIdForEvent)
            .join(
                enter => {
                    return enter.append("text")
                        .attr("y", e => vis.yScale(vis.main.time) - (e.labelLevel + 1) * 2 * expandingFontSize - expandingFontSize);
                })
            .style("font-size", expandingFontSize + "px")
            .attr("real-y", e => vis.yScale(vis.main.time) - (e.labelLevel + 1) * 2 * expandingFontSize - expandingFontSize)
            .attr("real-x", e => vis.main.xScale(e.time))
            .transition()
            .duration(localAnimationDuration)
            .attr("y", e => vis.yScale(vis.main.time) - (e.labelLevel + 1) * 2 * expandingFontSize - expandingFontSize)
            .attr("x", e => vis.main.xScale(e.time))
            .attr("id", d => (d.hidden || d.copy) ? "" : "event-text-" + d.group + "-" + d.index)
            .attr("class", "event-text event-text-main")
            .attr("opacity", e => (e.hidden || e.copy) ? 0 : 1)
            .style('text-anchor', 'middle')
            .text(e => e.label);

        vis.chartAnnotations.selectAll(".event-years-main")
            .data(vis.main.events, generateUniqueIdForEvent)
            .join(
                enter => {
                    return enter.append("text")
                        .attr("y", e => vis.yScale(vis.main.time) - (e.labelLevel + 1) * 2 * expandingFontSize);
                })
            .style("font-size", expandingFontSize + "px")
            .transition()
            .duration(localAnimationDuration)
            .attr("y", e => vis.yScale(vis.main.time) - (e.labelLevel + 1) * 2 * expandingFontSize)
            .attr("x", e => vis.main.xScale(e.time))
            .attr("id", d => "event-years-" + d.group + "-" + d.index)
            .attr("class", "event-years-main")
            .attr("opacity", e => (e.hidden || e.copy) ? 0 : 1)
            .style('text-anchor', 'middle')
            .text(e => vis.numberFormatter(e.time) + " years");

        vis.chartClickables.selectAll(".event-text-container")
            .data(vis.main.events.filter(d => !d.copy), generateUniqueIdForEvent)
            .join("rect")
            .attr("opacity", 0)
            .attr("width", 15 * expandingFontSize)
            .attr("height", 2.2 * expandingFontSize)
            .on("click", (_, e) => goToEvent(e.group, e.index))
            .transition()
            .duration(localAnimationDuration)
            .attr("class", "event-text-container")
            .attr("x", e => vis.main.xScale(e.time) - 7.5 * expandingFontSize)
            .attr("y", e => vis.yScale(vis.main.time) - (e.labelLevel + 1) * 2 * expandingFontSize - 1.9 * expandingFontSize)
        vis.chartClickables.selectAll(".event-text-container").raise();

        const todayLineEnds = [
            vis.yScale(vis.main.time) - 1.1 * expandingLineHeight / 2,
            vis.data.length > 1 ? vis.height + 1.2 * archiveLineHeight / 2 : vis.yScale(vis.main.time) + 1.1 * expandingLineHeight / 2
        ];

        const todayLineLength = todayLineEnds[1] - todayLineEnds[0];

        vis.chartAnnotations.selectAll(".event-marker-today")
            .data([{ label: "Today", time: 0 }])
            .join("rect")
            .attr("class", "event-marker-today")
            .attr("y", todayLineEnds[0])
            .attr("x", e => vis.main.xScale(e.time))
            .attr("width", 0.25 * expandingLineHeight)
            .attr("fill", "black")
            .attr("stroke", "none")
            .attr("rx", 0.10 * expandingLineHeight)
            .attr("ry", 0.10 * expandingLineHeight)
            .attr("opacity", e => e.hidden ? 0 : e.copy ? 0.4 : 1)
            .transition()
            .duration(localAnimationDuration)
            .attr("height", todayLineLength);

        vis.chartAnnotations.selectAll(".end-texts")
            .data([{ label: "Today", time: 0 }])
            .join("text")
            .attr("class", "end-texts")
            .attr("opacity", 1)
            .style('text-anchor', 'middle')
            .style("font-size", expandingFontSize + "px")
            .text(d => d.label)
            .transition()
            .duration(localAnimationDuration)
            .attr("x", (d, i) => vis.main.xScale(d.time) + 3 * expandingFontSize)
            .attr("y", todayLineLength / 2 - 1.7 * expandingFontSize);

        vis.chartAnnotations.selectAll(".end-years")
            .data([{ label: "Today", time: 0 }])
            .join("text")
            .attr("class", "end-years")
            .attr("opacity", 1)
            .style('text-anchor', 'middle')
            .style("font-size", expandingFontSize + "px")
            .text(d => vis.numberFormatter(d.time) + " years")
            .transition()
            .duration(localAnimationDuration)
            .attr("x", (d, i) => vis.main.xScale(d.time) + 3 * expandingFontSize)
            .attr("y", todayLineLength / 2 - 0.2 * expandingFontSize);

        if (backGroupAmount === 0 && backEventAmount === 0) {
            setMedia(vis.main.label, vis.main.description, vis.main.image);
        }
    }

    clearBoldedEvent() {
        const vis = this;
        vis.chartAnnotations.selectAll(".magnifier")
            .transition()
            .duration(animationDuration / 4)
            .attr("opacity", 0);
    }

    setBoldedEvent(group, event, fade) {
        const vis = this;
        
        vis.clearBoldedEvent();
        const selectedEvent = vis.chartAnnotations.select("#event-text-" + group + "-" + event);
        const isGroupLabel = selectedEvent.classed("event-group-label-" + group);
        let width = selectedEvent.node().getComputedTextLength() * 1.2;
        if ((group === vis.data.length - 1) || isGroupLabel) {
            width = d3.max([width, vis.chartAnnotations.select("#event-years-" + group + "-" + event).node().getComputedTextLength() * 1.2]);
        }
        const height = +selectedEvent.style("font-size").slice(0, -2) * ((group === vis.data.length - 1) || isGroupLabel ? 2.6 : 1.8);

        vis.chartAnnotations.selectAll(".magnifier")
            .data([null])
            .join("rect")
            .attr("class", "magnifier")
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", height / ((group === vis.data.length - 1) || isGroupLabel ? 12 : 6))
            .attr("rx", vis.width / 200)
            .attr("ry", vis.width / 200)
            .transition()
            .duration(animationDuration / 2)
            .attr("opacity", fade ? 0 : 1)
            .attr("width", width)
            .attr("height", height)
            .attr("x", selectedEvent.attr("real-x") - width / (isGroupLabel ? 1.1 : 2))
            .attr("y", selectedEvent.attr("real-y") - ((group === vis.data.length - 1) || isGroupLabel ? 0.9 : 1.3) * height / 2)
            .attr("real-x", selectedEvent.attr("real-x") - width / (isGroupLabel ? 1.1 : 2))
            .attr("real-y", selectedEvent.attr("real-y") - ((group === vis.data.length - 1) || isGroupLabel ? 0.9 : 1.3) * height / 2);
    }

    checkCollision(row, left, right) {
        let collision = false;

        row.forEach(({ leftBound, rightBound }) => {
            if ((leftBound <= left       && rightBound >= left) ||
                (leftBound <= right      && rightBound >= right) ||
                (left      <= leftBound  && right      >= leftBound) ||
                (left      <= rightBound && right      >= rightBound)) {
                collision = true;
            }
        });

        return collision;
    }
}
