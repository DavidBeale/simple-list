
'use strict';

var template = require('./template.html');


/**
 * Render an Item
 */
var ItemRenderer = Object.create(HTMLElement.prototype);

ItemRenderer.attachedCallback = function() {
	this.innerHTML = template(this);

	this._label = this.querySelector('strong');
	this._label.textContent = this.getAttribute('label');

	this._button = this.querySelector('button');
	this._button.addEventListener('click', onClick.bind(this));
};


ItemRenderer.attributeChangedCallback = function(attrName, oldValue, newValue) {
	if (attrName === 'label')
	{
		this._label.textContent = this.getAttribute('label');
	}
};



module.exports = document.registerElement('item-renderer', {
	prototype: ItemRenderer
});



function onClick()
{
	var event = new CustomEvent('removeItem',
	{
		detail: this._label.textContent,
		bubbles: true,
		cancelable: true
	});

	this.dispatchEvent(event);
}