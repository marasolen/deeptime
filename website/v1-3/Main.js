const url = new URL(window.location.href);

window.location.href = '/v1-3/vis?' + url.searchParams.toString();