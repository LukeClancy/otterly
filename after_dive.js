import morphdom from 'morphdom'
xport default class AfterDive {
	constructor(baseElement, submitter, resolve, reject, isDev){
		this.baseElement = baseElement
		this.submitter = submitter
		this.resolve = resolve
		this.reject = reject
		this.isDev = isDev
	}
	getThing(obj, optional = false, doc = document){
		let el
		if(obj.id){
			el = doc.getElementById(obj.id)
			if(!el && !optional && this.isDev){console.log('could not find object with id: ', obj.id)}
		} else if(obj.selector){
			el = this.getSelector(obj.selector, doc)
			if(!el && !optional && this.isDev){console.log('could not find object with selector: ', obj.selector)}
		} else if(!optional && this.isDev) {
			console.log('expected a node identifier (either a "selector" field or an "id" field)')
		}
		return el
	}
	getSelector(str, doc = document) {
		if(str == "submitter") {
			return this.submitter
		} else if (str == "baseElement") {
			return this.baseElement
		} else {
			return doc.querySelector(str)
		}
	}
	log(obj){
		console.log(obj)
	}
	reload(){
		Turbo.cache.clear()
		otty.goto(window.location.href, {reload: true})
		// window.Turbo.visit(window.location.href, {action: 'replace'})
	}
	redirect(obj){
		otty.goto(obj)
	}
	insert(obj){
		let sel = this.getThing(obj)
		if(!sel) { return }
		let pos = obj['position']
		let html = obj['html']
		sel.insertAdjacentHTML(pos, html)
	}
	morph(x) {
		let opts = x //this includes options that go directly to the morphdom function
		let perm = x['permanent']
		let ign = x['ignore']
		if(opts == null) {
			opts = {}
		}
		if(ign != null || perm != null) {
			let m_parse_p = (selector, from, to) => {
				if(from.matches(selector) && to.matches(selector)) {
					return false
				} else {
					return true
				}
			}
			let m_parse_i = (selector, from, to) => {
				if(from.matches(selector) || to.matches(selector)) {
					return false
				} else {
					return true
				}
			}
			let m_parse = (selectors, inner_parse, from, to) => {
				if(!(Array.isArray(selectors))) {
					selectors = [selectors]
				}
				for(let y = 0; y < selectors.length; y++) {
					if(!inner_parse(selectors[y], from, to)){
						return false
					}
				}
				return true
			}
			opts['onBeforeElChildrenUpdated'] = (from, to) => {
				if(! m_parse(ign, m_parse_i, from, to) ) {
					return false
				}
				if(! m_parse(perm, m_parse_p, from, to) ) {
					return false
				}
				return true
			}
		}
		let s = this.getThing(x)
		if(!s) { return }
		morphdom(s, x['html'], opts)
	}
	remove(obj) {
		let s = this.getThing(obj)
		if(!s) { return }
		s.parentNode.removeChild(s)
	}
	replace(obj){
		//this method needs more scrutiny

		//does not support baseElement or submitter selectors. Recommend using ids.
		let sel, parser, tempdoc, orienter, childrenOnly

		parser = new DOMParser();
		tempdoc = parser.parseFromString(obj['html'],  "text/html")
		orienter = this.getThing(obj, false, tempdoc)
		if(!orienter){return}
		childrenOnly = obj['childrenOnly']
		sel = this.getThing(obj)
		if(!sel){return}
		if(orienter == null) {
			if(childrenOnly) {
				sel.innerHTML = obj['html']
			} else {
				orienter = tempdoc.querySelector('body').children[0]
				sel.replaceWith(orienter)
			}
		} else {
			if(childrenOnly) {
				sel.innerHTML = orienter.innerHTML
			} else {
				sel.replaceWith(orienter)
			}
		}
	}
	innerHtml(obj) {
		let s = this.getThing(obj)
		if(!s){return}
		s.innerHTML = obj['html']
	}
	eval2(data) {								
		//anything weird? Just use this. You have access to anything in the hash.
		//selector input is special and will automatically be set to the variable referenced.
		//note it doesn't actually use eval for performance related reasons. Something about effects on minimization i believe.
		//is this a security risk? We check we are connecting with ourselves above. So should be fine
		let selector = getThing(data, true)
		//continue being insane lol
		let x = Function("data", "selector", 'baseElement', 'submitter', `"use strict"; ${data['code']};`)(data, selector, this.baseElement, this.submitter)
		if(x == "break") {						//lil bit of extra awesome
			resolve(returning)
			return "break"
		}
	}
	setData(data){
		let keys, x, key, obj, attrs, attr_keys, y, attr_key
		keys = Object.keys(data)
		for(x = 0; x < keys.length; x++) {
			key = keys[x]
			obj = this.getSelector(key)
			attrs = data[key]
			attr_keys = Object.keys(attrs)
			for(y = 0; y < attr_keys.length; y++) {
				attr_key = attr_keys[y]
				obj.dataset[attr_key] = attrs[attr_key]
			}
		}
	}
}