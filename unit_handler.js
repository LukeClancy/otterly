import Generic from "./units/generic.js"

//this file contains all the code for Unit Handling (data-unit, data-ex). It also includes shortcuts
//for element access.
//
//we:
//	1. create shortcuts for easier access to important html funcionality (currentTarget = ct, dataset = ds, e.currentTarget.dataSet.x = e.ct.ds.x).
//		These attributes get used constantly, this helps think about the more important bits.
//	2. Accept a bunch of custom units.
//	3. Initial load those units and event handlers
//	4. Create observers for those attributes and keep it updated.

export default class UnitHandler {
	constructor(unit_list){
		this.units = unit_list
		this.shortcuts()
		this.handleFirstUnits()
		//mutation that keeps track of all this stuff
		this.createObserver()

		return this
	}
	shortcuts(){
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
		let onConnected = []
		let onRemoved = []
		let u = ob._unit
		let cs = [u]
		// console.log('nms', nms)
		for(let nm of nms){
			let c = this.units[nm]
			if(c == undefined) {
				console.error('data-unit\'s \'' + nm + '\' is not matching any unit names.')
			} else if (!(c == Generic)) {
				cs.push(c)
			}
		}

		//Collected onConnected / onRemoved events that happen to all
		for(let u of cs){
			if(u.onConnected){onConnected.push(u.onConnected)}
			if(u.onRemoved){onRemoved.push(u.onRemoved)}
		}
		
		Object.assign(...cs)
		Object.defineProperties(u, {
			el: {
				get: function(){return this.element},
				set: function(v){return this.element = v}
			}
		})
		u.el = ob

		if(onConnected.length > 0){
			u.unitConnected= (function(oc, uc) {
				uc.bind(this)()
				for(let f of oc){
					f.bind(this)()
				}
			}).bind(u, onConnected, u.unitConnected)
		}
		if(onRemoved.length > 0) {
			u.unitRemoved= (function(or, ur) {
				ur.bind(this)()
				for(let f of or){
					f.bind(this)()
				}
			}).bind(u, onRemoved, u.unitRemoved)
		}
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
	

		if(x.unit) {
			unit = x_node.closest(`[data-unit~=\'${x.unit}\']`)._unit
		} else {
			unit = x_node.closest('[data-unit]')._unit
		}
		if(unit[x.f_name] == undefined){
			console.error(`${x.f_name} not defined on unit`)
			return null
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
					console.error('parse issue in data-on, json expected')
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
			if(current.f_name == undefined || current.f_name == ''){throw new Error("parse issue in data-on, no function name found")}
			return JSON.stringify(current)
		})
		return all
	}
	changeEvents(node, new_x, old_x){
		let nx, ox, trig, f, unit, x_node, x, deets
	
		new_x = this.parseEventString(new_x)
		old_x = this.parseEventString(old_x)
		nx = new_x.filter(x => !old_x.includes(x))
		ox = old_x.filter(x => !new_x.includes(x))
		for(x of nx){
			deets = this.getEventDetails(x, node)
			if(deets == null){ continue }
			[unit, x_node, trig, f] = deets
			unit.addUnitEvent(x_node, trig, f, JSON.stringify(x))
		}
		for(x of ox){
			deets = this.getEventDetails(x, node)
			if(deets == null){ continue }
			[unit, x_node, trig, f] = deets
			unit.removeUnitEvent(x_node, trig, undefined, JSON.stringify(x))
		}
	}
	handleFirstUnits(){
		let node, x, x_node, trig, f, unit, deets
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
		let load_xs = Array.from(document.querySelectorAll('[data-on]'))
		for(node of load_xs) {
			let evs = this.parseEventString(node.dataset.on)
			for(let ev of evs){
				deets = this.getEventDetails(ev, node)
				if(deets == null){continue}
				[unit, x_node, trig, f] = deets
				unit.addUnitEvent(x_node, trig, f, JSON.stringify(ev))
			}
		}

		//call load units connect events
		for(node of load_units){
			node._unit.unitConnected()
		}
	}
	qsInclusive(n, pat){
		let units = Array.from(n.querySelectorAll(pat))
		if(n.matches(pat)){units.push(n)}
		return units
	}
	createObserver(){
		this.observer = new MutationObserver((ma) => {
			let n, ns, chls, mut, attrs
			// console.log('mutation', ma)
			ns = []
			ma = Array.from(ma)
			// ma = ma.filter((m) => {return m.type == "childList" || m.type == "attributes"})
			chls = ma.filter((m) => {return m.type == 'childList'})
			for(mut of chls) {
				//remove units
				for(n of mut.removedNodes) {
					//text nodes included 😅
					if(! n.querySelector ){ continue }
					let units = this.qsInclusive(n, '[data-unit]')
					for(let u of units){ u._unit.unitRemoved() }
				}
				//add units, push to list for later calling connected after everything is linked up
				for(n of mut.addedNodes) {
					if(! n.querySelector ){ continue }
					let units = this.qsInclusive(n, '[data-unit]')
					for(let u of units){ ns.push(this.addUnit(u)) }
					let evNodes = this.qsInclusive(n, '[data-unit]')
					for(let evNode of evNodes){this.changeEvents(evNode, evNode.dataset.on, '')}
				}
			}
			attrs = ma.filter((m) => {
				return (m.type == "attributes" && (m.attributeName == 'data-unit' || m.attributeName == 'data-on'))
			})
			//sometimes if you change an attribute, instead of one mutation, it throws up 2, one removing
			//the previous value, one adding the new. We get rid of that now. Also set up for next.
			//So sorry for using maps and all that weirdness but i needed an object key and regular objects
			//stringify that. I didn't make maps! Dont blame me! (plz)
			let dus, xs, target, oldValue, it
			let mattrs = new Map([
				['data-unit', dus = new Map()],
				['data-on',xs = new Map()]
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
				this.changeEvents(target, target.dataset.on, oldValue)
			}
			//call unit connected
			for(n of ns) { n._unit.unitConnected() }
		})

		//actual observation
		this.observer.observe(document.body, {
			"childList": true, "attributes": true, "subtree": true,
			"attributeFilter": ['data-on', 'data-unit'], "attributeOldValue": true
		})

		return this.observer
	}
}