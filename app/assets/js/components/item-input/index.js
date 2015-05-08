
'use strict';

var template = require('./template.html');


/**
 * Allow input of an Item
 */
var ItemInput = Object.create(HTMLElement.prototype);



ItemInput.attachedCallback = function() {
	this.innerHTML = template(this);

	this._input = this.querySelector('input');
	this._input.addEventListener('input', onInput.bind(this));
	this._input.addEventListener('keypress', onKeyPress.bind(this));

	this._button = this.querySelector('button');
	this._button.addEventListener('click', onButtonClick.bind(this));
};




module.exports = document.registerElement('item-input', {
	prototype: ItemInput
});



function onButtonClick()
{
	var event = new CustomEvent('addItem',
	{
		detail: this._input.value,
		bubbles: true,
		cancelable: true
	});

	this.dispatchEvent(event);

	this._input.value = '';
}


function onInput()
{
	if (this._input.value)
	{
		this._button.removeAttribute('disabled');
	}
	else
	{
		this._button.setAttribute('disabled', '');
	}
}


function onKeyPress(event)
{
	if (event.keyCode == '13')
	{
		onButtonClick.call(this);
	}
}