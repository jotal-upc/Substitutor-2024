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

let unique_amount = 0;
let total_amount = 0;


function organizeBlockedHostUrls(data) {
    // resultData => {hostname: [[url, times_replaced], ...]}
    let resultData = new Map();
    for (let i = 0; i < data.length; i++) {
        // Check if hostname is in map
        if (resultData.has(data[i].host)) {
            let auxArray = resultData.get(data[i].host);
            let found = false;
            // Check if URL is in hostname urls list
            for (let j = 0; j < auxArray.length && !found; j++) {
                if (data[i].url === auxArray[j][0]) {
                    auxArray[j][1] += 1;
                    found = true;
                }
            }
            if (!found) {
                auxArray.push([data[i].url, 1]);
            }
            resultData.set(data[i].host, auxArray);
        }
        else {
            resultData.set(data[i].host, [[data[i].url, 1]]);
        }
    }
    return resultData;
}


function truncateUrl(str) {
    const size = 64;
    if (str.length <= size) {
        return str;
    }
    return str.slice(0, size) + '...';
}


function createHostUrlStructure(hostname, data) {
    const hostDetails = document.createElement("details");
    const hostSummary = document.createElement("summary");

    // Summary content
    const hostnameTable = document.createElement("table");
    const hostnameRow = document.createElement("tr");
    const hostnameCellLeft = document.createElement("td");
    const hostnameCellRight = document.createElement("td");
    const hostnameHeading = document.createElement("h4");
    hostnameHeading.textContent = hostname;
    let hostnameResourceAmount = 0;

    const hostUrlTable = document.createElement("table");
    for (let i = 0; i < data.length; i++) {
        const row = document.createElement("tr");
        const urlCell = document.createElement("td");
        const timesCell = document.createElement("td");

        urlCell.textContent = truncateUrl(data[i][0]);
        urlCell.style.width = "370px";
        timesCell.textContent = data[i][1];
        timesCell.style.width = "30px";

        row.appendChild(urlCell);
        row.appendChild(timesCell);
        hostUrlTable.appendChild(row);

        hostnameResourceAmount += data[i][1];
        unique_amount++;
    }

    // const hostnameResources = document.createElement("h4");
    // hostnameResources.textContent = "[" + hostnameResourceAmount + "]";

    hostnameCellLeft.appendChild(hostnameHeading);
    // hostnameCellRight.appendChild(hostnameResources);
    hostnameCellRight.textContent = "[" + hostnameResourceAmount + "]";
    hostnameCellRight.style.fontSize = "14px";
    hostnameCellLeft.style.width = "370px";
    hostnameCellRight.style.width = "30px";

    hostnameRow.appendChild(hostnameCellLeft);
    hostnameRow.appendChild(hostnameCellRight);
    hostnameTable.appendChild(hostnameRow);
    // hostnameTable.style.display = "inline-table";

    hostSummary.appendChild(hostnameTable);
    hostSummary.style.display = "inline-table";
    hostDetails.appendChild(hostSummary);
    hostDetails.appendChild(hostUrlTable);

    hostUrlTable.style.paddingTop = "10px";
    hostDetails.style.paddingBottom = "10px";
    hostDetails.style.paddingTop = "10px";
    hostDetails.style.borderTop = "2px solid #f1f1f1";

    return hostDetails;
}


function getBlockedUrls(){
    browser.runtime.sendMessage({method: 'get_blocked_urls'}, function(response) {
        if(response && response.length > 0){

            const blockedUrls = document.getElementById('blocked_urls');

            let parsedData = organizeBlockedHostUrls(response);
            parsedData.forEach (function(value, key) {
                // console.log(key + JSON.stringify(value));
                const hostStruct = createHostUrlStructure(key, value);
                blockedUrls.appendChild(hostStruct);
            })

            total_amount += response.length;

            document.getElementById('num_unique').innerHTML = unique_amount.toString();
            document.getElementById('num_total').innerHTML = total_amount.toString();
            document.getElementById('num_hosts').innerHTML = parsedData.size.toString();
        }
        else{
            document.getElementById('num_unique').innerHTML = "0";
            document.getElementById('num_total').innerHTML = "0";
            document.getElementById('num_hosts').innerHTML = "0";
        }
	});
}

function checkEnabled(){
    onoffButton = document.getElementById('onoffButton');

    browser.runtime.sendMessage({method:'get_enabled'}, function(response){
        onoffButton.checked = response;
    });

    onoffButton.addEventListener('change', function() {
        browser.runtime.sendMessage({method: 'filterCheck', data: onoffButton.checked});
    });
}


// Run our script as soon as the document's DOM is ready.
document.addEventListener('DOMContentLoaded', function () {
    checkEnabled();
});


getBlockedUrls();