const setMedia = (label, description, image) => {
    let innerHTML = "";
    innerHTML += `<h1 id=\"media-title\">${label}</h1>`;

    if (description) {
        innerHTML += `<p id=\"media-description\">${description}</p>`;
    }

    if (image) {
        innerHTML += `<img id="media-image" src="${image}">`;
    }

    document.getElementById("media-focus").innerHTML = innerHTML;

    $('img').on('dragstart', function(event) { event.preventDefault(); });
};