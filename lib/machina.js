/*!
 *  * machina - A library for creating powerful and flexible finite state machines. Loosely inspired by Erlang/OTP's gen_fsm behavior.
 *  * Author: Jim Cowart (http://ifandelse.com)
 *  * Version: v2.0.0
 *  * Url: http://machina-js.org/
 *  * License(s): 
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("lodash"));
	else if(typeof define === 'function' && define.amd)
		define(["lodash"], factory);
	else if(typeof exports === 'object')
		exports["machina"] = factory(require("lodash"));
	else
		root["machina"] = factory(root["_"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__( 1 );
	var emitter = __webpack_require__( 2 );
	
	module.exports = _.merge( emitter.instance, {
		Fsm: __webpack_require__( 5 ),
		BehavioralFsm: __webpack_require__( 6 ),
		utils: __webpack_require__( 3 ),
		eventListeners: {
			newFsm: []
		}
	} );


/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var utils = __webpack_require__( 3 );
	var _ = __webpack_require__( 1 );
	
	function getInstance() {
		return {
			emit: function( eventName ) {
				var args = utils.getLeaklessArgs( arguments );
				if ( this.eventListeners[ "*" ] ) {
					_.each( this.eventListeners[ "*" ], function( callback ) {
						if ( !this.useSafeEmit ) {
							callback.apply( this, args );
						} else {
							try {
								callback.apply( this, args );
							} catch ( exception ) {
								/* istanbul ignore else  */
								if ( console && typeof console.log !== "undefined" ) {
									console.log( exception.stack );
								}
							}
						}
					}, this );
				}
				if ( this.eventListeners[ eventName ] ) {
					_.each( this.eventListeners[ eventName ], function( callback ) {
						if ( !this.useSafeEmit ) {
							callback.apply( this, args.slice( 1 ) );
						} else {
							try {
								callback.apply( this, args.slice( 1 ) );
							} catch ( exception ) {
								/* istanbul ignore else  */
								if ( console && typeof console.log !== "undefined" ) {
									console.log( exception.stack );
								}
							}
						}
					}, this );
				}
			},
	
			on: function( eventName, callback ) {
				var self = this;
				self.eventListeners = self.eventListeners || { "*": [] };
				if ( !self.eventListeners[ eventName ] ) {
					self.eventListeners[ eventName ] = [];
				}
				self.eventListeners[ eventName ].push( callback );
				return {
					eventName: eventName,
					callback: callback,
					off: function() {
						self.off( eventName, callback );
					}
				};
			},
	
			off: function( eventName, callback ) {
				this.eventListeners = this.eventListeners || { "*": [] };
				if ( !eventName ) {
					this.eventListeners = {};
				} else {
					if ( callback ) {
						this.eventListeners[ eventName ] = _.without( this.eventListeners[ eventName ], callback );
					} else {
						this.eventListeners[ eventName ] = [];
					}
				}
			}
		};
	}
	
	module.exports = {
		getInstance: getInstance,
		instance: getInstance()
	};


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var slice = [].slice;
	var events = __webpack_require__( 4 );
	var _ = __webpack_require__( 1 );
	
	var makeFsmNamespace = ( function() {
		var machinaCount = 0;
		return function() {
			return "fsm." + machinaCount++;
		};
	} )();
	
	function getDefaultBehavioralOptions() {
		return {
			initialState: "uninitialized",
			eventListeners: {
				"*": []
			},
			states: {},
			namespace: makeFsmNamespace(),
			useSafeEmit: false,
			hierarchy: {},
			pendingDelegations: {}
		};
	}
	
	function getDefaultClientMeta() {
		return {
			inputQueue: [],
			targetReplayState: "",
			state: undefined,
			priorState: undefined,
			priorAction: "",
			currentAction: "",
			currentActionArgs: undefined,
			inExitHandler: false
		};
	}
	
	function getLeaklessArgs( args, startIdx ) {
		var result = [];
		for ( var i = ( startIdx || 0 ); i < args.length; i++ ) {
			result[ i ] = args[ i ];
		}
		return result;
	}
	/*
		handle ->
			child = stateObj._child && stateObj._child.instance;
	
		transition ->
			newStateObj._child = getChildFsmInstance( newStateObj._child );
			child = newStateObj._child && newStateObj._child.instance;
	*/
	function getChildFsmInstance( config, client ) {
		if ( !config ) {
			return;
		}
		var childFsmDefinition = {};
		if ( typeof config === "object" ) {
			// is this a config object with a factory?
			if ( config.factory ) {
				childFsmDefinition = config;
				childFsmDefinition.instance = childFsmDefinition.factory( client );
			} else {
				// assuming this is a machina instance
				childFsmDefinition.factory = function( client ) {
					return config;
				};
			}
		} else if ( typeof config === "function" ) {
			childFsmDefinition.factory = config;
		}
		childFsmDefinition.instance = childFsmDefinition.factory( client );
		return childFsmDefinition;
	}
	
	function listenToChild( fsm, child ) {
		// Need to investigate potential for discarded event
		// listener memory leak in long-running, deeply-nested hierarchies.
		return child.on( "*", function( eventName, data ) {
			switch ( eventName ) {
				case events.NO_HANDLER:
					if ( !data.ticket && !data.delegated && data.namespace !== fsm.namespace ) {
						// Ok - we're dealing w/ a child handling input that should bubble up
						data.args[ 1 ].bubbling = true;
					}
					// we do NOT bubble _reset inputs up to the parent
					if ( data.inputType !== "_reset" ) {
						fsm.handle.apply( fsm, data.args );
					}
					break;
				case events.HANDLING :
					var ticket = data.ticket;
					if ( ticket && fsm.pendingDelegations[ ticket ] ) {
						delete fsm.pendingDelegations[ ticket ];
					}
					fsm.emit( eventName, data ); // possibly transform payload?
					break;
				default:
					fsm.emit( eventName, data ); // possibly transform payload?
					break;
			}
		} );
	}
	
	// _machKeys are members we want to track across the prototype chain of an extended FSM constructor
	// Since we want to eventually merge the aggregate of those values onto the instance so that FSMs
	// that share the same extended prototype won't share state *on* those prototypes.
	var _machKeys = [ "states", "initialState" ];
	var extend = function( protoProps, staticProps ) {
		var parent = this;
		var fsm; // placeholder for instance constructor
		var machObj = {}; // object used to hold initialState & states from prototype for instance-level merging
		var Ctor = function() {}; // placeholder ctor function used to insert level in prototype chain
	
		// The constructor function for the new subclass is either defined by you
		// (the "constructor" property in your `extend` definition), or defaulted
		// by us to simply call the parent's constructor.
		if ( protoProps && protoProps.hasOwnProperty( "constructor" ) ) {
			fsm = protoProps.constructor;
		} else {
			// The default machina constructor (when using inheritance) creates a
			// deep copy of the states/initialState values from the prototype and
			// extends them over the instance so that they'll be instance-level.
			// If an options arg (args[0]) is passed in, a states or intialState
			// value will be preferred over any data pulled up from the prototype.
			fsm = function() {
				var args = slice.call( arguments, 0 );
				args[ 0 ] = args[ 0 ] || {};
				var blendedState;
				var instanceStates = args[ 0 ].states || {};
				blendedState = _.merge( _.cloneDeep( machObj ), { states: instanceStates } );
				blendedState.initialState = args[ 0 ].initialState || this.initialState;
				_.extend( args[ 0 ], blendedState );
				parent.apply( this, args );
			};
		}
	
		// Inherit class (static) properties from parent.
		_.merge( fsm, parent );
	
		// Set the prototype chain to inherit from `parent`, without calling
		// `parent`'s constructor function.
		Ctor.prototype = parent.prototype;
		fsm.prototype = new Ctor();
	
		// Add prototype properties (instance properties) to the subclass,
		// if supplied.
		if ( protoProps ) {
			_.extend( fsm.prototype, protoProps );
			_.merge( machObj, _.transform( protoProps, function( accum, val, key ) {
				if ( _machKeys.indexOf( key ) !== -1 ) {
					accum[ key ] = val;
				}
			} ) );
		}
	
		// Add static properties to the constructor function, if supplied.
		if ( staticProps ) {
			_.merge( fsm, staticProps );
		}
	
		// Correctly set child's `prototype.constructor`.
		fsm.prototype.constructor = fsm;
	
		// Set a convenience property in case the parent's prototype is needed later.
		fsm.__super__ = parent.prototype;
		return fsm;
	};
	
	function createUUID() {
		var s = [];
		var hexDigits = "0123456789abcdef";
		for ( var i = 0; i < 36; i++ ) {
			s[ i ] = hexDigits.substr( Math.floor( Math.random() * 0x10 ), 1 );
		}
		s[ 14 ] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
		/* jshint ignore:start */
		s[ 19 ] = hexDigits.substr( ( s[ 19 ] & 0x3 ) | 0x8, 1 ); // bits 6-7 of the clock_seq_hi_and_reserved to 01
		/* jshint ignore:end */
		s[ 8 ] = s[ 13 ] = s[ 18 ] = s[ 23 ] = "-";
		return s.join( "" );
	}
	
	module.exports = {
		createUUID: createUUID,
		extend: extend,
		getDefaultBehavioralOptions: getDefaultBehavioralOptions,
		getDefaultOptions: getDefaultBehavioralOptions,
		getDefaultClientMeta: getDefaultClientMeta,
		getChildFsmInstance: getChildFsmInstance,
		getLeaklessArgs: getLeaklessArgs,
		listenToChild: listenToChild,
		makeFsmNamespace: makeFsmNamespace
	};


/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = {
		NEXT_TRANSITION: "transition",
		HANDLING: "handling",
		HANDLED: "handled",
		NO_HANDLER: "nohandler",
		TRANSITION: "transition",
		TRANSITIONED: "transitioned",
		INVALID_STATE: "invalidstate",
		DEFERRED: "deferred",
		NEW_FSM: "newfsm"
	};


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var BehavioralFsm = __webpack_require__( 6 );
	var utils = __webpack_require__( 3 );
	var _ = __webpack_require__( 1 );
	
	var Fsm = {
		constructor: function() {
			BehavioralFsm.apply( this, arguments );
			this.ensureClientMeta();
		},
		initClient: function initClient() {
			var initialState = this.initialState;
			if ( !initialState ) {
				throw new Error( "You must specify an initial state for this FSM" );
			}
			if ( !this.states[ initialState ] ) {
				throw new Error( "The initial state specified does not exist in the states object." );
			}
			this.transition( initialState );
		},
		ensureClientMeta: function ensureClientMeta() {
			if ( !this._stamped ) {
				this._stamped = true;
				_.defaults( this, _.cloneDeep( utils.getDefaultClientMeta() ) );
				this.initClient();
			}
			return this;
		},
	
		ensureClientArg: function( args ) {
			var _args = args;
			// we need to test the args and verify that if a client arg has
			// been passed, it must be this FSM instance (this isn't a behavioral FSM)
			if ( typeof _args[ 0 ] === "object" && !( "inputType" in _args[ 0 ] ) && _args[ 0 ] !== this ) {
				_args.splice( 0, 1, this );
			} else if ( typeof _args[ 0 ] !== "object" || ( typeof _args[ 0 ] === "object" && ( "inputType" in _args[ 0 ] ) ) ) {
				_args.unshift( this );
			}
			return _args;
		},
	
		getHandlerArgs: function( args, isCatchAll ) {
			// index 0 is the client, index 1 is inputType
			// if we're in a catch-all handler, input type needs to be included in the args
			// inputType might be an object, so we need to just get the inputType string if so
			var _args = args;
			var input = _args[ 1 ];
			if ( typeof inputType === "object" ) {
				_args.splice( 1, 1, input.inputType );
			}
			return isCatchAll ?
				_args.slice( 1 ) :
				_args.slice( 2 );
		},
	
		getSystemHandlerArgs: function( args, client ) {
			return args;
		},
	
		// "classic" machina FSM do not emit the client property on events (which would be the FSM itself)
		buildEventPayload: function() {
			var args = this.ensureClientArg( utils.getLeaklessArgs( arguments ) );
			var data = args[ 1 ];
			if ( _.isPlainObject( data ) ) {
				return _.extend( data, { namespace: this.namespace } );
			} else {
				return { data: data || null, namespace: this.namespace };
			}
		}
	};
	
	_.each( [
		"handle",
		"transition",
		"deferUntilTransition",
		"processQueue",
		"clearQueue"
	], function( methodWithClientInjected ) {
		Fsm[ methodWithClientInjected ] = function() {
			var args = this.ensureClientArg( utils.getLeaklessArgs( arguments ) );
			return BehavioralFsm.prototype[ methodWithClientInjected ].apply( this, args );
		};
	} );
	
	Fsm = BehavioralFsm.extend( Fsm );
	
	module.exports = Fsm;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__( 1 );
	var utils = __webpack_require__( 3 );
	var emitter = __webpack_require__( 2 );
	var topLevelEmitter = emitter.instance;
	var events = __webpack_require__( 4 );
	
	var MACHINA_PROP = "__machina__";
	
	function BehavioralFsm( options ) {
		_.extend( this, options );
		_.defaults( this, utils.getDefaultBehavioralOptions() );
		this.initialize.apply( this, arguments );
		topLevelEmitter.emit( events.NEW_FSM, this );
	}
	
	_.extend( BehavioralFsm.prototype, {
		initialize: function() {},
	
		initClient: function initClient( client ) {
			var initialState = this.initialState;
			if ( !initialState ) {
				throw new Error( "You must specify an initial state for this FSM" );
			}
			if ( !this.states[ initialState ] ) {
				throw new Error( "The initial state specified does not exist in the states object." );
			}
			this.transition( client, initialState );
		},
	
		configForState: function configForState( newState, client ) {
			var newStateObj = this.states[ newState ];
			var child;
			_.each( this.hierarchy, function( childListener, key ) {
				if ( childListener && typeof childListener.off === "function" ) {
					childListener.off();
				}
			} );
	
			if ( newStateObj._child ) {
				newStateObj._child = utils.getChildFsmInstance( newStateObj._child, client );
				child = newStateObj._child && newStateObj._child.instance;
				this.hierarchy[ child.namespace ] = utils.listenToChild( this, child );
			}
	
			return child;
		},
	
		ensureClientMeta: function ensureClientMeta( client ) {
			if ( typeof client !== "object" ) {
				throw new Error( "An FSM client must be an object." );
			}
			client[ MACHINA_PROP ] = client[ MACHINA_PROP ] || {};
			if ( !client[ MACHINA_PROP ][ this.namespace ] ) {
				client[ MACHINA_PROP ][ this.namespace ] = _.cloneDeep( utils.getDefaultClientMeta() );
				this.initClient( client );
			}
			return client[ MACHINA_PROP ][ this.namespace ];
		},
	
		buildEventPayload: function( client, data ) {
			if ( _.isPlainObject( data ) ) {
				return _.extend( data, { client: client, namespace: this.namespace } );
			} else {
				return { client: client, data: data || null, namespace: this.namespace };
			}
		},
	
		getHandlerArgs: function( args, isCatchAll ) {
			// index 0 is the client, index 1 is inputType
			// if we're in a catch-all handler, input type needs to be included in the args
			// inputType might be an object, so we need to just get the inputType string if so
			var _args = args.slice( 0 );
			var input = _args[ 1 ];
			if ( typeof input === "object" ) {
				_args.splice( 1, 1, input.inputType );
			}
			return isCatchAll ?
				_args :
				[ _args[ 0 ] ].concat( _args.slice( 2 ) );
		},
	
		getSystemHandlerArgs: function( args, client ) {
			return [ client ].concat( args );
		},
	
		handle: function( client, input ) {
			var inputDef = input;
			if ( typeof input === "undefined" ) {
				throw new Error( "The input argument passed to the FSM's handle method is undefined. Did you forget to pass the input name?" );
			}
			if ( typeof input === "string" ) {
				inputDef = { inputType: input, delegated: false, ticket: undefined };
			}
			var clientMeta = this.ensureClientMeta( client );
			var args = utils.getLeaklessArgs( arguments );
			if ( typeof input !== "object" ) {
				args.splice( 1, 1, inputDef );
			}
			clientMeta.currentActionArgs = args.slice( 1 );
			var currentState = clientMeta.state;
			var stateObj = this.states[ currentState ];
			var handlerName;
			var handler;
			var isCatchAll = false;
			var child;
			var result;
			var action;
			if ( !clientMeta.inExitHandler ) {
				child = this.configForState( currentState, client );
				if ( child && !this.pendingDelegations[ inputDef.ticket ] && !inputDef.bubbling ) {
					inputDef.ticket = ( inputDef.ticket || utils.createUUID() );
					inputDef.delegated = true;
					this.pendingDelegations[ inputDef.ticket ] = { delegatedTo: child.namespace };
					// WARNING - returning a value from `handle` on child FSMs is not really supported.
					// If you need to return values from child FSM input handlers, use events instead.
					result = child.handle.apply( child, args );
				} else {
					if ( inputDef.ticket && this.pendingDelegations[ inputDef.ticket ] ) {
						delete this.pendingDelegations[ inputDef.ticket ];
					}
					handlerName = stateObj[ inputDef.inputType ] ? inputDef.inputType : "*";
					isCatchAll = ( handlerName === "*" );
					handler = ( stateObj[ handlerName ] || this[ handlerName ] ) || this[ "*" ];
					action = clientMeta.state + "." + handlerName;
					clientMeta.currentAction = action;
					var eventPayload = this.buildEventPayload(
						client,
						{ inputType: inputDef.inputType, delegated: inputDef.delegated, ticket: inputDef.ticket }
					);
					if ( !handler ) {
						this.emit( events.NO_HANDLER, _.extend( { args: args }, eventPayload ) );
					} else {
						this.emit( events.HANDLING, eventPayload );
						if ( typeof handler === "function" ) {
							result = handler.apply( this, this.getHandlerArgs( args, isCatchAll ) );
						} else {
							result = handler;
							this.transition( client, handler );
						}
						this.emit( events.HANDLED, eventPayload );
					}
					clientMeta.priorAction = clientMeta.currentAction;
					clientMeta.currentAction = "";
					clientMeta.currentActionArgs = undefined;
				}
			}
			return result;
		},
	
		transition: function( client, newState ) {
			var clientMeta = this.ensureClientMeta( client );
			var curState = clientMeta.state;
			var curStateObj = this.states[ curState ];
			var newStateObj = this.states[ newState ];
			var child;
			var args = utils.getLeaklessArgs( arguments ).slice( 2 );
			if ( !clientMeta.inExitHandler && newState !== curState ) {
				if ( newStateObj ) {
					child = this.configForState( newState, client );
					if ( curStateObj && curStateObj._onExit ) {
						clientMeta.inExitHandler = true;
						curStateObj._onExit.call( this, client );
						clientMeta.inExitHandler = false;
					}
					clientMeta.targetReplayState = newState;
					clientMeta.priorState = curState;
					clientMeta.state = newState;
					var eventPayload = this.buildEventPayload( client, {
						fromState: clientMeta.priorState,
						action: clientMeta.currentAction,
						toState: newState
					} );
					this.emit( events.TRANSITION, eventPayload );
					if ( newStateObj._onEnter ) {
						newStateObj._onEnter.apply( this, this.getSystemHandlerArgs( args, client ) );
						this.emit( events.TRANSITIONED, eventPayload );
					}
					if ( child ) {
						child.handle( client, "_reset" );
					}
	
					if ( clientMeta.targetReplayState === newState ) {
						this.processQueue( client, events.NEXT_TRANSITION );
					}
					return;
				}
				this.emit( events.INVALID_STATE, this.buildEventPayload( client, {
					state: clientMeta.state,
					attemptedState: newState
				} ) );
			}
		},
	
		deferUntilTransition: function( client, stateName ) {
			var clientMeta = this.ensureClientMeta( client );
			if ( clientMeta.currentActionArgs ) {
				var queued = {
					type: events.NEXT_TRANSITION,
					untilState: stateName,
					args: clientMeta.currentActionArgs
				};
				clientMeta.inputQueue.push( queued );
				var eventPayload = this.buildEventPayload( client, {
					state: clientMeta.state,
					queuedArgs: queued
				} );
				this.emit( events.DEFERRED, eventPayload );
			}
		},
	
		deferAndTransition: function( client, stateName ) {
			this.deferUntilTransition( client, stateName );
			this.transition( client, stateName );
		},
	
		processQueue: function( client ) {
			var clientMeta = this.ensureClientMeta( client );
			var filterFn = function( item ) {
				return ( ( !item.untilState ) || ( item.untilState === clientMeta.state ) );
			};
			var toProcess = _.filter( clientMeta.inputQueue, filterFn );
			clientMeta.inputQueue = _.difference( clientMeta.inputQueue, toProcess );
			_.each( toProcess, function( item ) {
				this.handle.apply( this, [ client ].concat( item.args ) );
			}, this );
		},
	
		clearQueue: function( client, name ) {
			var clientMeta = this.ensureClientMeta( client );
			if ( !name ) {
				clientMeta.inputQueue = [];
			} else {
				var filter = function( evnt ) {
					return ( name ? evnt.untilState !== name : true );
				};
				clientMeta.inputQueue = _.filter( clientMeta.inputQueue, filter );
			}
		},
	
		compositeState: function( client ) {
			var clientMeta = this.ensureClientMeta( client );
			var state = clientMeta.state;
			var child = this.states[state]._child && this.states[state]._child.instance;
			if ( child ) {
				state += "." + child.compositeState( client );
			}
			return state;
		}
	}, emitter.getInstance() );
	
	BehavioralFsm.extend = utils.extend;
	
	module.exports = BehavioralFsm;


/***/ }
/******/ ])
});
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovLy93ZWJwYWNrL2Jvb3RzdHJhcCBkODNkNjg4OWU0Zjc4NzgxYzhjMyIsIndlYnBhY2s6Ly8vLi9zcmMvbWFjaGluYS5qcyIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwge1wicm9vdFwiOlwiX1wiLFwiY29tbW9uanNcIjpcImxvZGFzaFwiLFwiY29tbW9uanMyXCI6XCJsb2Rhc2hcIixcImFtZFwiOlwibG9kYXNoXCJ9Iiwid2VicGFjazovLy8uL3NyYy9lbWl0dGVyLmpzIiwid2VicGFjazovLy8uL3NyYy91dGlscy5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvZXZlbnRzLmpzIiwid2VicGFjazovLy8uL3NyYy9Gc20uanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL0JlaGF2aW9yYWxGc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRCxPO0FDVkE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsdUJBQWU7QUFDZjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7Ozs7OztBQ3RDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUFBQzs7Ozs7OztBQ1ZELGdEOzs7Ozs7QUNBQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxPQUFNO0FBQ047QUFDQTtBQUNBLFFBQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU07QUFD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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSTtBQUNKO0FBQ0EsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFJO0FBQ0o7QUFDQTtBQUNBLEdBQUU7O0FBRUY7QUFDQTtBQUNBO0FBQ0EsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFHO0FBQ0gsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRTs7QUFFRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxFQUFDOztBQUVEOztBQUVBIiwiZmlsZSI6Im1hY2hpbmEuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCJsb2Rhc2hcIikpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoW1wibG9kYXNoXCJdLCBmYWN0b3J5KTtcblx0ZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpXG5cdFx0ZXhwb3J0c1tcIm1hY2hpbmFcIl0gPSBmYWN0b3J5KHJlcXVpcmUoXCJsb2Rhc2hcIikpO1xuXHRlbHNlXG5cdFx0cm9vdFtcIm1hY2hpbmFcIl0gPSBmYWN0b3J5KHJvb3RbXCJfXCJdKTtcbn0pKHRoaXMsIGZ1bmN0aW9uKF9fV0VCUEFDS19FWFRFUk5BTF9NT0RVTEVfMV9fKSB7XG5yZXR1cm4gXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svdW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbiIsIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKVxuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuXG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRleHBvcnRzOiB7fSxcbiBcdFx0XHRpZDogbW9kdWxlSWQsXG4gXHRcdFx0bG9hZGVkOiBmYWxzZVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sb2FkZWQgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKDApO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIGQ4M2Q2ODg5ZTRmNzg3ODFjOGMzIiwidmFyIF8gPSByZXF1aXJlKCBcImxvZGFzaFwiICk7XG52YXIgZW1pdHRlciA9IHJlcXVpcmUoIFwiLi9lbWl0dGVyXCIgKTtcblxubW9kdWxlLmV4cG9ydHMgPSBfLm1lcmdlKCBlbWl0dGVyLmluc3RhbmNlLCB7XG5cdEZzbTogcmVxdWlyZSggXCIuL0ZzbVwiICksXG5cdEJlaGF2aW9yYWxGc206IHJlcXVpcmUoIFwiLi9CZWhhdmlvcmFsRnNtXCIgKSxcblx0dXRpbHM6IHJlcXVpcmUoIFwiLi91dGlsc1wiICksXG5cdGV2ZW50TGlzdGVuZXJzOiB7XG5cdFx0bmV3RnNtOiBbXVxuXHR9XG59ICk7XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9tYWNoaW5hLmpzXG4vLyBtb2R1bGUgaWQgPSAwXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIm1vZHVsZS5leHBvcnRzID0gX19XRUJQQUNLX0VYVEVSTkFMX01PRFVMRV8xX187XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gZXh0ZXJuYWwge1wicm9vdFwiOlwiX1wiLFwiY29tbW9uanNcIjpcImxvZGFzaFwiLFwiY29tbW9uanMyXCI6XCJsb2Rhc2hcIixcImFtZFwiOlwibG9kYXNoXCJ9XG4vLyBtb2R1bGUgaWQgPSAxXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciB1dGlscyA9IHJlcXVpcmUoIFwiLi91dGlsc1wiICk7XG52YXIgXyA9IHJlcXVpcmUoIFwibG9kYXNoXCIgKTtcblxuZnVuY3Rpb24gZ2V0SW5zdGFuY2UoKSB7XG5cdHJldHVybiB7XG5cdFx0ZW1pdDogZnVuY3Rpb24oIGV2ZW50TmFtZSApIHtcblx0XHRcdHZhciBhcmdzID0gdXRpbHMuZ2V0TGVha2xlc3NBcmdzKCBhcmd1bWVudHMgKTtcblx0XHRcdGlmICggdGhpcy5ldmVudExpc3RlbmVyc1sgXCIqXCIgXSApIHtcblx0XHRcdFx0Xy5lYWNoKCB0aGlzLmV2ZW50TGlzdGVuZXJzWyBcIipcIiBdLCBmdW5jdGlvbiggY2FsbGJhY2sgKSB7XG5cdFx0XHRcdFx0aWYgKCAhdGhpcy51c2VTYWZlRW1pdCApIHtcblx0XHRcdFx0XHRcdGNhbGxiYWNrLmFwcGx5KCB0aGlzLCBhcmdzICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrLmFwcGx5KCB0aGlzLCBhcmdzICk7XG5cdFx0XHRcdFx0XHR9IGNhdGNoICggZXhjZXB0aW9uICkge1xuXHRcdFx0XHRcdFx0XHQvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAgKi9cblx0XHRcdFx0XHRcdFx0aWYgKCBjb25zb2xlICYmIHR5cGVvZiBjb25zb2xlLmxvZyAhPT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyggZXhjZXB0aW9uLnN0YWNrICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIHRoaXMgKTtcblx0XHRcdH1cblx0XHRcdGlmICggdGhpcy5ldmVudExpc3RlbmVyc1sgZXZlbnROYW1lIF0gKSB7XG5cdFx0XHRcdF8uZWFjaCggdGhpcy5ldmVudExpc3RlbmVyc1sgZXZlbnROYW1lIF0sIGZ1bmN0aW9uKCBjYWxsYmFjayApIHtcblx0XHRcdFx0XHRpZiAoICF0aGlzLnVzZVNhZmVFbWl0ICkge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2suYXBwbHkoIHRoaXMsIGFyZ3Muc2xpY2UoIDEgKSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRjYWxsYmFjay5hcHBseSggdGhpcywgYXJncy5zbGljZSggMSApICk7XG5cdFx0XHRcdFx0XHR9IGNhdGNoICggZXhjZXB0aW9uICkge1xuXHRcdFx0XHRcdFx0XHQvKiBpc3RhbmJ1bCBpZ25vcmUgZWxzZSAgKi9cblx0XHRcdFx0XHRcdFx0aWYgKCBjb25zb2xlICYmIHR5cGVvZiBjb25zb2xlLmxvZyAhPT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyggZXhjZXB0aW9uLnN0YWNrICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIHRoaXMgKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0b246IGZ1bmN0aW9uKCBldmVudE5hbWUsIGNhbGxiYWNrICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0c2VsZi5ldmVudExpc3RlbmVycyA9IHNlbGYuZXZlbnRMaXN0ZW5lcnMgfHwgeyBcIipcIjogW10gfTtcblx0XHRcdGlmICggIXNlbGYuZXZlbnRMaXN0ZW5lcnNbIGV2ZW50TmFtZSBdICkge1xuXHRcdFx0XHRzZWxmLmV2ZW50TGlzdGVuZXJzWyBldmVudE5hbWUgXSA9IFtdO1xuXHRcdFx0fVxuXHRcdFx0c2VsZi5ldmVudExpc3RlbmVyc1sgZXZlbnROYW1lIF0ucHVzaCggY2FsbGJhY2sgKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGV2ZW50TmFtZTogZXZlbnROYW1lLFxuXHRcdFx0XHRjYWxsYmFjazogY2FsbGJhY2ssXG5cdFx0XHRcdG9mZjogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi5vZmYoIGV2ZW50TmFtZSwgY2FsbGJhY2sgKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0b2ZmOiBmdW5jdGlvbiggZXZlbnROYW1lLCBjYWxsYmFjayApIHtcblx0XHRcdHRoaXMuZXZlbnRMaXN0ZW5lcnMgPSB0aGlzLmV2ZW50TGlzdGVuZXJzIHx8IHsgXCIqXCI6IFtdIH07XG5cdFx0XHRpZiAoICFldmVudE5hbWUgKSB7XG5cdFx0XHRcdHRoaXMuZXZlbnRMaXN0ZW5lcnMgPSB7fTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICggY2FsbGJhY2sgKSB7XG5cdFx0XHRcdFx0dGhpcy5ldmVudExpc3RlbmVyc1sgZXZlbnROYW1lIF0gPSBfLndpdGhvdXQoIHRoaXMuZXZlbnRMaXN0ZW5lcnNbIGV2ZW50TmFtZSBdLCBjYWxsYmFjayApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuZXZlbnRMaXN0ZW5lcnNbIGV2ZW50TmFtZSBdID0gW107XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRnZXRJbnN0YW5jZTogZ2V0SW5zdGFuY2UsXG5cdGluc3RhbmNlOiBnZXRJbnN0YW5jZSgpXG59O1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvZW1pdHRlci5qc1xuLy8gbW9kdWxlIGlkID0gMlxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgc2xpY2UgPSBbXS5zbGljZTtcbnZhciBldmVudHMgPSByZXF1aXJlKCBcIi4vZXZlbnRzLmpzXCIgKTtcbnZhciBfID0gcmVxdWlyZSggXCJsb2Rhc2hcIiApO1xuXG52YXIgbWFrZUZzbU5hbWVzcGFjZSA9ICggZnVuY3Rpb24oKSB7XG5cdHZhciBtYWNoaW5hQ291bnQgPSAwO1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFwiZnNtLlwiICsgbWFjaGluYUNvdW50Kys7XG5cdH07XG59ICkoKTtcblxuZnVuY3Rpb24gZ2V0RGVmYXVsdEJlaGF2aW9yYWxPcHRpb25zKCkge1xuXHRyZXR1cm4ge1xuXHRcdGluaXRpYWxTdGF0ZTogXCJ1bmluaXRpYWxpemVkXCIsXG5cdFx0ZXZlbnRMaXN0ZW5lcnM6IHtcblx0XHRcdFwiKlwiOiBbXVxuXHRcdH0sXG5cdFx0c3RhdGVzOiB7fSxcblx0XHRuYW1lc3BhY2U6IG1ha2VGc21OYW1lc3BhY2UoKSxcblx0XHR1c2VTYWZlRW1pdDogZmFsc2UsXG5cdFx0aGllcmFyY2h5OiB7fSxcblx0XHRwZW5kaW5nRGVsZWdhdGlvbnM6IHt9XG5cdH07XG59XG5cbmZ1bmN0aW9uIGdldERlZmF1bHRDbGllbnRNZXRhKCkge1xuXHRyZXR1cm4ge1xuXHRcdGlucHV0UXVldWU6IFtdLFxuXHRcdHRhcmdldFJlcGxheVN0YXRlOiBcIlwiLFxuXHRcdHN0YXRlOiB1bmRlZmluZWQsXG5cdFx0cHJpb3JTdGF0ZTogdW5kZWZpbmVkLFxuXHRcdHByaW9yQWN0aW9uOiBcIlwiLFxuXHRcdGN1cnJlbnRBY3Rpb246IFwiXCIsXG5cdFx0Y3VycmVudEFjdGlvbkFyZ3M6IHVuZGVmaW5lZCxcblx0XHRpbkV4aXRIYW5kbGVyOiBmYWxzZVxuXHR9O1xufVxuXG5mdW5jdGlvbiBnZXRMZWFrbGVzc0FyZ3MoIGFyZ3MsIHN0YXJ0SWR4ICkge1xuXHR2YXIgcmVzdWx0ID0gW107XG5cdGZvciAoIHZhciBpID0gKCBzdGFydElkeCB8fCAwICk7IGkgPCBhcmdzLmxlbmd0aDsgaSsrICkge1xuXHRcdHJlc3VsdFsgaSBdID0gYXJnc1sgaSBdO1xuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59XG4vKlxuXHRoYW5kbGUgLT5cblx0XHRjaGlsZCA9IHN0YXRlT2JqLl9jaGlsZCAmJiBzdGF0ZU9iai5fY2hpbGQuaW5zdGFuY2U7XG5cblx0dHJhbnNpdGlvbiAtPlxuXHRcdG5ld1N0YXRlT2JqLl9jaGlsZCA9IGdldENoaWxkRnNtSW5zdGFuY2UoIG5ld1N0YXRlT2JqLl9jaGlsZCApO1xuXHRcdGNoaWxkID0gbmV3U3RhdGVPYmouX2NoaWxkICYmIG5ld1N0YXRlT2JqLl9jaGlsZC5pbnN0YW5jZTtcbiovXG5mdW5jdGlvbiBnZXRDaGlsZEZzbUluc3RhbmNlKCBjb25maWcsIGNsaWVudCApIHtcblx0aWYgKCAhY29uZmlnICkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXIgY2hpbGRGc21EZWZpbml0aW9uID0ge307XG5cdGlmICggdHlwZW9mIGNvbmZpZyA9PT0gXCJvYmplY3RcIiApIHtcblx0XHQvLyBpcyB0aGlzIGEgY29uZmlnIG9iamVjdCB3aXRoIGEgZmFjdG9yeT9cblx0XHRpZiAoIGNvbmZpZy5mYWN0b3J5ICkge1xuXHRcdFx0Y2hpbGRGc21EZWZpbml0aW9uID0gY29uZmlnO1xuXHRcdFx0Y2hpbGRGc21EZWZpbml0aW9uLmluc3RhbmNlID0gY2hpbGRGc21EZWZpbml0aW9uLmZhY3RvcnkoIGNsaWVudCApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBhc3N1bWluZyB0aGlzIGlzIGEgbWFjaGluYSBpbnN0YW5jZVxuXHRcdFx0Y2hpbGRGc21EZWZpbml0aW9uLmZhY3RvcnkgPSBmdW5jdGlvbiggY2xpZW50ICkge1xuXHRcdFx0XHRyZXR1cm4gY29uZmlnO1xuXHRcdFx0fTtcblx0XHR9XG5cdH0gZWxzZSBpZiAoIHR5cGVvZiBjb25maWcgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRjaGlsZEZzbURlZmluaXRpb24uZmFjdG9yeSA9IGNvbmZpZztcblx0fVxuXHRjaGlsZEZzbURlZmluaXRpb24uaW5zdGFuY2UgPSBjaGlsZEZzbURlZmluaXRpb24uZmFjdG9yeSggY2xpZW50ICk7XG5cdHJldHVybiBjaGlsZEZzbURlZmluaXRpb247XG59XG5cbmZ1bmN0aW9uIGxpc3RlblRvQ2hpbGQoIGZzbSwgY2hpbGQgKSB7XG5cdC8vIE5lZWQgdG8gaW52ZXN0aWdhdGUgcG90ZW50aWFsIGZvciBkaXNjYXJkZWQgZXZlbnRcblx0Ly8gbGlzdGVuZXIgbWVtb3J5IGxlYWsgaW4gbG9uZy1ydW5uaW5nLCBkZWVwbHktbmVzdGVkIGhpZXJhcmNoaWVzLlxuXHRyZXR1cm4gY2hpbGQub24oIFwiKlwiLCBmdW5jdGlvbiggZXZlbnROYW1lLCBkYXRhICkge1xuXHRcdHN3aXRjaCAoIGV2ZW50TmFtZSApIHtcblx0XHRcdGNhc2UgZXZlbnRzLk5PX0hBTkRMRVI6XG5cdFx0XHRcdGlmICggIWRhdGEudGlja2V0ICYmICFkYXRhLmRlbGVnYXRlZCAmJiBkYXRhLm5hbWVzcGFjZSAhPT0gZnNtLm5hbWVzcGFjZSApIHtcblx0XHRcdFx0XHQvLyBPayAtIHdlJ3JlIGRlYWxpbmcgdy8gYSBjaGlsZCBoYW5kbGluZyBpbnB1dCB0aGF0IHNob3VsZCBidWJibGUgdXBcblx0XHRcdFx0XHRkYXRhLmFyZ3NbIDEgXS5idWJibGluZyA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gd2UgZG8gTk9UIGJ1YmJsZSBfcmVzZXQgaW5wdXRzIHVwIHRvIHRoZSBwYXJlbnRcblx0XHRcdFx0aWYgKCBkYXRhLmlucHV0VHlwZSAhPT0gXCJfcmVzZXRcIiApIHtcblx0XHRcdFx0XHRmc20uaGFuZGxlLmFwcGx5KCBmc20sIGRhdGEuYXJncyApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBldmVudHMuSEFORExJTkcgOlxuXHRcdFx0XHR2YXIgdGlja2V0ID0gZGF0YS50aWNrZXQ7XG5cdFx0XHRcdGlmICggdGlja2V0ICYmIGZzbS5wZW5kaW5nRGVsZWdhdGlvbnNbIHRpY2tldCBdICkge1xuXHRcdFx0XHRcdGRlbGV0ZSBmc20ucGVuZGluZ0RlbGVnYXRpb25zWyB0aWNrZXQgXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmc20uZW1pdCggZXZlbnROYW1lLCBkYXRhICk7IC8vIHBvc3NpYmx5IHRyYW5zZm9ybSBwYXlsb2FkP1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGZzbS5lbWl0KCBldmVudE5hbWUsIGRhdGEgKTsgLy8gcG9zc2libHkgdHJhbnNmb3JtIHBheWxvYWQ/XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fSApO1xufVxuXG4vLyBfbWFjaEtleXMgYXJlIG1lbWJlcnMgd2Ugd2FudCB0byB0cmFjayBhY3Jvc3MgdGhlIHByb3RvdHlwZSBjaGFpbiBvZiBhbiBleHRlbmRlZCBGU00gY29uc3RydWN0b3Jcbi8vIFNpbmNlIHdlIHdhbnQgdG8gZXZlbnR1YWxseSBtZXJnZSB0aGUgYWdncmVnYXRlIG9mIHRob3NlIHZhbHVlcyBvbnRvIHRoZSBpbnN0YW5jZSBzbyB0aGF0IEZTTXNcbi8vIHRoYXQgc2hhcmUgdGhlIHNhbWUgZXh0ZW5kZWQgcHJvdG90eXBlIHdvbid0IHNoYXJlIHN0YXRlICpvbiogdGhvc2UgcHJvdG90eXBlcy5cbnZhciBfbWFjaEtleXMgPSBbIFwic3RhdGVzXCIsIFwiaW5pdGlhbFN0YXRlXCIgXTtcbnZhciBleHRlbmQgPSBmdW5jdGlvbiggcHJvdG9Qcm9wcywgc3RhdGljUHJvcHMgKSB7XG5cdHZhciBwYXJlbnQgPSB0aGlzO1xuXHR2YXIgZnNtOyAvLyBwbGFjZWhvbGRlciBmb3IgaW5zdGFuY2UgY29uc3RydWN0b3Jcblx0dmFyIG1hY2hPYmogPSB7fTsgLy8gb2JqZWN0IHVzZWQgdG8gaG9sZCBpbml0aWFsU3RhdGUgJiBzdGF0ZXMgZnJvbSBwcm90b3R5cGUgZm9yIGluc3RhbmNlLWxldmVsIG1lcmdpbmdcblx0dmFyIEN0b3IgPSBmdW5jdGlvbigpIHt9OyAvLyBwbGFjZWhvbGRlciBjdG9yIGZ1bmN0aW9uIHVzZWQgdG8gaW5zZXJ0IGxldmVsIGluIHByb3RvdHlwZSBjaGFpblxuXG5cdC8vIFRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIG5ldyBzdWJjbGFzcyBpcyBlaXRoZXIgZGVmaW5lZCBieSB5b3Vcblx0Ly8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG5cdC8vIGJ5IHVzIHRvIHNpbXBseSBjYWxsIHRoZSBwYXJlbnQncyBjb25zdHJ1Y3Rvci5cblx0aWYgKCBwcm90b1Byb3BzICYmIHByb3RvUHJvcHMuaGFzT3duUHJvcGVydHkoIFwiY29uc3RydWN0b3JcIiApICkge1xuXHRcdGZzbSA9IHByb3RvUHJvcHMuY29uc3RydWN0b3I7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gVGhlIGRlZmF1bHQgbWFjaGluYSBjb25zdHJ1Y3RvciAod2hlbiB1c2luZyBpbmhlcml0YW5jZSkgY3JlYXRlcyBhXG5cdFx0Ly8gZGVlcCBjb3B5IG9mIHRoZSBzdGF0ZXMvaW5pdGlhbFN0YXRlIHZhbHVlcyBmcm9tIHRoZSBwcm90b3R5cGUgYW5kXG5cdFx0Ly8gZXh0ZW5kcyB0aGVtIG92ZXIgdGhlIGluc3RhbmNlIHNvIHRoYXQgdGhleSdsbCBiZSBpbnN0YW5jZS1sZXZlbC5cblx0XHQvLyBJZiBhbiBvcHRpb25zIGFyZyAoYXJnc1swXSkgaXMgcGFzc2VkIGluLCBhIHN0YXRlcyBvciBpbnRpYWxTdGF0ZVxuXHRcdC8vIHZhbHVlIHdpbGwgYmUgcHJlZmVycmVkIG92ZXIgYW55IGRhdGEgcHVsbGVkIHVwIGZyb20gdGhlIHByb3RvdHlwZS5cblx0XHRmc20gPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmdzID0gc2xpY2UuY2FsbCggYXJndW1lbnRzLCAwICk7XG5cdFx0XHRhcmdzWyAwIF0gPSBhcmdzWyAwIF0gfHwge307XG5cdFx0XHR2YXIgYmxlbmRlZFN0YXRlO1xuXHRcdFx0dmFyIGluc3RhbmNlU3RhdGVzID0gYXJnc1sgMCBdLnN0YXRlcyB8fCB7fTtcblx0XHRcdGJsZW5kZWRTdGF0ZSA9IF8ubWVyZ2UoIF8uY2xvbmVEZWVwKCBtYWNoT2JqICksIHsgc3RhdGVzOiBpbnN0YW5jZVN0YXRlcyB9ICk7XG5cdFx0XHRibGVuZGVkU3RhdGUuaW5pdGlhbFN0YXRlID0gYXJnc1sgMCBdLmluaXRpYWxTdGF0ZSB8fCB0aGlzLmluaXRpYWxTdGF0ZTtcblx0XHRcdF8uZXh0ZW5kKCBhcmdzWyAwIF0sIGJsZW5kZWRTdGF0ZSApO1xuXHRcdFx0cGFyZW50LmFwcGx5KCB0aGlzLCBhcmdzICk7XG5cdFx0fTtcblx0fVxuXG5cdC8vIEluaGVyaXQgY2xhc3MgKHN0YXRpYykgcHJvcGVydGllcyBmcm9tIHBhcmVudC5cblx0Xy5tZXJnZSggZnNtLCBwYXJlbnQgKTtcblxuXHQvLyBTZXQgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBpbmhlcml0IGZyb20gYHBhcmVudGAsIHdpdGhvdXQgY2FsbGluZ1xuXHQvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuXHRDdG9yLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG5cdGZzbS5wcm90b3R5cGUgPSBuZXcgQ3RvcigpO1xuXG5cdC8vIEFkZCBwcm90b3R5cGUgcHJvcGVydGllcyAoaW5zdGFuY2UgcHJvcGVydGllcykgdG8gdGhlIHN1YmNsYXNzLFxuXHQvLyBpZiBzdXBwbGllZC5cblx0aWYgKCBwcm90b1Byb3BzICkge1xuXHRcdF8uZXh0ZW5kKCBmc20ucHJvdG90eXBlLCBwcm90b1Byb3BzICk7XG5cdFx0Xy5tZXJnZSggbWFjaE9iaiwgXy50cmFuc2Zvcm0oIHByb3RvUHJvcHMsIGZ1bmN0aW9uKCBhY2N1bSwgdmFsLCBrZXkgKSB7XG5cdFx0XHRpZiAoIF9tYWNoS2V5cy5pbmRleE9mKCBrZXkgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdGFjY3VtWyBrZXkgXSA9IHZhbDtcblx0XHRcdH1cblx0XHR9ICkgKTtcblx0fVxuXG5cdC8vIEFkZCBzdGF0aWMgcHJvcGVydGllcyB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24sIGlmIHN1cHBsaWVkLlxuXHRpZiAoIHN0YXRpY1Byb3BzICkge1xuXHRcdF8ubWVyZ2UoIGZzbSwgc3RhdGljUHJvcHMgKTtcblx0fVxuXG5cdC8vIENvcnJlY3RseSBzZXQgY2hpbGQncyBgcHJvdG90eXBlLmNvbnN0cnVjdG9yYC5cblx0ZnNtLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGZzbTtcblxuXHQvLyBTZXQgYSBjb252ZW5pZW5jZSBwcm9wZXJ0eSBpbiBjYXNlIHRoZSBwYXJlbnQncyBwcm90b3R5cGUgaXMgbmVlZGVkIGxhdGVyLlxuXHRmc20uX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblx0cmV0dXJuIGZzbTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZVVVSUQoKSB7XG5cdHZhciBzID0gW107XG5cdHZhciBoZXhEaWdpdHMgPSBcIjAxMjM0NTY3ODlhYmNkZWZcIjtcblx0Zm9yICggdmFyIGkgPSAwOyBpIDwgMzY7IGkrKyApIHtcblx0XHRzWyBpIF0gPSBoZXhEaWdpdHMuc3Vic3RyKCBNYXRoLmZsb29yKCBNYXRoLnJhbmRvbSgpICogMHgxMCApLCAxICk7XG5cdH1cblx0c1sgMTQgXSA9IFwiNFwiOyAvLyBiaXRzIDEyLTE1IG9mIHRoZSB0aW1lX2hpX2FuZF92ZXJzaW9uIGZpZWxkIHRvIDAwMTBcblx0LyoganNoaW50IGlnbm9yZTpzdGFydCAqL1xuXHRzWyAxOSBdID0gaGV4RGlnaXRzLnN1YnN0ciggKCBzWyAxOSBdICYgMHgzICkgfCAweDgsIDEgKTsgLy8gYml0cyA2LTcgb2YgdGhlIGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWQgdG8gMDFcblx0LyoganNoaW50IGlnbm9yZTplbmQgKi9cblx0c1sgOCBdID0gc1sgMTMgXSA9IHNbIDE4IF0gPSBzWyAyMyBdID0gXCItXCI7XG5cdHJldHVybiBzLmpvaW4oIFwiXCIgKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGNyZWF0ZVVVSUQ6IGNyZWF0ZVVVSUQsXG5cdGV4dGVuZDogZXh0ZW5kLFxuXHRnZXREZWZhdWx0QmVoYXZpb3JhbE9wdGlvbnM6IGdldERlZmF1bHRCZWhhdmlvcmFsT3B0aW9ucyxcblx0Z2V0RGVmYXVsdE9wdGlvbnM6IGdldERlZmF1bHRCZWhhdmlvcmFsT3B0aW9ucyxcblx0Z2V0RGVmYXVsdENsaWVudE1ldGE6IGdldERlZmF1bHRDbGllbnRNZXRhLFxuXHRnZXRDaGlsZEZzbUluc3RhbmNlOiBnZXRDaGlsZEZzbUluc3RhbmNlLFxuXHRnZXRMZWFrbGVzc0FyZ3M6IGdldExlYWtsZXNzQXJncyxcblx0bGlzdGVuVG9DaGlsZDogbGlzdGVuVG9DaGlsZCxcblx0bWFrZUZzbU5hbWVzcGFjZTogbWFrZUZzbU5hbWVzcGFjZVxufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL3V0aWxzLmpzXG4vLyBtb2R1bGUgaWQgPSAzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRORVhUX1RSQU5TSVRJT046IFwidHJhbnNpdGlvblwiLFxuXHRIQU5ETElORzogXCJoYW5kbGluZ1wiLFxuXHRIQU5ETEVEOiBcImhhbmRsZWRcIixcblx0Tk9fSEFORExFUjogXCJub2hhbmRsZXJcIixcblx0VFJBTlNJVElPTjogXCJ0cmFuc2l0aW9uXCIsXG5cdFRSQU5TSVRJT05FRDogXCJ0cmFuc2l0aW9uZWRcIixcblx0SU5WQUxJRF9TVEFURTogXCJpbnZhbGlkc3RhdGVcIixcblx0REVGRVJSRUQ6IFwiZGVmZXJyZWRcIixcblx0TkVXX0ZTTTogXCJuZXdmc21cIlxufTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2V2ZW50cy5qc1xuLy8gbW9kdWxlIGlkID0gNFxuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJ2YXIgQmVoYXZpb3JhbEZzbSA9IHJlcXVpcmUoIFwiLi9CZWhhdmlvcmFsRnNtXCIgKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoIFwiLi91dGlsc1wiICk7XG52YXIgXyA9IHJlcXVpcmUoIFwibG9kYXNoXCIgKTtcblxudmFyIEZzbSA9IHtcblx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKCkge1xuXHRcdEJlaGF2aW9yYWxGc20uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdHRoaXMuZW5zdXJlQ2xpZW50TWV0YSgpO1xuXHR9LFxuXHRpbml0Q2xpZW50OiBmdW5jdGlvbiBpbml0Q2xpZW50KCkge1xuXHRcdHZhciBpbml0aWFsU3RhdGUgPSB0aGlzLmluaXRpYWxTdGF0ZTtcblx0XHRpZiAoICFpbml0aWFsU3RhdGUgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiWW91IG11c3Qgc3BlY2lmeSBhbiBpbml0aWFsIHN0YXRlIGZvciB0aGlzIEZTTVwiICk7XG5cdFx0fVxuXHRcdGlmICggIXRoaXMuc3RhdGVzWyBpbml0aWFsU3RhdGUgXSApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJUaGUgaW5pdGlhbCBzdGF0ZSBzcGVjaWZpZWQgZG9lcyBub3QgZXhpc3QgaW4gdGhlIHN0YXRlcyBvYmplY3QuXCIgKTtcblx0XHR9XG5cdFx0dGhpcy50cmFuc2l0aW9uKCBpbml0aWFsU3RhdGUgKTtcblx0fSxcblx0ZW5zdXJlQ2xpZW50TWV0YTogZnVuY3Rpb24gZW5zdXJlQ2xpZW50TWV0YSgpIHtcblx0XHRpZiAoICF0aGlzLl9zdGFtcGVkICkge1xuXHRcdFx0dGhpcy5fc3RhbXBlZCA9IHRydWU7XG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLCBfLmNsb25lRGVlcCggdXRpbHMuZ2V0RGVmYXVsdENsaWVudE1ldGEoKSApICk7XG5cdFx0XHR0aGlzLmluaXRDbGllbnQoKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZW5zdXJlQ2xpZW50QXJnOiBmdW5jdGlvbiggYXJncyApIHtcblx0XHR2YXIgX2FyZ3MgPSBhcmdzO1xuXHRcdC8vIHdlIG5lZWQgdG8gdGVzdCB0aGUgYXJncyBhbmQgdmVyaWZ5IHRoYXQgaWYgYSBjbGllbnQgYXJnIGhhc1xuXHRcdC8vIGJlZW4gcGFzc2VkLCBpdCBtdXN0IGJlIHRoaXMgRlNNIGluc3RhbmNlICh0aGlzIGlzbid0IGEgYmVoYXZpb3JhbCBGU00pXG5cdFx0aWYgKCB0eXBlb2YgX2FyZ3NbIDAgXSA9PT0gXCJvYmplY3RcIiAmJiAhKCBcImlucHV0VHlwZVwiIGluIF9hcmdzWyAwIF0gKSAmJiBfYXJnc1sgMCBdICE9PSB0aGlzICkge1xuXHRcdFx0X2FyZ3Muc3BsaWNlKCAwLCAxLCB0aGlzICk7XG5cdFx0fSBlbHNlIGlmICggdHlwZW9mIF9hcmdzWyAwIF0gIT09IFwib2JqZWN0XCIgfHwgKCB0eXBlb2YgX2FyZ3NbIDAgXSA9PT0gXCJvYmplY3RcIiAmJiAoIFwiaW5wdXRUeXBlXCIgaW4gX2FyZ3NbIDAgXSApICkgKSB7XG5cdFx0XHRfYXJncy51bnNoaWZ0KCB0aGlzICk7XG5cdFx0fVxuXHRcdHJldHVybiBfYXJncztcblx0fSxcblxuXHRnZXRIYW5kbGVyQXJnczogZnVuY3Rpb24oIGFyZ3MsIGlzQ2F0Y2hBbGwgKSB7XG5cdFx0Ly8gaW5kZXggMCBpcyB0aGUgY2xpZW50LCBpbmRleCAxIGlzIGlucHV0VHlwZVxuXHRcdC8vIGlmIHdlJ3JlIGluIGEgY2F0Y2gtYWxsIGhhbmRsZXIsIGlucHV0IHR5cGUgbmVlZHMgdG8gYmUgaW5jbHVkZWQgaW4gdGhlIGFyZ3Ncblx0XHQvLyBpbnB1dFR5cGUgbWlnaHQgYmUgYW4gb2JqZWN0LCBzbyB3ZSBuZWVkIHRvIGp1c3QgZ2V0IHRoZSBpbnB1dFR5cGUgc3RyaW5nIGlmIHNvXG5cdFx0dmFyIF9hcmdzID0gYXJncztcblx0XHR2YXIgaW5wdXQgPSBfYXJnc1sgMSBdO1xuXHRcdGlmICggdHlwZW9mIGlucHV0VHlwZSA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdF9hcmdzLnNwbGljZSggMSwgMSwgaW5wdXQuaW5wdXRUeXBlICk7XG5cdFx0fVxuXHRcdHJldHVybiBpc0NhdGNoQWxsID9cblx0XHRcdF9hcmdzLnNsaWNlKCAxICkgOlxuXHRcdFx0X2FyZ3Muc2xpY2UoIDIgKTtcblx0fSxcblxuXHRnZXRTeXN0ZW1IYW5kbGVyQXJnczogZnVuY3Rpb24oIGFyZ3MsIGNsaWVudCApIHtcblx0XHRyZXR1cm4gYXJncztcblx0fSxcblxuXHQvLyBcImNsYXNzaWNcIiBtYWNoaW5hIEZTTSBkbyBub3QgZW1pdCB0aGUgY2xpZW50IHByb3BlcnR5IG9uIGV2ZW50cyAod2hpY2ggd291bGQgYmUgdGhlIEZTTSBpdHNlbGYpXG5cdGJ1aWxkRXZlbnRQYXlsb2FkOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgYXJncyA9IHRoaXMuZW5zdXJlQ2xpZW50QXJnKCB1dGlscy5nZXRMZWFrbGVzc0FyZ3MoIGFyZ3VtZW50cyApICk7XG5cdFx0dmFyIGRhdGEgPSBhcmdzWyAxIF07XG5cdFx0aWYgKCBfLmlzUGxhaW5PYmplY3QoIGRhdGEgKSApIHtcblx0XHRcdHJldHVybiBfLmV4dGVuZCggZGF0YSwgeyBuYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlIH0gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHsgZGF0YTogZGF0YSB8fCBudWxsLCBuYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlIH07XG5cdFx0fVxuXHR9XG59O1xuXG5fLmVhY2goIFtcblx0XCJoYW5kbGVcIixcblx0XCJ0cmFuc2l0aW9uXCIsXG5cdFwiZGVmZXJVbnRpbFRyYW5zaXRpb25cIixcblx0XCJwcm9jZXNzUXVldWVcIixcblx0XCJjbGVhclF1ZXVlXCJcbl0sIGZ1bmN0aW9uKCBtZXRob2RXaXRoQ2xpZW50SW5qZWN0ZWQgKSB7XG5cdEZzbVsgbWV0aG9kV2l0aENsaWVudEluamVjdGVkIF0gPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgYXJncyA9IHRoaXMuZW5zdXJlQ2xpZW50QXJnKCB1dGlscy5nZXRMZWFrbGVzc0FyZ3MoIGFyZ3VtZW50cyApICk7XG5cdFx0cmV0dXJuIEJlaGF2aW9yYWxGc20ucHJvdG90eXBlWyBtZXRob2RXaXRoQ2xpZW50SW5qZWN0ZWQgXS5hcHBseSggdGhpcywgYXJncyApO1xuXHR9O1xufSApO1xuXG5Gc20gPSBCZWhhdmlvcmFsRnNtLmV4dGVuZCggRnNtICk7XG5cbm1vZHVsZS5leHBvcnRzID0gRnNtO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvRnNtLmpzXG4vLyBtb2R1bGUgaWQgPSA1XG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsInZhciBfID0gcmVxdWlyZSggXCJsb2Rhc2hcIiApO1xudmFyIHV0aWxzID0gcmVxdWlyZSggXCIuL3V0aWxzXCIgKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSggXCIuL2VtaXR0ZXJcIiApO1xudmFyIHRvcExldmVsRW1pdHRlciA9IGVtaXR0ZXIuaW5zdGFuY2U7XG52YXIgZXZlbnRzID0gcmVxdWlyZSggXCIuL2V2ZW50c1wiICk7XG5cbnZhciBNQUNISU5BX1BST1AgPSBcIl9fbWFjaGluYV9fXCI7XG5cbmZ1bmN0aW9uIEJlaGF2aW9yYWxGc20oIG9wdGlvbnMgKSB7XG5cdF8uZXh0ZW5kKCB0aGlzLCBvcHRpb25zICk7XG5cdF8uZGVmYXVsdHMoIHRoaXMsIHV0aWxzLmdldERlZmF1bHRCZWhhdmlvcmFsT3B0aW9ucygpICk7XG5cdHRoaXMuaW5pdGlhbGl6ZS5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdHRvcExldmVsRW1pdHRlci5lbWl0KCBldmVudHMuTkVXX0ZTTSwgdGhpcyApO1xufVxuXG5fLmV4dGVuZCggQmVoYXZpb3JhbEZzbS5wcm90b3R5cGUsIHtcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7fSxcblxuXHRpbml0Q2xpZW50OiBmdW5jdGlvbiBpbml0Q2xpZW50KCBjbGllbnQgKSB7XG5cdFx0dmFyIGluaXRpYWxTdGF0ZSA9IHRoaXMuaW5pdGlhbFN0YXRlO1xuXHRcdGlmICggIWluaXRpYWxTdGF0ZSApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggXCJZb3UgbXVzdCBzcGVjaWZ5IGFuIGluaXRpYWwgc3RhdGUgZm9yIHRoaXMgRlNNXCIgKTtcblx0XHR9XG5cdFx0aWYgKCAhdGhpcy5zdGF0ZXNbIGluaXRpYWxTdGF0ZSBdICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIlRoZSBpbml0aWFsIHN0YXRlIHNwZWNpZmllZCBkb2VzIG5vdCBleGlzdCBpbiB0aGUgc3RhdGVzIG9iamVjdC5cIiApO1xuXHRcdH1cblx0XHR0aGlzLnRyYW5zaXRpb24oIGNsaWVudCwgaW5pdGlhbFN0YXRlICk7XG5cdH0sXG5cblx0Y29uZmlnRm9yU3RhdGU6IGZ1bmN0aW9uIGNvbmZpZ0ZvclN0YXRlKCBuZXdTdGF0ZSwgY2xpZW50ICkge1xuXHRcdHZhciBuZXdTdGF0ZU9iaiA9IHRoaXMuc3RhdGVzWyBuZXdTdGF0ZSBdO1xuXHRcdHZhciBjaGlsZDtcblx0XHRfLmVhY2goIHRoaXMuaGllcmFyY2h5LCBmdW5jdGlvbiggY2hpbGRMaXN0ZW5lciwga2V5ICkge1xuXHRcdFx0aWYgKCBjaGlsZExpc3RlbmVyICYmIHR5cGVvZiBjaGlsZExpc3RlbmVyLm9mZiA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0XHRjaGlsZExpc3RlbmVyLm9mZigpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdGlmICggbmV3U3RhdGVPYmouX2NoaWxkICkge1xuXHRcdFx0bmV3U3RhdGVPYmouX2NoaWxkID0gdXRpbHMuZ2V0Q2hpbGRGc21JbnN0YW5jZSggbmV3U3RhdGVPYmouX2NoaWxkLCBjbGllbnQgKTtcblx0XHRcdGNoaWxkID0gbmV3U3RhdGVPYmouX2NoaWxkICYmIG5ld1N0YXRlT2JqLl9jaGlsZC5pbnN0YW5jZTtcblx0XHRcdHRoaXMuaGllcmFyY2h5WyBjaGlsZC5uYW1lc3BhY2UgXSA9IHV0aWxzLmxpc3RlblRvQ2hpbGQoIHRoaXMsIGNoaWxkICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNoaWxkO1xuXHR9LFxuXG5cdGVuc3VyZUNsaWVudE1ldGE6IGZ1bmN0aW9uIGVuc3VyZUNsaWVudE1ldGEoIGNsaWVudCApIHtcblx0XHRpZiAoIHR5cGVvZiBjbGllbnQgIT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIFwiQW4gRlNNIGNsaWVudCBtdXN0IGJlIGFuIG9iamVjdC5cIiApO1xuXHRcdH1cblx0XHRjbGllbnRbIE1BQ0hJTkFfUFJPUCBdID0gY2xpZW50WyBNQUNISU5BX1BST1AgXSB8fCB7fTtcblx0XHRpZiAoICFjbGllbnRbIE1BQ0hJTkFfUFJPUCBdWyB0aGlzLm5hbWVzcGFjZSBdICkge1xuXHRcdFx0Y2xpZW50WyBNQUNISU5BX1BST1AgXVsgdGhpcy5uYW1lc3BhY2UgXSA9IF8uY2xvbmVEZWVwKCB1dGlscy5nZXREZWZhdWx0Q2xpZW50TWV0YSgpICk7XG5cdFx0XHR0aGlzLmluaXRDbGllbnQoIGNsaWVudCApO1xuXHRcdH1cblx0XHRyZXR1cm4gY2xpZW50WyBNQUNISU5BX1BST1AgXVsgdGhpcy5uYW1lc3BhY2UgXTtcblx0fSxcblxuXHRidWlsZEV2ZW50UGF5bG9hZDogZnVuY3Rpb24oIGNsaWVudCwgZGF0YSApIHtcblx0XHRpZiAoIF8uaXNQbGFpbk9iamVjdCggZGF0YSApICkge1xuXHRcdFx0cmV0dXJuIF8uZXh0ZW5kKCBkYXRhLCB7IGNsaWVudDogY2xpZW50LCBuYW1lc3BhY2U6IHRoaXMubmFtZXNwYWNlIH0gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHsgY2xpZW50OiBjbGllbnQsIGRhdGE6IGRhdGEgfHwgbnVsbCwgbmFtZXNwYWNlOiB0aGlzLm5hbWVzcGFjZSB9O1xuXHRcdH1cblx0fSxcblxuXHRnZXRIYW5kbGVyQXJnczogZnVuY3Rpb24oIGFyZ3MsIGlzQ2F0Y2hBbGwgKSB7XG5cdFx0Ly8gaW5kZXggMCBpcyB0aGUgY2xpZW50LCBpbmRleCAxIGlzIGlucHV0VHlwZVxuXHRcdC8vIGlmIHdlJ3JlIGluIGEgY2F0Y2gtYWxsIGhhbmRsZXIsIGlucHV0IHR5cGUgbmVlZHMgdG8gYmUgaW5jbHVkZWQgaW4gdGhlIGFyZ3Ncblx0XHQvLyBpbnB1dFR5cGUgbWlnaHQgYmUgYW4gb2JqZWN0LCBzbyB3ZSBuZWVkIHRvIGp1c3QgZ2V0IHRoZSBpbnB1dFR5cGUgc3RyaW5nIGlmIHNvXG5cdFx0dmFyIF9hcmdzID0gYXJncy5zbGljZSggMCApO1xuXHRcdHZhciBpbnB1dCA9IF9hcmdzWyAxIF07XG5cdFx0aWYgKCB0eXBlb2YgaW5wdXQgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRfYXJncy5zcGxpY2UoIDEsIDEsIGlucHV0LmlucHV0VHlwZSApO1xuXHRcdH1cblx0XHRyZXR1cm4gaXNDYXRjaEFsbCA/XG5cdFx0XHRfYXJncyA6XG5cdFx0XHRbIF9hcmdzWyAwIF0gXS5jb25jYXQoIF9hcmdzLnNsaWNlKCAyICkgKTtcblx0fSxcblxuXHRnZXRTeXN0ZW1IYW5kbGVyQXJnczogZnVuY3Rpb24oIGFyZ3MsIGNsaWVudCApIHtcblx0XHRyZXR1cm4gWyBjbGllbnQgXS5jb25jYXQoIGFyZ3MgKTtcblx0fSxcblxuXHRoYW5kbGU6IGZ1bmN0aW9uKCBjbGllbnQsIGlucHV0ICkge1xuXHRcdHZhciBpbnB1dERlZiA9IGlucHV0O1xuXHRcdGlmICggdHlwZW9mIGlucHV0ID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBcIlRoZSBpbnB1dCBhcmd1bWVudCBwYXNzZWQgdG8gdGhlIEZTTSdzIGhhbmRsZSBtZXRob2QgaXMgdW5kZWZpbmVkLiBEaWQgeW91IGZvcmdldCB0byBwYXNzIHRoZSBpbnB1dCBuYW1lP1wiICk7XG5cdFx0fVxuXHRcdGlmICggdHlwZW9mIGlucHV0ID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0aW5wdXREZWYgPSB7IGlucHV0VHlwZTogaW5wdXQsIGRlbGVnYXRlZDogZmFsc2UsIHRpY2tldDogdW5kZWZpbmVkIH07XG5cdFx0fVxuXHRcdHZhciBjbGllbnRNZXRhID0gdGhpcy5lbnN1cmVDbGllbnRNZXRhKCBjbGllbnQgKTtcblx0XHR2YXIgYXJncyA9IHV0aWxzLmdldExlYWtsZXNzQXJncyggYXJndW1lbnRzICk7XG5cdFx0aWYgKCB0eXBlb2YgaW5wdXQgIT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRhcmdzLnNwbGljZSggMSwgMSwgaW5wdXREZWYgKTtcblx0XHR9XG5cdFx0Y2xpZW50TWV0YS5jdXJyZW50QWN0aW9uQXJncyA9IGFyZ3Muc2xpY2UoIDEgKTtcblx0XHR2YXIgY3VycmVudFN0YXRlID0gY2xpZW50TWV0YS5zdGF0ZTtcblx0XHR2YXIgc3RhdGVPYmogPSB0aGlzLnN0YXRlc1sgY3VycmVudFN0YXRlIF07XG5cdFx0dmFyIGhhbmRsZXJOYW1lO1xuXHRcdHZhciBoYW5kbGVyO1xuXHRcdHZhciBpc0NhdGNoQWxsID0gZmFsc2U7XG5cdFx0dmFyIGNoaWxkO1xuXHRcdHZhciByZXN1bHQ7XG5cdFx0dmFyIGFjdGlvbjtcblx0XHRpZiAoICFjbGllbnRNZXRhLmluRXhpdEhhbmRsZXIgKSB7XG5cdFx0XHRjaGlsZCA9IHRoaXMuY29uZmlnRm9yU3RhdGUoIGN1cnJlbnRTdGF0ZSwgY2xpZW50ICk7XG5cdFx0XHRpZiAoIGNoaWxkICYmICF0aGlzLnBlbmRpbmdEZWxlZ2F0aW9uc1sgaW5wdXREZWYudGlja2V0IF0gJiYgIWlucHV0RGVmLmJ1YmJsaW5nICkge1xuXHRcdFx0XHRpbnB1dERlZi50aWNrZXQgPSAoIGlucHV0RGVmLnRpY2tldCB8fCB1dGlscy5jcmVhdGVVVUlEKCkgKTtcblx0XHRcdFx0aW5wdXREZWYuZGVsZWdhdGVkID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5wZW5kaW5nRGVsZWdhdGlvbnNbIGlucHV0RGVmLnRpY2tldCBdID0geyBkZWxlZ2F0ZWRUbzogY2hpbGQubmFtZXNwYWNlIH07XG5cdFx0XHRcdC8vIFdBUk5JTkcgLSByZXR1cm5pbmcgYSB2YWx1ZSBmcm9tIGBoYW5kbGVgIG9uIGNoaWxkIEZTTXMgaXMgbm90IHJlYWxseSBzdXBwb3J0ZWQuXG5cdFx0XHRcdC8vIElmIHlvdSBuZWVkIHRvIHJldHVybiB2YWx1ZXMgZnJvbSBjaGlsZCBGU00gaW5wdXQgaGFuZGxlcnMsIHVzZSBldmVudHMgaW5zdGVhZC5cblx0XHRcdFx0cmVzdWx0ID0gY2hpbGQuaGFuZGxlLmFwcGx5KCBjaGlsZCwgYXJncyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCBpbnB1dERlZi50aWNrZXQgJiYgdGhpcy5wZW5kaW5nRGVsZWdhdGlvbnNbIGlucHV0RGVmLnRpY2tldCBdICkge1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzLnBlbmRpbmdEZWxlZ2F0aW9uc1sgaW5wdXREZWYudGlja2V0IF07XG5cdFx0XHRcdH1cblx0XHRcdFx0aGFuZGxlck5hbWUgPSBzdGF0ZU9ialsgaW5wdXREZWYuaW5wdXRUeXBlIF0gPyBpbnB1dERlZi5pbnB1dFR5cGUgOiBcIipcIjtcblx0XHRcdFx0aXNDYXRjaEFsbCA9ICggaGFuZGxlck5hbWUgPT09IFwiKlwiICk7XG5cdFx0XHRcdGhhbmRsZXIgPSAoIHN0YXRlT2JqWyBoYW5kbGVyTmFtZSBdIHx8IHRoaXNbIGhhbmRsZXJOYW1lIF0gKSB8fCB0aGlzWyBcIipcIiBdO1xuXHRcdFx0XHRhY3Rpb24gPSBjbGllbnRNZXRhLnN0YXRlICsgXCIuXCIgKyBoYW5kbGVyTmFtZTtcblx0XHRcdFx0Y2xpZW50TWV0YS5jdXJyZW50QWN0aW9uID0gYWN0aW9uO1xuXHRcdFx0XHR2YXIgZXZlbnRQYXlsb2FkID0gdGhpcy5idWlsZEV2ZW50UGF5bG9hZChcblx0XHRcdFx0XHRjbGllbnQsXG5cdFx0XHRcdFx0eyBpbnB1dFR5cGU6IGlucHV0RGVmLmlucHV0VHlwZSwgZGVsZWdhdGVkOiBpbnB1dERlZi5kZWxlZ2F0ZWQsIHRpY2tldDogaW5wdXREZWYudGlja2V0IH1cblx0XHRcdFx0KTtcblx0XHRcdFx0aWYgKCAhaGFuZGxlciApIHtcblx0XHRcdFx0XHR0aGlzLmVtaXQoIGV2ZW50cy5OT19IQU5ETEVSLCBfLmV4dGVuZCggeyBhcmdzOiBhcmdzIH0sIGV2ZW50UGF5bG9hZCApICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5lbWl0KCBldmVudHMuSEFORExJTkcsIGV2ZW50UGF5bG9hZCApO1xuXHRcdFx0XHRcdGlmICggdHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIiApIHtcblx0XHRcdFx0XHRcdHJlc3VsdCA9IGhhbmRsZXIuYXBwbHkoIHRoaXMsIHRoaXMuZ2V0SGFuZGxlckFyZ3MoIGFyZ3MsIGlzQ2F0Y2hBbGwgKSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgPSBoYW5kbGVyO1xuXHRcdFx0XHRcdFx0dGhpcy50cmFuc2l0aW9uKCBjbGllbnQsIGhhbmRsZXIgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5lbWl0KCBldmVudHMuSEFORExFRCwgZXZlbnRQYXlsb2FkICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2xpZW50TWV0YS5wcmlvckFjdGlvbiA9IGNsaWVudE1ldGEuY3VycmVudEFjdGlvbjtcblx0XHRcdFx0Y2xpZW50TWV0YS5jdXJyZW50QWN0aW9uID0gXCJcIjtcblx0XHRcdFx0Y2xpZW50TWV0YS5jdXJyZW50QWN0aW9uQXJncyA9IHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblxuXHR0cmFuc2l0aW9uOiBmdW5jdGlvbiggY2xpZW50LCBuZXdTdGF0ZSApIHtcblx0XHR2YXIgY2xpZW50TWV0YSA9IHRoaXMuZW5zdXJlQ2xpZW50TWV0YSggY2xpZW50ICk7XG5cdFx0dmFyIGN1clN0YXRlID0gY2xpZW50TWV0YS5zdGF0ZTtcblx0XHR2YXIgY3VyU3RhdGVPYmogPSB0aGlzLnN0YXRlc1sgY3VyU3RhdGUgXTtcblx0XHR2YXIgbmV3U3RhdGVPYmogPSB0aGlzLnN0YXRlc1sgbmV3U3RhdGUgXTtcblx0XHR2YXIgY2hpbGQ7XG5cdFx0dmFyIGFyZ3MgPSB1dGlscy5nZXRMZWFrbGVzc0FyZ3MoIGFyZ3VtZW50cyApLnNsaWNlKCAyICk7XG5cdFx0aWYgKCAhY2xpZW50TWV0YS5pbkV4aXRIYW5kbGVyICYmIG5ld1N0YXRlICE9PSBjdXJTdGF0ZSApIHtcblx0XHRcdGlmICggbmV3U3RhdGVPYmogKSB7XG5cdFx0XHRcdGNoaWxkID0gdGhpcy5jb25maWdGb3JTdGF0ZSggbmV3U3RhdGUsIGNsaWVudCApO1xuXHRcdFx0XHRpZiAoIGN1clN0YXRlT2JqICYmIGN1clN0YXRlT2JqLl9vbkV4aXQgKSB7XG5cdFx0XHRcdFx0Y2xpZW50TWV0YS5pbkV4aXRIYW5kbGVyID0gdHJ1ZTtcblx0XHRcdFx0XHRjdXJTdGF0ZU9iai5fb25FeGl0LmNhbGwoIHRoaXMsIGNsaWVudCApO1xuXHRcdFx0XHRcdGNsaWVudE1ldGEuaW5FeGl0SGFuZGxlciA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNsaWVudE1ldGEudGFyZ2V0UmVwbGF5U3RhdGUgPSBuZXdTdGF0ZTtcblx0XHRcdFx0Y2xpZW50TWV0YS5wcmlvclN0YXRlID0gY3VyU3RhdGU7XG5cdFx0XHRcdGNsaWVudE1ldGEuc3RhdGUgPSBuZXdTdGF0ZTtcblx0XHRcdFx0dmFyIGV2ZW50UGF5bG9hZCA9IHRoaXMuYnVpbGRFdmVudFBheWxvYWQoIGNsaWVudCwge1xuXHRcdFx0XHRcdGZyb21TdGF0ZTogY2xpZW50TWV0YS5wcmlvclN0YXRlLFxuXHRcdFx0XHRcdGFjdGlvbjogY2xpZW50TWV0YS5jdXJyZW50QWN0aW9uLFxuXHRcdFx0XHRcdHRvU3RhdGU6IG5ld1N0YXRlXG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0dGhpcy5lbWl0KCBldmVudHMuVFJBTlNJVElPTiwgZXZlbnRQYXlsb2FkICk7XG5cdFx0XHRcdGlmICggbmV3U3RhdGVPYmouX29uRW50ZXIgKSB7XG5cdFx0XHRcdFx0bmV3U3RhdGVPYmouX29uRW50ZXIuYXBwbHkoIHRoaXMsIHRoaXMuZ2V0U3lzdGVtSGFuZGxlckFyZ3MoIGFyZ3MsIGNsaWVudCApICk7XG5cdFx0XHRcdFx0dGhpcy5lbWl0KCBldmVudHMuVFJBTlNJVElPTkVELCBldmVudFBheWxvYWQgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNoaWxkICkge1xuXHRcdFx0XHRcdGNoaWxkLmhhbmRsZSggY2xpZW50LCBcIl9yZXNldFwiICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIGNsaWVudE1ldGEudGFyZ2V0UmVwbGF5U3RhdGUgPT09IG5ld1N0YXRlICkge1xuXHRcdFx0XHRcdHRoaXMucHJvY2Vzc1F1ZXVlKCBjbGllbnQsIGV2ZW50cy5ORVhUX1RSQU5TSVRJT04gKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmVtaXQoIGV2ZW50cy5JTlZBTElEX1NUQVRFLCB0aGlzLmJ1aWxkRXZlbnRQYXlsb2FkKCBjbGllbnQsIHtcblx0XHRcdFx0c3RhdGU6IGNsaWVudE1ldGEuc3RhdGUsXG5cdFx0XHRcdGF0dGVtcHRlZFN0YXRlOiBuZXdTdGF0ZVxuXHRcdFx0fSApICk7XG5cdFx0fVxuXHR9LFxuXG5cdGRlZmVyVW50aWxUcmFuc2l0aW9uOiBmdW5jdGlvbiggY2xpZW50LCBzdGF0ZU5hbWUgKSB7XG5cdFx0dmFyIGNsaWVudE1ldGEgPSB0aGlzLmVuc3VyZUNsaWVudE1ldGEoIGNsaWVudCApO1xuXHRcdGlmICggY2xpZW50TWV0YS5jdXJyZW50QWN0aW9uQXJncyApIHtcblx0XHRcdHZhciBxdWV1ZWQgPSB7XG5cdFx0XHRcdHR5cGU6IGV2ZW50cy5ORVhUX1RSQU5TSVRJT04sXG5cdFx0XHRcdHVudGlsU3RhdGU6IHN0YXRlTmFtZSxcblx0XHRcdFx0YXJnczogY2xpZW50TWV0YS5jdXJyZW50QWN0aW9uQXJnc1xuXHRcdFx0fTtcblx0XHRcdGNsaWVudE1ldGEuaW5wdXRRdWV1ZS5wdXNoKCBxdWV1ZWQgKTtcblx0XHRcdHZhciBldmVudFBheWxvYWQgPSB0aGlzLmJ1aWxkRXZlbnRQYXlsb2FkKCBjbGllbnQsIHtcblx0XHRcdFx0c3RhdGU6IGNsaWVudE1ldGEuc3RhdGUsXG5cdFx0XHRcdHF1ZXVlZEFyZ3M6IHF1ZXVlZFxuXHRcdFx0fSApO1xuXHRcdFx0dGhpcy5lbWl0KCBldmVudHMuREVGRVJSRUQsIGV2ZW50UGF5bG9hZCApO1xuXHRcdH1cblx0fSxcblxuXHRkZWZlckFuZFRyYW5zaXRpb246IGZ1bmN0aW9uKCBjbGllbnQsIHN0YXRlTmFtZSApIHtcblx0XHR0aGlzLmRlZmVyVW50aWxUcmFuc2l0aW9uKCBjbGllbnQsIHN0YXRlTmFtZSApO1xuXHRcdHRoaXMudHJhbnNpdGlvbiggY2xpZW50LCBzdGF0ZU5hbWUgKTtcblx0fSxcblxuXHRwcm9jZXNzUXVldWU6IGZ1bmN0aW9uKCBjbGllbnQgKSB7XG5cdFx0dmFyIGNsaWVudE1ldGEgPSB0aGlzLmVuc3VyZUNsaWVudE1ldGEoIGNsaWVudCApO1xuXHRcdHZhciBmaWx0ZXJGbiA9IGZ1bmN0aW9uKCBpdGVtICkge1xuXHRcdFx0cmV0dXJuICggKCAhaXRlbS51bnRpbFN0YXRlICkgfHwgKCBpdGVtLnVudGlsU3RhdGUgPT09IGNsaWVudE1ldGEuc3RhdGUgKSApO1xuXHRcdH07XG5cdFx0dmFyIHRvUHJvY2VzcyA9IF8uZmlsdGVyKCBjbGllbnRNZXRhLmlucHV0UXVldWUsIGZpbHRlckZuICk7XG5cdFx0Y2xpZW50TWV0YS5pbnB1dFF1ZXVlID0gXy5kaWZmZXJlbmNlKCBjbGllbnRNZXRhLmlucHV0UXVldWUsIHRvUHJvY2VzcyApO1xuXHRcdF8uZWFjaCggdG9Qcm9jZXNzLCBmdW5jdGlvbiggaXRlbSApIHtcblx0XHRcdHRoaXMuaGFuZGxlLmFwcGx5KCB0aGlzLCBbIGNsaWVudCBdLmNvbmNhdCggaXRlbS5hcmdzICkgKTtcblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cblx0Y2xlYXJRdWV1ZTogZnVuY3Rpb24oIGNsaWVudCwgbmFtZSApIHtcblx0XHR2YXIgY2xpZW50TWV0YSA9IHRoaXMuZW5zdXJlQ2xpZW50TWV0YSggY2xpZW50ICk7XG5cdFx0aWYgKCAhbmFtZSApIHtcblx0XHRcdGNsaWVudE1ldGEuaW5wdXRRdWV1ZSA9IFtdO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgZmlsdGVyID0gZnVuY3Rpb24oIGV2bnQgKSB7XG5cdFx0XHRcdHJldHVybiAoIG5hbWUgPyBldm50LnVudGlsU3RhdGUgIT09IG5hbWUgOiB0cnVlICk7XG5cdFx0XHR9O1xuXHRcdFx0Y2xpZW50TWV0YS5pbnB1dFF1ZXVlID0gXy5maWx0ZXIoIGNsaWVudE1ldGEuaW5wdXRRdWV1ZSwgZmlsdGVyICk7XG5cdFx0fVxuXHR9LFxuXG5cdGNvbXBvc2l0ZVN0YXRlOiBmdW5jdGlvbiggY2xpZW50ICkge1xuXHRcdHZhciBjbGllbnRNZXRhID0gdGhpcy5lbnN1cmVDbGllbnRNZXRhKCBjbGllbnQgKTtcblx0XHR2YXIgc3RhdGUgPSBjbGllbnRNZXRhLnN0YXRlO1xuXHRcdHZhciBjaGlsZCA9IHRoaXMuc3RhdGVzW3N0YXRlXS5fY2hpbGQgJiYgdGhpcy5zdGF0ZXNbc3RhdGVdLl9jaGlsZC5pbnN0YW5jZTtcblx0XHRpZiAoIGNoaWxkICkge1xuXHRcdFx0c3RhdGUgKz0gXCIuXCIgKyBjaGlsZC5jb21wb3NpdGVTdGF0ZSggY2xpZW50ICk7XG5cdFx0fVxuXHRcdHJldHVybiBzdGF0ZTtcblx0fVxufSwgZW1pdHRlci5nZXRJbnN0YW5jZSgpICk7XG5cbkJlaGF2aW9yYWxGc20uZXh0ZW5kID0gdXRpbHMuZXh0ZW5kO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJlaGF2aW9yYWxGc207XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9CZWhhdmlvcmFsRnNtLmpzXG4vLyBtb2R1bGUgaWQgPSA2XG4vLyBtb2R1bGUgY2h1bmtzID0gMCJdLCJzb3VyY2VSb290IjoiIn0=