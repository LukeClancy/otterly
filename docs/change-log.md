# changelog

### 3.0.1
- if a unit is set on a form, withform will always be true, and it will use that form's formdata. This makes it easier to use native form elements, ex: checkboxes (which have weird html standards)
- Forgot to mention an otty.log method that is to squash errors in unit A so they don't stop unit B from running. It pushes logging information onto otty.logData, and logs to the console aswell. Should send it in a post request to tracked_errors for error tracking. Will do in future.
- Some issues with the version number was fixed.

### 3.0.0
- added a shortcut for html elements "cl" with corresponds to classList
- dives options:
	- if withform is active, and withform is on a form element, it will use that form's formdata. This may be a breaking change.
	- I added 'allowDefault'  to the generic unit's dive options. This allows the event to propogate instead of the default circumstance where it prevents event propogration.
	- I added the stagger customization attribute which comes into play in customizing times for the below "staggered" and "delay" dive behaviors
	- I added 'staggered' to the available dive behaviors. Staggered does not run a dive if a dive was run recently. This time is customizable by the stagger attribute.
	- I added the "delay" dive behavior. Similar to stagger, except instead of just rejecting the dive, it sets a timeout to run it. Good for search bars.
	- use case: keyup searches that refresh an area while you search.

	for example: <input data-on='keydown->dive[{"behavior": "delay", "stagger": 300, allowDefault: true,  withform: true}]'>

I noticed recently that "GET" methods when it comes to forms natively navigate to the page that is requested. Considering adding this as an option in otterly. Thinking about it, it might of made some of my previous code neater in my MidFlip project (especially the many-choice menu). Certainly better than manipulating
complex hrefs in some cases. *shouldn't* be a hard thing to work in.

A potential weakness with my dive behaviors is they are only really expected to be one use case per unit. Might not work so well else-wise. Perhaps I should note that. Perhaps I should key them to the currentTarget? But the current target could have multiple events keyed to it. IDK. Feels like one of those "I could make this way more complex and blow up the package size so as to fix a niche issue that nearly no one will hit and would be fairly easy to solve the one time you do hit it" type of things. I think we will deal.

### 2.0.3
- Bug fixes
- Made omitting changes to the head easer, to deal with javascript libraries that change head elements. For instance the google button makes style changes, but then you would go to a new page, which removes those elements, as they aren't in the head element of the new page. Anyway, you can do that by overriding navigationHeadMorph, and looking at the comment in that function.
- Having unreplicatable issues with google button, am considering error reporting system to go along with the stopError function. For instance, an otty.log function and a reportError function. The reportError function would be fault tolerant and not rely on bundling or the rest of otty. Would have to copy-paste into script tag.


### 2.0.2
- Added a stopError function in otty.js. This function is called when there is an error in unit activities, like a click or when connected/removed. The purpose of this is to stop errors in unit 1 from propogating up and canceling actions in unit 2. You may want to override this method to support whatever error logging code/service you use.
- changed how SPAs work in a couple of ways for reliablity and sanity. Additionally, custom SPA functionality is now easily attainable. Simply use the handleNavigation({replaceSelector}) option. For instance, providing[ [".contentArea", ".notificationArea], "body"] will replace contentArea and notificationArea if they are both available in the current document and the new document. Otherwise it will fall back to the body. Very powerfull. No need to override anything. This functionality needs further testing.
- thinking about making a YT video.

### 2.0.0 and 0.1.5
- I may of accidently gone from 0.1 -> 2.0. Its in production and works great so its not the end of the world. Would rather of had the "not stable" excuse a bit longer though.
- MAJOR BREAKING CHANGE where I removed all classes in midflip, instead replacing them with regular objects. This is as I was having issues with the 'extend' keyword in gnome web and apple devices. It might of been a SWC thing? Due to the extend keyword basically being the only reason anyone would want classes in the first place, and the fact you can *~extend~* an object by just going {...object1, ...yourobject2}, which actually gives more control, I went ahead and removed classes. This should help avoid various niche error cases. In practical senses, instead of going new AClass(...) You now do AClass.init(...) in your index.js file. Objects are simpler and easier to work with anyway, and this is meant to be an easily configurable library. Plus all our units are objects, not classes. Just makes sense to me.
- Tested the polling. Added polling Docs. Polling is based off queues, and perhaps a little complex. But it covers various use cases, and is setup to be upgradable to websockets in the future if we decide to add websocket compatibility.
- I added shortcuts setA and getA for setAttribute and getAttribute respectively.

### 0.1.3
- Seems fairly stable. May need tuning in some areas but overall works great.
- AJAX (otty's dive/AfterDive) and SPA functionality is there and works.
- some variables and setup has changed somewhat.
- added qs (querySelector) and qsa (querySelectorAll) shortcuts to the document element.
- in the future:
	- I am seeing that it may be nice to have some async loading capabilites. For instance, for javascript thats in page 1 but not in any of the other pages. Shouldn't be toooo hard right? OFC one would have to link this to whatever bundler they are doing. Anyway, just something in mind.
	- I am thinking about making a hex package for ajax side of otterly. Counter argument is that you would then have to version match (gross) and also the code is pretty simple anyway / may not be needed (after all, its just some json [{morph: {id: x, html: y}}] etc, it doesn't need to be complicated. OFC you might have a custom function for throwing up an alert or something but still.)
- updated docs
- Made docs/marketing website based off the markdown: [https://otterlyjs.org](https://otterlyjs.org). (was going to use otterly.js and even got  the domain. Turns out .js domains are unusable. Dont know why they sell them?)
- Tell me if you have any issues with the github issues button.


### 0.0.13
- Further fixes as I find things (this is 0.0.x)
- Added a function dedicated to finding url hash and scrolling to it in otty.js
- Had a great time gaslighting myself because I could not for the life of me extend a class. But it turned out to be an issue with my webpack configuration, not my basic coding skills. Side effect of that is everything is now "export default ..." except for index.js.

### 0.0.8
- changelog start
- unit and data-on functionality works, as well as SPA functions.
- dive functionality has not been verified and likely does not work.
