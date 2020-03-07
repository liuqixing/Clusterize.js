const lodash		= require( 'lodash' );
const ClusterizeUtil	= require( './ClusterizeUtil' );




/**
 *	Clusterize.js - v0.18.1 - 2018-01-02
 *	http://NeXTs.github.com/Clusterize.js/
 *	Copyright (c) 2015 Denis Lukov; Licensed GPLv3
 */
function ClusterizeMain()
{
	const Clusterize = ( data ) =>
	{
		if ( ! ( this instanceof Clusterize ) )
		{
			return new Clusterize( data );
		}

		//	..
		let self = this;
		let defaults =
		{
			rows_in_block : 50,
			blocks_in_cluster : 4,
			tag : null,
			show_no_data_row : true,
			no_data_class : 'clusterize-no-data',
			no_data_text : 'No data',
			keep_parity : true,
			callbacks : {}
		};

		//	public parameters
		self.options	= {};
		let arrOptions	= [ 'rows_in_block', 'blocks_in_cluster', 'show_no_data_row', 'no_data_class', 'no_data_text', 'keep_parity', 'tag', 'callbacks' ];
		for ( let i = 0; i < arrOptions.length; i++ )
		{
			let oOption = arrOptions[ i ];
			self.options[ oOption ] = ( typeof data[ oOption ] != 'undefined' && data[ oOption ] != null )
				? data[ oOption ]
				: defaults[ oOption ];
		}

		let arrElems = [ 'scroll', 'content' ];
		for ( let i = 0; i < arrElems.length ; i++ )
		{
			let elem	= arrElems[ i ];
			let sElemKey	= elem + '_elem';
			self[ sElemKey ] = data[ elem + 'Id' ]
				? document.getElementById( data[ elem + 'Id' ] )
				: data[ sElemKey ];
			if ( ! self[ sElemKey ] )
			{
				throw new Error( "Error! Could not find " + elem + " element" );
			}
		}

		//	tabindex forces the browser to keep focus on the scrolling list, fixes #11
		if ( ! self.content_elem.hasAttribute( 'tabindex' ) )
		{
			self.content_elem.setAttribute( 'tabindex', 0 );
		}

		//	private parameters
		let arrRows	= ClusterizeUtil.isArray( data.rows ) ? data.rows : self.fetchMarkup();
		let oCache	= {};
		let nScrollTop	= self.scroll_elem.scrollTop;

		//	append initial data
		self.insertToDOM( arrRows, oCache );

		//	restore the scroll position
		self.scroll_elem.scrollTop = nScrollTop;

		// adding scroll handler
		let bLastCluster	= false;
		let nScrollDebounce	= 0;
		let bPointerEventsSet	= false;
		const scrollEv = () =>
			{
				//	fixes scrolling issue on Mac #3
				if ( ClusterizeUtil.isMac() )
				{
					if ( ! bPointerEventsSet )
					{
						self.content_elem.style.pointerEvents = 'none';
					}

					bPointerEventsSet = true;
					clearTimeout( nScrollDebounce );
					nScrollDebounce = setTimeout(() =>
					{
						self.content_elem.style.pointerEvents = 'auto';
						bPointerEventsSet = false;
					}, 50 );
				}

				const bLastClusterT = self.getClusterNum();
				if ( bLastCluster !== bLastClusterT )
				{
					self.insertToDOM( arrRows, oCache );
				}
				if ( self.options.callbacks.scrollingProgress )
				{
					self.options.callbacks.scrollingProgress( self.getScrollProgress() );
				}
			};
		let nTimerResizeDebounce = 0;
		const resizeEv = () =>
		{
			clearTimeout( nTimerResizeDebounce );
			nTimerResizeDebounce = setTimeout( self.refresh, 100 );
		};

		ClusterizeUtil.on( 'scroll', self.scroll_elem, scrollEv );
		ClusterizeUtil.on( 'resize', window, resizeEv );

		//	public methods
		self.destroy = ( clean ) =>
		{
			ClusterizeUtil.off( 'scroll', self.scroll_elem, scrollEv );
			ClusterizeUtil.off( 'resize', window, resizeEv );
			self.html( ( clean ? self.generateEmptyRow() : arrRows ).join( '' ) );
		};

		self.refresh = ( force ) =>
		{
			if ( self.getRowsHeight( arrRows ) || force )
			{
				self.update( arrRows );
			}
		};

		self.update = ( new_rows ) =>
		{
			arrRows = ClusterizeUtil.isArray( new_rows ) ? new_rows : [];
			let nScrollTop = self.scroll_elem.scrollTop;

			//	fixes #39
			if ( arrRows.length * self.options.item_height < nScrollTop )
			{
				self.scroll_elem.scrollTop = 0;
				bLastCluster = 0;
			}
			self.insertToDOM( arrRows, oCache );
			self.scroll_elem.scrollTop = nScrollTop;
		};

		self.clear = () =>
		{
			self.update( [] );
		};

		self.getRowsAmount = () =>
		{
			return arrRows.length;
		};

		self.getScrollProgress = () =>
		{
			return this.options.scroll_top / ( arrRows.length * this.options.item_height ) * 100 || 0;
		};

		const add = ( sWhere, arrNewRows ) =>
		{
			arrNewRows = ClusterizeUtil.isArray( arrNewRows ) ? arrNewRows : [];
			if ( ! arrNewRows.length )
			{
				return;
			}

			//	...
			arrRows = 'append' === sWhere
				? arrRows.concat( arrNewRows )
				: arrNewRows.concat( arrRows );
			self.insertToDOM( arrRows, oCache );
		};

		self.append = ( arrRows ) =>
		{
			add( 'append', arrRows );
		};

		self.prepend = ( arrRows ) =>
		{
			add( 'prepend', arrRows );
		};
	};

	Clusterize.prototype =
	{
		constructor : Clusterize,

		//	fetch existing markup
		fetchMarkup : () =>
		{
			let rows = [];
			let rows_nodes = this.getChildNodes( this.content_elem );

			while ( rows_nodes.length )
			{
				rows.push( rows_nodes.shift().outerHTML );
			}

			//	...
			return rows;
		},

		//	get tag name, content tag name, tag height, calc cluster height
		exploreEnvironment : ( rows, cache ) =>
		{
			let opts = this.options;
			opts.content_tag = this.content_elem.tagName.toLowerCase();

			if ( ! rows.length )
			{
				return;
			}

			if ( ClusterizeUtil.getIeVersion() && ClusterizeUtil.getIeVersion() <= 9 && ! opts.tag )
			{
				opts.tag = rows[ 0 ].match( /<([^>\s/]*)/ )[ 1 ].toLowerCase();
			}

			if ( this.content_elem.children.length <= 1 )
			{
				cache.data = this.html( rows[ 0 ] + rows[ 0 ] + rows[ 0 ] );
			}
			if ( ! opts.tag )
			{
				opts.tag = this.content_elem.children[ 0 ].tagName.toLowerCase();
			}

			//	...
			this.getRowsHeight( rows );
		},

		getRowsHeight : ( arrRows ) =>
		{
			let oOpts		= this.options;
			let nPrevItemHeight	= oOpts.item_height;

			//	...
			oOpts.cluster_height	= 0;
			if ( ! lodash.isArray( arrRows ) || ! arrRows.length )
			{
				return;
			}

			//	...
			let arrNodes = this.content_elem.children;
			if ( ! arrNodes || ! arrNodes.length )
			{
				return;
			}

			//	...
			let oNode = arrNodes[ Math.floor( arrNodes.length / 2 ) ];

			//	...
			oOpts.item_height = oNode.offsetHeight;

			//	consider table's border-spacing
			if ( oOpts.tag === 'tr' &&
				'collapse' !== ClusterizeUtil.getStyle( 'borderCollapse', this.content_elem ) )
			{
				oOpts.item_height += parseInt( ClusterizeUtil.getStyle( 'borderSpacing', this.content_elem ), 10 ) || 0;
			}

			//	consider margins (and margins collapsing)
			if ( 'tr' !== oOpts.tag )
			{
				let nMarginTop		= parseInt( ClusterizeUtil.getStyle( 'marginTop', oNode ), 10 ) || 0;
				let nMarginBottom	= parseInt( ClusterizeUtil.getStyle( 'marginBottom', oNode ), 10) || 0;
				oOpts.item_height	+= Math.max( nMarginTop, nMarginBottom );
			}

			//	...
			oOpts.block_height	= oOpts.item_height * oOpts.rows_in_block;
			oOpts.rows_in_cluster	= oOpts.blocks_in_cluster * oOpts.rows_in_block;
			oOpts.cluster_height	= oOpts.blocks_in_cluster * oOpts.block_height;

			//	...
			return nPrevItemHeight !== oOpts.item_height;
		},

		//	get current cluster number
		getClusterNum : () =>
		{
			this.options.scroll_top = this.scroll_elem.scrollTop;
			return Math.floor( this.options.scroll_top / ( this.options.cluster_height - this.options.block_height ) ) || 0;
		},

		//	generate empty row if no data provided
		generateEmptyRow : () =>
		{
			let opts = this.options;
			if ( ! opts.tag || ! opts.show_no_data_row )
			{
				return [];
			}

			let empty_row = document.createElement( opts.tag );
			let no_data_content = document.createTextNode( opts.no_data_text );
			let td;

			empty_row.className = opts.no_data_class;
			if ( opts.tag === 'tr' )
			{
				td = document.createElement( 'td' );

				//	fixes #53
				td.colSpan	= 100;
				td.appendChild( no_data_content );
			}

			//	...
			empty_row.appendChild( td || no_data_content );
			return [ empty_row.outerHTML ];
		},

		//	generate cluster for current scroll position
		generate : ( arrRows, nClusterNum ) =>
		{
			if ( ! Array.isArray( arrRows ) )
			{
				throw new Error( `generate with invalid arrRows.` );
			}
			if ( ! lodash.isNumber( nClusterNum ) )
			{
				throw new Error( `generate with invalid nClusterNum.` );
			}

			//	...
			let opts	= this.options;
			let rows_len	= arrRows.length;

			if ( rows_len < opts.rows_in_block )
			{
				return {
					top_offset : 0,
					bottom_offset : 0,
					rows_above : 0,
					rows : rows_len ? arrRows : this.generateEmptyRow()
				};
			}

			let items_start = Math.max( ( opts.rows_in_cluster - opts.rows_in_block ) * nClusterNum, 0 );
			let items_end = items_start + opts.rows_in_cluster;
			let top_offset = Math.max(items_start * opts.item_height, 0);
			let bottom_offset = Math.max((rows_len - items_end) * opts.item_height, 0);
			let this_cluster_rows = [];
			let rows_above = items_start;
			if ( top_offset < 1 )
			{
				rows_above ++;
			}
			for ( let i = items_start; i < items_end; i++ )
			{
				arrRows[ i ] && this_cluster_rows.push( arrRows[ i ] );
			}

			return {
				top_offset: top_offset,
				bottom_offset: bottom_offset,
				rows_above: rows_above,
				rows: this_cluster_rows
			}
		},

		renderExtraTag : ( sClassName, nHeight ) =>
		{
			if ( ! lodash.isString( sClassName ) )
			{
				throw new Error( `renderExtraTag with invalid sClassName.` );
			}

			//	...
			let oTag	= document.createElement( this.options.tag );
			let sClusterizePrefix = 'clusterize-';

			//	...
			oTag.className	= [ sClusterizePrefix + 'extra-row', sClusterizePrefix + sClassName ].join( ' ' );
			if ( lodash.isNumber( nHeight ) )
			{
				oTag.style.height = String( nHeight ) + 'px';
			}

			//	...
			return oTag.outerHTML;
		},

		//	if necessary verify data changed and insert to DOM
		insertToDOM : ( arrRows, oCache ) =>
		{
			if ( ! lodash.isArray( arrRows ) )
			{
				throw new Error( `insertToDOM with invalid arrRows.` );
			}
			if ( ! lodash.isObject( oCache ) )
			{
				throw new Error( `insertToDOM with invalid oCache.` );
			}

			//	explore row's height
			if ( ! this.options.cluster_height )
			{
				this.exploreEnvironment( arrRows, oCache );
			}
			let data				= this.generate( arrRows, this.getClusterNum() );
			let this_cluster_rows			= data.rows.join( '' );
			let this_cluster_content_changed	= this.checkChanges( 'data', this_cluster_rows, oCache );
			let top_offset_changed			= this.checkChanges( 'top', data.top_offset, oCache );
			let only_bottom_offset_changed		= this.checkChanges( 'bottom', data.bottom_offset, oCache );
			let callbacks				= this.options.callbacks;
			let layout				= [];

			if ( this_cluster_content_changed || top_offset_changed )
			{
				if ( data.top_offset )
				{
					this.options.keep_parity && layout.push( this.renderExtraTag( 'keep-parity' ) );
					layout.push( this.renderExtraTag( 'top-space', data.top_offset ) );
				}

				layout.push( this_cluster_rows );
				data.bottom_offset && layout.push( this.renderExtraTag( 'bottom-space', data.bottom_offset ) );
				callbacks.clusterWillChange && callbacks.clusterWillChange();
				this.html( layout.join( '' ) );
				this.options.content_tag === 'ol' && this.content_elem.setAttribute( 'start', data.rows_above );
				this.content_elem.style[ 'counter-increment' ] = 'clusterize-counter ' + ( data.rows_above - 1 );
				callbacks.clusterChanged && callbacks.clusterChanged();
			}
			else if ( only_bottom_offset_changed )
			{
				this.content_elem.lastChild.style.height = data.bottom_offset + 'px';
			}
		},

		//	unfortunately ie <= 9 does not allow to use innerHTML for table elements, so make a workaround
		html : ( sData ) =>
		{
			if ( ! lodash.isString( sData ) )
			{
				throw new Error( `getChildNodes with invalid sData.` );
			}

			//	...
			let oContentElem = this.content_elem;
			if ( ClusterizeUtil.getIeVersion() &&
				ClusterizeUtil.getIeVersion() <= 9 &&
				this.options.tag === 'tr' )
			{
				let oDiv = document.createElement( 'div' );
				let oLast;

				//	...
				oDiv.innerHTML = '<table><tbody>' + sData + '</tbody></table>';
				while ( ( oLast = oContentElem.lastChild ) )
				{
					oContentElem.removeChild( oLast );
				}
				let arrRowsNodes = this.getChildNodes( oDiv.firstChild.firstChild );
				while ( arrRowsNodes && arrRowsNodes.length )
				{
					oContentElem.appendChild( arrRowsNodes.shift() );
				}
			}
			else
			{
				oContentElem.innerHTML = sData;
			}
		},

		getChildNodes : ( oTag ) =>
		{
			if ( ! oTag )
			{
				throw new Error( `getChildNodes with invalid oTag.` );
			}

			let child_nodes = oTag.children;
			let nodes = [];
			for ( let i = 0, ii = child_nodes.length; i < ii; i++ )
			{
				nodes.push( child_nodes[ i ] );
			}

			//	...
			return nodes;
		},
		checkChanges : ( sType, value, oCache ) =>
		{
			if ( ! lodash.isString( sType ) )
			{
				throw new Error( `checkChanges with invalid sType.` );
			}
			if ( ! lodash.isObject( oCache ) )
			{
				throw new Error( `checkChanges with invalid oCache.` );
			}

			//	...
			let bChanged = ( value !== oCache[ sType ] );
			oCache[ sType ] = value;

			//	...
			return bChanged;
		}
	};

	return Clusterize;
}


/**
 *  @exports
 *  @type {function(): ClusterizeMain}
 */
module.exports = ClusterizeMain;
