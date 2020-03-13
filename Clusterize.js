if ( 'undefined' !== typeof require )
{
	const ClusterizeUtil	= require( './ClusterizeUtil' );
}


/**
 *	Clusterize.js - v0.18.1 - 2018-01-02
 *	http://NeXTs.github.com/Clusterize.js/
 *	Copyright (c) 2015 Denis Lukov; Licensed GPLv3
 */
class Clusterize
{
	constructor ( oParameter )
	{
		if ( ! ClusterizeUtil.isObject( oParameter ) ||
			! ClusterizeUtil.isArray( oParameter.rows ) ||
			! ClusterizeUtil.isString( oParameter.scrollId ) ||
			! ClusterizeUtil.isString( oParameter.contentId ) )
		{
			throw new Error( `Clusterize.constructor.invalid.oData` );
		}

		this.scrollElem		= document.getElementById( oParameter.scrollId );
		this.contentElem	= document.getElementById( oParameter.contentId );
		if ( 'undefined' === typeof this.scrollElem || ! this.scrollElem )
		{
			throw new Error( `Clusterize.constructor.failed.find.scroll_elem.by.id:${ oParameter.scrollId }` );
		}
		if ( 'undefined' === typeof this.contentElem || ! this.contentElem )
		{
			throw new Error( `Clusterize.constructor.failed.find.content_elem.by.id:${ oParameter.contentId }` );
		}

		//	public parameters
		const oDefaultValues =
		{
			rows_in_block : 10,
			blocks_in_cluster : 2,
			tag : null,
			show_no_data_row : true,
			no_data_class : 'clusterize-no-data',
			no_data_text : 'No data',
			keep_parity : true,
			callbacks : {}
		};
		this.options = Object.assign( {}, oDefaultValues, oParameter );

		//	tabindex forces the browser to keep focus on the scrolling list, fixes #11
		if ( ! this.contentElem.hasAttribute( 'tabindex' ) )
		{
			this.contentElem.setAttribute( 'tabindex', "0" );
		}

		//	private parameters
		this.arrRows	= ClusterizeUtil.isArray( oParameter.rows ) ? oParameter.rows : this.fetchMarkup();
		this.oCache	= {};
		let nScrollTop	= this.scrollElem.scrollTop;

		//	append initial data
		this.insertToDOM();

		//	restore the scroll position
		this.scrollElem.scrollTop	= nScrollTop;

		//	adding scroll handler
		this.bInitLastCluster		= false;
		this.nInitTimerScrollDebounce	= 0;
		this.bInitPointerEventsSet	= false;
		this.nInitTimerResizeDebounce	= 0;

		//
		//	set event listeners
		//
		ClusterizeUtil.on( 'scroll', this.scrollElem, ( event ) =>
		{
			this.scrollEv( event );
		});
		ClusterizeUtil.on( 'resize', window, ( event ) =>
		{
			this.resizeEv( event );
		});
	}

	scrollEv( event )
	{
		//	fixes scrolling issue on Mac #3
		if ( ClusterizeUtil.isMac() )
		{
			if ( ! this.bInitPointerEventsSet )
			{
				this.contentElem.style.pointerEvents = 'none';
			}

			this.bInitPointerEventsSet = true;
			clearTimeout( this.nInitTimerScrollDebounce );
			this.nInitTimerScrollDebounce = setTimeout(() =>
			{
				this.contentElem.style.pointerEvents = 'auto';
				this.bInitPointerEventsSet = false;
			}, 50 );
		}

		if ( this.bInitLastCluster !== ( this.bInitLastCluster = this.getClusterNum() ) )
		{
			this.insertToDOM();
		}
		if ( this.options.callbacks.scrollingProgress )
		{
			this.options.callbacks.scrollingProgress( this.getScrollProgress() );
		}
	}

	resizeEv( event )
	{
		clearTimeout( this.nInitTimerResizeDebounce );
		this.nInitTimerResizeDebounce = setTimeout( this.refresh, 100 );
	}

	//	public methods
	destroy( bClean )
	{
		ClusterizeUtil.off( 'scroll', this.scrollElem, this.scrollEv );
		ClusterizeUtil.off( 'resize', window, this.resizeEv );
		this.html( ( bClean ? this.generateEmptyRow() : this.arrRows ).join( '' ) );
	}

	refresh( bForce )
	{
		if ( this.getRowsHeight( this.arrRows ) || bForce )
		{
			this.update( this.arrRows );
		}
	}

	update( arrNewRows )
	{
		this.arrRows = ClusterizeUtil.isArray( arrNewRows ) ? arrNewRows : [];
		let nScrollTop = this.scrollElem.scrollTop;

		//	fixes #39
		if ( this.arrRows.length * this.options.item_height < nScrollTop )
		{
			this.scrollElem.scrollTop = 0;
			this.bInitLastCluster = false;
		}

		//	...
		this.insertToDOM();
		this.scrollElem.scrollTop = nScrollTop;
	}

	clear()
	{
		this.update( [] );
	}

	getRowsAmount()
	{
		return this.arrRows.length;
	}

	getScrollProgress()
	{
		return this.options.scroll_top / ( this.arrRows.length * this.options.item_height ) * 100 || 0;
	}

	add( sWhere, arrNewRows )
	{
		arrNewRows = ClusterizeUtil.isArray( arrNewRows ) ? arrNewRows : [];
		if ( ! arrNewRows.length )
		{
			return;
		}

		this.arrRows = 'append' === sWhere
			? this.arrRows.concat( arrNewRows )
			: arrNewRows.concat( this.arrRows );
		this.insertToDOM();
	}

	append( arrRows )
	{
		this.add( 'append', arrRows );
	}

	prepend( arrRows )
	{
		this.add( 'prepend', arrRows );
	}



	//	fetch existing markup
	fetchMarkup()
	{
		let arrRows = [];
		let arrRowsNodes = this.getChildNodes( this.contentElem );

		while ( arrRowsNodes.length )
		{
			arrRows.push( arrRowsNodes.shift().outerHTML );
		}

		//	...
		return arrRows;
	}

	//	get tag name, content tag name, tag height, calc cluster height
	exploreEnvironment()
	{
		this.options.content_tag = this.contentElem.tagName.toLowerCase();

		if ( this.arrRows.length < 1 )
		{
			return;
		}

		if ( this.contentElem.children.length <= 1 )
		{
			this.oCache.data = this.html( this.arrRows[ 0 ] + this.arrRows[ 0 ] + this.arrRows[ 0 ] );
		}
		if ( ! this.options.tag )
		{
			this.options.tag = this.contentElem.children[ 0 ].tagName.toLowerCase();
		}

		//	...
		this.getRowsHeight();
	}

	//	calculate the height of rows
	getRowsHeight()
	{
		let nPrevItemHeight	= this.options.item_height;

		//	...
		this.options.cluster_height	= 0;
		if ( ! ClusterizeUtil.isArray( this.arrRows ) || 0 === this.arrRows.length )
		{
			return;
		}

		//	...
		let arrNodes = this.contentElem.children;
		if ( ! arrNodes || ! arrNodes.length )
		{
			return;
		}

		//	...
		let oNode = arrNodes[ Math.floor( arrNodes.length / 2 ) ];

		//	...
		this.options.item_height = oNode.offsetHeight;

		//	consider table's border-spacing
		if ( this.options.tag === 'tr' &&
			'collapse' !== ClusterizeUtil.getStyle( 'borderCollapse', this.contentElem ) )
		{
			this.options.item_height += parseInt( ClusterizeUtil.getStyle( 'borderSpacing', this.contentElem ), 10 ) || 0;
		}

		//	consider margins (and margins collapsing)
		if ( 'tr' !== this.options.tag )
		{
			let nMarginTop		= parseInt( ClusterizeUtil.getStyle( 'marginTop', oNode ), 10 ) || 0;
			let nMarginBottom	= parseInt( ClusterizeUtil.getStyle( 'marginBottom', oNode ), 10) || 0;
			this.options.item_height	+= Math.max( nMarginTop, nMarginBottom );
		}

		//	...
		this.options.block_height	= this.options.item_height * this.options.rows_in_block;
		this.options.rows_in_cluster	= this.options.blocks_in_cluster * this.options.rows_in_block;
		this.options.cluster_height	= this.options.blocks_in_cluster * this.options.block_height;

		//	...
		return nPrevItemHeight !== this.options.item_height;
	}

	//	get current cluster number
	getClusterNum()
	{
		//
		//	cluster 1
		//		block 1
		//			item 1
		//			item 2
		//			item 3
		//		block 2
		//			item 4
		//			item 5
		//			item 6
		//	cluster 2
		//		block 3
		//			item 7
		//			item 8
		//			item 9
		//		block 4
		//			item 10
		//			item 11
		//			item 12
		//
		//	scrollTop is the height of the page scrolled upward out of the view
		//
		this.options.scroll_top = this.scrollElem.scrollTop;
		const nClusterBlockDiff	= this.options.cluster_height - this.options.block_height;
		const nValue		= this.options.scroll_top / nClusterBlockDiff;
		const nFloorValue	= Math.floor( nValue );
		return nFloorValue || 0;
	}

	//	generate empty row if no data provided
	generateEmptyRow()
	{
		if ( ! this.options.tag || ! this.options.show_no_data_row )
		{
			return [];
		}

		let oEmptyRow = document.createElement( this.options.tag );
		if ( ! oEmptyRow )
		{
			return [];
		}

		let oNoDataContent = document.createTextNode( this.options.no_data_text );
		if ( ! oNoDataContent )
		{
			return [];
		}

		//	...
		let oTd;

		//	...
		oEmptyRow.className = this.options.no_data_class;
		if ( 'tr' === this.options.tag )
		{
			oTd = document.createElement( 'td' );

			//	fixes #53
			oTd.colSpan = 100;
			oTd.appendChild( oNoDataContent );
		}

		//	...
		oEmptyRow.appendChild( oTd || oNoDataContent );
		return [ oEmptyRow.outerHTML ];
	}

	//	generate cluster for current scroll position
	generate( nClusterNum )
	{
		if ( ! Array.isArray( this.arrRows ) )
		{
			throw new Error( `Clusterize.generate.invalid.arrRows` );
		}
		if ( ! ClusterizeUtil.isNumber( nClusterNum ) )
		{
			throw new Error( `Clusterize.generate.invalid.nClusterNum` );
		}

		//	...
		let nRowsLen = this.arrRows.length;
		if ( nRowsLen < this.options.rows_in_block )
		{
			const arrNewRows = nRowsLen > 0 ? this.arrRows : this.generateEmptyRow();
			console.log( `###### Clusterize.generate ${ arrNewRows.length } rows since rows < this.options.rows_in_block=${ this.options.rows_in_block }` );
			return {
				top_offset : 0,
				bottom_offset : 0,
				rows_above : 0,
				rows : arrNewRows
			};
		}

		let nItemsStart		= Math.max( ( this.options.rows_in_cluster - this.options.rows_in_block ) * nClusterNum, 0 );
		let nItemsEnd		= nItemsStart + this.options.rows_in_cluster;

		let nTopOffset		= Math.max( nItemsStart * this.options.item_height, 0 );
		let nBottomOffset	= Math.max( ( nRowsLen - nItemsEnd ) * this.options.item_height, 0 );
		let arrThisClusterRows	= [];
		let nRowsAbove		= nItemsStart;
		if ( nTopOffset < 1 )
		{
			nRowsAbove ++;
		}
		for ( let i = nItemsStart; i < nItemsEnd; i++ )
		{
			this.arrRows[ i ] && arrThisClusterRows.push( this.arrRows[ i ] );
		}

		console.log( `###### Clusterize.generate ${ arrThisClusterRows.length } rows normally!` );
		return {
			top_offset: nTopOffset,
			bottom_offset: nBottomOffset,
			rows_above: nRowsAbove,
			rows: arrThisClusterRows
		}
	}

	renderExtraTag( sClassName, nHeight )
	{
		if ( ! ClusterizeUtil.isString( sClassName ) )
		{
			throw new Error( `Clusterize.renderExtraTag.invalid.sClassName` );
		}

		//	...
		let oTag = document.createElement( this.options.tag );
		let sClusterizePrefix = 'clusterize-';

		//	...
		oTag.className	= [ sClusterizePrefix + 'extra-row', sClusterizePrefix + sClassName ].join( ' ' );
		if ( ClusterizeUtil.isNumber( nHeight ) )
		{
			oTag.style.height = String( nHeight ) + 'px';
		}

		return oTag.outerHTML;
	}

	//	if necessary verify data changed and insert to DOM
	insertToDOM()
	{
		if ( ! ClusterizeUtil.isArray( this.arrRows ) )
		{
			throw new Error( `Clusterize.insertToDOM.invalid.arrRows` );
		}
		if ( ! ClusterizeUtil.isObject( this.oCache ) )
		{
			throw new Error( `Clusterize.insertToDOM.invalid.oCache` );
		}

		//	explore row's height
		if ( ! this.options.cluster_height )
		{
			this.exploreEnvironment();
		}

		//	...
		let oGeneratedData			= this.generate( this.getClusterNum() );
		let sThisClusterRowsString		= oGeneratedData.rows.join( '' );
		let this_cluster_content_changed	= this.checkChanges( 'data', sThisClusterRowsString );
		let top_offset_changed			= this.checkChanges( 'top', oGeneratedData.top_offset );
		let only_bottom_offset_changed		= this.checkChanges( 'bottom', oGeneratedData.bottom_offset );
		let callbacks				= this.options.callbacks;
		let layout				= [];

		if ( this_cluster_content_changed || top_offset_changed )
		{
			if ( oGeneratedData.top_offset )
			{
				this.options.keep_parity && layout.push( this.renderExtraTag( 'keep-parity' ) );
				layout.push( this.renderExtraTag( 'top-space', oGeneratedData.top_offset ) );
			}

			layout.push( sThisClusterRowsString );
			oGeneratedData.bottom_offset && layout.push( this.renderExtraTag( 'bottom-space', oGeneratedData.bottom_offset ) );
			callbacks.clusterWillChange && callbacks.clusterWillChange();
			this.html( layout.join( '' ) );
			this.options.content_tag === 'ol' && this.contentElem.setAttribute( 'start', oGeneratedData.rows_above );
			this.contentElem.style[ 'counter-increment' ] = 'clusterize-counter ' + ( oGeneratedData.rows_above - 1 );
			callbacks.clusterChanged && callbacks.clusterChanged();
		}
		else if ( only_bottom_offset_changed )
		{
			this.contentElem.lastChild.style.height = oGeneratedData.bottom_offset + 'px';
		}
	}

	html( sData )
	{
		if ( ! ClusterizeUtil.isString( sData ) )
		{
			throw new Error( `Clusterize.html.invalid.sData` );
		}

		//
		//	unfortunately ie <= 9 does not allow to use innerHTML for table elements,
		//	so do not support it
		//
		this.contentElem.innerHTML = sData;
	}

	getChildNodes( oTagContainer )
	{
		if ( ! oTagContainer )
		{
			throw new Error( `Clusterize.getChildNodes.invalid.oTagContainer` );
		}

		//	convert oTagContainer.children object to Array
		let arrNodes	= [];
		let nLen	= oTagContainer.children.length;
		for ( let i = 0; i < nLen; i++ )
		{
			arrNodes.push( oTagContainer.children[ i ] );
		}

		return arrNodes;
	}

	checkChanges( sType, vValue )
	{
		if ( ! ClusterizeUtil.isString( sType ) )
		{
			throw new Error( `Clusterize.checkChanges.invalid.sType` );
		}
		if ( ! ClusterizeUtil.isObject( this.oCache ) )
		{
			throw new Error( `Clusterize.checkChanges.invalid.oCache` );
		}

		//	...
		let bChanged = ( vValue !== this.oCache[ sType ] );
		this.oCache[ sType ] = vValue;

		//	...
		return bChanged;
	}
}




/**
 *  @exports
 *  @type {function(): Clusterize}
 */
if ( 'undefined' !== typeof module )
{
	module.exports = Clusterize;
}
else
{
	exports = Clusterize;
}
