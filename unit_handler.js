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
		
		this.createObserver() //mutation that keeps track of all this stuff

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
				for(let f of or){
					f.bind(this)()
				}
				ur.bind(this)()
			}).bind(u, onRemoved, u.unitRemoved)
		}
		return ob
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
	getEventDetails(x, xNode, brokenParent = null){
		//click->LikeArea#like				will find the closest LikeArea dataunit and hit like
		//click->like						will just hit the like function of the closest data unit
		//option 1: click->like(e, post: true)	will find the closest data unit and run unit.like(e, post: true)
		//option 2: click->like({})			< the {} gets parsed as javascript and is added to the function call. Issue, only one parameter at a time
		//option 3: click->like([])			< then we use the ... syntax to expand it and throw in the e as first param. I like this because
		//										it allows multiple deep parameters in a non shitty way (unlike stimulusjs), while also stopping people from
		//										habitually inlining js which could become an issue in option 1. Also would prevent having to run JSON.parse on everything.
		//
		// I did not like option 1 since it encourages javascript in the html which is kinda messy. Ended up doing
		// something like this click->like[...]; which works well i think. OFC we made writing out the unit optional

		let getUnit = (from, x) => {
			if(x.unit) {
				return from.closest(`[data-unit~=\'${x.unit}\']`)
			} else {
				return  from.closest('[data-unit]')
			}
		}
		let unit = getUnit(xNode, x)
		//so when we remove the event, its not in the parents doc
		//which can make things weird, hence brokenParent.
		if(brokenParent && !unit){ unit = getUnit(brokenParent, x) }

		if((!unit) || (! (unit = unit._unit)) || (!unit[x.f_name])){
			if(!unit){
				console.error(`data-on error, unable to find unit requested for '${x.f_name}'`)	
			}else{
				console.error(`data-on error, '${x.f_name}' not defined on unit`) }
			return null
		}
		let func = unit[x.f_name].bind(unit, ...x.input)
	
		return [unit, xNode, x.action, func]
	}
	changeEvents(node, new_x, old_x, opts){
		let trig, f, unit, xNode, x, deets, nx, ox

		new_x = this.parseEventString(new_x)
		old_x = this.parseEventString(old_x)
		
		nx = new_x.filter(x => !old_x.includes(x))
		ox = old_x.filter(x => !new_x.includes(x))
		for(x of ox){
			deets = this.getEventDetails(x, node, opts.brokenParent)
			if(deets == null){ continue }
			[unit, xNode, trig, f] = deets
			unit.removeUnitEvent(xNode, trig, undefined, JSON.stringify(x))
		}
		for(x of nx){
			deets = this.getEventDetails(x, node)
			if(deets == null){ continue }
			[unit, xNode, trig, f] = deets
			unit.addUnitEvent(xNode, trig, f, JSON.stringify(x))
		}
	}
	createObserver(){
		this.observer = new MutationObserver((ma) => {
			let n, ns, chls, mut, attrs
			ns = []
			ma = Array.from(ma)
			//get children
			chls = ma.filter((m) => {return m.type == 'childList'})
			for(mut of chls) {
				//remove events and then units. Broken parents
				//are a little weird but it works.
				for(n of mut.removedNodes) {
					let brokenParent = mut.target

					if(! n.querySelector ){ continue }

					let evNodes = this.qsInclusive(n, '[data-on]')
					for(let evNode of evNodes){ this.changeEvents(evNode, '', evNode.dataset.on, { brokenParent }) }

					let units = this.qsInclusive(n, '[data-unit]')
					for(let u of units){ u._unit.unitRemoved() } //generic.js sets ._unit to undefined
				}
				//add units and then events
				for(n of mut.addedNodes) {
					if(! n.querySelector ){ continue }
					let units = this.qsInclusive(n, '[data-unit]')
					for(let u of units){ ns.push(this.addUnit(u)) }

					let evNodes = this.qsInclusive(n, '[data-on]')
					for(let evNode of evNodes){ this.changeEvents(evNode, evNode.dataset.on, '') }
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
				['data-on', xs = new Map()]
			])
			//ensure that we get 1 of every combo with the most non-nully oldValue
			for(mut of attrs){
				if(!(mattrs.get(mut.attributeName).get(mut.target))){
					mattrs.get(mut.attributeName).set(mut.target, mut.oldValue)
				}
			}
			console.log('mattrs', mattrs, attrs)

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