const numLabelLevels = 4;
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

        vis.numberFormatter = d3.format(".3~s");

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
            .attr('class', 'drawing-area');

        vis.chartAreas = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartStandardLines = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartExpandingLine = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartAnnotations = vis.svg.append('g')
            .attr('class', 'chart');

        vis.updateData();
    }

    /**
     * Process the data into a usable format for the visualization. Set up the data side of the visualization.
     * @param data - object, unprocessed data
     */
    updateData(data) {
        const vis = this;

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

        vis.setupChart(0)
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
            vis.eventConnectors = vis.eventConnectors.filter(ec => ec.late.group !== vis.data.length - 1);

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

        if (lastEvent) {
            lastEvent.events.filter(e => !e.copy).forEach((e, j) => {
                vis.eventConnectors.push({ early: { group: i - 1, element: j }, late: { group: i, element: d.events.length } });
                d.events.push({ label: e.label, time: e.time, copy: true });
            });

            d.segments = JSON.parse(JSON.stringify(lastEvent.segments));
            d.segments.push({ start: d.segments[d.segments.length - 1].end, end: d.time });
        } else {
            d.segments = [{ start: 0, end: d.time }]
        }

        d.events.forEach((e, j) => {
            e.labelLevel = j % numLabelLevels;
        });
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
            d.xScale.range([i < vis.data.length - 1 ? vis.width / 2 : 0, vis.width]);
        });

        const areaAnchorSets = [];

        vis.data.forEach((d, i) => {
            const areaAnchorSet = [];
            vis.data.slice(i, i + numAreaExtensions).forEach((f, j) => {
                areaAnchorSet.push({ time: d.time, x: f.xScale(f.time), y: vis.yScale(f.time),
                    w: j + i === vis.data.length - 1 ? vis.width : vis.width / 2 });
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
                    console.log(widthScale(i));
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

        vis.renderVis(animationDuration);
    }

    /**
     * Bind data to visual elements.
     * @param animationDuration - number, the length of the animation in ms
     */
    renderVis(animationDuration) {
        const vis = this;

        let timePeriodColours = d3.scaleOrdinal(d3.schemeCategory10);

        const connectorLineWidth = 0.1 / 100 * vis.width;

        vis.chartAreas.selectAll(".area")
            .data(vis.areas)
            .join("path")
            .transition()
            .duration(animationDuration)
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
            .duration(animationDuration)
            .attr("class", "event-connector")
            .attr("x1", ec => vis.data[ec.early.group].xScale(vis.data[ec.early.group].events[ec.early.element].time))
            .attr("y1", ec => vis.yScale(vis.data[ec.early.group].time))
            .attr("x2", ec => vis.data[ec.late.group].xScale(vis.data[ec.late.group].events[ec.late.element].time))
            .attr("y2", ec => vis.yScale(vis.data[ec.late.group].time))
            .attr("stroke-width", connectorLineWidth)
            .style("stroke", "red")
            .attr("stroke-opacity", 0.2);

        const archiveLineHeight = 1.5 / 100 * vis.height;
        const archiveFontSize = 1.3 / 100 * vis.height;

        vis.data.forEach((d, j) => {
            vis.chartStandardLines.selectAll(".segments-" + d.time)
                .data(d.segments)
                .join("line")
                .transition()
                .duration(animationDuration)
                .attr("class", "segments-" + d.time)
                .attr("x1", s => d.xScale(s.end))
                .attr("y1", _ => vis.yScale(d.time))
                .attr("x2", s => d.xScale(s.start))
                .attr("y2", _ => vis.yScale(d.time))
                .style("stroke", (_, i) => timePeriodColours(i))
                .style("stroke-width", archiveLineHeight + "px")
                .attr("stroke-opacity", 1);

            vis.chartAnnotations.selectAll(".event-line-" + d.time)
                .data(d.events.filter(d => !d.copy))
                .join("line")
                .transition()
                .duration(animationDuration)
                .attr("class", "event-line-" + d.time)
                .attr("x1", e => d.xScale(e.time))
                .attr("y1", _ => vis.yScale(d.time))
                .attr("x2", e => d.xScale(e.time))
                .attr("y2", e => vis.yScale(d.time) - (e.labelLevel + 0.8) * 1 * archiveFontSize)
                .style("stroke", "red")
                .attr("stroke-width", connectorLineWidth)
                .attr("stroke-opacity", _ => j === vis.data.length - 1 ? 0 : 0.2);

            vis.chartAnnotations.selectAll(".event-marker-" + d.time)
                .data(d.events)
                .join("rect")
                .transition()
                .duration(animationDuration)
                .attr("class", "event-marker-" + d.time)
                .attr("x", e => d.xScale(e.time) - 0.3 * archiveLineHeight)
                .attr("y", _ => vis.yScale(d.time) - 0.5 * archiveLineHeight)
                .attr("width", 0.6 * archiveLineHeight)
                .attr("height", archiveLineHeight)
                .attr("fill", "black")
                .attr("stroke", "none")
                .attr("opacity", e => j === vis.data.length - 1 ? 0 : e.copy ? 0.4 : 1);

            vis.chartAnnotations.selectAll(".event-text-" + d.time)
                .data(d.events.filter(d => !d.copy))
                .join("text")
                .transition()
                .duration(animationDuration)
                .attr("class", "event-text-" + d.time)
                .attr("x", e => d.xScale(e.time))
                .attr("y", e => vis.yScale(d.time) - (e.labelLevel + 1) * 1.1 * archiveFontSize)
                .attr("opacity", _ => j === vis.data.length - 1 ? 0 : 1)
                .style('text-anchor', 'middle')
                .style("font-size", archiveFontSize + "px")
                .text(e => e.label);
        });

        const expandingLineHeight = 4.5 / 100 * vis.height;
        const expandingFontSize = 1.7 / 100 * vis.height;

        vis.chartExpandingLine.selectAll(".segments-main")
            .data(vis.main.segments)
            .join("line")
            .attr("class", "segments-main")
            .attr("stroke-opacity", 1)
            .style("stroke-width", expandingLineHeight + "px")
            .style("stroke", (_, i) => timePeriodColours(i))
            .transition()
            .duration(animationDuration)
            .attr("x1", s => vis.main.xScale(s.end))
            .attr("y1", _ => vis.yScale(vis.main.time))
            .attr("x2", s => vis.main.xScale(s.start))
            .attr("y2", _ => vis.yScale(vis.main.time));

        vis.chartAnnotations.selectAll(".event-line-main")
            .data(vis.main.events)
            .join("line")
            .transition()
            .duration(animationDuration)
            .attr("class", "event-line-main")
            .attr("x1", e => vis.main.xScale(e.time))
            .attr("y1", _ => vis.yScale(vis.main.time))
            .attr("x2", e => vis.main.xScale(e.time))
            .attr("y2", e => vis.yScale(vis.main.time) - (e.labelLevel + 0.8) * 2 * expandingFontSize)
            .style("stroke", "red")
            .attr("stroke-width", connectorLineWidth)
            .attr("stroke-opacity", e => (e.hidden || e.copy) ? 0 : 0.2);

        vis.chartAnnotations.selectAll(".event-marker-main")
            .data(vis.main.events)
            .join("rect")
            .attr("height", expandingLineHeight)
            .attr("y", _ => vis.yScale(vis.main.time) - expandingLineHeight / 2)
            .transition()
            .duration(animationDuration)
            .attr("class", "event-marker-main")
            .attr("x", e => vis.main.xScale(e.time) - 0.125 * expandingLineHeight)
            .attr("width", 0.25 * expandingLineHeight)
            .attr("fill", "black")
            .attr("stroke", "none")
            .attr("opacity", e => e.hidden ? 0 : e.copy ? 0.4 : 1);

        vis.chartAnnotations.selectAll(".event-text-main")
            .data(vis.main.events)
            .join("text")
            .attr("y", e => vis.yScale(vis.main.time) - (e.labelLevel + 1) * 2 * expandingFontSize - expandingFontSize)
            .style("font-size", expandingFontSize + "px")
            .transition()
            .duration(animationDuration)
            .attr("x", e => vis.main.xScale(e.time))
            .attr("class", "event-text-main")
            .attr("opacity", e => (e.hidden || e.copy) ? 0 : 1)
            .style('text-anchor', 'middle')
            .text(e => e.label);

        vis.chartAnnotations.selectAll(".event-years-main")
            .data(vis.main.events)
            .join("text")
            .attr("y", e => vis.yScale(vis.main.time) - (e.labelLevel + 1) * 2 * expandingFontSize)
            .style("font-size", expandingFontSize + "px")
            .transition()
            .duration(animationDuration)
            .attr("x", e => vis.main.xScale(e.time))
            .attr("class", "event-years-main")
            .attr("opacity", e => (e.hidden || e.copy) ? 0 : 1)
            .style('text-anchor', 'middle')
            .text(e => vis.numberFormatter(e.time) + " years");

        document.getElementById("media-title").innerText = vis.main.label;
        document.getElementById("media-description").innerText = vis.main.description ? vis.main.description : "A description of " + vis.main.label + ".";
        document.getElementById("media-image").src = "src/data/images/" + (vis.main.image ? vis.main.image : "noimage.jpeg");
    }
}
