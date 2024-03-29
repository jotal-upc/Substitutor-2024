/*
 *
 * Copyright (C) 2020 Universitat Politècnica de Catalunya.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//############################################## GLOBAL VARIABLES ##############################################

// ============== GENERAL PURPOSE VARIABLES ==============
let filter = true; // Boolean that indicates if extension's filter is activated or not
let tabsInfo = new Map(); //Info about current open tabs will be handled in this variable
let whitelisted_matches; // Whitelisted elements to avoid some false positives that affect some websites functioning, stored in whitelist.json
let hash_block_list = ["", ""]; //Content block_list: a list of SHA-256 hashes for the content-blocker

// ============== BASE REPO/API PATHS ==============
const base_repo_path = "https://raw.githubusercontent.com/ismael-castell/Replacements/main";
const base_api_path = "https://eprivo.eu/api/api.php?";
const base_stat_api_path = "http://127.0.0.1:5000"; // Testing only

// ============== EXTENSION STATISTICS VARIABLES ==============
const minStatUpdates = 10; // Send stats to the server after reaching 'minStatUpdates' resources substituted
let currStatUpdates = 0;


//change badge color (badge shows the number of suspicious url blocked on a website)
browser.browserAction.setBadgeBackgroundColor({color:'#cf1b1b'});


loadWhiteList();
downloadBlacklist();


// ############################################## WHITELIST FUNCTIONS ##############################################
// purpose of this is to avoid false positive that affects website usability and correct functioning
async function loadWhiteList(){
    let aux;
    await jQuery.getJSON("whitelist.json", function(result) {
        aux = result;
        for (let key in aux) {
            switch (key) {
                case "whitelisted_matches":
                    whitelisted_matches = aux[key];
                    break;
            }
        }
    });
}


// ############################################## INIT FUNCTIONS ##############################################
async function downloadBlacklist(){
    if (await checkHashlistUpdate()) {
        await updateHashlist();
    }
    await writeBlacklist();
}


async function writeBlacklist() {
    let aux = await browser.storage.local.get("hashDB_content");
    hash_block_list = aux.hashDB_content;

    //@debug
    console.debug("hash block list loaded");
}


async function getRemoteHashlistHash() {
    let response = await fetch(base_repo_path + '/list.hash');
    let content = await response.text();
    return content;
}


async function getLocalHashlistHash() {
    let aux = await browser.storage.local.get("hashDB_hash");
    return aux.hashDB_hash;
}


async function checkHashlistUpdate() {
    let localHashlistHash = await getLocalHashlistHash();
    let remoteHashlistHash = await getRemoteHashlistHash();

    //@debug
    console.debug("local  : " + localHashlistHash);
    console.debug("remote : " + remoteHashlistHash);

    if (localHashlistHash === remoteHashlistHash) {
        console.debug("hash is up to date!");
        return false; 
    }

    let hashDB_hash = remoteHashlistHash;
    browser.storage.local.set({hashDB_hash});
    return true;
}


async function updateHashlist() {
    //@debug
    console.debug("downloading new hash block list.");

    let response = await fetch(base_repo_path + '/list.csv');
    let online_content = (await response.text()).split("\n");
    let hashDB_content = await parseBlacklist(online_content);
    browser.storage.local.set({hashDB_content});
}


async function parseBlacklist(orig_block_list) {
    let new_block_list = [];
    for (let i = 0; i < orig_block_list.length; i++) {
        let aux = orig_block_list[i].split(',');
        new_block_list.push([aux[0],aux[1]]);
    }
    return new_block_list;
}


//######################### CONTENT-BLOCKER FUNCTIONS #########################
//generates the SHA-256 hash string from an ArrayBuffer
async function hash_func(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);               // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
}

//check if resource hashes are block_listed
async function isOnBlacklist(hash) {
   let binarySearch = function (arr, x, start, end) { 
        if (start > end) return ["", ""];

        let mid=Math.floor((start + end)/2);
        if (arr[mid][0] === x && arr[mid][1] === 0) return [arr[mid][0], ""];
        if (arr[mid][0] === x && arr[mid][1] !== 0) return [arr[mid][0], arr[mid][1]];
        
        if (arr[mid][0] > x) return binarySearch(arr, x, start, mid-1); 
        else return binarySearch(arr, x, mid+1, end); 
    } 

    let ret = await binarySearch(hash_block_list, hash, 0, hash_block_list.length-1);
    return ret;
}


//######################### tabInfo related functions #########################
//function to create a new entry for tabsInfo
function newInfo (tabId){
    browser.tabs.get(tabId,
        function(tab) {
            if (browser.runtime.lastError) {
                //roudabout to error "no tab with id xxx"
                console.debug("Sorry for this: ",browser.runtime.lastError.message);
                return;
            }
            let aux_host;
            try {
                if (tab.url === undefined) {
                    return;
                }

                aux_host = new URL(tab.url).host;

                baseHost = aux_host.split(".");
                baseHost = baseHost.slice(baseHost.length-2, baseHost.length);
                baseHost = (baseHost[0]+"."+baseHost[1]);

                let info = {
                    id: tabId,
                    url: tab.url,
                    blocked_index: [],
                    blocked: [],
                    host: aux_host,
                    baseHost: baseHost,
                };
                tabsInfo.set(tabId,info);
            } catch (e) {
                //if you load something that's not a website, error, like local files
                console.debug("Visited site is not an URL");
            }
        }
    );
}

function updateTabInfo (idTab, aux_URL){
        let blocked_info = {
            url: aux_URL.href,
            host: aux_URL.host,
            check: false,
        }

        tabsInfo.get(idTab).blocked_index.push(aux_URL.href);
        tabsInfo.get(idTab).blocked.push(blocked_info);

        tabsInfo.set(idTab,  tabsInfo.get(idTab));
        tabsInfo.set(idTab,  tabsInfo.get(idTab));

        browser.browserAction.setBadgeText(
            {tabId: idTab, text: ((tabsInfo.get(idTab).blocked.length).toString())}
        );
}


// ############################################## REQUEST PROCESSING ##############################################
browser.webRequest.onBeforeRequest.addListener(
    function(details){
        //this is a callback function executed when details of the webrequest are available

        //check if extension is enabled
        if (!filter){
            console.debug("No filter!");
            return;
        }

        const request_url = details.url;
        const idTab = details.tabId;

        //needed when tab created in background
        if (idTab >= 0 && !tabsInfo.has(idTab)) {
            newInfo(idTab);
        }

        if (tabsInfo.get(idTab) === undefined) {
            return;
        }

        let aux_URL = new URL(request_url);
        let tabHost = tabsInfo.get(idTab).host;

        // checks whitelist
        for (let key in whitelisted_matches) {
            if (aux_URL.href.includes(whitelisted_matches[key])) {
                console.debug("Allowed by whitelist: " + request_url);
                return;
            }
        }

        // CONTENT BLOCKER
        let filterReq = browser.webRequest.filterResponseData(details.requestId);
        let tmp_data = [];

        filterReq.ondata = event => {
            tmp_data.push(event.data);
        };

        filterReq.onstop = async event => {

            let auxblob = new Blob(tmp_data);
            let data = await new Response(auxblob).arrayBuffer();

            let hash = await hash_func(data);
            let isTracking = await isOnBlacklist(hash);

            if (isTracking[0] !== "") { // Has to be blocked
                let new_data;
                let cacheSearch = await getFromCache(isTracking[1]);

                // Resource is present in cache
                if (cacheSearch[0]) {
                    new_data = cacheSearch[1];
                    console.debug("Clean resource retrieved from CACHE => hash: " + isTracking[1]);
                }
                // Resource is not present in cache => Has to be retrieved from repo
                else {
                    let response = await fetch(base_repo_path + '/' + isTracking[1][0] + '/' + isTracking[1].concat(".js"));
                    new_data = await response.arrayBuffer();
                    console.debug("Clean resource retrieved from REPO => hash: " + isTracking[1]);
                }

                console.debug(details.url + " blocked and replaced by Substitutor");
                console.debug("(Replaced: " + isTracking[0] + " => " + isTracking[1] + ")");

                //add info to tabinfo
                let aux_URL = await new URL(request_url);
                updateTabInfo(details.tabId,aux_URL);
                await writeFilter(filterReq, new_data);

                // Post script substitution cache management section
                // Update stats + Store script if needed
                let needCache = await updateHashCounter(isTracking[1]);
                if (needCache) {
                    await storeInCache(isTracking[1], new_data);
                }

                currStatUpdates++;
                if ((await getScriptStatsEnabled() || await getHostStatsEnabled()) && (currStatUpdates >= minStatUpdates)) {
                    await sendStatsServer(); // Same function resets 'currStatUpdates' back to zero if api POST is successful
                }
            }
            else {
                await writeFilter(filterReq, data);
            }
        }
        async function writeFilter(filter, data) {
            filter.write(data);
            filter.close();
        }
    },
    {urls: ["<all_urls>"]},
    ["blocking"]
);

/* DISABLED AT THE TIME
// TESTING -> Store host information
browser.webRequest.onCompleted.addListener(
    async function(details) {
        let tabHost = tabsInfo.get(details.tabId).host;
        // Update host stats table (only if the user agrees)
        if (await getHostStatsEnabled() && tabHost !== "") {
            await updateHostsData(tabHost);
        }
    },
    {urls: ["<all_urls>"]},
    []
);
*/

// ############################################## TABS LISTENERS ##############################################
let current_tab;
//on activated tab, creates new tabInfo if tab visited is not registered
browser.tabs.onActivated.addListener(
    function(activeInfo){
        current_tab = activeInfo.tabId;
        if (tabsInfo.has(activeInfo.tabId)){
            return;
        }
        newInfo(activeInfo.tabId);
        console.debug(tabsInfo);
    }
);


//on updated tab, creates new tabInfo when page is reloaded or url is changed
browser.tabs.onUpdated.addListener(
    function(tabId, changeInfo){
        if ((changeInfo.url !== undefined) && tabsInfo.has(tabId)){
            newInfo(tabId);
            browser.browserAction.setBadgeText(
                {tabId: tabId, text: ('')}
            );
        }
    }
);


//on removed, remove tabInfo when a tab is closed
browser.tabs.onRemoved.addListener(
    function(tabId){
        if(!tabsInfo.has(tabId)){
            return;
        }
        tabsInfo.delete(tabId);
    }
);


// ############################################## CONNECTIONS WITH POPUP ##############################################
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	switch (request.method)
	{
    case 'get_enabled':
        sendResponse(filter);
        break;
    case 'filterCheck':
        filter = request.data;
        break;

    case 'get_blocked_urls':
        if (tabsInfo.has(current_tab)){
            //console.debug("Request received, sending data...", tabsInfo.get(current_tab).blocked);
            sendResponse(tabsInfo.get(current_tab).blocked);
        }
        break;
	}
    //this is to prevent error message "Unchecked runtime.lastError: The message port closed before a response was received." from appearing needlessly
    sendResponse();
});


// ############################################### SCRIPT CACHE MANAGER ###############################################
//
// The main goal of implementing a cache mem is to reduce the number of requests sent to the repo, and therefore also
// reduce the time it takes to obtain the clean javascript code.
//
// The extension should keep the X most replaced clean scripts in cache, by saving them in the browser's local storage.
// The extension should also maintain a counter of the times each clean script has been used, in order to store only
// the most used ones.

async function getCacheMinAppears() {
    let cacheMinAppears = (await browser.storage.local.get("cacheMinAppears")).cacheMinAppears;
    if (cacheMinAppears === undefined) {
        cacheMinAppears = 5;
        browser.storage.local.set({cacheMinAppears});
    }
    return cacheMinAppears;
}


async function getCacheMaxScripts() {
    let cacheMaxScripts = (await browser.storage.local.get("cacheMaxScripts")).cacheMaxScripts;
    if (cacheMaxScripts === undefined) {
        cacheMaxScripts = 10;
        browser.storage.local.set({cacheMaxScripts});
    }
    return cacheMaxScripts;
}

async function updateHashCounter(resourceHash) {
    // Updates hash resource counter + returns true if the script corresponding to
    // resourceHash has to be saved in cache (if it reaches the minimum number of appearances)
    let aux = await browser.storage.local.get("hashCounter");
    let hashCounter = aux.hashCounter;
    if (hashCounter === undefined) {
        console.debug("[counter] Initializing counter...");
        hashCounter = [];
    }
    let found = false;
    let counter = 0;
    for (let i = 0; i < hashCounter.length; i++) {
        if (hashCounter[i][0] === resourceHash) {
            hashCounter[i][1] += 1;
            counter = hashCounter[i][1];
            found = true;
            break;
        }
    }
    if (!found) {
        hashCounter.push([resourceHash, 1]);
        counter = 1;
        console.debug("[counter] Added new entry => hash: " + resourceHash);
    }
    // console.debug(hashCounter); // DEBUG
    browser.storage.local.set({hashCounter});
    return ((await getCacheMinAppears()) === counter);
}

async function resetHashCounter(resourceHash) {
    // Sets resource counter back to 0 for given resource.
    // !! Should only be called after removing an entry from the script cache !!
    let aux = await browser.storage.local.get("hashCounter");
    let hashCounter = aux.hashCounter;
    for (let i = 0; i < hashCounter.length; i++) {
        if (hashCounter[i][0] === resourceHash) {
            hashCounter[i][1] = 0;
            break;
        }
    }
    browser.storage.local.set({hashCounter});
}

async function storeInCache(resourceHash, resourceScript) {
    // Stores the corresponding resource hash and script in local storage
    let aux = await browser.storage.local.get("resourceCache");
    let resourceCache = aux.resourceCache;
    if (resourceCache === undefined) {
        console.debug("[cache] Initializing cache...");
        resourceCache = [];
    }
    // resourceCache[index][0] => Resource hash
    // resourceCache[index][1] => Resource script
    // resourceCache[index][2] => Timestamp that indicates last time resource was accessed
    let lastAccess = Date.now();
    if (resourceCache.length === (await getCacheMaxScripts())) {
        // If the cache has reached its maximum size, the entry which has been used least recently
        // has to be substituted.
        let oldestIndex = 0;
        let oldestTime = resourceCache[0][2];
        for (let i = 1; i < resourceCache.length; i++) {
            if (resourceCache[i][2] < oldestTime) {
                oldestTime = resourceCache[i][2];
                oldestIndex = i;
            }
        }
        // When dropping an element from the cache we should reset its counter back to 0, because if not it would
        // increase indefinitely and wouldn't be able to reach back the cacheMinAppears, and it would never be able
        // to enter resourceCache again.
        await resetHashCounter(resourceCache[oldestIndex][0]);
        console.debug("[cache] Max Size reached. Dropped oldest entry (hash: " + resourceCache[oldestIndex][0] + ")");
        resourceCache[oldestIndex] = [resourceHash, resourceScript, lastAccess];
    }
    else {
        resourceCache.push([resourceHash, resourceScript, lastAccess]);
    }
    console.debug("[cache] Added new entry => hash: " + resourceHash);
    browser.storage.local.set({resourceCache});
}

async function getFromCache(resourceHash) {
    // Returns a pair (array size=2), where the first element indicates if the resource is present in cache,
    // and if it is true, the second element is the arraybuffer (script content).
    let aux = await browser.storage.local.get("resourceCache");
    let resourceCache = aux.resourceCache;
    if (resourceCache !== undefined) {
        for (let i = 0; i < resourceCache.length; i++) {
            if (resourceCache[i][0] === resourceHash) {
                resourceCache[i][2] = Date.now(); // Update timestamp
                return [true, resourceCache[i][1]];
            }
        }
    }
    return [false, null]; // Returns this in case the cache is not initialized or the resource is not present in cache
}


// ############################################### EXTENSION STATISTICS ###############################################
//
// Send statistics data about the most substituted scripts in order to keep those more up-to-date and (maybe) include
// them inside the extension by default.


async function getScriptStatsEnabled() {
    let scriptStatsEnabled = (await browser.storage.local.get("scriptStatsEnabled")).scriptStatsEnabled;
    if (scriptStatsEnabled === undefined) {
        scriptStatsEnabled = false;
        browser.storage.local.set({scriptStatsEnabled});
    }
    return scriptStatsEnabled;
}


async function getHostStatsEnabled() {
    let hostStatsEnabled = (await browser.storage.local.get("hostStatsEnabled")).hostStatsEnabled;
    if (hostStatsEnabled === undefined) {
        hostStatsEnabled = false;
        browser.storage.local.set({hostStatsEnabled});
    }
    return hostStatsEnabled;
}


async function calcHashCounterDiff(newHashCounter, oldHashCounter) {
    if (oldHashCounter === undefined) {
        return newHashCounter;
    }
    let result = [];
    let index = 0;
    while(index < oldHashCounter.length) {
        if (oldHashCounter[index][0] === newHashCounter[index][0]) { // Unnecessary? Should always be true
            let val = newHashCounter[index][1] - oldHashCounter[index][1];
            if (val < 0) {
                result.push([newHashCounter[index][0], newHashCounter[index][1]]);
            }
            else if (val !== 0) {
                result.push([newHashCounter[index][0], val]);
            }
        }
        index++;
    }
    while (index < newHashCounter.length) {
        result.push(newHashCounter[index]);
        index++;
    }
    return result;
}


async function saveOldHashCounter() {
    // We need to save the hashCounter state for the last time we sent statistics to the server, so that each
    // time we only send the difference between the current and previous counters.
    let old_hashCounter = (await browser.storage.local.get("hashCounter")).hashCounter;
    browser.storage.local.set({old_hashCounter});
}


async function updateHostsData(hostname) {
    // hostStats[index][0] => hostname string
    // hostStats[index][1] => number of visits since last time data was sent to the server
    // hostStats[index][2] => has been previously announced to the server? (0: yes, 1: no)
    let hostStats = (await browser.storage.local.get("hostStats")).hostStats;
    if (hostStats === undefined) {
        console.debug("[host-stats] Initializing host stats...");
        hostStats = [];
    }
    let found = false;
    for (let i = 0; i < hostStats.length; i++) {
        if (hostStats[i][0] === hostname) {
            hostStats[i][1] += 1;
            found = true;
            break;
        }
    }
    if (!found) {
        hostStats.push([hostname, 1, 1]);
        console.debug("[host-stats] Added new entry => hostname: " + hostname);
    }
    // console.debug(hostStats); // DEBUG
    browser.storage.local.set({hostStats});
}


async function resetHostsData() {
    let hostStats = (await browser.storage.local.get("hostStats")).hostStats;
    for (let i = 0; i < hostStats.length; i++) {
        hostStats[i][1] = 0;
        hostStats[i][2] = 0;
    }
    browser.storage.local.set({hostStats});
}


async function getHostsToSend(hostArray) {
    // Only send hosts whose stats have changed, in order to reduce post api call size
    let result = [];
    for (let i = 0; i < hostArray.length; i++) {
        if (hostArray[i][1] !== 0) {
            result.push(hostArray[i]);
        }
    }
    return result;
}


async function sendStatsServer() {
    let scripts = [];
    let hosts = [];

    if (await getScriptStatsEnabled()) {
        let hashCounter = (await browser.storage.local.get("hashCounter")).hashCounter;
        let oldHashCounter = (await browser.storage.local.get("old_hashCounter")).old_hashCounter;
        scripts = await calcHashCounterDiff(hashCounter, oldHashCounter);
    }
    if (await getHostStatsEnabled()) {
        let auxHostStats = (await browser.storage.local.get("hostStats")).hostStats;
        hosts = await getHostsToSend(auxHostStats);
    }

    console.debug("POST body => " + JSON.stringify({scripts, hosts}));
    const response = await fetch(base_stat_api_path + "/stats", {
        method: "POST",
        headers: {"Content-Type": "application/json; charset=UTF-8"},
        body: JSON.stringify({scripts, hosts})
    });

    if (response.ok) {
        if (await getScriptStatsEnabled()) await saveOldHashCounter();
        if (await getHostStatsEnabled()) await resetHostsData();
        currStatUpdates = 0;
    }
    return response;
}
