class Timeline {

    /**
     * Construct a new Tiered Timeline.
     * @param config - object, information on visualization size and margins
     * @param fullAge - number, length of full time period in years
     * @param currentTime - number, time to show on timeline in years
     */
    constructor(config, fullAge, currentTime) {
        this.config = config;
        this.fullAge = fullAge;
        this.currentTime = currentTime;

        this.configureVis();
    }

    /**
     * Initialize the scale and append static elements.
     */
    configureVis() {
        const vis = this;

        vis.xScale = d3.scaleLinear();

        vis.numberFormatter = d3.format(",");

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .append('svg')
            .attr('class', 'drawing-area');

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chartSegment = vis.svg.append('g')
            .attr('class', 'chart');
        vis.chartAnnotations = vis.svg.append('g')
            .attr('class', 'chart');

        vis.updateData();
    }

    /**
     * Process the data into a usable format for the visualization. Set up the data side of the visualization.
     */
    updateData(fullAge, currentTime) {
        const vis = this;

        if (fullAge) {
            vis.fullAge = fullAge;
        }

        if (currentTime) {
            vis.currentTime = currentTime;
        }

        vis.xScale.domain([vis.fullAge.time, 0]);

        vis.setupChart()
    }

    /**
     * Set up the visual side of the visualization.
     */
    setupChart() {
        const vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.margin = {};
        vis.margin.top = vis.config.containerHeight * vis.config.margin.top;
        vis.margin.right = vis.config.containerWidth * vis.config.margin.right;
        vis.margin.bottom = vis.config.containerHeight * vis.config.margin.bottom;
        vis.margin.left = vis.config.containerWidth * vis.config.margin.left;

        vis.width = vis.config.containerWidth - vis.margin.left - vis.margin.right;
        vis.height = vis.config.containerHeight - vis.margin.top - vis.margin.bottom;

        vis.xScale.range([0, vis.width]);

        // Define size of SVG drawing area
        vis.svg
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chartSegment
            .attr('transform', `translate(${vis.margin.left}, ${vis.margin.top})`);
        vis.chartAnnotations
            .attr('transform', `translate(${vis.margin.left}, ${vis.margin.top})`);

        vis.renderVis(0);
    }

    /**
     * Move the "You are here" marker to the given time.
     * @param currentTime - number, time to show on timeline in years
     */
    nextTime(currentTime) {
        const vis = this;

        vis.currentTime = currentTime;

        vis.renderVis(animationDuration);
    }

    /**
     * Bind data to visual elements.
     * @param animationDuration - number, the duration for the animation to take in ms
     */
    renderVis(animationDuration) {
        const vis = this;

        const barHeight = 0.2 * vis.height;
        const fontSize = 0.45 * barHeight;

        vis.chartSegment.selectAll(".segment")
            .data([null])
            .join("line")
            .attr("class", "segment")
            .attr("x1", 0)
            .attr("y1", vis.height / 2)
            .attr("x2", vis.width)
            .attr("y2", vis.height / 2)
            .style("stroke", "lightgrey")
            .style("stroke-width", barHeight + "px")
            .attr("stroke-opacity", 1);

        vis.chartAnnotations.selectAll(".here-marker")
            .data([vis.currentTime])
            .join("rect")
            .transition()
            .duration(animationDuration)
            .attr("class", "here-marker")
            .attr("x", d => vis.xScale(d.time) - 0.1 * barHeight)
            .attr("y", vis.height / 2 - 1.1 * barHeight / 2)
            .attr("width", 0.2 * barHeight)
            .attr("height", 1.1 * barHeight)
            .attr("fill", "black")
            .attr("stroke", "none")
            .attr("rx", 0.10 * barHeight)
            .attr("ry", 0.10 * barHeight)
            .attr("opacity", 1);

        vis.chartAnnotations.selectAll(".here-text")
            .data([vis.currentTime])
            .join("text")
            .transition()
            .duration(animationDuration)
            .attr("class", "here-text")
            .attr("x", d => vis.xScale(d.time))
            .attr("y", vis.height / 2 + 2.4 * fontSize)
            .attr("opacity", 1)
            .style('text-anchor', 'middle')
            .style("font-size", fontSize + "px")
            .text("You are here");

        vis.chartAnnotations.selectAll(".here-years")
            .data([vis.currentTime])
            .join("text")
            .transition()
            .duration(animationDuration)
            .attr("class", "here-years")
            .attr("x", d => vis.xScale(d.time))
            .attr("y", vis.height / 2 + 3.9 * fontSize)
            .attr("opacity", 1)
            .style('text-anchor', 'middle')
            .style("font-size", fontSize + "px")
            .text(d => vis.numberFormatter(d.time) + " years");

        vis.chartAnnotations.selectAll(".end-texts")
            .data([{ label: "Today", time: 0 }, vis.fullAge])
            .join("text")
            .attr("class", "end-texts")
            .attr("x", (d, i) => vis.xScale(d.time) + (i === 0 ? 3 * fontSize : 0))
            .attr("y", (_, i) => vis.height / 2 - (i === 0 ? 0.5 : 3) * fontSize)
            .attr("opacity", 1)
            .style('text-anchor', 'middle')
            .style("font-size", fontSize + "px")
            .text(d => d.label);

        vis.chartAnnotations.selectAll(".end-years")
            .data([{ label: "Today", time: 0 }, vis.fullAge])
            .join("text")
            .attr("class", "end-years")
            .attr("x", (d, i) => vis.xScale(d.time) + (i === 0 ? 3 * fontSize : 0))
            .attr("y", (_, i) => vis.height / 2 - (i === 0 ? -1 : 1.5) * fontSize)
            .attr("opacity", 1)
            .style('text-anchor', 'middle')
            .style("font-size", fontSize + "px")
            .text(d => vis.numberFormatter(d.time) + " years");
    }
}
