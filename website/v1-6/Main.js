const url = new URL(window.location.href);

window.location.href = '/v1-6/vis?' + url.searchParams.toString();