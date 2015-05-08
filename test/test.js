'use strict';

/*jshint -W079 */
var expect = require('chai').expect;

// Setup Mock for Node
global.localStorage = require('localStorage');


var MainPM = require('../app/assets/js/models/MainPM');

describe('MainPM', function() {

	var pm;

	before(function(){

		pm = new MainPM();
		pm.init();
	});


	it('should start with no items', function() {

		expect(pm.items.length).to.equal(0);

	});	

	

	describe('addItem', function() {

		it('should add an item', function() {

			pm.addItem('Test');

			expect(pm.items.length).to.equal(1);
			expect(pm.items[0]).to.equal('Test');

		});	

		it('should add another item', function() {

			pm.addItem('Test2');

			expect(pm.items.length).to.equal(2);
			expect(pm.items[1]).to.equal('Test2');

		});

	});


	describe('removeItem', function() {

		it('should remove an item', function() {

			pm.removeItem('Test');

			expect(pm.items.length).to.equal(1);
			expect(pm.items[0]).to.equal('Test2');

		});	
	
	});
});



