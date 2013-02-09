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
    name: 'ca.Channel',
    kind: 'enyo.Component',
    method: 'POST',
    handleAs: 'json',
    contentType: 'application/json',
    maxRetries: 10000000000,
    retryTimeout: 1000, // msec

    events: {
        onDisconnect: ''
    },

    create: function() {
        this.url = this.owner && this.owner.getPostUrl();
        this.inherited(arguments);
    },
    invokeAsync: function(msg, cbOK, cbError) {
        if (this.destroyed) {
            throw new Error("Invoke on destroyed channel");
        }
        this._invokeAsync(msg, 0, cbOK, cbError);
    },
    updateToken: function(msg) {
        var jsonRpc = enyo.cloudassistant.jsonRpc;
        var session = this.owner;
        var token = session.getToken();
        jsonRpc.setToken(msg, token);
    },
    _invokeAsync: function(msg, retries, cbOK, cbError) {
        this.updateToken(msg); // retries should get the latest token
        var msgStr = enyo.json.stringify(msg);
        var request = new enyo.Ajax({
                                        url : this.url, method: this.method,
                                        handleAs: this.handleAs,
                                        contentType: this.contentType,
                                        postBody: msgStr
                                    });
        request.retries = retries;
        request.msg = msg;
        request.cbOK = cbOK;
        request.cbError = cbError;
        request.response(this, 'responseHandler');
        request.error(this, 'transportErrorHandler');
        request.go();
    },
    responseHandler: function(inRequest, inResponse) {
        var jsonRpc = enyo.cloudassistant.jsonRpc;
        if (jsonRpc.isSystemError(inResponse)) {
            this.checkId(inRequest, inResponse) &&
                this.systemErrorHandler(inRequest, inResponse);
        } else if (jsonRpc.isAppReply(inResponse)) {
            this.checkId(inRequest, inResponse) &&
                this.appReplyHandler(inRequest, inResponse);
        } else {
            this.badMessageHandler(inRequest, inResponse);
        }
    },
    badMessageHandler: function(inRequest, inResponse) {
        this.ignore(inRequest, inResponse, "Ignoring bad response");
    },
    appReplyHandler: function(inRequest, inResponse) {
        var jsonRpc = enyo.cloudassistant.jsonRpc;
        var error = jsonRpc.getAppReplyError(inResponse);
        var data = jsonRpc.getAppReplyData(inResponse);
        if (error) {
            // Only application level errors in callback
            inRequest.cbError(error);
        } else {
            inRequest.cbOK(data);
        }
    },
    checkId : function(inRequest, inResponse) {
        if (inResponse.id !== inRequest.msg.id) {
            this.ignore(inRequest, inResponse, "Wrong Id");
            return false;
        } else {
            return true;
        }
    },
    transportErrorHandler: function(inRequest, inError) {
        this.die(inRequest, inError, "Transport error");
    },
    systemErrorHandler: function(inRequest, inError) {
        var jsonRpc = enyo.cloudassistant.jsonRpc;
        if (inRequest.retries > this.maxRetries) {
            this.die(inRequest, inError, "Too many retries");
        } else if (jsonRpc.isRedirect(inError)) {
            this.tryAgain(inRequest);
        } else if (jsonRpc.isNotAuthorized(inError)) {
            this.newLogin(inRequest, inError);
        } else if (jsonRpc.isRecoverable(inError)) {
            enyo.log("Channel: Retrying recoverable error " +
                   enyo.json.stringify(inError));
            this.tryAgain(inRequest);
        } else {
            this.die(inRequest, inError, "Unrecoverable system error");
        }
    },
    newLogin: function(inRequest, inError) {
        var jsonRpc = enyo.cloudassistant.jsonRpc;
        var session = this.owner;
        session.login(jsonRpc.getToken(inRequest.msg));
        this.tryAgain(inRequest);
    },
    tryAgain: function(inRequest) {
        var fn = enyo.bind(this, "_invokeAsync", inRequest.msg,
            inRequest.retries + 1, inRequest.cbOK, inRequest.cbError);
        setTimeout(fn, this.retryTimeout);
    },
    ignore: function(inRequest, inResponse, logMsg) {
        enyo.error("Channel: Ignoring "+ logMsg + " Request:" +
                    enyo.json.stringify(inRequest.msg) + " Response:" +
                    enyo.json.stringify(inResponse));
    },
    die: function(inRequest, inError, logMsg) {
        var allLogMsg = "Channel: "+ logMsg + " shutting down: Request:" +
                    enyo.json.stringify(inRequest.msg) + " Response:" +
                    enyo.json.stringify(inError);
        enyo.error(allLogMsg);
        this.doDisconnect({msg : allLogMsg});
        this.destroy();
    }
});
