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
            vis.fullAge = currentTime;
        }

        vis.xScale.domain([vis.fullAge, 0]);

        vis.setupChart()
    }

    /**
     * Set up the visual side of the visualization.
     */
    setupChart() {
        const vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.xScale.range([0, vis.width]);

        // Define size of SVG drawing area
        vis.svg
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chartSegment
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
        vis.chartAnnotations
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

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

        vis.chartSegment.selectAll(".segment")
            .data([null])
            .join("line")
            .attr("class", "segment")
            .attr("x1", 0)
            .attr("y1", vis.height / 2)
            .attr("x2", vis.width)
            .attr("y2", vis.height / 2)
            .style("stroke", "lightgrey")
            .style("stroke-width", "20px")
            .attr("stroke-opacity", 1);

        vis.chartAnnotations.selectAll(".now-marker")
            .data([vis.currentTime])
            .join("rect")
            .transition()
            .duration(animationDuration)
            .attr("class", "now-marker")
            .attr("x", d => vis.xScale(d) - 4)
            .attr("y", vis.height / 2 - 10)
            .attr("width", 8)
            .attr("height", 20)
            .attr("fill", "black")
            .attr("stroke", "none")
            .attr("opacity", 1);

        vis.chartAnnotations.selectAll(".now-text")
            .data([vis.currentTime])
            .join("text")
            .transition()
            .duration(animationDuration)
            .attr("class", "now-text")
            .attr("x", d => vis.xScale(d) - 4)
            .attr("y", vis.height / 2 - 15)
            .attr("opacity", 1)
            .style('text-anchor', 'middle')
            .style("font-size", "0.9em")
            .text("You are here");
    }
}
