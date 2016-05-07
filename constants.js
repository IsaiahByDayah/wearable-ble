module.exports = {

	/*
		WEARABLE
	*/

	// Flag for if feathers should be started in verbose mode
	START_FEATHER_IN_VERBOSE_MODE: false,

	// Flag for if feathers should request rssi updates
	REQUEST_RSSI_UPDATES: true,

	// Override rate at which RSSI should be updated
	OVERRIDE_REQUEST_RSSI_UPDATE_RATE: 2500,

	// How long to allow a feather to get setup before canceling
	READY_TIMEOUT_DURATION: 15
};