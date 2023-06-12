let currentlyAnimating;

let goalGroupIndex;

class EventPreview {

    /**
     * Construct a new Tiered Timeline.
     * @param config - object, information on visualization size and margins
     */
    constructor(config, data) {
        this.config = config;
        this.data = data;

        this.configureVis();
    }

    /**
     * Initialize the scale and append static elements.
     */
    configureVis() {
        const vis = this;
            
        vis.setupChart();
    }

    /**
     * Set up the visual side of the visualization.
     */
    setupChart() {
        const vis = this;

        vis.width = vis.config.containerWidth;
        vis.height = vis.config.containerHeight;

        vis.renderVis();
    }

    /**
     * Bind data to visual elements.
     */
    renderVis() {
        const vis = this;

        const colourScale = d3.scaleOrdinal(d3.schemeCategory10);
        let timePeriodColours = x => colourScale(x % 10);

        const container = document.getElementById(vis.config.parentElement.slice(1));

        vis.data.forEach((d, i) => {
            const eventDiv = document.createElement("div");
            eventDiv.className = "event-preview-div";
            eventDiv.style.height = (100 / vis.data.length) + "%";
            eventDiv.style.top = (100 * (vis.data.length - 1 - i) / vis.data.length) + "%";
            eventDiv.onclick = async () => {
                const nextEventIndex = d.events.filter(e => !e.copy).length - 1;

                const localAnimationDuration = animationDuration / 4;

                if (!currentlyAnimating && (i > currentGroupIndex || (i === currentGroupIndex && currentEventIndex < nextEventIndex))) {
                    currentlyAnimating = true;

                    const timeout = () => {
                        return new Promise(resolve => setTimeout(resolve, localAnimationDuration));
                    };

                    for (let j = currentGroupIndex; j <= i; j++) {
                        currentGroupIndex = j;
                        currentEventIndex = vis.data[currentGroupIndex].events.filter(e => !e.copy).length - 1;
    
                        backEventAmount = 0;
                        backGroupAmount = 0;
        
                        tieredTimeline.clearBoldedEvent();
        
                        updateURL();
        
                        const dataCopy = getSlicedData();
        
                        tieredTimeline.updateData(dataCopy, localAnimationDuration);
                        timeline.updateData(
                            {
                                label: data[currentGroupIndex].events[currentEventIndex].label,
                                time: data[currentGroupIndex].events[currentEventIndex].time
                            },
                            dataCopy,
                            localAnimationDuration);
                        
                        updateButtonStatuses();

                        if (j < i) {
                            await timeout();
                        }
                    }

                    currentlyAnimating = false;
                }
            };

            const eventText = document.createElement("p");
            eventText.className = "event-preview-text";
            eventText.innerHTML = d.eventgroupname;

            const eventImage = document.createElement("img");
            eventImage.className = "event-preview-img";
            eventImage.setAttribute("src", d.image)

            const eventColour = document.createElement("div");
            eventColour.className = "event-preview-colour";
            eventColour.style.backgroundColor = timePeriodColours(i);

            eventDiv.appendChild(eventText);
            eventDiv.appendChild(eventImage);
            eventDiv.appendChild(eventColour);

            container.appendChild(eventDiv);
        });
    }
}
