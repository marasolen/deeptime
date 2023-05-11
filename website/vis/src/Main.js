const animationDuration = 2000;

let tieredTimeline;
let timeline;

const setButtonFunctions = () => {
    document.onkeydown = (event) => {
        if (event.key === "Escape") {
            pressOpenSettings = true;
        }
    };

    document.onkeyup = (event) => {
        if (event.key === "Escape" && pressOpenSettings) {
            pressOpenSettings = false;

            interactionHandler("keyboard: toggle settings");
            changePage("settings");
        }
    };

    document.getElementById("back-button").onclick = () => {
        if (interactionMode === "interactive" || interactionMode === "dynamic") {
            interactionHandler("button: back");
            backEvent();
        }

        updateButtonStatuses();
    };

    document.getElementById("reset-button").onclick = () => {
        if (interactionMode === "interactive" || interactionMode === "dynamic") {
            interactionHandler("button: reset");
            reset();
        }

        updateButtonStatuses();
    };

    document.getElementById("next-button").onclick = () => {
        if (interactionMode === "interactive" || interactionMode === "dynamic") {
            interactionHandler("button: next event");
            nextEvent();
        }

        updateButtonStatuses();
    };

    document.getElementById("pause-button").onclick = () => {
        if (interactionMode === "dynamic") {
            endAnimation();
        }
    };

    document.getElementById("wait-button").onclick = () => {
        if (interactionMode === "dynamic") {
            cancelAnimation();
        }
    };
};

const setContainerSize = (config) => {
    config.containerHeight = document.getElementById(config.parentElement.slice(1)).getBoundingClientRect().height;
    config.containerWidth = document.getElementById(config.parentElement.slice(1)).getBoundingClientRect().width;
};

const resizeStyles = (config) => {
    $(config.parentElement).css("border-width", config.borderWidth * window.innerHeight + "px");
    $(config.parentElement).css("border-radius", 6 * config.borderWidth * window.innerHeight + "px");
    $(config.parentElement).css("padding", 6 * config.borderWidth * window.innerHeight + "px");
    $(config.parentElement).css("font-size", config.descriptionFontSize * window.innerHeight + "px");
    $(config.parentElement + " input").css("font-size", config.descriptionFontSize * window.innerHeight + "px");
    $(config.parentElement + " select").css("font-size", config.descriptionFontSize * window.innerHeight + "px");
    $(config.parentElement + " h1").css("font-size", config.headerFontSize * window.innerHeight + "px");
    $(config.parentElement + " ul").css("padding-left", config.headerFontSize * window.innerHeight + "px");
    $(config.parentElement + " ol").css("padding-left", config.headerFontSize * window.innerHeight + "px");
};

const setContainerSizes = () => {
    setContainerSize(tieredTimelineConfig);
    setContainerSize(timelineConfig);
    setContainerSize(mediaBoxConfig);

    $("#separator").css("border-width", mediaBoxConfig.borderWidth * window.innerHeight + "px");
    resizeStyles(mediaBoxConfig);
    resizeStyles(settingsConfig);

    $(".interface-button").css("font-size", mediaBoxConfig.headerFontSize * window.innerHeight + "px");
    $("#next-button").css("font-size", 1.3 * mediaBoxConfig.headerFontSize * window.innerHeight + "px");
    $(".interface-button").css("border-radius", 2 * mediaBoxConfig.borderWidth * window.innerHeight + "px");
    $(".interaction-description").css("font-size", mediaBoxConfig.headerFontSize * window.innerHeight + "px");
};

window.addEventListener('load', async () => {
    const absorbEvent = event => event.preventDefault()
    document.addEventListener('contextmenu', absorbEvent);    

    loadURLSettings();
    if (!sheetsId) {
        changePage("welcome");
        return;
    }

    await getData();
    if (!data) {
        changePage("settings");
        return;
    }
    
    if (interactionMode === "animated") {
        document.getElementById("interaction-container").style.display = "none";
        document.getElementById("media-focus").style.height = "55%";
        startAnimation(true);
    } else if (interactionMode === "dynamic") {
        initializeDynamicAnimation();
    }

    setButtonFunctions();
    setContainerSizes();

    const dataCopy = getSlicedData();

    tieredTimeline = new TieredTimeline(tieredTimelineConfig, dataCopy);

    const numEventsInGroup = backGroupAmount === 0 ? currentEventIndex : data[currentGroupIndex - backGroupAmount].events.length - 1;
    timeline = new Timeline(timelineConfig,
        {
            label: data[data.length - 1].label,
            time: data[data.length - 1].time
        },
        {
            label: data[currentGroupIndex - backGroupAmount].events[numEventsInGroup - backEventAmount].label,
            time: data[currentGroupIndex - backGroupAmount].events[numEventsInGroup - backEventAmount].time
        });

    const event = data[currentGroupIndex - backGroupAmount].events[numEventsInGroup - backEventAmount];
    setMedia(event.label, event.description, event.image);
    if (backEventAmount > 0 || backGroupAmount > 0) {
        setTimeout(() => tieredTimeline.setBoldedEvent(currentGroupIndex - backGroupAmount, numEventsInGroup - backEventAmount), 50);
    }

    updateButtonStatuses();

    document.getElementById("loading").style.display = "none";
    document.getElementById("escape-to-settings").style.display = "block";

    setTimeout(() => {
        document.getElementById("escape-to-settings").style.display = "none";
    }, 3000);
});

window.addEventListener('resize', () => {
    setContainerSizes();

    tieredTimeline.config = tieredTimelineConfig;
    tieredTimeline.setupChart(0);

    timeline.config = timelineConfig;
    timeline.setupChart();

    const numEventsInGroup = backGroupAmount === 0 ? currentEventIndex : data[currentGroupIndex - backGroupAmount].events.length - 1;
    if (backEventAmount > 0 || backGroupAmount > 0) {
        setTimeout(() => tieredTimeline.setBoldedEvent(currentGroupIndex - backGroupAmount, numEventsInGroup - backEventAmount), 50);
    }
});
