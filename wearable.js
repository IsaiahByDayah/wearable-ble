var Feather = require('feather-ble');
var _ = require('underscore');

var CONSTANTS = require('./constants.js');

var Wearable = function(peripheral){

	/*
		VARIABLES
	*/
	// Reference to "this"
	var _self = this;

	// Noble Peripheral Object
	this._feather = new Feather({
		peripheral: peripheral,
		verbose: CONSTANTS.START_FEATHER_IN_VERBOSE_MODE,
		rssi: CONSTANTS.REQUEST_RSSI_UPDATES
		// rssi_update_rate: CONSTANTS.OVERRIDE_REQUEST_RSSI_UPDATE_RATE
	});

	// Wearable's UserID
	this._userID;

	// Flag for if wearable is ready for use
	this._ready = false;

	// Timestamp for when feather was ready
	this._start;

	// Timestamp for when feather was disconnected
	this._end;

	// Listener Event callbacks
	this._listeners = {
		// When wearable is connected and ready
		"ready": [],

		// When a user "likes"
		"like": [],

		// When a user dismisses
		"dismiss": [],

		// When rssi changes
		"rssi": [],

		// When a user disconnects
		"disconnect": []
	};


	/*
		METHODS
	*/
	// Adds Event Listener
	this.on = function(event, callback){
		_self._listeners[event].push(callback);
	};

	// Adds Event Listeners to feather. Tells Feather to setup. Grabs userID from feather.
	this.setup = function(){
		_self._feather.on("ready", onFeatherReady);

		_self._feather.on("disconnect", onFeatherDisconnected);

		_self._feather.on("message", onMessageRecieved);

		_self._feather.on("rssi", onRssiUpdate);

		_self._feather.setup();

		// Triggers callbacks of type 'e' passing along err
		function triggerSimpleCallbacks(e, err){
			_.each(_self._listeners[e], function(callback){
				callback(err);
			});
		}

		// Callback for when feather is ready
		//   Requests UserID from feather
		function onFeatherReady(err){
			if (err) {
				triggerSimpleCallbacks("ready", err);
				return;
			}

			_self._start = new Date();

			var requestUserIDMessage = JSON.stringify({
				msgType: "UserID",
				request: "GET"
			});

			_self._feather.sendMessage(requestUserIDMessage);
		}

		// Callback for when feather is disconnected
		//   Trigger disconnect callbacks
		function onFeatherDisconnected(){
			_self._end = new Date();
			triggerSimpleCallbacks("disconnect", null);
		}

		// Parse message and call appropriate callbacks
		function onMessageRecieved(msg){
			// console.log("Incoming Message: " + msg);

			if (isJsonString(msg)){
				msg = JSON.parse(msg);
				// console.log("Converted: ", msg);
			}
			else {
				// Message was not acceptable JSON
				// Unable to tell what im returning an error to at this point soooo.... doing nothing for now?
				return;
			}

			switch(msg.msgType){
				case "UserID":
					userIDRecieved(msg);
					break;
				case "Like":
					likeRecieved(msg);
					break;
				case "Dismiss":
					dismissedRecieved(msg);
					break;
				default:
					// Unknown message type
					break;
			}

			function userIDRecieved(message){
				_self._userID = message.userID;

				if (_self._userID) {
					_self._ready = true;
					triggerSimpleCallbacks("ready", null);
				}
				else {
					// Trigger with error
					var err = new Error("Did not retrieve userID from wearable");
					triggerSimpleCallbacks("ready", err);
				}
			}

			function likeRecieved(message){
				triggerSimpleCallbacks("like", null);
			}

			function dismissedRecieved(message){
				triggerSimpleCallbacks("dismiss", null);
			}

			function isJsonString(str) {
				try {
					JSON.parse(str);
				} catch (e) {
					return false;
				}
				return true;
			}
		}

		// Callback for when RSSI updates
		//   Call RSSI updated callbacks
		//     Passes along callback function that takes signal strength to send to feather
		function onRssiUpdate(err, rssi){

			if (! _self._ready){
				// We're not ready, don't try to update RSSI / Signal Strength
				return;
			}

			if (err) {
				// Trigger RSSI callbacks with error
				_.each(_self._listeners.rssi, function(callback){
					callback(err);
				});
				return;
			}

			// Disconnect from feather if RSSI is too low
			if (rssi < CONSTANTS.MINIMUM_RSSI_TO_STAY_CONNECTED) {
				_self.disconnect();
				return;
			}

			// Trigger RSSI callbacks
			_.each(_self._listeners.rssi, function(callback){
				callback(err, rssi, function(strength){

					var signalStrengthMessage = JSON.stringify({
						msgType: "SignalStrength",
						signalStrengthValue: strength
					});

					_self._feather.sendMessage(signalStrengthMessage);
				});
			});
		}
	};

	// Disconnect from the feather
	this.disconnect = function(){
		_self._feather.disconnect();
	};

	// Returns if the noble peripheral is a wearable-acceptable peripheral
	this.isWearable = function(peripheral){
		return new Feather().isFeather(peripheral);
	};
};

module.exports = Wearable;