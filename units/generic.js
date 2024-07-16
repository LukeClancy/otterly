let generic =  {
	unitName: "Generic",
	unitRemoved(){
		this.el._unit = undefined

		for(let ev of this.unitEvents){
			ev.obj.removeEventListener()
		}
	},
	unitConnected(){
	},
	unitEvents: [],
	addUnitEvent(obj, nm, f, f_str){
		obj.addEventListener(nm, f)
		this.unitEvents.push({obj, nm, f, f_str})
	},
	removeUnitEvent(obj, nm, f, f_str){
		let comp, e
		// find the event, allowing fuzzy event / object finding if needed
		if(f_str != undefined) {
			comp = (ue) => (obj == ue.obj && nm == ue.nm && f_str == ue.f_str)
		} else if (f != undefined) {
			comp = (ue) => (obj == ue.obj && nm == ue.nm && f == ue.f)
		} else {
			comp = (ue) => (obj == ue.obj && nm == ue.nm)
		}
		e = this.unitEvents.find(comp)
		//return nothing if not found, or remove event and pass back details.
		if(e == undefined){return e}
		e = this.unitEvents.splice(this.unitEvents.indexOf(e), 1)[0]
		e.obj.removeEventListener(e.nm, e.f)
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
		'withCredentials', 'e', 'submitter'],
	diveErrParams: ['formInfo', 'xhrChangeF', 'baseElement'],
	relevantData(e){
		if(e){
			return {unitId: el.id, submitterId: e.ct.id, ...el.dataset, ...e.ct.dataset}
		} else {
			return {unitId: el.id, ...el.dataset}
		}
	},
	diveInfo(e, h = {}){
	//this function is for formatting html data into a format for an otty dive. Behaviours:
	//	1. returns an object with the dive options, including the formInfo option (which has the information sent to the server)
	//		- if a dataset key is included in diveOptParams, it will be added to the options.
	//		- if a dataset key is included in diveErrParams, you will get a warning.
	//		- otherwise, it will be added as a form field in formInfo.
	//		('csrfHeader' key = the data-csrf-header parameter in the html. As csrfHeader is in diveOptParams, it will become an option.)
	//	2. formInfo includes unitId, submitterId, the units dataset, and the event's currentTarget dataset (with the currentTarget taking priority.)
	//	3. options:
	//		opts:		override default options hash (must still have formInfo object)
	//		data:		override the dataset aquisition
	//		formData:	override the default FormData object
	//		inputs: 	boolean. Include input names/values for the unit.
	//
	//	note that if there are any formData keys (through formData or inputs options) then function will return a FormData object.
		let defaults = {
			opts: {e: e, method: 'POST', formInfo: {}},
			data: { ...this.relevantData(e) }, 
			formData: new FormData(),
			inputs: false
		}
		h = { ...defaults, ...h	}
		h.opts = {...defaults.opts, ...h.opts} //regain e and formInfo

		let inp, els, k
		for(k of Object.keys(h.data)){
			if(this.diveOptParams.includes(k)){
				h.opts[k] = h.data[k]
			} else if(this.diveErrParams.includes(k)){
				console.error('bad key for diveDataset: ' + k)
			} else {
				h.opts.formInfo[k] = h.data[k]
			}
		}
		if(h.inputs){
			//we use formData so it doesn't freak if theres an image or something.
			els = Array.from(el.qsa('input'))
			if(el.nodeName == 'INPUT'){els.push(el)}
			for(inp of els) {
				if(inp.name != null && inp.value != null) {
					h.formData.append(inp.name, inp.value)
				}
			}
		}
		if(!(h.formData.keys().next().done)){
			h.opts.formInfo = otty.obj_to_fd(opts.formInfo, h.formData)
		}
		return h.opts
	},
	dive(e, h){
		e.preventDefault();
		e.stopPropagation();
		if(!h){h = {}}
		otty.dive(this.diveInfo(e, h))
	}
}

Object.defineProperties(generic, {
	el: {
		get: function(){return this.element},
		set: function(v){return this.element = v}
	}
})

export default generic