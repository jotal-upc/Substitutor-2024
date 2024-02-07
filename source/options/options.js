let scriptCheckbox = document.querySelector("#enableScriptStats");
let hostCheckbox = document.querySelector("#enableHostStats");

async function loadStoredValues() {
    let scriptStatsEnabled = (await browser.storage.local.get("scriptStatsEnabled")).scriptStatsEnabled;
    if (scriptStatsEnabled) scriptCheckbox.checked = true;

    let hostStatsEnabled = (await browser.storage.local.get("hostStatsEnabled")).hostStatsEnabled;
    if (hostStatsEnabled) hostCheckbox.checked = true;
}


scriptCheckbox.addEventListener("change", function () {
    if (this.checked) {
        let scriptStatsEnabled = true;
        browser.storage.local.set({scriptStatsEnabled});
    }
    else {
        let scriptStatsEnabled = false;
        browser.storage.local.set({scriptStatsEnabled});
    }
});

hostCheckbox.addEventListener("change", function () {
    if (this.checked) {
        let hostStatsEnabled = true;
        browser.storage.local.set({hostStatsEnabled});
    }
    else {
        let hostStatsEnabled = false;
        browser.storage.local.set({hostStatsEnabled});
    }
});

loadStoredValues();