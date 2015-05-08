# small-list

HTML5 Application Demo - Without using a full stack framework

[View Demo](http://)

## Approach
The Implementation is based on browserify, to give the structure inherit in node.js applications and make the libraries of npm available.

The app is structured as a main view backed by a presentation model. The view uses custom components, which it wires together. 

The view and components are extensions to HTMLElement, registered a Custom Elements.

The presentation model extends Node's EventEmitter in order to allow the view to "bind" to it.


### Improvements
- Items are currently modelled as Strings. An item Object would be more flexible
- Use of D3.js to manage the Item Renderes would be more efficient
- Clean up presentation with some custom .less styles
- Components could be moved to their own packages, as per npm micro-modules
- UI Tests using WebDriver
- Take advantage of ES6 language features using a browserify transform
- Use a logger


### IE
The code has not been tested on IE, put should work on IE9+ with suitable polyfills for Custom Elements, Array Observe etc


## Installation

```shell
npm install
```

## Build

```shell
npm test
```

Open */dist/index.html* in your browser


## Development

```shell
gulp
```