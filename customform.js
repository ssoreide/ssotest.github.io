/*
Copyright (c) 2015 Vizrt

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

(MIT License)

The customform.js serves as a reference implementation of how a custom HTML
forms communicate with VDF payload editor hosts. This code can either be
used as-is or be adapted to fulfill specific needs.
*/

/* exported bindFields */
/**
 * Provides a function for binding a custom HTML form to a VDF payload provided
 * by a payload editor host.  
 * 
 * @module customform
 */
var bindFields = (function(window) {
	"use strict";
	var exports = {};
	var vizNs = "http://www.vizrt.com/types";

	function log(message) {
		window.console.log(message);
	}

	function getQueryParameter(name) {
		var query = window.location.search.substring(1);
		var params = query.split("&");
		var i;
		for (i = 0; i < params.length; ++i) {
			var kv = params[i].split("=");
			if (window.decodeURIComponent(kv[0]) == name) {
				return window.decodeURIComponent(kv[1]);
			}
		}
		return null;
	} 
	
	/**
	 * Get the host origin specified by the "payload_host_origin" query
	 * parameter.
	 */
	function getHostOrigin() {
		return getQueryParameter("payload_host_origin");
	}

	/**
	 * Get the guest identifier specified by the "guestid" query
	 * parameter.
	 */
	function getGuestIdentifier() {
		return getQueryParameter("guestid");
	}

	/**
	 * Create an iterator returning a single value.
	 */
	function singleItr(value) {
		var done = false;
		return {
			next: function() {
				if (done) {
					return {done: true};
				}

				done = true;
				return {value: value, done: false};
			}
		};
	}

	/**
	 * Create an iterator returning all the elements of a given set of parents
	 * that matches a given name.
	 */
	function elementsItr(parentsItr, nsUri, name) {
		var children = null;
		var i = 0;
		return {
			next: function() {
				while (true) {
					if (children === null || children.length == i) {
						var parent = parentsItr.next();
						if (parent.done) {
							return {done: true};
						}

						children = parent.value.childNodes;
						continue;
					}

					var node = children.item(i++);
					if (node.nodeType != window.Node.ELEMENT_NODE) {
						continue;
					}

					if (nsUri !== null && nsUri != node.namespaceURI) {
						continue;
					}

					if (name != node.tagName) {
						continue;
					}

					return {done: false, value: node};
				}
			}
		};
	}

	/**
	 * Get a value string from the given field.
	 */
	function getFieldValue(field) {
		var valueEl = first(elementsItr(singleItr(field), vizNs, "value"), null);
		return valueEl === null ? "" : text(valueEl);
	}

	/**
	 * Get a value string from the given field.
	 */
	function getFieldKeyValueList(field) {
		var listEl = first(elementsItr(singleItr(field), vizNs, "list"), null);
		return listEl === null ? [] : keyValueList(listEl);
	
	}

	/**
	 * Get a JSON object representing a subset of fields from parent field
	 */
	function getSubsetFields(field) {
		return field === null ? [] : subsetMap(field);
	}
	
	/**
	 * Return the text contained in the text node children of a parent
	 * element.
	 */
	function text(parent) {
		var result = "";
		var children = parent.childNodes;
		var i;
		for (i = 0; i < children.length; ++i) {
			var node = children.item(i);
			if (node.nodeType != window.Node.TEXT_NODE) {
				continue;
			}
			
			result += node.nodeValue;
		}

		return result;
	}

	/**
	 * Return the keyValue list based on node children of a payload list
	 * element.
	 */
	function keyValueList(parent) {
		var result = [];
		var iterator = elementsItr(singleItr(parent), vizNs, "payload");
		var next = iterator.next();
		while(!next.done){
			var item  = next.value;
			var kvp = {};
			var innerFieldsIterator = elementsItr(singleItr(item), vizNs, "field");
			var nextField = innerFieldsIterator.next();
			while(!nextField.done){
				var field = nextField.value;
				kvp[field.getAttribute("name")] = getFieldValue(field);
				nextField = innerFieldsIterator.next();
			}
			result.push(kvp);
			next = iterator.next();
		}
		return result;
	}


	/**
	 * Return the subset element list as JSON key value object contained in parent element node
	 * Subset field element name will be key, and the elements child value element will be value 
	 * for each subset element in the result.
	 */
	function subsetMap(parent) {
		var result = [];
		var iterator = elementsItr(singleItr(parent), vizNs, "field");
		var next = iterator.next();
		var kvp = {};
		while(!next.done){
			var field  = next.value;
			kvp[field.getAttribute("name")] = getFieldValue(field);
			next = iterator.next();
		}
		return kvp;
	}

	/**
	 * Return the first value from an iterator, or a default value if the
	 * iterator has no values.
	 */
	function first(itr, defValue) {
		var n = itr.next();
		if (n.done) {
			return defValue;
		}
		
		return n.value;
	}
	
	/**
	 * Maps VDF payload fields to HTML form.
	 * 
	 * @class
	 */
	exports.FieldMapping = function FieldMapping(doc, config) {
		var listeners = [];
		var hostOrigin = getHostOrigin();
		var fieldEls = {};
		var htmlDoc = doc;
		var setters = (config && config.setters) ? config.setters : {};
		var keyValueListSetters = (config && config.keyValueListSetters) ? config.keyValueListSetters : {};
		var subsetSetters = (config && config.subsetSetters) ? config.subsetSetters : {};

		/**
		 * Add a listener to an element, and record it in a pool of listeners
		 * that can easily be removed.
		 * 
		 * @ignore
		 */
		function addListener(el, type, func) {
			el.addEventListener(type, func, false);
			listeners.push([el, type, func]);
		}
		
		/**
		 * Remove all previously added listeners that were recorded.
		 * 
		 * @ignore
		 */
		function removePreviousListeners() {
			var i;
			for (i = 0; i < listeners.length; ++i) {
				var reg = listeners[i];
				var el = reg[0];
				var type = reg[1];
				var func = reg[2];
				el.removeEventListener(func, type);
			}

			listeners = [];
		}

		/**
		 * Replace field value with value from HTML form element, and send
		 * updated VDF payload to host.
		 * 
		 * @ignore
		 */
		function replaceValue(el, newValue) {
			var payloadDoc = el.ownerDocument;
			
			var valueEl = payloadDoc.createElementNS(vizNs, "value");	
			var textNode = payloadDoc.createTextNode(newValue);
			
			valueEl.appendChild(textNode);

			var oldValueEl = first(elementsItr(singleItr(el), vizNs, "value"), null);
			if (oldValueEl === null) {
				el.appendChild(valueEl);
			} else {
				el.replaceChild(valueEl, oldValueEl);
			}

			var serializer = new window.XMLSerializer();
			var newXml = serializer.serializeToString(payloadDoc);

			window.parent.postMessage({type: "payload_changed", guestid: getGuestIdentifier(), xml: newXml}, hostOrigin);
		}

		/**
		 * Replace field value with value from HTML form element, and send
		 * updated VDF payload to host.
		 * 
		 * @ignore
		 */
		function replaceKeyValueList(el, newKeyValueList) {
			var payloadDoc = el.ownerDocument;

			var listNode = payloadDoc.createElementNS(vizNs,  "list");

			for(var i=0;i<newKeyValueList.length;i++){
				var payLoadNode = payloadDoc.createElementNS(vizNs,  "payload");
				var arrayItem = newKeyValueList[i];
				for(var key in arrayItem){
					var value=arrayItem[key];
					var fieldNode = payloadDoc.createElementNS(vizNs, "field");
					var valueEl = payloadDoc.createElementNS(vizNs, "value");
					var textNode = payloadDoc.createTextNode(value);
					valueEl.appendChild(textNode);
					fieldNode.appendChild(valueEl);
					fieldNode.setAttribute('name', key);
					payLoadNode.appendChild(fieldNode);
				}
				listNode.appendChild(payLoadNode);
			}

			var oldListEl = first(elementsItr(singleItr(el), vizNs, "list"), null);
			if (oldListEl === null) {
				el.appendChild(listNode);
			} else {
				el.replaceChild(listNode, oldListEl);
			}

			var serializer = new window.XMLSerializer();
			var newXml = serializer.serializeToString(payloadDoc);

			window.parent.postMessage({type: "payload_changed", guestid: getGuestIdentifier(), xml: newXml}, hostOrigin);
		}

		/**
		 *  Replace all fields in a field subset. It is important to note that failing to provide all present elements will 
		 *  in effect remove any missing elements (like javascripts array implementation), it is therefore most stable to 
		 *  always make sure your replacement JSON object contains all elements currently in the subset. 
		 *  
		 *  The key value pairs of the second argument {name: value ... n} is used as field name (name), and value tag 
		 *  data (value) in the created subset elements.
		 *  
		 * @param  {[type]}
		 * @param  {[type]}
		 * @return {[type]}
		 */
		function replaceSubsetFields(el, subsetObjectList) {
			var payloadDoc = el.ownerDocument;
			var fieldArr = []; 
			var oldItemsIterator = elementsItr(singleItr(el), vizNs, 'field');
			var next = oldItemsIterator.next();
			while (el.firstChild) {
			    el.removeChild(el.firstChild);
			}
			for(var key in subsetObjectList){
				var value=subsetObjectList[key];
				var fieldNode = payloadDoc.createElementNS(vizNs, "field");
				var valueEl = payloadDoc.createElementNS(vizNs, "value");
				var textNode = payloadDoc.createTextNode(value);
				valueEl.appendChild(textNode);
				fieldNode.setAttribute('name', key);
				fieldNode.appendChild(valueEl);
				el.appendChild(fieldNode);
			}

			var serializer = new window.XMLSerializer();
			var newXml = serializer.serializeToString(payloadDoc);

			window.parent.postMessage({type: "payload_changed", guestid: getGuestIdentifier(), xml: newXml}, hostOrigin);
		}

		/**
		 * Create a listener function that listens for changes to a specific
		 * value in the HTML form.
		 * 
		 * @ignore
		 */
		function createInputListener(fieldEl, inputEl) {
			return function(/*event*/) {
				replaceValue(fieldEl, inputEl.value);
			};
		}

		/**
		 * Apply the values from the VDF payload to the HTML form and set up
		 * listening for changes in the HTML form.
		 * 
		 * @ignore
		 */
		function onSetPayload(payloadXml) {
			var parser = new window.DOMParser();
			var payloadDoc = parser.parseFromString(payloadXml, "text/xml");

			removePreviousListeners();
			fieldEls = {};

			var els = elementsItr(elementsItr(singleItr(payloadDoc), vizNs, "payload"), vizNs, "field");
			while (true) {
				var nextField = els.next();
				if (nextField.done) {
					break;
				}
				
				var field = nextField.value;
				var id = "field_" + field.getAttribute("name");
				fieldEls[id] = field;
				// console.log("assigned to "+id); // Disabled this for NAB per request
				
				var setter = setters[id];
				if (setter) {
					setter(getFieldValue(field));
					continue;
				}

				var keyValueListSetter = keyValueListSetters[id];
				if (keyValueListSetter) {
					keyValueListSetter(getFieldKeyValueList(field));
					continue;
				}
				
				var subsetSetter = subsetSetters[id];
				if (subsetSetter) {
					subsetSetter(getSubsetFields(field));
					continue;
				}

				var el = htmlDoc.getElementById(id);
				if (el && typeof el.value !== "undefined") {
					el.value = getFieldValue(field);
					var listener = createInputListener(field, el);
					addListener(el, "input", listener);
				}
			}
		}

		/**
		 * Identify and dispatch messages from the payload editor host.
		 * 
		 * @param {MessageEvent} message - Message event sent by payload editor host.
		 */
		this.onMessageFromHost = function(message) {
			var data = message.data;
			if (!data.type) {
				log("Got unknown message format from host.");
				log(message);
			}

			var messageType = data.type;
			if (messageType == "set_payload") {
				onSetPayload(data.xml);
			} else {
				log("Got unknown message type from host: " + messageType);
			}
		};

		/**
		 * Set an updated text value on a field and notify payload editor host.
		 * 
		 * @param {string} fieldID - Field identifier mapped from field name.
		 * @param {string} newValue - New field value to assign to the payload field.
		 */
		this.setTextValue = function (fieldId, newValue) {
			var field = fieldEls[fieldId];
			if(field){
				replaceValue(field, newValue);
			}
		};

		/**
		 * Set an updated list of values and notify payload editor host.
		 *
		 * @param {string} fieldID - Field identifier mapped from field name.
		 * @param {string} newValue - New list of values to assign to the payload list.
		 */
		this.setKeyValueList = function(fieldId, newKeyValueList) {
			var field = fieldEls[fieldId];
			if(field){
				replaceKeyValueList(field, newKeyValueList);
			}
		};


		/**
		 * Set a new list of sub elements to a field element
		 *
		 * @param {string} fieldID - Parent field identifier (field name)
		 * @param {string} newSubsetFields - New list of sub elements to attatch to parent
		 */
		this.setSubsetFields = function(fieldId, newSubsetFields) {
			var field = fieldEls[fieldId];
			if(field){
				replaceSubsetFields(field, newSubsetFields);
			}
		};


	};

	
	
	/** 
	 * @summary Apply content from VDF payload to HTML elements with matching
	 * IDs, an arrange for user changes in content to be reported back.
	 * 
	 * @description <p>Call this function on load to start listening for
	 * "set_payload" window messages. When a "set_payload" message is received,
	 * the accompanying payload XML document is parsed, and each field in the
	 * payload is enumerated. The name of each field converted to a field
	 * identifier by prefixing it with "field_".</p>
	 * 
	 * <p>If the provided config.setters map contains a function with that,
	 * identifier then that function is called with the content value of the
	 * field as a parameter.</p>
	 * 
	 * <p>Otherwise, if an HTML element with an HTML element ID matching the
	 * identifier exists and it has a "value" property, the content value of
	 * the field is applied assigned to the "value" property. Furthermore an
	 * "input" event listener is added to the element which when invoked will
	 * update the payload XML document with the content from the "value"
	 * property of the HTML element, and send a window "finish_edit" message to
	 * the payload editor host window.</p>
	 *  
	 * <p>This mechanism works for elements such as the HTML input element which
	 * both has a "value" property and emits "input" events when the user
	 * changes its content.</p>
	 * 
	 * <p>When you provide a setter function for a given field identifier in
	 * the config.setters map, you should also keep the returned FieldMapping
	 * instance and call its setTextValue() function whenever the user updates
	 * the value of the field in the custom HTML form.</p>
	 * 
	 * @param {Object} [config] - Optional mapping configuration.
	 * @param {Object<string,function(string,string)>} config.setters - A map of field identifier to setter functions.
	 * 
	 * @returns {FieldMapping} An mapping to the HTML form that can transmit
	 *     updates to the payload editor host. 
	 */
	exports.bindFields = function (config) {
		var mapping = new exports.FieldMapping(window.document, config);
		window.addEventListener("message", function(message) { mapping.onMessageFromHost(message); }, false);
		var hostOrigin = getHostOrigin();
		window.parent.postMessage({type: "payload_guest_loaded", guestid: getGuestIdentifier()}, hostOrigin);
		return mapping;
	};

	return exports.bindFields;
})(window);

