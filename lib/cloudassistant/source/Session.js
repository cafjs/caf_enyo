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
              name: 'ca.Session',
              kind: enyo.Component,

              maxRetries: 100,
              retryTimeout: 1000, // msec

              // internal
              reqQueue : [],
              retries : 0,

              handlers: {
                  onDisconnect: "channelDisconnected",
                  onNotified: "msgNotified"
              },
              events: {
                  onOnline: "",
                  onOffline:"",
                  onBadCredentials: "",
                  onGoodCredentials: "",
                  onNotification: ""  // only when using default callbackObject
              },
              published: {
                  postUrl : "",
                  loginUrl : "",
                  // inParams
                  token :  enyo.cloudassistant.jsonRpc.DUMMY_TOKEN,
                  caOwner : undefined,
                  password : 'changeme',
                  sessionId: 'default',
                  disableBackChannel: false,
                  appHost: enyo.cloudassistant.props.appHost,
                  appProtocol: enyo.cloudassistant.props.appProtocol,
                  caName:'me_myca1',
                  myId: undefined,
                  callbackObject: undefined,
                  callbackMethod: 'dispatcher'
              },
              components: [
                  //{name: "backChannel", kind: "ca.BackChannel"} only if needed
                  {name: "requestChannel", kind: "ca.RequestChannel"},
                  {name: "loginChannel", kind: "ca.LoginChannel"}

              ],

              constructor: function(inParams) {
	          enyo.mixin(this, inParams);
	          this.inherited(arguments);
              },
              create: function() {
                  this.postUrl = this.getAppProtocol() + "//" +
                      this.getAppHost() + '/ca/'+ this.getCaName();
                  this.loginUrl = this.getAppProtocol() + "//" +
                      this.getAppHost() + '/login/'+ this.getCaName();
                  this.caOwner = (this.caOwner ? this.caOwner :
                                   this.caName.split('_')[0]);
                  this.myId = (this.myId ? this.myId : this.caOwner + '_'
                               +  enyo.cloudassistant.jsonRpc.FROM_ID);
                  this.callbackObject = this.callbackObject ||
                      this.defaultCallbackObject();
                  this.inherited(arguments);
                  this.doOnline({msg: this.postUrl});
                  this.recoverChannels(); // start backChannel if needed
              },
              login: function(lastToken) {
                  var self = this;
                  var okAuth = function(newToken) {
                      self.token = newToken;
                      self.doGoodCredentials({token: newToken});
                      self.doOnline({msg: this.loginUrl});
                      self.log("Authentication OK");
                  };
                  // err is {msg:<string>, data: {accountsURL: <string>}}
                  var errAuth = function(err) {
                      self.doBadCredentials({msg: err.msg, data : err.data});
                      self.doOffline({msg: this.loginUrl});
                      self.log(JSON.stringify(err));
                  };
                  if (lastToken === this.token) {
                      var req = {
                          token: this.getToken(),
                          to : this.getCaName(),
                          from : this.getMyId(),
                          sessionId : this.getSessionId(),
                          methodName : 'authenticate',
                          argsList: [this.caOwner, this.password],
                          cbOK : okAuth,
                          cbError: errAuth
                      };
                      try {
                          this.$.loginChannel.invokeAsync(req, req.cbOK,
                                                          req.cbError);
                      } catch (x) {
                          this.doOffline({msg: this.loginUrl});
                          this.warn(x);
                          this.log(x.stack);
                      }
                  }
              },
              msgNotified: function(inSender, inMsg) {
                  if (this.getCallbackObject()) {
                      try {
                          enyo.cloudassistant
                              .jsonRpc.call(this.getCallbackObject(),inMsg.msg);
                      } catch (x) {
                          this.warn(x);
                          this.log(x.stack);
                      }
                  } else {
                      this.log(inSender.name, "got msg: " + inMsg.msg);
                  }
                  return true;
              },
              remoteInvoke : function(methodName, argsList, cbOK, cbError) {
                  var request = {
                      token: this.getToken(),
                      to : this.getCaName(),
                      from : this.getMyId(),
                      sessionId : this.getSessionId(),
                      methodName : methodName,
                      argsList: argsList,
                      cbOK : cbOK,
                      cbError: cbError
                  };
                  this.reqQueue.push(request);
                  this.flushReqQueue();
              },
              isOffline: function() {
                  return  (!(this.$.requestChannel) ||
                           (!(this.$.backChannel) && !(this.disableBackChannel))
                           || !(this.$.loginChannel));
              },
              flushReqQueue: function() {
                  var req = this.reqQueue.shift();
                  if (!req) {
                      return true;
                  }
                  if (this.$.requestChannel) {
                      try {
                          this.$.requestChannel.invokeAsync(req, req.cbOK,
                                                            req.cbError);
                          return this.flushReqQueue();
                      } catch (x) {
                          this.doOffline({msg: this.postUrl});
                          this.reqQueue.unshift(req);
                          this.warn(x);
                          this.log(x.stack);
                          return false;
                      }
                  } else {
                      this.reqQueue.unshift(req);
                      return false;
                  }
              },
              channelDisconnected :  function(inSender, inEvent) {
                  this.doOffline({msg: this.postUrl});
                  this.removeComponent(inSender);
                  if (this.retries < this.maxRetries) {
                      this.retries = this.retries + 1;
                      var fn = enyo.bind(this, "recoverChannels");
                      enyo.log("Retrying connection " + this.retries);
                      setTimeout(fn, this.retryTimeout);
                  } else {
                      this.die(inSender, inEvent, "Too many attempts");
                  };
                  return true;
              },
              recoverChannels : function() {
                  if (!(this.$.requestChannel)) {
                      this.createComponent({name: "requestChannel",
                                            kind: "ca.RequestChannel"});
                      if (this.flushReqQueue()) {
                          this.doOnline({msg: this.postUrl});
                      };
                  }
                  if (!(this.$.backChannel) && !(this.disableBackChannel)) {
                      this.createComponent({name: "backChannel",
                                            kind: "ca.BackChannel"});
                      this.doOnline({msg: this.postUrl});
                  }
                  if (!(this.$.loginChannel)) {
                      this.createComponent({name: "loginChannel",
                                            kind: "ca.LoginChannel"});
                      this.doOnline({msg: this.loginUrl});
                  }

              },
              die: function(inRequest, inError, logMsg) {
                  var allLogMsg = "Session: "+ logMsg +
                      " shuting down: Request:" +
                      enyo.json.stringify(inRequest.msg) + " Response:" +
                      enyo.json.stringify(inError);
                  enyo.error(allLogMsg);
                  this.destroy();
              },
              defaultCallbackObject: function() {
                  var self = this;
                  return {
                      dispatcher : function(varArgs) {
                          var args = Array.prototype.slice.call(arguments);
                          self.doNotification(args);
//                          console.log(" got new messages:" +
//                                      JSON.stringify(args));
                      }
                  };
              }


          });
