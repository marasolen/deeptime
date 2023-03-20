const animationDuration = 2000;

let tieredTimeline;
let timeline;

const setInputFunctions = () => {
    document.getElementById("datasetSubmit").onclick = async () => {
        const sheetsId = document.getElementById("datasetUpload").value;

        const tempData = await processData(sheetsId);
        data = tempData ? tempData : data;

        reset();
    };

    document.getElementById("no-menu-link").onclick = async () => {
        noMenu = !noMenu;
        updateURL();
        $("#menu-toggle-status").text("Current status: " + (noMenu ? "will not show" : "will show"));
    };

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
            pressNextEvent = true;
        }

        if (event.key === "ArrowUp" && !settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            pressNextEventGroup = true;
        }

        if (event.key === "r" && !settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            pressResetDataset = true;
        }

        if (event.key === "Escape") {
            pressOpenSettings = true;
        }
    };

    document.onkeyup = (event) => {
        if (event.key === "ArrowRight" && pressNextEvent && !settingsOpen) {
            pressNextEvent = false

            interactionHandler("keyboard: next event");
            nextEvent();
        }

        if (event.key === "ArrowUp" && pressNextEventGroup && !settingsOpen) {
            pressNextEventGroup = false;

            interactionHandler("keyboard: next event group");
            nextEventGroup();
        }

        if (event.key === "r" && pressResetDataset && !settingsOpen) {
            pressNextEventGroup = false;

            interactionHandler("keyboard: reset");
            reset();
        }

        if (event.key === "Escape" && pressOpenSettings) {
            pressOpenSettings = false;

            interactionHandler("keyboard: toggle settings");
            toggleSettings();
        }
    };

    document.getElementById("reset-button").onclick = () => {
        if (!settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            interactionHandler("button: reset");
            reset();
        }
    };

    document.getElementById("next-button").onclick = () => {
        if (!settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            interactionHandler("button: next event");
            nextEvent();
        }
    };

    document.getElementById("next-group-button").onclick = () => {
        if (!settingsOpen && (interactionMode === "interactive" || interactionMode === "dynamic")) {
            interactionHandler("button: next event group");
            nextEventGroup();
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
    setContainerSize(uploadBoxConfig);
    setContainerSize(instructionsBoxConfig);
    setContainerSize(settingsBoxConfig);

    $("#separator").css("border-width", mediaBoxConfig.borderWidth * window.innerHeight + "px");
    resizeStyles(mediaBoxConfig);
    resizeStyles(uploadBoxConfig);
    resizeStyles(instructionsBoxConfig);
    resizeStyles(settingsBoxConfig);

    $(".interface-button").css("font-size", mediaBoxConfig.headerFontSize * window.innerHeight + "px");
    $(".interface-button").css("border-radius", 2 * mediaBoxConfig.borderWidth * window.innerHeight + "px");
};

window.addEventListener('load', async () => {
    setInputFunctions();
    setButtonFunctions();
    setContainerSizes();

    const tempData = await loadURLSettings(processData);

    if (tempData) {
        data = tempData;
    } else {
        return;
    }

    const dataCopy = getSlicedData();

    tieredTimeline = new TieredTimeline(tieredTimelineConfig, dataCopy);
    timeline = new Timeline(timelineConfig,
        {
            label: data[data.length - 1].label,
            time: data[data.length - 1].time
        },
        {
            label: data[currentGroupIndex].events[currentEventIndex].label,
            time: data[currentGroupIndex].events[currentEventIndex].time
        });
});

window.addEventListener('resize', () => {
    setContainerSizes();

    tieredTimeline.config = tieredTimelineConfig;
    tieredTimeline.setupChart(0);

    timeline.config = timelineConfig;
    timeline.setupChart();
});
