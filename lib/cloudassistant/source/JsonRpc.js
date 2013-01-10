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

/*
 * Convenience functions to construct messages for remote requests or
 * process responses/notifications. We currently use a subset of JSON-RPC 2.0
 * message format.
 *
 */
(function () {
if (!(enyo.cloudassistant)) {
    enyo.cloudassistant = {};
}

var FROM_ID = "-2";
var DUMMY_TOKEN = "INVALID_2";

var ERROR_CODES = {
    parseError: -32700,
    invalidRequest: -32600,
    methodNotFound:  -32601,
    invalidParams:-32602,
    internalError :  -32603,
    //-32000 to -32099 for implementation-defined server-errors
    noSuchCA: -32000,
    shutdownCA:  -32001,
    checkpointFailure:  -32002,
    prepareFailure:  -32003,
    exceptionThrown:  -32004,
    commitFailure:  -32005,
    forceRedirect: -32006,
    notAuthorized: -32007
};


var randomId  = function() {
    var unique = Math.floor(Math.random() *10000000000000000);
    var result = '' + (new Date()).getTime() + unique;
    return result;
};

var notification = function(token, to, from, sessionId,
                            methodName, argsList) {
    var argsArray = (argsList && argsList.slice(0));
    argsArray = argsArray || [];
    var firstArg = {"token" : token, "sessionId" : sessionId, "to" : to,
                    "from" : from};
    argsArray.unshift(firstArg);
    return {
        'jsonrpc': "2.0",
        'method' : methodName,
        'params' : argsArray
    };
};

var isNotification = function(msg) {
    return  (msg && (msg.jsonrpc === "2.0") &&
             (msg.method) &&
             (msg.params && msg.params.length > 0) &&
             (!msg.id));
};

var request = function(token, to, from, sessionId, methodName, argsList) {
    var result = notification(token, to, from, sessionId, methodName, argsList);
    result.id = randomId();
    return result;
};


var isRequest  = function(msg) {
    return (msg && (msg.jsonrpc === "2.0") &&
            (msg.method) &&
            (msg.params && msg.params.length > 0) &&
            (msg.id));
};

var isSystemError = function(msg) {
    return (msg && (msg.jsonrpc === "2.0") &&
            (msg.error && msg.error.code) &&
            (msg.error.data) && (msg.error.data.length === 2) &&
            (msg.id));
};

var isRecoverable = function(msg) {
    var code = getSystemErrorCode(msg);
    // Non-deterministic errors or specific to a particular node
    return ((code === ERROR_CODES.noSuchCA) || (code === ERROR_CODES.shutdownCA) ||
            (code === ERROR_CODES.checkpointFailure) ||
            (code === ERROR_CODES.prepareFailure) ||
            (code === ERROR_CODES.commitFailure) ||
            (code === ERROR_CODES.internalError));

};

var isRedirect = function(msg) {
    return (isSystemError(msg) &&
            (getSystemErrorCode(msg) === ERROR_CODES.forceRedirect));
};

var isNotAuthorized = function(msg) {
    return (isSystemError(msg) &&
            (getSystemErrorCode(msg) === ERROR_CODES.notAuthorized));
};



var isAppReply = function(msg) {
    return (msg && (msg.jsonrpc === "2.0") &&
            (msg.result && (msg.result.length === 3)) &&
            (msg.id));
};


var getMeta = function(msg) {
    if  (isRequest(msg) || isNotification(msg)) {
        return msg.params[0];
    } else if (isAppReply(msg)) {
        return msg.result[0];
    } else if (isSystemError(msg)) {
        return msg.error.data[0];
    } else {
        return undefined;
    }
};

var setMeta = function(msg, meta) {
    if  (isRequest(msg) || isNotification(msg)) {
        msg.params[0] = meta;
    } else if (isAppReply(msg)) {
        msg.result[0] = meta;
    } else if (isSystemError(msg)) {
        msg.error.data[0] = meta;
    } else {
        enyo.error("Setting meta in a badly defined msg " +
                   msg.toString());
    }
};

var getSessionId  = function(msg) {
    var meta = getMeta(msg);
    return (meta ? meta.sessionId : undefined);
};

var getToken = function(msg) {
    var meta = getMeta(msg);
    return (meta ? meta.token : undefined);
};

var getTo =  function(msg) {
    var meta = getMeta(msg);
    return (meta ? meta.to : undefined);
};

var getFrom =  function(msg) {
    var meta = getMeta(msg);
    return (meta ? meta.from : undefined);
};

var getAppReplyError =  function(msg) {
    return (isAppReply(msg) ? msg.result[1] : undefined);
};

var getAppReplyData =  function(msg) {
    return (isAppReply(msg) ? msg.result[2] : undefined);
};

var getSystemErrorData =  function(msg) {
     return (isSystemError(msg) ? msg.error.data[1] : undefined);
};

var getSystemErrorCode =  function(msg) {
     return (isSystemError(msg) ? msg.error.code : undefined);
};

var getSystemErrorMsg =  function(msg) {
     return (isSystemError(msg) ? msg.error.message : undefined);
};

var call = function(target, msg) {
    if (!isNotification(msg)) {
        throw new Error("msg:" + msg + " not a notification");
    }
    if (typeof target[msg.method] !== 'function') {
        throw new Error("no method" + msg.method + " in target");
    }
    var args = msg.params.slice(0);
    args.shift(); // get rid of meta-data
    target[msg.method].apply(target, args);
};

var setToken = function(msg, token) {
    var meta = getMeta(msg) || {};
    meta.token = token;
    setMeta(msg, meta);
};


//* @protected
enyo.cloudassistant.jsonRpc = {
    'FROM_ID' : FROM_ID,
    'DUMMY_TOKEN' : DUMMY_TOKEN,
    'ERROR_CODES' : ERROR_CODES,
    'notification' : notification,
    'isNotification' : isNotification,
    'request' : request,
    'isRequest' : isRequest,
    'isNotAuthorized' : isNotAuthorized,
    'isSystemError' : isSystemError,
    'isRecoverable' : isRecoverable,
    'isRedirect': isRedirect,
    'isAppReply' : isAppReply,
    'getMeta' : getMeta,
    'getSessionId' : getSessionId,
    'getToken' :  getToken,
    'getTo' :  getTo,
    'getFrom' : getFrom,
    'getAppReplyError' : getAppReplyError,
    'getAppReplyData' : getAppReplyData,
    'getSystemErrorData' :getSystemErrorData,
    'getSystemErrorCode': getSystemErrorCode,
    'getSystemErrorMsg' :getSystemErrorMsg,
    'setMeta' : setMeta,
    'setToken' : setToken,
    'call': call
};

}());
