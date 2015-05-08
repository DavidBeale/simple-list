
'use strict';

var ItemList = require('../../components/item-list');
var ItemInput = require('../../components/item-input');
var template = require('./template.html');
var MainPM = require('../../models/MainPM');

/**
 * View to Manage Items
 */
var Main = Object.create(HTMLElement.prototype);

Main.createdCallback = function() {
	this._pm = new MainPM();
	this._pm.on('itemsChange', onItemsChange.bind(this));
};


Main.attachedCallback = function() {
	this.innerHTML = template(this);

	this._itemList = document.querySelector('item-list');
	this._itemList.addEventListener('removeItem', onRemoveItem.bind(this));
	onItemsChange.call(this, this._pm.items);

	this._itemInput = document.querySelector('item-input');
	this._itemInput.addEventListener('addItem', onAddItem.bind(this));
};


module.exports = document.registerElement('app-main', {
	prototype: Main
});



function onItemsChange(items)
{
	console.log('Items Changed');
	this._itemList.items = items;
}

function onAddItem(event)
{
	this._pm.addItem(event.detail);
}

function onRemoveItem(event)
{
	this._pm.removeItem(event.detail);
}