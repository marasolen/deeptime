let sheetsId = null;

let user = "";
let pass = "";

let currentGroupIndex = 0;
let currentEventIndex = 0;

let backEventAmount = 0;
let backGroupAmount = 0;

let interactionMode = "interactive";
let dynamicWait = 60;
let animationInterval = 2;
let animationMode = "animation-event";
let animationResetInterval = 6;

let logInterval = 3600;

let noSettings = true;

const loadURLSetting = (url, parameter, defaultValue) => {
    if (url.searchParams.has(parameter)) {
        noSettings = false;
        return url.searchParams.get(parameter);
    } else {
        url.searchParams.set(parameter, defaultValue);
        return defaultValue;
    }
};

const loadURLSettings = () => {
    let url = new URL(window.location.href);

    sheetsId = loadURLSetting(url, "id", sheetsId);

    user = loadURLSetting(url, "user", user);
    pass = loadURLSetting(url, "pass", pass);

    currentGroupIndex = +loadURLSetting(url, "gIndex", currentGroupIndex);
    currentEventIndex = +loadURLSetting(url, "eIndex", currentEventIndex);
    backGroupAmount = +loadURLSetting(url, "backGroup", backGroupAmount);
    backEventAmount = +loadURLSetting(url, "backEvent", backEventAmount);
    interactionMode = loadURLSetting(url, "mode", "interactive");
    dynamicWait = +loadURLSetting(url, "dynamicWait", dynamicWait);
    animationInterval = +loadURLSetting(url, "interval", animationInterval);
    animationMode = loadURLSetting(url, "animMode", animationMode);
    animationResetInterval = +loadURLSetting(url, "resetInterval", animationResetInterval);
    logInterval = +loadURLSetting(url, "logInterval", logInterval);

    window.history.pushState("string", "Title", url.href);

    return sheetsId;
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
    url.searchParams.set("logInterval", logInterval);

    window.history.pushState("string", "Title", url.href);
};