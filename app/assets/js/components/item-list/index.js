
'use strict';

var ItemRenderer = require('../item-renderer');
var template = require('./template.html');
var util = require('util');


/**
 * Display a List of Items
 */
var ItemList = Object.create(HTMLElement.prototype);

Object.defineProperty(ItemList, 'items', {
	get: function() {
		return this._items;
	},
	set: function(value) {
		if (value !== this._items)
		{
			var observer = itemsObserver.bind(this);

			Array.unobserve(this._items, observer);

			removeItems.call(this, this._items);
			this._items = value;
			addItems.call(this, this._items);

			Array.observe(this._items, observer, ['splice']);
		}
	}
});


ItemList.createdCallback = function() {
	
	this._items = [];

};


ItemList.attachedCallback = function() {
	this.innerHTML = template(this);

	this._list = this.querySelector('ul');

	this._count = this.querySelector('span');
};



module.exports = document.registerElement('item-list', {
	prototype: ItemList
});


// TODO: Better to use D3.js
function addItems(items)
{
	items.forEach(function(item){
		var renderer = new ItemRenderer();
		renderer.setAttribute('__key', item);
		this._list.appendChild(renderer); 
		renderer.setAttribute('label', item);
	}.bind(this));

	updateCount.call(this);
}

function removeItems(items)
{
	items.forEach(function(item){
		var renderer = document.querySelector('item-renderer[__key="' + item + '"]');
		if (renderer)
		{
			this._list.removeChild(renderer);
		}
	}.bind(this));

	updateCount.call(this);
}


function updateCount()
{
	this._count.textContent = util.format('%s item%s in the list', this._items.length, this._items.length !== 1 ? 's' : '');
}


function itemsObserver(changes)
{
	changes.forEach(function(change){
		if (change.addedCount !== 0)
		{
			addItems.call(this, [change.object[change.index]]);
		}
		else
		{
			removeItems.call(this, [change.removed]);
		}
	}.bind(this));
}

