
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
	constructor(generic, unit_list){
		this.generic = generic
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
		HTMLElement.prototype.qs = function(str){ return this.querySelector(str) }
		HTMLElement.prototype.qsa = function(str){ return this.querySelectorAll(str) }		
	}
	addUnit(ob, nms) {
		if(nms == undefined) {
			nms = ob.dataset.unit.split(' ') 
		}
		let onConnected = []
		let onRemoved = []
		let u

		if(ob._unit == undefined) {
			ob._unit = {...this.generic}
			u = ob._unit
			Object.defineProperties(u, {
				el: {
					get: function(){return this.element},
					set: function(v){return this.element = v}
				}
			})
		} else {
			u = ob._unit
		}
		let cs = [u]
		for(let nm of nms){
			let c = this.units[nm]
			if(c == undefined) {
				console.error('data-unit\'s \'' + nm + '\' is not matching any unit names.')
			} else if (!(c == this.generic)) {
				cs.push(c)
			}
		}

		//Collected onConnected / onRemoved events that happen to all
		for(let u of cs){
			if(u.onConnected){onConnected.push(u.onConnected)}
			if(u.onRemoved){onRemoved.push(u.onRemoved)}
		}
		
		Object.assign(...cs)
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
		let node, x, unit
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
				unit = this.getEventUnit(ev, node)
				if(!unit){continue}
				unit.addUnitEvent(ev, node)
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
	getEventUnit(x, xNode, brokenParent){
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

		if(!unit || !(unit._unit)){
			if(otty.isDev){console.log("unit not found for following node:", xNode, "event parse data: ", x)}
			return null
		}
	
		return unit._unit
	}
	changeEvents(node, new_x, old_x, brokenParent){
		let unit, x, nx, ox

		new_x = this.parseEventString(new_x)
		old_x = this.parseEventString(old_x)
		
		nx = new_x.filter(x => !old_x.includes(x))
		ox = old_x.filter(x => !new_x.includes(x))
		for(x of ox){
			unit = this.getEventUnit(x, node, brokenParent)
			if(!unit){ continue }
			unit.removeUnitEvent(x, node)
		}
		for(x of nx){
			unit = this.getEventUnit(x, node, brokenParent)
			if(!unit){continue}
			unit.addUnitEvent(x, node)
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
					if(! n.querySelector ){ continue } //<- text nodes

					let evNodes = this.qsInclusive(n, '[data-on]')
					for(let evNode of evNodes){ this.changeEvents(evNode, '', evNode.dataset.on, brokenParent) }

					let units = this.qsInclusive(n, '[data-unit]')
					for(let u of units){ u._unit?.unitRemoved() } //generic.js sets ._unit to undefined
				}
				//add units and then events
				for(n of mut.addedNodes) {
					if(! n.querySelector ){ continue } //<- text nodes

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
					target._unit?.unitRemoved()
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
		this.observer.observe(document.documentElement, {
			"childList": true, "attributes": true, "subtree": true,
			"attributeFilter": ['data-on', 'data-unit'], "attributeOldValue": true
		})

		return this.observer
	}
}