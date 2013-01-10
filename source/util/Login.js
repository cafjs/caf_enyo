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
              name: "ca.Login",
              classes: "onyx",
              kind : "Control",
              published : {
                  appPublisher: "",
                  appLocalName: "",
                  caOwner: "",
                  caLocalName: "",
                  token : "",
                  password :""
              },
              events : {
                  onLogin : ""
                  // propagates onPassword from PasswordPopup
              },
              components : [
                  {kind: "ca.Login.CredentialsPopup", name: "credentialsPopup",
                   onCredentials :"activate"},
                  {kind: "ca.Login.PasswordPopup", name: "passwordPopup",
                   onPassword:"setNewPassword"}
              ],
              create: function() {
		  this.inherited(arguments);
                  var caProps = enyo.cloudassistant.props || {};
                  caProps.caLocalName && this.setCaLocalName(caProps
                                                             .caLocalName);
                  caProps.caOwner && this.setCaOwner(caProps.caOwner);
                  caProps.token && this.setToken(caProps.token);
                  caProps.password && this.setPassword(caProps.password);
                  caProps.appPublisher && this.setAppPublisher(caProps
                                                               .appPublisher);
                  caProps.appLocalName && this.setAppLocalName(caProps
                                                               .appLocalName);
                  if (this.caOwner && this.caLocalName) {
                      // try to login but after allowing full initialization
                      enyo.asyncMethod(this, this.activate, null, {});
                  } else {
                      enyo.asyncMethod(this, this.askForCredentials,
                                       this.caOwner, this.caLocalName);
                  }
              },
              activate: function(inSource, inEvent) {
                  this.setCaOwner(inEvent.caOwner || this.caOwner);
                  this.setCaLocalName(inEvent.caLocalName || this.caLocalName);
                  var loginCtx = {caOwner : this.caOwner,
                                  caLocalName : this.caLocalName,
                                  password : this.password,
                                  token : this.token
                                 };
                  this.doLogin(loginCtx);
                  return true;
              },
              askForCredentials: function(caOwner, caLocalName) {
                  this.$.credentialsPopup.showPopup(caOwner,
                                                    caLocalName);
              },
              setNewPassword: function(inSource, inEvent) {
                  this.password = inEvent.password;
                  // do not return true, so it continues propagating to top
              },
              askForPassword : function() {
                  this.$.passwordPopup.showPopup();
              },
              resetToken : function(newToken) {
                  enyo.cloudassistant.props.token = newToken;
                  this.token = newToken;
              }
          });

enyo.kind({
              name:"ca.Login.PasswordPopup",
              kind: "onyx.Popup",
              events: {
                onPassword: ""
              },
              centered: true, modal: true, floating: true, scrim: true,
              scrimWhenModal: false, autoDismiss: false,
              style: "text-align: center;",
              components: [
                  {kind: "onyx.InputDecorator",
                   name: "passwordInputDecorator",
                   components: [
		       { kind: "onyx.Input", placeholder: "password",
                         type:"password", style: "width: 90%;",
                         name: "passwordInput"}
		   ]
                  },
                  {kind: "onyx.Button", style: "text-align: center;",
                   content: "Sign in",
                   ontap: "newPassword"}
              ],
              newPassword:  function(inSource, inEvent) {
                  var result = {};
                  result.password = this.$.passwordInput.getValue();
                  this.hidePopup();
                  this.doPassword(result);
                  this.$.passwordInput.setValue("");
              },
              showPopup: function() {
                  this.show();
              },
              hidePopup: function() {
                  this.hide();
              }
          });

enyo.kind({
              name:"ca.Login.CredentialsPopup",
              kind: "onyx.Popup",
              events: {
                onCredentials: ""
              },
              centered: true,
              modal: true,
              floating: true, scrim: true,
              scrimWhenModal: false, autoDismiss: false,
              style: "text-align: center;",
              components: [
                  {kind: "onyx.InputDecorator",
                   name: "caOwnerInputDecorator",
                   components: [
		       { kind: "onyx.Input", placeholder: "username",
                          style: "width: 90%;",
                         name: "caOwnerInput"}
		   ]
                  },
                  {kind: "onyx.InputDecorator",
                   name: "caLocalNameInputDecorator",
                   components: [
		       { kind: "onyx.Input", placeholder: "CA local name",
                          style: "width: 90%;",
                         name: "caLocalNameInput"}
		   ]
                  },
                  {kind: "onyx.Button", style: "text-align: center;",
                   content: "Login/Sign up",
                   ontap: "newCredentials"}
              ],
              newCredentials:  function(inSource, inEvent) {
                  var result = {};
                  result.caOwner = this.$.caOwnerInput.getValue();
                  result.caLocalName = this.$.caLocalNameInput.getValue();
                  if (result.caOwner && result.caLocalName) {
                      this.hidePopup();
                      this.doCredentials(result);
                  }
                  return true;
              },
              showPopup: function(caOwner, caLocalName) {
                  caOwner && this.$.caOwnerInput.setValue(caOwner);
                  caLocalName && this.$.caLocalNameInput.setValue(caLocalName);
                  this.show();
              },
              hidePopup: function() {
                  this.hide();
              }
          });



