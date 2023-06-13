const defaultSheetsId = "1WTxwt7RjEiNdJqSu6U2L1_CGpbsOwgUYQT3VyrdDoaI";

const changePage = (base, custom) => {
    let url = new URL(window.location.href);
    
    if (custom) {
        custom.forEach(kv => url.searchParams.set(kv.key, kv.value));
    }

    window.location.href = url.toString().replace(/\/[a-z]*\/\?/, '/' + base + "/?")
};