
'use strict';

var store = require('store');

/**
 * Persistance Service - Singleton
 */


exports.readItems = function readItems()
{
	return store.get('items') || [];
};


exports.saveItems = function saveItem(items)
{
	store.set('items', items);
};


