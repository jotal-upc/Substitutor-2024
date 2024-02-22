let scriptCheckbox = document.querySelector("#enableScriptStats");
let hostCheckbox = document.querySelector("#enableHostStats");

let scriptCacheMinAppears = document.querySelector("#cacheMinAppears");
let scriptCacheMaxScripts = document.querySelector("#cacheMaxScripts");

async function loadStoredStatValues() {
    let scriptStatsEnabled = (await browser.storage.local.get("scriptStatsEnabled")).scriptStatsEnabled;
    if (scriptStatsEnabled) scriptCheckbox.checked = true;

    let hostStatsEnabled = (await browser.storage.local.get("hostStatsEnabled")).hostStatsEnabled;
    if (hostStatsEnabled) hostCheckbox.checked = true;
}

async function loadStoredCacheValues() {
    let cacheMinAppears = (await browser.storage.local.get("cacheMinAppears")).cacheMinAppears;
    if (cacheMinAppears) scriptCacheMinAppears.value = cacheMinAppears;

    let cacheMaxScripts = (await browser.storage.local.get("cacheMaxScripts")).cacheMaxScripts;
    if (cacheMaxScripts) scriptCacheMaxScripts.value = cacheMaxScripts;
}

scriptCheckbox.addEventListener("change", function () {
    if (this.checked) {
        let scriptStatsEnabled = true;
        browser.storage.local.set({scriptStatsEnabled});
    } else {
        let scriptStatsEnabled = false;
        browser.storage.local.set({scriptStatsEnabled});
    }
});

hostCheckbox.addEventListener("change", function () {
    if (this.checked) {
        let hostStatsEnabled = true;
        browser.storage.local.set({hostStatsEnabled});
    } else {
        let hostStatsEnabled = false;
        browser.storage.local.set({hostStatsEnabled});
    }
});

scriptCacheMinAppears.addEventListener("change", function () {
    let cacheMinAppears = this.value;
    browser.storage.local.set({cacheMinAppears});
});

scriptCacheMaxScripts.addEventListener("change", function () {
    let cacheMaxScripts = this.value;
    browser.storage.local.set({cacheMaxScripts});
});


loadStoredStatValues();
loadStoredCacheValues();