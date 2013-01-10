/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

(function () {
if (!(enyo.cloudassistant)) {
    enyo.cloudassistant = {};
}

// assumed this lib and the app are co-located
var location = window.location || {};
var protocol = location.protocol;
var port = (protocol === 'http:' ? 80 :
            (protocol === 'https:' ? 443 :
             undefined));
port = (location.port ? location.port : port);

var app = location.hostname.split('.')[0];
var appLst = app.split("_");
var appPublisher;
var appLocalName;
if (appLst.length > 1) {
    appPublisher = appLst.shift();
    appLocalName = appLst.join('_');
} else {
    appPublisher = 'root';
    appLocalName = app;
};

function parseSearch(search, key) {
    if (search) {
        var all = search.substring(1).split('&');
        for (var i = 0 ; i< all.length; i++) {
            var keyVal = all[i].split('=');
            if ((keyVal.length == 2) &&
                (decodeURIComponent(keyVal[0]) === key)) {
                return decodeURIComponent(keyVal[1]);
            }
        }
    }
    return undefined;
}

var token = parseSearch(location.search, 'token');
if (typeof token === 'string') {
    try {
        token = JSON.parse(token);
    } catch (ignore) {
        enyo.error("cannot parse (JSON) token " + token);
        token = undefined;
    }
} else {
    token = undefined;
}

var strToBoolean = function(flag) {
    if (flag === 'false') {
        return false;
    } else if (flag === 'true') {
        return true;
    } else {
        return undefined;
    }
};

var baseUrl = (location.search ? location.href.split(location.search)[0] :
               location.href);

var origin = (location.origin ? location.origin : (location.protocol + "//" +
location.host));

enyo.cloudassistant.props = {
    'appHostname' : location.hostname,
    'appHost' : location.host, // includes port
    'appProtocol' : protocol,
    'port' : port,
    'baseUrl' : baseUrl,
    'origin' : origin,
    'caOwner' : parseSearch(location.search, 'caOwner'),
    'password' : parseSearch(location.search, 'password'),
    'token' : token,
    'sessionId' :  parseSearch(location.search, 'sessionId'),
    'caLocalName' : parseSearch(location.search, 'caLocalName'),
    'appPublisher' : appPublisher,
    'appLocalName' : appLocalName,
    'goTo' : parseSearch(location.search, 'goTo'),
    'unrestrictedToken'  : strToBoolean(parseSearch(location.search,
                                                    'unrestrictedToken'))
};

}());
