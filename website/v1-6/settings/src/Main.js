const animationDuration = 2000;

let tieredTimeline;
let timeline;

const updatePage = () => {
    if (interactionMode === "interactive") {
        $("#system-mode").val("interactive").change();
        document.getElementById("animation-options").style.display = "none";
        document.getElementById("dynamic-options").style.display = "none";
    } else if (interactionMode === "animated") {
        $("#system-mode").val("animated").change();
        document.getElementById("animation-options").style.display = "block";
        document.getElementById("dynamic-options").style.display = "none";
    } else {
        $("#system-mode").val("dynamic").change();
        document.getElementById("animation-options").style.display = "block";
        document.getElementById("dynamic-options").style.display = "block";
    }

    $("#dynamic-wait").val(dynamicWait).change();
    $("#interval").val(animationInterval).change();
    $("#reset-delay").val(animationResetInterval).change();

    $("#subtitle").val(subtitle).change();
    $("#username").val(user).change();
    $("#password").val(pass).change();

    ["animation-event", "animation-event-group"].forEach(style => {
        $('input:radio[name=animation-style]').filter('[id=' + style + ']').prop("checked", animationMode === style);
    });
}

const setInputFunctions = () => {
    document.getElementById("welcome").onclick = async () => {
        changePage("welcome");
    };
    document.getElementById("start").onclick = async () => {
        if (data) {
            changePage("vis");
        }
    };

    document.getElementById("datasetSubmit").onclick = async () => {
        sheetsId = document.getElementById("datasetUpload").value;

        data = await processData(sheetsId);
        if (data) {
            document.getElementById("start").classList.toggle("enabled-button", true);
            document.getElementById("start").classList.toggle("disabled-button", false);
            updateURL();
        } else {
            document.getElementById("start").classList.toggle("enabled-button", false);
            document.getElementById("start").classList.toggle("disabled-button", true);
            return;
        }

        reset();
    };

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

    $('#subtitle').on("change", () => {
        subtitle = $("#subtitle").val();
        updateURL();
    });

    $('#username').on("change", () => {
        user = $("#username").val();
        updateURL();
    });

    $('#password').on("change", () => {
        pass = $("#password").val();
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
    setContainerSize(settingsBoxConfig);
    setContainerSize(advancedBoxConfig);

    resizeStyles(uploadBoxConfig);
    resizeStyles(settingsBoxConfig);
    resizeStyles(advancedBoxConfig);
    
    $(".interface-button").css("font-size", uploadBoxConfig.headerFontSize * window.innerHeight + "px");
    $(".interface-button").css("border-radius", 2 * uploadBoxConfig.borderWidth * window.innerHeight + "px");
};

window.addEventListener('load', async () => {
    const absorbEvent = event => event.preventDefault()
    document.addEventListener('contextmenu', absorbEvent);

    loadURLSettings();
    await getData();

    if (data) {
        document.getElementById("start").classList.toggle("enabled-button", true);
        document.getElementById("start").classList.toggle("disabled-button", false);
    }

    setInputFunctions();
    setContainerSizes();

    updatePage();

    document.getElementById("loading").style.display = "none";
});

window.addEventListener('resize', () => {
    setContainerSizes();
});
