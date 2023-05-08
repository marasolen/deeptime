const config = {
    borderWidth:         0.4 / 100,
    headerFontSize:      3.0 / 100
}

const setButtonFunctions = () => {
    document.getElementById("default").onclick = () => {
        changePage("../", [{ key: "id", value: "1WTxwt7RjEiNdJqSu6U2L1_CGpbsOwgUYQT3VyrdDoaI" }])
    };

    document.getElementById("custom").onclick = () => {
        changePage("settings");
    };
};

const resizeStyles = () => {
    $(".interface-button").css("font-size", config.headerFontSize * window.innerHeight + "px");
    $(".interface-button").css("border-radius", 2 * config.borderWidth * window.innerHeight + "px");
    $(".welcome-message").css("font-size", config.headerFontSize * window.innerHeight + "px");
};

window.addEventListener('load', async () => {
    setButtonFunctions();
    resizeStyles();
});

window.addEventListener('resize', () => {
    resizeStyles();
});
