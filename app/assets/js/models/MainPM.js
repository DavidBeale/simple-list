
'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var MainPM = function()
{
	this._items = [];

	EventEmitter.call(this);
};

util.inherits(MainPM, EventEmitter);

module.exports = MainPM;


Object.defineProperty(MainPM.prototype, 'items', {
	get: function() {
		return this._items;
	},
	set: function(value) {
		if (value !== this._items)
		{
			this._items = value;
			this.emit('itemsChange', this._items);
		}
	}
});


MainPM.prototype.addItem = function addItem(item) {
	console.info('Adding: ', item);
	
	this._items.push(item);
	
	this.emit('itemsChange', this._items);
};

MainPM.prototype.removeItem = function addItem(item) {
	console.info('Removing: ', item);
	
	var index = this._items.indexOf(item);
	if (index > -1) 
	{
    	this._items.splice(index, 1);
	}
	
	this.emit('itemsChange', this._items);
};