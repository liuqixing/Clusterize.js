/*
Ininite looping scroll.
Tested and works well in latest Chrome, Safari and Firefox.


https://stackoverflow.com/questions/10570684/infinite-scrolling-in-both-directions-up-and-down

*/

(function (window) {
	'use strict';

	var doc = document,
		body = doc.body,
		html = doc.documentElement,
		startElement = doc.getElementsByClassName('is-start')[0],
		clones = doc.getElementsByClassName('is-clone'),
		disableScroll = false,
		docHeight,
		scrollPos,
		clonesHeight,
		i;

	function getScrollPos() {
		return (window.pageYOffset || html.scrollTop)  - (html.clientTop || 0);
	}

	function getDocHeight() {
		return Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
	}

	function getClonesHeight() {
		i = 0;
		clonesHeight = 0;

		for (i; i < clones.length; i += 1) {
			clonesHeight = clonesHeight + clones[i].offsetHeight;
		}

		return clonesHeight;
	}

	docHeight = getDocHeight();
	clonesHeight = getClonesHeight();

	window.addEventListener('resize', function () {
		scrollPos = getScrollPos();
		docHeight = getDocHeight();
		clonesHeight = getClonesHeight();

		if (scrollPos <= 0) {
			window.scroll(0, 1); // Scroll 1 pixel to allow upwards scrolling.
		}
	}, false);

	window.addEventListener('scroll', function () {
		if (disableScroll === false) {
			scrollPos = getScrollPos();

			if (clonesHeight + scrollPos >= docHeight) {
				// Scroll to the top when you’ve reached the bottom
				window.scroll(0, 1); // Scroll 1 pixel to allow upwards scrolling.
				disableScroll = true;
			} else if (scrollPos <= 0) {
				// Scroll to the top of the clones when you reach the top.
				window.scroll(0, docHeight - clonesHeight);
				disableScroll = true;
			}

			if (disableScroll) {
				// Disable scroll-repositioning for a while to avoid flickering.
				window.setTimeout(function () {
					disableScroll = false;
				}, 100);
			}
		}
	}, false);

	// Needs a small delay in some browsers.
	window.setTimeout(function () {
		if (startElement) {
			// Start at the middle of the starting block.
			window.scroll(0, Math.round(startElement.getBoundingClientRect().top + document.body.scrollTop - (window.innerHeight - startElement.offsetHeight) / 2));
		} else {
			// Scroll 1 pixel to allow upwards scrolling.
			window.scroll(0, 1);
		}
	});

}(this));
