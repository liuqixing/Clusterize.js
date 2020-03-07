/**
 * 	@class	ClusterizeUtil
 */
class ClusterizeUtil
{
	//
	//	detect ie9 and lower
	//	https://gist.github.com/padolsey/527683#comment-786682
	//
	static getIeVersion()
	{
		let v	= 0;
		let el	= null;
		let all	= null;

		for ( v = 3,
			el = document.createElement('b'),
			all = el.all || [];
			el.innerHTML = '<!--[if gt IE ' + ( ++v ) + ']><i><![endif]-->',
			all[ 0 ];
		)
		{
		}
		return v > 4 ? v : document.documentMode;
	}

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

}


/**
 *	@type {ClusterizeUtil}
 */
module.exports	= ClusterizeUtil;
