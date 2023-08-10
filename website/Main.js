const url = new URL(window.location.href);

window.location.href = '/v1-5/vis?' + url.searchParams.toString();