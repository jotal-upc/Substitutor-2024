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

function get_blocked_urls(){
    browser.runtime.sendMessage({method: 'get_blocked_urls'}, function(response) {
        // alert(JSON.stringify(response));
        if(response && response.length > 0){
            amount += response.length;
            document.getElementById('num').innerHTML = amount;

            for (let i = 0; i < response.length; i++) {
                let row = document.getElementById('url_table').insertRow();
                let cell1 = row.insertCell(0);
                let cell2 = row.insertCell(1);
                cell1.innerHTML = response[i].host;
                cell2.innerHTML = response[i].url;
            }
        }
        else{
            document.getElementById('p1').innerHTML = "0";
        }
        // document.getElementById('blocked_urls').appendChild(document.createElement("br"));
        // document.getElementById('blocked_urls').appendChild(document.createElement("br"));
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


get_blocked_urls();