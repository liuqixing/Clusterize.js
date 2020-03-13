/**
 * 	@class	ClusterizeUtil
 */
class ClusterizeUtil
{
	static isMac()
	{
		return -1 !== navigator.platform.toLowerCase().indexOf( 'mac' );
	}


	//
	//	support functions
	//
	static on( evt, element, fnc )
	{
		return element.addEventListener ? element.addEventListener( evt, fnc, false ) : element.attachEvent( "on" + evt, fnc );
	}

	static off( evt, element, fnc )
	{
		return element.removeEventListener ? element.removeEventListener( evt, fnc, false ) : element.detachEvent( "on" + evt, fnc );
	}

	static isArray( arr )
	{
		return '[object Array]' === Object.prototype.toString.call( arr );
	}

	static getStyle( prop, elem )
	{
		return window.getComputedStyle ? window.getComputedStyle( elem )[ prop ] : elem.currentStyle[ prop ];
	}

	static isNumber( vValue )
	{
		return 'number' === typeof vValue;
	}

	static isString( vValue )
	{
		return 'string' === typeof vValue;
	}

	static isObject( vValue )
	{
		const sType = typeof vValue;
		return null !== vValue && ( 'object' === sType || 'function' === sType );
	}
}


/**
 *	@type {ClusterizeUtil}
 */
if ( 'undefined' !== typeof module )
{
	module.exports = ClusterizeUtil;
}
else
{
	exports = ClusterizeUtil;
}
