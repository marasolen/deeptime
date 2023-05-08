const animationDuration = 2000;

let tieredTimeline;
let timeline;

const updatePage = () => {
    if (interactionMode === "interactive") {
        $("#system-mode").val("interactive").change();
        document.getElementById("animation-options").style.display = "none";
        document.getElementById("dynamic-options").style.display = "none";
        document.getElementById("interaction-container").style.display = "block";
    } else if (interactionMode === "animated") {
        $("#system-mode").val("animated").change();
        document.getElementById("animation-options").style.display = "block";
        document.getElementById("dynamic-options").style.display = "none";
        document.getElementById("interaction-container").style.display = "none";
    } else {
        $("#system-mode").val("dynamic").change();
        document.getElementById("animation-options").style.display = "block";
        document.getElementById("dynamic-options").style.display = "block";
        document.getElementById("interaction-container").style.display = "block";
    }

    $("#menu-toggle-status").text("Current status: " +
        (url.searchParams.get("noMenu") === "true" ? "will not show" : "will show"));
    $("#dynamic-wait").val(dynamicWait).change();
    $("#interval").val(animationInterval).change();
    $("#reset-delay").val(animationResetInterval).change();

    ["animation-event", "animation-event-group"].forEach(style => {
        $('input:radio[name=animation-style]').filter('[id=' + style + ']').prop("checked", animationMode === style);
    })

    document.getElementById("trace-options").style.display = "block";
    $("#log-data-interval").val(logInterval).change();
}

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

    $('#log-data-interval').on("change", () => {
        logInterval = $("#log-data-interval").val();
        updateURL();
    });

    document.getElementById("system-mode").onchange = () => {
        interactionMode = document.getElementById("system-mode").value;
        if (interactionMode === "interactive") {
            document.getElementById("animation-options").style.display = "none";
            document.getElementById("dynamic-options").style.display = "none";
        } else if (interactionMode === "animated") {
            document.getElementById("animation-options").style.display = "block";
            document.getElementById("dynamic-options").style.display = "none";
        } else {
            document.getElementById("animation-options").style.display = "block";
            document.getElementById("dynamic-options").style.display = "block";
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
    setContainerSize(uploadBoxConfig);
    setContainerSize(instructionsBoxConfig);
    setContainerSize(settingsBoxConfig);

    resizeStyles(uploadBoxConfig);
    resizeStyles(instructionsBoxConfig);
    resizeStyles(settingsBoxConfig);
};

window.addEventListener('load', async () => {
    const absorbEvent = event => event.preventDefault()
    document.addEventListener('contextmenu', absorbEvent);

    loadURLSettings();
    await getData();

    setInputFunctions();
    setContainerSizes();

    const sheetsId = await loadURLSettings(processData);

    if (sheetsId) {
        data = processData(sheetsId);
    }

    updatePage();
});

window.addEventListener('resize', () => {
    setContainerSizes();
});
