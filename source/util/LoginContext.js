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
              name: "ca.LoginContext",
              classes: "onyx",
              kind : "Control",
              published: {
                  connStatus: null,
                  session: null,
                  sessionId: undefined,
                  callbackObject: undefined
              },
              events: {
                  onSession: "",
                  onNotification: "",
                  onLogout: ""
              },
              components: [
                  {kind: "ca.Login", name : "login", onLogin : "activate",
                   onPassword : "setPassword"},
                  {kind: "onyx.Toolbar", name :"welcomeToolbar",
                   layoutKind:"FittableColumnsLayout",
                   components: [
                       {name :"dot", content: "\u25CF"},//solid circle character
                       {name: "welcome",
                        content: ""},
                       {fit:true},
                       {kind: "onyx.Button", name:"logoutButton",
                        content:"Log Out", ontap:"deactivate"}
                   ]}
              ],
              constructor: function(inParams) {
	          enyo.mixin(this, inParams);
	          this.inherited(arguments);
              },
              activate: function(inSource, inEvent) {
                  var caName =  inEvent.caOwner + '_' + inEvent.caLocalName;
                  this.createComponent({kind: "ca.Session", name : "mySession",
                                        onOnline:"connected",
                                        onOffline:"disconnected",
                                        onBadCredentials:"askForPassword",
                                        onGoodCredentials:"resetToken",
                                        password:  inEvent.password,
                                        token: inEvent.token,
                                        sessionId: this.getSessionId(),
                                        callbackObject: this.callbackObject,
                                        caName: caName});
                  this.setSession(this.$.mySession);
              },
              deactivate:function(inSource, inEvent) {
                  this.$.login && this.$.login.destroy();
                  this.$.mySession && this.$.mySession.destroy();
                  this.$.welcome.setContent("Logged off");
                  this.doLogout({});
                  return true;
              },
              connected: function(inSource, inEvent) {
                  this.connStatus = true;
                  this.$.dot.setStyle("color: green;");
                  var publisher = (this.$.login.getAppPublisher() === "root" ?
                                   "" : (this.$.login.getAppPublisher() + "_"));

                  this.$.welcome
                      .setContent(publisher + this.$.login.getAppLocalName() +
                                  "#" + this.$.login.getCaOwner() + "_" +
                                  this.$.login.getCaLocalName());
                  this.$.welcomeToolbar.render();
                  this.doSession({session : this.$.mySession,
                                  caOwner :this.$.login.getCaOwner(),
                                  caLocalName : this.$.login.getCaLocalName(),
                                  token : this.$.login.getToken()});
                  return true;
              },
              disconnected: function() {
                  this.connStatus = false;
                  this.$.dot.setStyle("color: red;");
                  return true;
               },
              askForPassword: function(inSource, inEvent) {
                  // inEvent is {msg:<string>, data: {accountsURL: <string>}}
                  if (inEvent.data && inEvent.data.accountsURL) {
                      // gone to Accounts service for login
                      window.location.replace(inEvent.data.accountsURL);
                  } else {
                      // local login only (mainly for debugging)
                      this.$.login.askForPassword();
                  }
                  return true;
              },
              setPassword: function(inSource, inEvent) {
                  this.$.mySession.setPassword(inEvent.password);
                  return true;
              },
              resetToken: function(inSource, inEvent) {
                  this.$.login.resetToken(inEvent.token);
                  return true;
              }
          });
