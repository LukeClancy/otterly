import morphdom from 'morphdom'
class AfterDive {
	constructor(base_element, submitter, resolve, reject, development){
		this.base_element = base_element
		this.submitter = submitter
		this.resolve = resolve
		this.reject = reject
		this.development = development
	}
	get_selector(str) {
		if(str == "submitter") {
			return this.submitter
		} else if (str == "base_element") {
			return this.base_element
		} else {
			return this.querySelector(str)
		}
	}
	log(obj){
		console.log(obj)
	}
	reload(){
		Turbo.cache.clear()
		window.Turbo.visit(window.location.href, {action: 'replace'})
	}
	redirect(obj){
		window.Turbo.visit(obj)
	}
	insert(obj){
		let sel = this.get_selector(obj['selector'])
		if(sel == null && this.development) {
			console.log('missing selector ', obj['selector'])
		}
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
		let s = this.get_selector(x['selector'])
		if(s ==null && this.development) {
			console.log('missing selector ', x['selector'])
			return
		}
		morphdom(s, x['html'], opts)
	}
	remove(obj) {
		let s = this.get_selector(obj['selector'])
		s.parentNode.removeChild(s)
	}
	replace(obj){
		//this method needs more scrutiny

		//does not support base_element or submitter selectors. Recommend using ids.
		let sel, parser, tempdoc, orienter, children_only

		parser = new DOMParser();
		tempdoc = parser.parseFromString(obj['html'],  "text/html")
		orienter = tempdoc.querySelector(obj['selector'])
		children_only = obj['children_only']
		sel = this.querySelector(obj['selector'])
		if(sel == null && this.development) {
			console.log('missing selector ', obj['selector'])
			return
		}

		if(orienter == null) {
			if(children_only) {
				sel.innerHTML = obj['html']
			} else {
				orienter = tempdoc.querySelector('body').children[0]
				sel.replaceWith(orienter)
			}
		} else {
			if(children_only) {
				sel.innerHTML = orienter.innerHTML
			} else {
				sel.replaceWith(orienter)
			}
		}
	}
	inner_html(obj) {
		let s = this.get_selector(obj['selector'])
		if(s == null && this.development) {
			console.log('missing selector ', obj['selector'])
			return
		}
		s.innerHTML = obj['html']
	}
	eval2(data) {								//anything weird? Just use this. You have access to anything in the hash.
												//selector input is special and will automatically be set to the variable referenced.
		let selector							//note it doesn't actually use eval for performance related reasons. Something about effects on minimization i believe.
		if(data['selector']){					//is this a security risk? We check we are connecting with ourselves above. So should be fine
			selector = this.get_selector(data['selector'])
		}
		//continue being insane lol
		let x = Function("data", "selector", 'base_element', 'submitter', `"use strict"; ${data['code']};`)(data, selector, this.base_element, this.submitter)
		if(x == "break") {						//lil bit of extra awesome
			resolve(returning)
			return "break"
		}
	}
	set_data(data){
		let keys, x, key, obj, attrs, attr_keys, y, attr_key
		keys = Object.keys(data)
		for(x = 0; x < keys.length; x++) {
			key = keys[x]
			obj = this.get_selector(key)
			attrs = data[key]
			attr_keys = Object.keys(attrs)
			for(y = 0; y < attr_keys.length; y++) {
				attr_key = attr_keys[y]
				obj.dataset[attr_key] = attrs[attr_key]
			}
		}
	}
}
export { AfterDive }