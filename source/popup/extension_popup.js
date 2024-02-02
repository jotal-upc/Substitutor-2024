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

let amount = 0


function organizeBlockedHostUrls(data) {
    // resultData => {hostname: [[url, times_replaced], ...]}
    let resultData = new Map();
    for (let i = 0; i < data.length; i++) {
        if (resultData.has(data[i].host)) {
            let auxArray = resultData.get(data[i].host);
            let found = false;
            for (let j = 0; j < auxArray.length && !found; j++) {
                if (data[i].url === auxArray[j][0]) {
                    auxArray[j][1] += 1;
                    found = true;
                }
            }
            if (!found) auxArray.push([data[i].url, 1]);
            resultData.set(data[i].host, auxArray);
        }
        else {
            resultData.set(data[i].host, [[data[i].url, 1]]);
        }
    }
    return resultData;
}


function createHostUrlStructure(hostname, data) {
    const hostDetails = document.createElement("details");
    const hostSummary = document.createElement("summary");
    const hostHeading = document.createElement("h4");
    hostHeading.textContent = hostname;

    const hostUrlTable = document.createElement("table");
    for (let i = 0; i < data.length; i++) {
        let row = hostUrlTable.insertRow();
        let cell1 = row.insertCell(0);
        let cell2 = row.insertCell(1);
        cell1.innerHTML = data[i][0];
        cell2.innerHTML = data[i][1];
    }

    hostSummary.appendChild(hostHeading);
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

            // amount += response.length;
            // document.getElementById('num').innerHTML = amount;
            // document.getElementById('blocked_table').style.display = "block";

        }
        else{
            // document.getElementById('num').innerHTML = "0";
            // document.getElementById('blocked_table').style.display = "none";
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