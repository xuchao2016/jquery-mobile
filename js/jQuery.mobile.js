/*!
 * jQuery Mobile
 * http://jquerymobile.com/
 *
 * Copyright 2010, jQuery Project
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */
(function( jQuery, window, undefined ) {
	// if we're missing support for any of these, then we're a C-grade browser
	if ( !jQuery.support.display || !jQuery.support.position || !jQuery.support.overflow || !jQuery.support.floatclear ) {
		return;
	}	
	
	//these properties should be made easy to override externally
	jQuery.mobile = {};
	
	jQuery.extend(jQuery.mobile, {
		subPageUrlKey: 'ui-page' //define the key used in urls for sub-pages. Defaults to &ui-page=
	});
	jQuery.mobile.subPageUrlKey = 'ui-page';

	var $window = jQuery(window),
		$html = jQuery('html'),
		$head = jQuery('head'),
		$body,
		$loader = jQuery('<div class="ui-loader ui-body-c ui-corner-all fade in"><span class="ui-icon ui-icon-loading spin"></span><h1>loading.</h1></div>'),
		startPage,
		startPageId = 'ui-page-start',
		activePageClass = 'ui-page-active',
		pageTransition,
		transitions = 'slide slideup slidedown pop flip fade dissolve swap',
		transitionDuration = 350,
		backBtnText = "Back",
		urlStack = [ {
			url: location.hash.replace( /^#/, "" ),
			transition: "slide"
		} ],
		nextPageRole = null,
		noCache = '.ui-dialog';
	
	
	
	
	
	// hide address bar
	function hideBrowserChrome() {
		// prevent scrollstart and scrollstop events
		jQuery.event.special.scrollstart.enabled = false;
		window.scrollTo( 0, 0 );
		setTimeout(function() {
			jQuery.event.special.scrollstart.enabled = true;
		}, 150 );
	}
	
	function getBaseURL(){
	    var newBaseURL = location.hash.replace(/#/,'').split('/');
		if(newBaseURL.length && /[.|&]/.test(newBaseURL[newBaseURL.length-1]) ){
			newBaseURL.pop();	
		}
		newBaseURL = newBaseURL.join('/');
		if(newBaseURL !== "" && newBaseURL.charAt(newBaseURL.length-1) !== '/'){  newBaseURL += '/'; }
		return newBaseURL;
	}
	
	function setBaseURL(){
		//set base url for new page assets
		$('#ui-base').attr('href', getBaseURL());
	}
	
	function resetBaseURL(){
		$('#ui-base').attr('href', location.pathname);
	}
	
	
	// send a link through hash tracking
	jQuery.fn.ajaxClick = function() {
		var href = jQuery( this ).attr( "href" );
		pageTransition = jQuery( this ).attr( "data-transition" ) || "slide";
		nextPageRole = jQuery( this ).attr( "data-rel" );
		
		//reset base to pathname for new request
		resetBaseURL();  	
		//find new base for url building
		var newBaseURL = getBaseURL();
		
		//if href is absolute but local, or a local ID, no base needed
		if( /^\//.test(href) || (/https?:\/\//.test(href) && !!(href).match(location.hostname)) || /^#/.test(href) ){
			newBaseURL = '';
		}
		
		// set href to relative path using baseURL and
		if( !/https?:\/\//.test(href) ){
			href = newBaseURL + href;
		}
						
		//if it's a non-local-anchor and Ajax is not supported, or if it's an external link, go to page without ajax
		if ( ( /^[^#]/.test(href) && !jQuery.support.ajax ) || ( /https?:\/\//.test(href) && !!!href.match(location.hostname) ) ) {
			location = href
		}
		else{
			// let the hashchange event handler take care of requesting the page via ajax
			location.hash = href;
		}
		return this;
	};
	
	// ajaxify all navigable links
	jQuery( "a:not([href=#]):not([target=_blank]):not([rel=external])" ).live( "click", function(event) {
		jQuery( this ).ajaxClick();
		return false;
	});
	
	// turn on/off page loading message.. also hides the ui-content div
	function pageLoading( done ) {
		if ( done ) {
			$html.removeClass( "ui-loading" );
			//fade in page content, remove loading msg
			jQuery('.ui-page-active .ui-content').addClass('dissolve in');
		} else {
			$html.addClass( "ui-loading" );
			$loader.appendTo( $body ).addClass( "dissolve in" );
		}
	};
	
	// transition between pages - based on transitions from jQtouch
	function changePage( from, to, transition, back ) {
		hideBrowserChrome();
		
		// kill keyboard (thx jQtouch :) )
		jQuery( document.activeElement ).blur();
		
		// animate in / out
		from.addClass( transition + " out " + ( back ? "reverse" : "" ) );
		to.appendTo($body).addClass( activePageClass + " " + transition +
			" in " + ( back ? "reverse" : "" ) );
		
		// callback - remove classes, etc
		to.animationComplete(function() {
			from.add( to ).removeClass(" out in reverse " + transitions );
			from.removeClass( activePageClass );
			pageLoading( true );
			jQuery.fixedToolbars.show();
		});
	};
	
	jQuery(function() {
		$body = jQuery( "body" );
		pageLoading();
		
		// needs to be bound at domready (for IE6)
		// find or load content, make it active
		$window.bind( "hashchange", function(e) {
			var url = location.hash.replace( /^#/, "" ),
				stackLength = urlStack.length,
				// pageTransition only exists if the user clicked a link
				back = !pageTransition && stackLength > 1 &&
					urlStack[ stackLength - 2 ].url === url,
				transition = pageTransition || "slide",
				fileUrl = url;
			pageTransition = undefined;
			
			// if the new href is the same as the previous one
			if ( back ) {
				transition = urlStack.pop().transition;
			} else {
				urlStack.push({ url: url, transition: transition });
			}
			
			//remove any pages that shouldn't cache
			jQuery(noCache).remove();
			
			//function for setting role of next page
			function setPageRole( newPage ) {
				if ( nextPageRole ) {
					newPage.attr( "data-role", nextPageRole );
					nextPageRole = undefined;
				}
			}
			
			if ( url ) {
				// see if content is present already
				var localDiv = jQuery( "[id='" + url + "']" );
				if ( localDiv.length ) {
					if ( localDiv.is( "[data-role]" ) ) {
						setPageRole( localDiv );
					}
					setBaseURL();
					mobilize( localDiv );
					changePage( jQuery( ".ui-page-active" ), localDiv, transition, back );
				} else { //ajax it in
					pageLoading();
					if(url.match( '&' + jQuery.mobile.subPageUrlKey )){
						fileUrl = url.split( '&' + jQuery.mobile.subPageUrlKey )[0];
					}
					var newPage = jQuery( "<div>" )
						.appendTo( $body )
						.load( fileUrl + ' [data-role="page"]', function() {
							// TODO: test this (avoids querying the dom for new element):
//							var newPage = jQuery( this ).find( ".ui-page" ).eq( 0 )
//								.attr( "id", url );
//							jQuery( this ).replaceWith( newPage );
//							setPageRole( newPage );
//							mobilize( newPage );
//							changePage( jQuery( ".ui-page-active" ), newPage, transition, back );
							jQuery( this ).replaceWith(
								jQuery( this ).find( '[data-role="page"]' ).eq( 0 ).attr( "id", fileUrl ) );
							var newPage = jQuery( "[id='" + fileUrl + "']" );
							setPageRole( newPage );
							mobilize( newPage );
							newPage = jQuery( "[id='" + url + "']" );
							changePage( jQuery( ".ui-page-active" ), newPage, transition, back );
						});
						
						setBaseURL();
				}
			} else {
				// either we've backed up to the root page url
				// or it's the first page load with no hash present
				var currentPage = jQuery( ".ui-page-active" );
				if ( currentPage.length && !startPage.is( ".ui-page-active" ) ) {
					changePage( currentPage, startPage, transition, back );
				} else {
					startPage.addClass( activePageClass );
					jQuery.fixedToolbars.show();
					pageLoading( true );
				}
			}
		});
		
		hideBrowserChrome();
	});
	
	
	
	
	
	//add orientation class on flip/resize.
	$window.bind( "orientationchange", function( event, data ) {
		$html.removeClass( "portrait landscape" ).addClass( data.orientation );
	});
	
	//add mobile, loading classes to doc
	$html.addClass('ui-mobile');
	
	//insert mobile meta - these will need to be configurable somehow.
	$head.append('<meta name="viewport" content="width=device-width, minimum-scale=1.0, maximum-scale=1.0" />'+
		'<link rel="apple-touch-icon" href="images/homeicon.png" />'+
		'<link rel="apple-touch-startup-image" href="images/startscreen.png" />'+
		'<meta name="apple-mobile-web-app-capable" content="yes" />' +
        '<meta name="apple-mobile-web-app-status-bar-style" content="default" />'+
        '<base  href="" id="ui-base" />');
    
    //
    resetBaseURL();    
	
	//potential (probably incomplete) fallback to workaround lack of animation callbacks. 
	//should this be extended into a full special event?
	// note: Expects CSS animations use transitionDuration (350ms)
	jQuery.fn.animationComplete = function(callback){
		if(jQuery.support.WebKitAnimationEvent){
			return jQuery(this).one('webkitAnimationEnd', callback); //check out transitionEnd (opera per Paul's request)
		}
		else{
			setTimeout(callback, transitionDuration);
		}
	};
	
	
	
	//markup-driven enhancements, to be called on any ui-page upon loading
	function mobilize($el){	
		//to-do: make sure this only runs one time on a page (or maybe per component)
		return $el.not('[data-mobilized]').each(function(){	

			var $el = $(this);

			//hide no-js content
			$el.find('[data-role="nojs"]').addClass('ui-nojs');
			
			$el.find('input[type=radio],input[type=checkbox]').customCheckboxRadio();
			$el.find('button, input[type=submit], input[type=reset], input[type=image]').customButton();
			$el.find('input[type=text],input[type=number],input[type=password],textarea').customTextInput();
			$el.find("input, select").filter('[data-role="slider"]').slider();
			$el.find('select').not('[data-role="slider"]').customSelect();
			
			/*temporary datepicker workaround */
			$el.find('input[type=date]').hide().after( $('<div />').datepicker() );
			$('.ui-datepicker-header').addClass('ui-body-c ui-corner-top').removeClass('ui-corner-all');
			$('.ui-datepicker-prev').buttonMarkup({iconPos: 'notext', icon: 'arrow-l', shadow: true, corners: true});
			$('.ui-datepicker-next').buttonMarkup({iconPos: 'notext', icon: 'arrow-r', shadow: true, corners: true});
			$('.ui-datepicker-calendar thead').remove();
			$('.ui-datepicker-calendar .ui-btn-text span').attr('class','');
			$('.ui-datepicker-calendar td').addClass('ui-btn-up-c');
			$('.ui-datepicker-calendar a').buttonMarkup({corners: false, shadow: false});
			/* //temporary datepicker workaround */
			
			//pre-find data els
			var $dataEls = $el.find('[data-role]').andSelf().each(function() {
				var $this = $(this),
					role = $this.attr("data-role");
				switch(role) {
				case 'header':
				case 'footer':
					$this.addClass('ui-bar-' + ($(this).data('theme') ? $(this).data('theme') : 'a'));
				case 'page':	
				case 'content':
					$this.addClass('ui-' + role);
					break;
				case 'collapsible':
				case 'fieldcontain':
				case 'globalnav':
				case 'listview':
				case 'dialog':
				case 'ajaxform':
					$this[role]();
					break;
				case 'controlgroup':
					// FIXME for some reason this has to come before the form control stuff (see above)
					$this.controlgroup({
						direction: $this.attr("data-type")
					});
					break;
				}
			});
			
			//fix toolbars
			$el.fixHeaderFooter();

			//add back buttons to headers that don't have them	
			// FIXME make that optional?
			// TODO don't do that on devices that have a native back button?
			var backBtn = $el.find('.ui-header a.ui-back');
			if(!backBtn.length){
				backBtn = jQuery('<a href="#" class="ui-back" data-icon="arrow-l"></a>').appendTo($el.find('.ui-header'));
			}
			
			//buttons from links in headers,footers,bars, or with data-role
			$dataEls.filter('[data-role="button"]').add('.ui-header a, .ui-footer a, .ui-bar a').not('.ui-btn').buttonMarkup();
			//links within content areas
			$el.find('.ui-body a:not(.ui-btn):not(.ui-link-inherit)').addClass('ui-link');
			//make all back buttons mimic the back button (pre-js, these links are usually "home" links)
			backBtn
				.click(function(){
					// FIXME if you navigated from some page directly to subpage (ala .../#_form-controls.html), back button will actually go to the previous page, instead of the parent page
					history.go(-1);
					return false;
				})
				.find('.ui-btn-text').text(backBtnText);	
			
			$el.attr('data-mobilized', true);	
		});
	};
	
	jQuery.extend({
		mobilize: mobilize,
		pageLoading: pageLoading,
		changePage: changePage,
		hideBrowserChrome: hideBrowserChrome
	});

	//dom-ready
	jQuery(function(){
		
		//set up active page - mobilize it!
		startPage = jQuery('[data-role="page"]:first');
		
		//make sure it has an ID - for finding it later
		if(!startPage.attr('id')){ 
			startPage.attr('id', startPageId); 
		}
		
		//mobilize all pages present
		mobilize(jQuery('[data-role="page"]'));
		
		//trigger a new hashchange, hash or not
		$window.trigger( "hashchange" );
		
		//update orientation 
		$html.addClass( jQuery.event.special.orientationchange.orientation( $window ) );
		
		//some debug stuff for the events pages
		jQuery('body').bind('scrollstart scrollstop swipe swipeleft swiperight tap taphold turn',function(e){
			jQuery('#eventlogger').prepend('<div>Event fired: '+ e.type +'</div>');
		});
	});
})( jQuery, this );
