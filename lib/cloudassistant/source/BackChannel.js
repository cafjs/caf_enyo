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

enyo.kind({
    name: 'ca.BackChannel',
    kind: 'ca.Channel',
    events: {
        onNotified:''
    },
    create: function() {
        this.inherited(arguments);
        this.url = this.url + '/backchannel';
        this.nextPull();
    },
    nextPull: function() {
        setTimeout(enyo.bind(this, "pull"), 0);
    },

    pull: function() {
        var jsonRpc = enyo.cloudassistant.jsonRpc;
        var session = this.owner;
        if (!session) {
            this.die({},{}, "Parent session gone"); 
        } else {
            var cbOK = enyo.bind(this, 'newMessageHandler');
            var cbError = enyo.bind(this, 'errorMessageHandler');
            var msg = jsonRpc.request(session.getToken(), session.getCaName(),
                                      session.getMyId(),
                                      session.getSessionId(),
                                      session.getCallbackMethod());
            this.invokeAsync(msg, cbOK, cbError);
        }
    },
    newMessageHandler: function(msg) {
        this.nextPull();
        this.doNotified({msg: msg});
    },
    errorMessageHandler: function(error) {
        this.nextPull();
        if (error !== 'timeout') {
            enyo.error("BackChannel: got non-timeout app error "+ error);
        }
    },
    // overwrite default badMessageHandler from ignore to retry
     badMessageHandler: function(inRequest, inResponse) {
         if (inRequest.retries > this.maxRetries) {
             this.die(inRequest, inError, "Too many retries");
         } else {
             this.ignore(inRequest, inResponse, "Retrying after ignoring bad response");
             this.tryAgain(inRequest);
         }
     }



});
