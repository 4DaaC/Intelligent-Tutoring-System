/*
 * This class provides access to the debugging console.
 * @constructor
 */
function DebugConsole() {
};

/*
 * Print a normal log message to the console
 * @param {Object|String} message Message or object to print to the console
 */
DebugConsole.prototype.log = function(message) {
	if (typeof message == 'object')
		message = Object.toJSON(message);   
		
	this.error(message);
};

/*
 * Print a warning message to the console
 * @param {Object|String} message Message or object to print to the console
 */
DebugConsole.prototype.warn = function(message) {
	if (typeof message == 'object')
		message = Object.toJSON(message);    
		
	this.error(message);
};

/**
 * Print an error message to the console
 * @param {Object|String} message Message or object to print to the console
 */
DebugConsole.prototype.error = function(message) {
	if (typeof message == 'object')
		message = Object.toJSON(message);
 
	console.log(JSON.stringify(message));
};

if (typeof window.debug == "undefined") window.debug = new DebugConsole();
