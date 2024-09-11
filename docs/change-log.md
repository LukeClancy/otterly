# changelog


### 0.2.0 and 0.1.5
- MAJOR BREAKING CHANGE where I removed all classes in midflip, instead replacing them with regular objects. This is as I was having issues with the 'extend' keyword in gnome web and apple devices. It might of been a SWC thing? Due to the extend keyword basically being the only reason anyone would want classes in the first place, and the fact you can *~extend~* an object by just going {...object1, ...yourobject2}, which actually gives more control, I went ahead and removed classes. This should help avoid various niche error cases. In practical senses, instead of going new AClass(...) You now do AClass.init(...) in your index.js file. Objects are simpler and easier to work with anyway, and this is meant to be an easily configurable library. Plus all our units are objects, not classes. Just makes sense to me.
- Tested the polling. Added polling Docs. Polling is based off queues, and perhaps a little complex. But it covers various use cases,
	and is setup to be upgradable to websockets in the future if we decide to add websocket compatibility.
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
- Tell me if you have any isssssuessssssss with the github issues button.


### 0.0.13
- Further fixes as I find things (this is 0.0.x)
- Added a function dedicated to finding url hash and scrolling to it in otty.js
- Had a great time gaslighting myself because I could not for the life of me extend a class. But it turned out to be an issue with my webpack configuration, not my basic coding skills. Side effect of that is everything is now "export default ..." except for index.js.

### 0.0.8
- changelog start
- unit and data-on functionality works, as well as SPA functions.
- dive functionality has not been verified and likely does not work.