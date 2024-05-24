import Generic from "./units/generic.js"

// import '@ungap/custom-elements'; //< this is a polyfill fo the is="" attribute and element extensions
	//which we use heavily

// - look into onload, load, rendered, whatever. Add events for these
// - Look into storing page and scroll location when clicking through links. A prev_page variable, and prev_y variable I suppose.
// - might be able to do that with the forward button too?
// - 
// current thinking, use this is="" plugin for most of the heavy lifting. Its constructor should
//	be autocalled.
// https://github.com/ungap/custom-elements#readme
// <script src="//unpkg.com/@ungap/custom-elements"></script>

//what we need from user
//	- csrf selector.
//	- is development? Boolean for console dumps.
//	- passback of Generic and TripwireActions (or whatever we end up calling it) so
//		they can add their own things.
//	- unit classes they have created.

class UnitHandler {
	shortcuts(){
		Object.defineProperties(Generic, {
			el: {
				get: function(){return this.element},
				set: function(v){return this.element = v}
			}
		})
		Object.defineProperties(Event.prototype, {
			ct: {
				get: function(){return this.currentTarget},
			}
		})
		Object.defineProperties(HTMLElement.prototype, {
			ds: {
				get: function(){return this.dataset},
				set: function(v) {return (this.dataset = v)}
			}
		})
		HTMLElement.prototype.q = function(str){ return this.querySelector(str) }
		HTMLElement.prototype.qa = function(str){ return this.querySelectorAll(str) }		
	}
	addUnit(ob, nms) {
		if(nms == undefined) {
			nms = ob.dataset.unit.split(' ')
		}
		if(ob._unit == undefined) {
			ob._unit = {...Generic}
		}
		let cs = [ob._unit]
		// console.log('nms', nms)
		for(let nm of nms){
			let c = this.units[nm]
			if(c == undefined) {
				console.error('data-unit\'s \'' + nm + '\' is not matching any of unit classes.')
			} else if (!(c == Generic)) {
				cs.push(c)
			}
		}
		Object.assign(...cs)
		ob._unit.element = ob
		return ob
	}
	getEventDetails(x, x_node){
		//click->LikeArea#like				will find the closest LikeArea dataunit and hit like
		//click->like						will just hit the like function of the closest data unit
		//option 1: click->like(e, post: true)	will find the closest data unit and run unit.like(e, post: true)
		//option 2: click->like({})			< the {} gets parsed as javascript and is added to the function call. Issue, only one parameter at a time
		//option 3: click->like([])			< then we use the ... syntax to expand it and throw in the e as first param. I like this because
		//										it allows multiple deep parameters in a non shitty way (unlike stimulusjs), while also stopping people from
		//										habitually inlining js which could become an issue in option 1. Also would prevent having to run JSON.parse on everything.
		//
		// I did not like option 1 since it encourages javascript in the html which is kinda messy. Ended up doing
		// something like this click->like[...]; which works well i think.
		// we can do 2 and 3 at a point.	
		let func, unit
	
		console.log(x)

		if(x.unit) {
			unit = x_node.closest(`[data-unit~=\'${x.unit}\']`)._unit
		} else {
			unit = x_node.closest('[data-unit]')._unit
		}
		if(unit[x.f_name] == undefined){
			console.error(`${x.f_name} not defined on unit`)
			return
		}
		func = unit[x.f_name].bind(unit, ...x.input)
	
		return [unit, x_node, x.action, func]
	}
	parseEventString(x){
		if(!(x) || x.length == 0){ return [] }
		if(x[x.length - 1] != ';'){x += ';'}
		let all = []
		let current = {}
		let i = 0
		while(i < x.length){
			// console.log(x, i, current)
			if(x.substr(i, 2) == '->'){
				current.action = x.substr(0, i)
				x = x.substr(i + 2)
				i = 0
			} else if(x[i] == '#') {
				current.unit = x.substr(0, i)
				x = x.substr(i+1)
				i = 0
			} else if(x[i] == '['){
				current.f_name = x.substr(0, i)
				x = x.substr(i)
				i = 0
	
				let json = undefined
				let end
				for(end = 0; end < x.length; end += 1){
					// console.log(i, end, x)
					if(x.substr(end, 2) == '];'){
						// console.log('testing json', json)
						// in case there is another ];
						try{
							json = JSON.parse(x.substr(i, (end - i) + 1))
						// console.log('testing json', json)
						} catch {
							console.log('failed to parse json')
							json = undefined
							continue
						}
						// console.log('ok')
						break
					}
				}
				if(json == undefined){
					console.error('parse issue in data-x, json expected')
				}
				current.input = json
				x = x.substr(end + 1)
				i = 0
			} else if (x[i] == ';') {
				if(!(current.f_name) && i != 0) {
					current.f_name = x.substr(0, i)
				}
				x = x.substr(i+1)
				i = 0
				if(current.f_name && current.action ) {
					all.push(current)
				}
				current = {}
			} else {
				i += 1
			}
		}
		// console.log(all)
		all.map((current) => {
			if(current.action == undefined){current.action = 'connect'}
			if(current.input == undefined){current.input = []}
			//current unit should stay undefined if not
			if(current.f_name == undefined || current.f_name == ''){throw new Error("parse issue in data-x, no function name found")}
			return JSON.stringify(current)
		})
		return all
	}
	changeEvents(node, new_x, old_x){
		let nx, ox, trig, f, unit, x_node, x
	
		new_x = this.parseEventString(new_x)
		old_x = this.parseEventString(old_x)
		nx = new_x.filter(x => !old_x.includes(x))
		ox = old_x.filter(x => !new_x.includes(x))
		for(x of nx){
			[unit, x_node, trig, f] = this.getEventDetails(x, node)
			unit.addUnitEvent(x_node, trig, f, JSON.stringify(x))
		}
		for(x of ox){
			[unit, x_node, trig, f] = this.getEventDetails(x, node)
			unit.removeUnitEvent(x_node, trig, undefined, JSON.stringify(x))
		}
	}
	handleFirstUnits(){
		let node, x, x_node, trig, f, unit
		x = {}
		for(let u of this.units) {
			x[u.unitName] = u
		}
		this.units = x

		//initial unit load
		let load_units = Array.from(document.querySelectorAll('[data-unit]'))
		for(node of load_units ) {
			this.addUnit(node)
		}

		//initial executors load
		let load_xs = Array.from(document.querySelectorAll('[data-x]'))
		for(node of load_xs) {
			let evs = this.parseEventString(node.dataset.x)
			for(let ev of evs){
				[unit, x_node, trig, f] = this.getEventDetails(ev, node)
				unit.addUnitEvent(x_node, trig, f, JSON.stringify(ev))
			}
		}

		//call load units connect events
		for(node of load_units){
			node._unit.unitConnected()
		}
	}
	createObserver(){
		this.observer = new MutationObserver((ma) => {
			let n, ns, chls, mut, attrs, unit_attrs, x_attrs
			// console.log('mutation', ma)
			ns = []
			ma = Array.from(ma)
			// ma = ma.filter((m) => {return m.type == "childList" || m.type == "attributes"})
			chls = ma.filter((m) => {return m.type == 'childList'})
			for(mut of chls) {
				//remove units
				for(n of mut.removedNodes) {
					//text nodes dont have datasets 😅
					if(n.dataset && n.dataset.unit) { n.unitRemoved() }
				}
				//add units, push to list for later calling connected after everything is linked up
				for(n of mut.addedNodes) {
					if(n.dataset && n.dataset.unit){ ns.push(this.addUnit(n)) }
				}
			}
			attrs = ma.filter((m) => {
				return (m.type == "attributes" && (m.attributeName == 'data-unit' || m.attributeName == 'data-x'))
			})
			//sometimes if you change an attribute, instead of one mutation, it throws up 2, one removing
			//the previous value, one adding the new. We get rid of that now. Also set up for next.
			//So sorry for using maps and all that weirdness but i needed an object key and regular objects
			//stringify that. I didn't make maps! Dont blame me! (plz)
			let dus, xs, target, oldValue, it
			let mattrs = new Map([
				['data-unit', dus = new Map()],
				['data-x',xs = new Map()]
			])
			//ensure that we get 1 of every combo with the most non-nully oldValue
			for(mut of attrs){
				if(!(mattrs.get(mut.attributeName).get(mut.target))){
					mattrs.get(mut.attributeName).set(mut.target, mut.oldValue)
				}
			}
			it = dus.keys()
			while(!((target = it.next()).done)) {
				target = target.value
				oldValue = dus.get(target)
				//So adding a unit I get. Removing I get. Adding more functionality to a unit should be ok too,
				//although the unitConnected and unitRemoved methods wont fire off, we could say that is by design.
				//You would have to watch variable names but OK.
				//However, removing functionality is no-no. For instance if "Generic Printer" is re-set to "Generic Washer"
				//its still going to have the Printer stuff. Adding / Removing functionality will get weird quick.
				//I recommend not doing that.

				//"Hey this stuff is confusing" - do it less.

				if(!(target.dataset.unit)){
					target._unit.unitRemoved()
					target._unit = undefined
				} else {
					if(!oldValue){oldValue = ''}
					let ol = oldValue.split(' ')
					let added = target.dataset.unit.split(' ').filter((z) =>{
						return !(ol.includes(z))
					})
					if(added.length > 0) {
						this.addUnit(target, added)
						if(!(oldValue)){
							ns.push(mut.target)
						}
					}
				}
			}
			it = xs.keys()
			while(!((target = it.next()).done)) {
				target = target.value
				oldValue = xs.get(target)
				this.changeEvents(target, target.dataset.x, oldValue)
			}
			//call unit connected
			for(n of ns) { n._unit.unitConnected() }
		})

		//actual observation
		this.observer.observe(document.body, {
			"childList": true, "attributes": true, "subtree": true,
			"attributeFilter": ['data-x', 'data-unit'], "attributeOldValue": true
		})

		return this.observer
	}

	constructor(unit_list){
		this.units = unit_list
		this.shortcuts()
		this.handleFirstUnits()
		//mutation that keeps track of all this stuff
		this.createObserver()

		return this.observer
	}
	
}

export { UnitHandler, Generic }