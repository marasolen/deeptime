const animationDuration = 2000;

let tieredTimeline;
let timeline;

const setInputFunctions = () => {
    document.getElementById("datasetSubmit").onclick = async () => {
        sheetsId = document.getElementById("datasetUpload").value;

        const tempData = await processData(sheetsId);
        if (tempData) {
            data = tempData;
            updateURL();
        } else {
            return;
        }

        reset();
    };

    document.getElementById("no-menu-link").onclick = async () => {
        noMenu = !noMenu;
        updateURL();
        $("#menu-toggle-status").text("Current status: " + (noMenu ? "will not show" : "will show"));
    };

    document.getElementById("log-data").onclick = async () => {
        shouldLogEvents = !shouldLogEvents;
        updateURL();
        $("#log-data-toggle-status").text("Current status: " + (shouldLogEvents ? "will log" : "will not log"));

        if (shouldLogEvents) {
            document.getElementById("trace-options").style.display = "block";
            startDownloadTimeout();
        } else {
            document.getElementById("trace-options").style.display = "none";
            logEvents = [];
            clearTimeout(logDownloadTimeout);
        }
    };

    $('#log-data-interval').on("change", () => {
        logInterval = $("#log-data-interval").val();
        updateURL();
        downloadLogs();
    });

    document.getElementById("system-mode").onchange = () => {
        interactionMode = document.getElementById("system-mode").value;
        if (interactionMode === "interactive") {
            document.getElementById("animation-options").style.display = "none";
            document.getElementById("dynamic-options").style.display = "none";
            document.getElementById("interaction-container").style.display = "block";
        } else if (interactionMode === "animated") {
            document.getElementById("animation-options").style.display = "block";
            document.getElementById("dynamic-options").style.display = "none";
            document.getElementById("interaction-container").style.display = "none";
        } else {
            document.getElementById("animation-options").style.display = "block";
            document.getElementById("dynamic-options").style.display = "block";
            document.getElementById("interaction-container").style.display = "block";
        }

        updateURL();
    };

    $('#dynamic-wait').on("change", () => {
        dynamicWait = $("#dynamic-wait").val();
        updateURL();
    });

    $('#interval').on("change", () => {
        animationInterval = $("#interval").val();
        updateURL();
    });

    $('input:radio[name=animation-style]').on('change', () => {
        animationMode = document.querySelector("input[type='radio'][name='animation-style']:checked").id;
        updateURL();
    });

    $('#reset-delay').on("change", () => {
        animationResetInterval = $("#reset-delay").val();
        updateURL();
    });
};

const setButtonFunctions = () => {
    document.onkeydown = (event) => {
        if (event.key === "ArrowRight" && !settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            pressBackEvent = true;

            updateButtonStatuses();
        }

        if (event.key === "ArrowLeft" && !settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            pressNextEvent = true;

            updateButtonStatuses();
        }

        if (event.key === "ArrowUp" && !settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            pressNextEventGroup = true;

            updateButtonStatuses();
        }

        if (event.key === "r" && !settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            pressResetDataset = true;

            updateButtonStatuses();
        }

        if (event.key === "Escape") {
            pressOpenSettings = true;

            updateButtonStatuses();
        }
    };

    document.onkeyup = (event) => {
        if (event.key === "ArrowRight" && pressBackEvent && !settingsOpen) {
            pressBackEvent = false

            interactionHandler("keyboard: back");
            backEvent();

            updateButtonStatuses();
        }

        if (event.key === "ArrowLeft" && pressNextEvent && !settingsOpen) {
            pressNextEvent = false

            interactionHandler("keyboard: next event");
            nextEvent();

            updateButtonStatuses();
        }

        if (event.key === "ArrowUp" && pressNextEventGroup && !settingsOpen) {
            pressNextEventGroup = false;

            interactionHandler("keyboard: next event group");
            nextEventGroup();

            updateButtonStatuses();
        }

        if (event.key === "r" && pressResetDataset && !settingsOpen) {
            pressNextEventGroup = false;

            interactionHandler("keyboard: reset");
            reset();

            updateButtonStatuses();
        }

        if (event.key === "Escape" && pressOpenSettings) {
            pressOpenSettings = false;

            interactionHandler("keyboard: toggle settings");
            toggleSettings();

            updateButtonStatuses();
        }
    };

    document.getElementById("back-button").onclick = () => {
        if (!settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            interactionHandler("button: back");
            backEvent();
        }

        updateButtonStatuses();
    };

    document.getElementById("reset-button").onclick = () => {
        if (!settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            interactionHandler("button: reset");
            reset();
        }

        updateButtonStatuses();
    };

    document.getElementById("next-button").onclick = () => {
        if (!settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            interactionHandler("button: next event");
            nextEvent();
        }

        updateButtonStatuses();
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
    setContainerSize(uploadBoxConfig);
    setContainerSize(instructionsBoxConfig);
    setContainerSize(settingsBoxConfig);

    $("#separator").css("border-width", mediaBoxConfig.borderWidth * window.innerHeight + "px");
    resizeStyles(mediaBoxConfig);
    resizeStyles(uploadBoxConfig);
    resizeStyles(instructionsBoxConfig);
    resizeStyles(settingsBoxConfig);

    $("#keep-rewinding-indicator").css("font-size", mediaBoxConfig.descriptionFontSize * window.innerHeight + "px");
    $(".interface-button").css("font-size", mediaBoxConfig.headerFontSize * window.innerHeight + "px");
    $(".interface-button").css("border-radius", 2 * mediaBoxConfig.borderWidth * window.innerHeight + "px");
};

window.addEventListener('load', async () => {
    const absorbEvent = event => event.preventDefault()
    document.addEventListener('contextmenu', absorbEvent);

    setInputFunctions();
    setButtonFunctions();
    setContainerSizes();

    const tempData = await loadURLSettings(processData);

    if (tempData) {
        data = tempData;
    } else {
        return;
    }

    if (shouldLogEvents) {
        startDownloadTimeout();
    }

    const dataCopy = getSlicedData();

    tieredTimeline = new TieredTimeline(tieredTimelineConfig, dataCopy);
    timeline = new Timeline(timelineConfig,
        {
            label: data[data.length - 1].label,
            time: data[data.length - 1].time
        },
        {
            label: data[currentGroupIndex - backGroupAmount].events[currentEventIndex - backEventAmount].label,
            time: data[currentGroupIndex - backGroupAmount].events[currentEventIndex - backEventAmount].time
        });

    const numEventsInGroup = backGroupAmount === 0 ? currentEventIndex : data[currentGroupIndex - backGroupAmount].events.length - 1;
    const event = data[currentGroupIndex - backGroupAmount].events[numEventsInGroup - backEventAmount];
    setMedia(event.label, event.description, event.image);
    if (backEventAmount > 0 || backGroupAmount > 0) {
        setTimeout(() => tieredTimeline.setBoldedEvent(currentGroupIndex - backGroupAmount, numEventsInGroup - backEventAmount), 50);
    }

    updateButtonStatuses();
});

window.addEventListener('resize', () => {
    setContainerSizes();

    tieredTimeline.config = tieredTimelineConfig;
    tieredTimeline.setupChart(0);

    timeline.config = timelineConfig;
    timeline.setupChart();
});
