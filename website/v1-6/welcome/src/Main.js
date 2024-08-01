const config = {
    borderWidth:         0.4 / 100,
    headerFontSize:      3.0 / 100
}

const setButtonFunctions = () => {
    document.getElementById("default").onclick = () => {
        changePage("vis", [{ key: "id", value: "1K4-sSSBIKzZOIDBDnqAPo_Uib7IvTiKq59A9l7BqUlA" }])
    };

    document.getElementById("custom").onclick = () => {
        changePage("settings");
    };
};

const resizeStyles = () => {
    $(".interface-button").css("font-size", config.headerFontSize * window.innerHeight + "px");
    $(".interface-button").css("border-radius", 2 * config.borderWidth * window.innerHeight + "px");
    $("#welcome-message").css("font-size", config.headerFontSize * window.innerHeight + "px");
};

window.addEventListener('load', async () => {
    setButtonFunctions();
    resizeStyles();

    document.getElementById("loading").style.display = "none";
});

window.addEventListener('resize', () => {
    resizeStyles();
});
