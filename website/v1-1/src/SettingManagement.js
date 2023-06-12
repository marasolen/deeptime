let sheetsId = "1WTxwt7RjEiNdJqSu6U2L1_CGpbsOwgUYQT3VyrdDoaI";

let currentGroupIndex = 0;
let currentEventIndex = 0;

let backEventAmount = 0;
let backGroupAmount = 0;

let interactionMode = "interactive";
let dynamicWait = 300;
let animationInterval = 30;
let animationMode = "animation-event";
let animationResetInterval = 60;

let noMenu = false;

let shouldLogEvents = false;
let logInterval = 3600;

const loadURLSetting = (url, parameter, defaultValue) => {
    if (url.searchParams.has(parameter)) {
        return url.searchParams.get(parameter);
    } else {
        url.searchParams.set(parameter, defaultValue);
        return defaultValue;
    }
};

const loadURLSettings = async (processData) => {
    let url = new URL(window.location.href);

    sheetsId = loadURLSetting(url, "id", sheetsId);

    const data = await processData(sheetsId);

    if (!data) {
        return;
    }

    currentGroupIndex = +loadURLSetting(url, "gIndex", currentGroupIndex);
    if (currentGroupIndex >= data.length) {
        currentGroupIndex = data.length - 1;
        url.searchParams.set("gIndex", currentGroupIndex);
    }

    currentEventIndex = +loadURLSetting(url, "eIndex", currentEventIndex);
    if (currentEventIndex >= data[currentGroupIndex].events.length) {
        currentEventIndex = data[currentGroupIndex].events.length - 1;
        url.searchParams.set("eIndex", currentEventIndex);
    }

    backGroupAmount = +loadURLSetting(url, "backGroup", backGroupAmount);
    if (backGroupAmount > currentGroupIndex) {
        backGroupAmount = currentGroupIndex;
        url.searchParams.set("backGroup", backGroupAmount);
    }

    backEventAmount = +loadURLSetting(url, "backEvent", backEventAmount);
    if (backEventAmount > currentEventIndex) {
        backEventAmount = currentEventIndex;
        url.searchParams.set("backEvent", backEventAmount);
    }

    interactionMode = loadURLSetting(url, "mode", "interactive");

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

    dynamicWait = +loadURLSetting(url, "dynamicWait", dynamicWait);
    animationInterval = +loadURLSetting(url, "interval", animationInterval);
    animationMode = loadURLSetting(url, "animMode", animationMode);
    animationResetInterval = +loadURLSetting(url, "resetInterval", animationResetInterval);

    noMenu = loadURLSetting(url, "noMenu", "false") === "true";
    if (noMenu) {
        toggleSettings();
    }

    $("#menu-toggle-status").text("Current status: " +
        (url.searchParams.get("noMenu") === "true" ? "will not show" : "will show"));
    $("#dynamic-wait").val(dynamicWait).change();
    $("#interval").val(animationInterval).change();
    $("#reset-delay").val(animationResetInterval).change();

    ["animation-event", "animation-event-group"].forEach(style => {
        $('input:radio[name=animation-style]').filter('[id=' + style + ']').prop("checked", animationMode === style);
    })

    shouldLogEvents = loadURLSetting(url, "logEvents", "false") === "true";
    $("#log-data-toggle-status").text("Current status: " + (shouldLogEvents ? "will log" : "will not log"));
    if (shouldLogEvents) {
        document.getElementById("trace-options").style.display = "block";
    }

    logInterval = +loadURLSetting(url, "logInterval", logInterval);
    $("#log-data-interval").val(logInterval).change();

    window.history.pushState("string", "Title", url.href);

    return data;
};

const updateURL = () => {
    let url = new URL(window.location.href);

    url.searchParams.set("id", sheetsId);
    url.searchParams.set("gIndex", currentGroupIndex);
    url.searchParams.set("eIndex", currentEventIndex);
    url.searchParams.set("backEvent", backEventAmount.toString());
    url.searchParams.set("backGroup", backGroupAmount.toString());
    url.searchParams.set("mode", interactionMode);
    url.searchParams.set("dynamicWait", dynamicWait);
    url.searchParams.set("interval", animationInterval);
    url.searchParams.set("animMode", animationMode);
    url.searchParams.set("resetInterval", animationResetInterval);
    url.searchParams.set("noMenu", noMenu);
    url.searchParams.set("logEvents", shouldLogEvents);
    url.searchParams.set("logInterval", logInterval);

    window.history.pushState("string", "Title", url.href);
};