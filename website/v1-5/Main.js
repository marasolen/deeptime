const url = new URL(window.location.href);

window.location.href = '/v1-4/vis?' + url.searchParams.toString();