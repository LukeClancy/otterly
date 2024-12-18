let generic =  {
	unitName: "Generic",
	unitRemoved(){
		this.el._unit = undefined
	},
	unitConnected(){
	},
	unitEvents: [],
	addUnitEvent(evInfo, actionNode) {
		let action = evInfo.action
		let f_name = evInfo.f_name
		let input = evInfo.input
		let f = this[f_name]
		if(!f){console.error(`Could not find function ${f} on unit: `, this, "data-on defined on: ", actionNode); return}

		let f3
		let dis = this
		if(input.length > 0){
			//we want the function to look like this x(event, input1, input2, ...)
			//but by binding before the event listener  it ends up looking like (input 1, ..., event)
			f3 = (event) => f.bind(dis)(event, ...input)
		} else {
			f3 = (event) => f.bind(dis)(event)
		}

		let f_str =  JSON.stringify(evInfo)
		if(action == "_remove"){
			this.unitEvents.push({actionNode,  action, f: f3, f_str, f_name})
		} else if(action == "_parse"){
			actionNode.addEventListener(action, f3)
			actionNode.dispatchEvent(new Event(action))
			actionNode.removeEventListener(action, f3)
		} else {
			actionNode.addEventListener(action, f3)
			this.unitEvents.push({actionNode, action, f: f3, f_str, f_name})
		}
	},
	removeUnitEvent(evInfo, actionNode){ //obj, nm, f, f_str) {
		//find the action based on the information provided
		let f_str = JSON.stringify(evInfo)
		let comp = (ue) => (actionNode == ue.actionNode && ue.f_str == f_str)
		let e = this.unitEvents.find(comp)

		if(e == undefined){return e}
		e = this.unitEvents.splice(this.unitEvents.indexOf(e), 1)[0]
		if(e.action == "_remove"){
			e.actionNode.addEventListener(e.action, e.f)
			e.actionNode.dispatchEvent(new Event(e.action))
			e.actionNode.removeEventListener(e.action, e.f)
		} else {
			e.actionNode.removeEventListener(e.action, e.f)
		}
		return e
	},
	// cool, now we can go e.ct.ds.val = this.element.q('[data-target]').d.val and its workable.
	parentUnit(unitc){
		let p = this.el.parentElement
		if(unitc == undefined) {
			while(p != null && !(p.dataset.unit == undefined)){
				p = p.parentElement
			}
		} else {
			while(p != null && !(p.dataset.unit.split(' ').includes(unitc))){
				p = p.parentElement
			}
		}
		if(p == undefined){ return p }
		return p._unit
	},
	childUnitsFirstLayer(unitc){
		let arr
		if(unitc == undefined) {
			arr = this.el.qa(':scope [data-unit]:not(:scope [data-unit] [data-unit])');
		} else {
			arr = this.el.qa(":scope [data-unit] [data-unit='" + unitc + "']:not(:scope [data-unit] [data-unit~='" + unitc + "'])");
		}
		return Array.from(arr).map(el => el._unit)
	},
	childUnitsDirect(unitc){
		let arr
		if(unitc == undefined) {
			arr = this.qa(':scope > [data-unit]')
		} else {
			arr = this.qa(":scope > [data-unit~='" + unitc + "']")
		}
		return Array.from(arr).map(el => el._unit)
	},
	childUnits(unitc){
		let arr
		if(unitc == undefined) {
			arr = this.qa(':scope [data-unit]')
		} else {
			arr = this.qa(":scope [data-unit~='" + unitc + "']")
		}
		return Array.from(arr).map(el => el._unit)
	},
	diveOptParams: ['url', 'method', 'csrfContent',
		'csrfHeader', 'csrfSelector', 'confirm',
		'withCredentials', 'e', 'submitter'
	],
	diveErrParams: ['formInfo', 'xhrChangeF', 'baseElement'],
	relevantData(e){
		if(e){
			let unitId = this.el.id
			let submitterId = e.ct.id
			let d1 = this.el.dataset
			let d2 = e.ct.dataset
			let out = {unitId, submitterId, ...d1, ...d2}
			return out
		} else {
			return {unitId: this.el.id, ...this.el.dataset}
		}
	},
	diveRepeatDefaultStopF(h){
		//due to spa this pageChanged thing can be a bother.
		let pageChanged = window.location.href != h.originalPageLocation
		let askedToStop = ( h.lastResult == "STOP" )
		return (pageChanged || askedToStop)
	},
	
	diveBehaviors: {
		repeat: async function(e, h) { //async 
			//h.stopF, h.repeats, h.originalPageLocation, h.waitTime, h.lastResults, h.processF
			h.originalPageLocation = window.location.href
			//get the functions requested from the unit, passing actual function objects not supported
			if(! h.stopF){
				h.stopF = this.diveRepeatDefaultStopF.bind(this)
			} else {
				h.stopF = (this[h.stopF]).bind(this)
			}
			if(h.processF){h.processF = (this[h.processF]).bind(this)}
			h.repeats = 0
			if(!h.waitTime){h.waitTime = 3000}
			let inf = this.diveInfo(e, h)
			while(!h.stopF(h)){
				h.lastResult = otty.dive(inf)
				if(h.processF){h.processF(h)}
				h.repeats += 1
				let justWait = (resolver) => setTimeout(resolver, h.waitTime)
				await new Promise(justWait, justWait)
			}
		},
		stagger: async function(e, h){
			this.delayInfo = this.diveInfo(e, h)
			if(this.timeoutWait){return}

			let doit = (() => {
				this.lastStagger =(new Date().getTime())
				this.timeoutWait = undefined
				return otty.dive(this.delayInfo)
			}).bind(this)

			if(!this.lastStagger){this.lastStagger = 0}
			let waitedFor = (new Date().getTime()) - this.lastStagger
			let stag = h.stagger || 500
			if(waitedFor < stag){
				this.timeoutWait = setTimeout((() => {
					doit()
				}).bind(this), stag - waitedFor)
			} else {
				doit()
			}
		},
		limit: async function(e, h){
			let tn = new Date().getTime()
			let stag = h.waitTime || 500
			if ( this.lastStagger && (tn - this.lastStagger) < stag){
				return
			}
			this.lastStagger = tn
			return this.diveBehaviors.default.bind(this)(e, h)
		},
		default: function(e, h){
			return otty.dive(this.diveInfo(e, h))
		}
	},
	diveInfo(e, h = {}){
		//this function is for formatting html data into a format for an otty dive. Behaviours:
		//	1. returns an object with the dive options, includexing the formInfo option (which has the information sent to the server)
		//		- if a dataset key is included in diveOptParams, it will be added to the options.
		//		- if a dataset key is included in diveErrParams, you will get a warning.
		//		- otherwise, it will be added as a form field in formInfo.
		//		('csrfHeader' key = the data-csrf-header parameter in the html. As csrfHeader is in diveOptParams, it will become an option.)
		//	2. formInfo includes unitId, submitterId, the units dataset, and the event's currentTarget dataset (with the currentTarget taking priority.)
		//	3. options:
		//		opts:		override default options hash (must still have formInfo object)
		//		data:		override the dataset aquisition
		//		formData:	override the default FormData object
		//		withform: 	This does a few things:
		//				- includes any input elements within the unit (not the form) in the request
		//              - if the data-path / data-method is not included, falls back to closest form's action/formaction/method/formethod html attitrubes
		//				- you can think of this boolean as saying "play nice with the html"
		//
		//	note that if the unit is on a form, it will automatically activate withForm and use that forms
		//		formdata
		
		let defaults = {
			opts: {e: e, formInfo: {}},
			withform: false
		}

		//get the input data elements
		let data = this.relevantData(e)

		//parse the settings into appropriate locations
		h = { ...defaults, ...h	}
		h.opts = {...defaults.opts, ...h.opts} //regain e and formInfo
		let inp, els, k
		for(k of Object.keys(data)){
			if(this.diveOptParams.includes(k)){
				h.opts[k] = data[k]
			} else if(this.diveErrParams.includes(k)){
				console.error('bad key for diveDataset: ' + k)
			} else {
				h.opts.formInfo[k] = data[k]
			}
		}
		// if its a form treat inputs as natively as possible. Otherwise
		// if someone wants it to act form-like, then try that. Note
		// that in this case it doesn't work with everything...
		// (checkboxes for example). Usually fine though.
		if(this.element.nodeName == "FORM"){
			h.withform = true
			h.formData = new FormData(this.element)
		} else if(h.withform){
			els = Array.from(this.el.qsa('input'))
			if(this.el.nodeName == 'INPUT'){els.push(this.el)}
			for(inp of els) {
				if(inp.name != null && inp.value != null) {
					h.formData.append(inp.name, inp.value)
				}
			}
		}
		
		
		if(!(h.opts.url)){ h.opts.url = h.opts.formInfo.path }
		if(!(h.opts.method)){h.opts.method = h.opts.formInfo.method}
		if(h.withform){
			if(!( h.opts.url)){ h.opts.url = e.ct.getAttribute("formaction")}
			if(! (h.opts.url) ){ h.opts.url = e.ct.closest('form')?.getAttribute('action') }
			if(!(h.opts.method)){ h.opts.method = e.ct.getAttribute("formmethod")}
			if(!(h.opts.method)){ h.opts.method = e.ct.closest('form')?.getAttribute('method') }
			if(e.ct.name && e.ct.value){
				h.formData.append(e.ct.name, e.ct.value)
			}
		}
		if(!(h.opts.method)){ h.opts.method = "POST"}

		h.opts.formInfo = otty.obj_to_fd(h.opts.formInfo, h.formData)

		return h.opts
	},
	dive(e, h){
		if(!h['allowDefault']){e.preventDefault()}
		let act
		if(h.behavior == undefined){h.behavior = 'default'}
		if(act = this.diveBehaviors[h.behavior]){
			act.bind(this)(e, h)
		} else {
			console.error("bad behavior type for a dive")
		}
	}
}

Object.defineProperties(generic, {
	el: {
		get: function(){return this.element},
		set: function(v){return this.element = v}
	}
})

export default generic