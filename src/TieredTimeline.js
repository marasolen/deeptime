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

        vis.minFloor = max === min ? min - 1 : min;
        vis.maxCeil = max;

        vis.yScale
            .domain([vis.minFloor, vis.maxCeil]);

        vis.setupChart(0)
    }

    /**
     * Animate the addition of a new timeline.
     * @param data - object, the new timeline to add
     */
    nextTime(data) {
        const vis = this;

        vis.data.push(data);
        vis.processDataItem(vis.data[vis.data.length - 1], vis.data.length - 1, vis.data[vis.data.length - 2])

        let existingEvents = JSON.parse(JSON.stringify(vis.main.events));
        existingEvents.forEach(e => {
            if (e.copy) {
                e.hidden = true;
            }

            if (!e.copy && !e.hidden) {
                e.copy = true;
            }
        });

        vis.main = JSON.parse(JSON.stringify(vis.data[vis.data.length - 1]));
        vis.main.xScale = vis.data[vis.data.length - 1].xScale;

        existingEvents.push(...JSON.parse(JSON.stringify(vis.data[vis.data.length - 1].events)).filter(s => !s.copy));
        vis.main.events = existingEvents;

        vis.yScale
            .domain([vis.minFloor, data.time]);

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

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.yScale
            .range([vis.height, 0]);

        vis.data.forEach((d, i) => {
            d.xScale.range([i < vis.data.length - 1 ? vis.width / 2 : 0, vis.width]);
        });

        const areaAnchorSets = [];

        vis.data.forEach((d, i) => {
            const areaAnchorSet = [];
            vis.data.slice(i, i + numAreaExtensions).forEach((f, j) => {
                areaAnchorSet.push({ time: d.time, x: f.time, y: vis.yScale(f.time),
                    w: j + i === vis.data.length - 1 ? vis.width : vis.width / 2 });
            });

            areaAnchorSets.push(areaAnchorSet);
        });

        vis.areas = [];
        console.log(areaAnchorSets)
        const generateArea = (anchorSet, lastPositionI, currPositionI, numIterations) => {
            const area = [];

            const lastPosition = anchorSet[lastPositionI];
            const currPosition = anchorSet[currPositionI];

            if (numIterations !== 0) {
                const yDiff = currPosition.y - lastPosition.y;

                for (let i = 0; i <= 10; i++) {
                    const yPosition = lastPosition.y + i * yDiff / 10;
                    const width = lastPosition.w + (currPosition.w - lastPosition.w) *
                        (vis.yScale.invert(yPosition) / currPosition.x - (10 - i) / 10 * lastPosition.x / currPosition.x);
                    area.push({ x: (-lastPosition.time / vis.yScale.invert(yPosition)) * width + vis.width, y: yPosition, t: "L" })
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
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
        vis.chartStandardLines
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
        vis.chartExpandingLine
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
        vis.chartAnnotations
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.renderVis(animationDuration);
    }

    /**
     * Bind data to visual elements.
     * @param animationDuration - number, the length of the animation in ms
     */
    renderVis(animationDuration) {
        const vis = this;

        let timePeriodColours = d3.scaleOrdinal(d3.schemeCategory10);

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
            .style("stroke", "red")
            .style("stroke-width", 2)
            .attr("stroke-opacity", 0.2);

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
                .style("stroke-width", "10px")
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
                .attr("y2", e => vis.yScale(d.time) - (e.labelLevel + 1) * 10)
                .style("stroke", "red")
                .style("stroke-width", 3)
                .attr("stroke-opacity", _ => j === vis.data.length - 1 ? 0 : 0.2);

            vis.chartAnnotations.selectAll(".event-marker-" + d.time)
                .data(d.events)
                .join("rect")
                .transition()
                .duration(animationDuration)
                .attr("class", "event-marker-" + d.time)
                .attr("x", e => d.xScale(e.time) - 3)
                .attr("y", _ => vis.yScale(d.time) - 5)
                .attr("width", 6)
                .attr("height", 10)
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
                .attr("y", e => vis.yScale(d.time) - (e.labelLevel + 1) * 10)
                .attr("opacity", _ => j === vis.data.length - 1 ? 0 : 1)
                .style('text-anchor', 'middle')
                .style("font-size", "0.7em")
                .text(e => e.label);
        });

        vis.chartExpandingLine.selectAll(".segments-main")
            .data(vis.main.segments)
            .join("line")
            .attr("class", "segments-main")
            .attr("stroke-opacity", 1)
            .style("stroke-width", "40px")
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
            .attr("y2", e => vis.yScale(vis.main.time) - (e.labelLevel + 2) * 15)
            .style("stroke", "red")
            .style("stroke-width", 3)
            .attr("stroke-opacity", e => (e.hidden || e.copy) ? 0 : 0.2);

        vis.chartAnnotations.selectAll(".event-marker-main")
            .data(vis.main.events)
            .join("rect")
            .attr("height", 40)
            .attr("y", _ => vis.yScale(vis.main.time) - 20)
            .transition()
            .duration(animationDuration)
            .attr("class", "event-marker-main")
            .attr("x", e => vis.main.xScale(e.time) - 5)
            .attr("width", 10)
            .attr("fill", "black")
            .attr("stroke", "none")
            .attr("opacity", e => e.hidden ? 0 : e.copy ? 0.4 : 1);

        vis.chartAnnotations.selectAll(".event-text-main")
            .data(vis.main.events)
            .join("text")
            .attr("y", e => vis.yScale(vis.main.time) - (e.labelLevel + 2) * 15)
            .style("font-size", "0.9em")
            .transition()
            .duration(animationDuration)
            .attr("x", e => vis.main.xScale(e.time))
            .attr("class", "event-text-main")
            .attr("opacity", e => (e.hidden || e.copy) ? 0 : 1)
            .style('text-anchor', 'middle')
            .text(e => e.label);

        document.getElementById("media-title").innerText = vis.main.label;
        document.getElementById("media-description").innerText = "A description of " + vis.main.label + ".";
    }
}
