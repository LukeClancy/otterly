import morphdom from 'morphdom'

export default {
	init(isDev, afterDive, csrfSelector, csrfHeader){
		return {isDev, afterDive, csrfSelector, csrfHeader, ...this}
	},
	obj_to_fd(formInfo, formData) {
		if(formInfo instanceof FormData) {
			return formInfo
		} else {
			//get good 🦄
			let recursed = (formData, key, item) => {
				let key2, item2
				if(Array.isArray(item)) {
					for(key2 in item) {
						item2 = item[key2]
						recursed(formData, key + "[]", item2)
					}
				}
				else if(typeof item === 'object') {
					for(key2 in item) {
						item2 = item[key2]
						recursed(formData, key + "[" + key2 + "]", item2)
					}
				} else {
					formData.append(key, item)
				}
			}
			if(!formData){
				formData = new FormData();
			}
			let key;
			for(key in formInfo){
				let item = formInfo[key]
				recursed(formData, key, item)
			}
			return formData
		}
	},
	_sendsXHROnLoad(resolve, reject, xhr, responseType){
		if(xhr.status >= 200 && xhr.status <= 302 && xhr.status != 300) {
			let rsp = xhr.response
			if(responseType == 'json'){
				try { rsp = JSON.parse(rsp) } catch {}
			}
			resolve({response: rsp, xhr: xhr})
			// get xhr.json for the json.
		} else {
			reject({status: xhr.status, statusText: xhr.statusText});
		}
	},
	_sendsXHROnError(resolve, reject, xhr){
		reject({
			status: xhr.status,
			statusText: xhr.statusText
		});
	},
	sendsXHR({url, formInfo, method = "POST", xhrChangeF,
		csrfContent, csrfHeader = this.csrfHeader,
		csrfSelector = this.csrfSelector,
		confirm, withCredentials = true, responseType="json",
		onload = this._sendsXHROnLoad, onerror = this._sendsXHROnError}){
		
		if(!csrfContent){
			csrfContent = document.querySelector(csrfSelector).content
		}

		return new Promise(function(resolve, reject) {
			var xhr, form_data;

			xhr = new XMLHttpRequest();
			xhr.withCredentials = withCredentials
			xhr.open(method, url)
			xhr.responseType=responseType
			xhr.onload = onload.bind(this, resolve, reject, xhr, responseType)
			xhr.onerror = onerror.bind(this, resolve, reject, xhr)

			//get formInfo into the form_data
			form_data = this.obj_to_fd(formInfo)

			xhr.setRequestHeader(csrfHeader, csrfContent)
			
			//helper so we know where this came from. Super useful when for example, checking
			//if someones signed in, and figuring out how to notify them that they are not
			//redirect back with a flash? Or just morph a message up?
			xhr.setRequestHeader('Otty', 'true')

			//add a file or something if you want go nuts
			if(xhrChangeF) {
				xhr = xhrChangeF(xhr)
			}

			if(confirm) {
				confirm = confirm(confirm)
				if(confirm) {
					xhr.send(form_data)	
				} else {
					resolve({'returning': 'user rejected confirm prompt'})
				}
			} else {
				xhr.send(form_data)
			}
		}.bind(this))
	},
	isLocalUrl(url, subdomainAccuracy = -2){
		//local includes subdomains. So if we are on x.com, x.com will work and y.x.com will work, but y.com wont.
		//change the -2 to -3, -4 etc to modify. Times where this may be an issue:
		//	- if you share domains with untrusted partys.
		let d = window.location.hostname
		let urld = (new URL(url, window.location)).hostname //url_with_default_host

		if( d.split('.').slice(subdomainAccuracy).join('.') == urld.split('.').slice(subdomainAccuracy).join('.')) {
			return true
		}
		return false
	},
	xss_pass(url){
		return this.isLocalUrl(url, -2)
	},
	dive(opts = {}){
		//divewire can be a security risk as its so dynamic, so make sure we are only connecting with ourselves...
		let url = opts.url
		let baseElement = opts.baseElement
		let submitter = opts.submitter
		if(opts.e != null) {
			if(baseElement == null) {
				baseElement = opts.e.currentTarget
			}
			if(submitter == null) {
				submitter = opts.e.submitter
			}
		}

		if(!this.xss_pass(url)){ throw url + " is not a local_url"	}
	
		let handle_response = ((actions, resolve, reject) => {
			let y, ottys_capabilities, task, data, out, returning, dive_id, action

			returning = actions

			if(!Array.isArray(actions)) {
				actions = [actions]
			}

			y = 0
			ottys_capabilities = this.afterDive.init(baseElement, submitter, resolve, reject, this.isDev)

			for(action of actions) {
				if(!action){continue}
				//make sure we have not already processed this dive (matters with polling)
				dive_id = action.dive_id
				if(dive_id) {
					if( this.previousDives.includes(dive_id) ) {
						continue;
					}
					this.previousDives.push(dive_id)
					delete action.dive_id
				}
				//get ottys task
				task = Object.keys(action)[0]
				data = action[task]
				if(task == 'eval'){task = 'eval2'}
				if(this.isDev){ console.log(task, data) }
				if(task == 'returning') {
					returning = data
				} else {
					try {
						out = ottys_capabilities[task](data)
					} catch(err) {
						if(this.isDev){
							console.log(task, data, err, err.message)
						}
					}
					if(out == "break"){
						break
					}
				}
			}
			resolve(returning)
		}).bind(this)
	
		return new Promise(function(resolve, reject) {
			this.sendsXHR(opts).then((obj) => {
				handle_response(obj.response, resolve, reject)
			}).catch((e) => {
				reject(e)
			})
		}.bind(this))
	},
	//this will default to replacing body if this css selector naught found.

	async stopGoto(href){
		//Check scroll to hash on same page
		let loc = window.location
		href = new URL(href, loc)
		//hashes
		if(loc.origin == href.origin && href.pathname == loc.pathname){
			return await this.scrollToLocationHashElement(href)
		}
		//I wanted my subdomains to be counted too... apparently not possible...
		if(loc.origin != href.origin){
			window.location.href = href.origin
			return true
		}
		return false
	},

	async linkClickedF(e) {
		let href = e.target.closest('[href]')
		if(!href){ return }
		href = href.getAttribute('href')
		if(!this.isLocalUrl(href, -99)){
			return
		}
		//prevent default if we do not handle
		//cancel their thing
		e.preventDefault()
		e.stopPropagation()

		await this.goto(href)
		return
	},

	async scrollToLocationHashElement(loc){
		if(loc.hash){
			let e = document.getElementById(decodeURIComponent(loc.hash.slice(1)))
			if(e){
				await this.waitForImages()
				e.scrollIntoView()
				return true
			}
		}
		return false
	},

	async goto(href, opts = {}){
		if(await this.stopGoto(href)){ return -1 }

		opts = {reload: false, ...opts}
		let loc = window.location
		href = new URL(href, loc)

		//start getting the new info
		let prom = this.sendsXHR({
			url: href,
			method: "GET",
			responseType: "text",											//<- dont try to json parse results
			xhrChangeF: (xhr) => {xhr.setRequestHeader('Otty-Nav', 'true'); return xhr} 	//<- header so server knows regular GET vs other otty requests
		})

		//get and replace page
		prom = await prom
		let page = prom.response, xhr = prom.xhr

		//in case of redirect...
		if(xhr.responseURL){
			let nhref = new URL(xhr.responseURL)
			nhref.hash = href.hash
			href = nhref
		}

		//replace page , starting at the top of the page. Update page state for where we were before the switch.
		//Note it is important to store the replacement html after removal to allow for things such as onRemoved
		// to run before we store.
		await this.pageReplace(page, 0, href, (BefBodyClone, befY, replaceSelector) => {
			this.replacePageState(loc, BefBodyClone, replaceSelector, befY)
			if(!(opts.reload)){
				//store the new page information.
				this.pushPageState(href, undefined, replaceSelector)
			}
		})

		return href
	},
	createStorageDoc(orienter, head){
		orienter = orienter.cloneNode(true)
		let storeDoc = (new DOMParser()).parseFromString('<!DOCTYPE HTML> <html></html>', 'text/html')
		if(orienter.nodeName == 'BODY'){
			storeDoc.body = orienter
		} else {
			storeDoc.body.appendChild(orienter)
		}
		morphdom(storeDoc.head, head)
		return storeDoc
	},
	navigationHeadMorph(tempdocHead){
		morphdom(document.head, tempdocHead)
	},
	async pageReplace(tempdoc, scroll, url, beforeReplace){
		let befY = window.scrollY	
		//standardize tempdoc (accept strings)
		if(typeof tempdoc == "string") {
			tempdoc = (new DOMParser()).parseFromString(tempdoc,  "text/html")
		}

		//switch the document's this.navigationReplace's css selector elements. if either not found,
		//default to switching bodies entirely
		let tmpOrienter, orienter,  replaceSelector
		for(replaceSelector of this.navigationReplaces){
			// console.log(tempdoc, replaceSelector)
			tmpOrienter = tempdoc.querySelector(replaceSelector)	
			orienter = document.querySelector(replaceSelector)
			if(tmpOrienter && orienter) {
				break
			}
		}

		//been having issues with the removed thing triggering.
		//this will do it manually, and then remove the el._unit so
		//it wont trigger again
		for(let unitEl of this.qsInclusive(orienter, '[data-unit]')){
			unitEl._unit?.unitRemoved()
		}
	
		//set stored information for recreating current page
		let storeDoc =  this.createStorageDoc(orienter, document.head)

		//placement of this is important since we need to change the url and state after killing all the previous units
		//but before creating all the new units and event handles. For instance, this breaks _parse->dive[{"behavior": "repeat"}] since
		//the thing quick cancels since it thinks it left the page lol.
		if(beforeReplace){beforeReplace(storeDoc, befY, replaceSelector)}

		// orienter.replaceChildren(...tmpOrienter.children)
		orienter.replaceWith(tmpOrienter)

		//morph the head to the new head. Throw into a different function for
		//any strangeness that one may encounter and 
		this.navigationHeadMorph(tempdoc.querySelector('head'))

		let shouldScrollToEl = (url && (!scroll))
		
		//handle scrolling
		let scrolled = false
		if(shouldScrollToEl){
			scrolled = await this.scrollToLocationHashElement(url)
		}
		if(!scrolled){
			if(scroll != 0){await this.waitForImages()}
			window.scroll(0, scroll)
		}
	},
	async waitForImages(){
		let arr = Array.from(document.body.querySelectorAll('img')).map((im)=>{
			new Promise((resolve) => {
				im.addEventListener('load', resolve)
				if(im.complete){resolve()}
			})
		})
		for(let a of arr){await a}
		return true
	},
	_pageState(scroll, doc, url, replaceSelector, match){
		this.historyReferences[this.historyReferenceLocation] = {
			replaceSelector: replaceSelector,
			doc:  doc,
			scroll: scroll,
			url: url,
			match: match
		}
	},
	replacePageState(url,  doc, replaceSelector, scroll){
		let matcher = Math.random()
		window.history.replaceState({
			historyReferenceLocation: this.historyReferenceLocation,
			match: matcher
		}, "", url);
		this._pageState(scroll, doc, url, replaceSelector, matcher)
	},
	pushPageState(url, doc, replaceSelector){
		let matcher = Math.random()
		this.historyReferenceLocation += 1
		this.historyReferences = this.historyReferences.slice(0, this.historyReferenceLocation + 1)
		window.history.pushState({
			historyReferenceLocation: this.historyReferenceLocation,
			match: matcher
		}, "", url)
		this._pageState(0, doc, url, replaceSelector, matcher)
	},
	qsInclusive(n, pat){
		let units = Array.from(n.querySelectorAll(pat))
		if(n.matches(pat)){units.push(n)}
		return units
	},
	handleNavigation(opts = {}){
		opts = {navigationReplaces: ['body'], ...opts}
		this.navigationReplaces = opts.navigationReplaces
		this.historyReferenceLocation = 0
		this.historyReferences = []
		history.scrollRestoration = 'manual'
		document.addEventListener('click', this.linkClickedF.bind(this))

		window.addEventListener('popstate', (async function (e){
			if(e.state && ( e.state.historyReferenceLocation != undefined)){
				let lastInf = this.historyReferences[this.historyReferenceLocation]
				this.historyReferenceLocation =  e.state.historyReferenceLocation
				let hr = this.historyReferences[this.historyReferenceLocation]
				if(hr && hr.match == e.state.match){
					await this.pageReplace(hr.doc, hr.scroll, hr.url, (befBodyClone, befY, replaceSelector) => {
						lastInf.scroll = befY
						lastInf.doc = befBodyClone
						lastInf.replaceSelector = replaceSelector
					})
				} else {
					//if they refresh and hit the back button or something it can make things difficult
					//especially since we still get the state information (thats where the e.state.match comes forward.)
					this.historyReferenceLocation = 0
					this.historyReferences = []
					this.goto(window.location, {reload: true})
				}
			}
		}).bind(this))
		//do not rely on eachother
		// this.updatePageState(window.location, {push: false})
		this.scrollToLocationHashElement(window.location)
	},
	previousDives: [],
	poll(dat){
		if(this.ActivePollId != dat.id) { return }

		let maybeResub = ((x)=>{
			if(x == 'should_resub') {
				this.subscribeToPoll(dat.queues, dat.pollInfo, dat.waitTime, dat.pollPath, dat.subPath)
			} else if(x != "no_updates") {
				dat.store = x
			}
		}).bind(this)

		let continuePolling = (()=>{
			let poll = (()=>{ this.poll(dat) }).bind(this)
			setTimeout(poll, dat.waitTime)
		}).bind(this)

		let fi = {}
		if(dat.store){fi = {'otty-store': dat.store}}

		this.dive({
			url: dat.pollPath,
			formInfo: fi
		}).then(maybeResub).finally(continuePolling)
	},
	subscribeToPoll(queues, pollInfo, waitTime, pollPath, subPath){
		this.pollPath = pollPath
		let id = Math.random()
		this.ActivePollId = id
		let dat = { queues, pollInfo, waitTime, id, pollPath, subPath }
		let poll = ((out) => {
			if(out == 'no_queues') {
				if(this.isDev){console.log('no_queues', out)}
			} else {
				dat.store = out
				this.poll(dat)
			}
		}).bind(this)

		let err_log = ((x)=>{
			if(this.isDev){console.error('sub fail', x)}
		}).bind(this)

		this.dive({
				url: subPath,
				formInfo: {
					queues: dat.queues,
					...dat.pollInfo
				}
			}).then(poll, err_log)
	}
}
