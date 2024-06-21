import morphdom from 'morphdom'

export default class Otty {
	constructor(isDev, afterDive, csrfSelector, csrfHeader) {
		this.isDev = isDev
		this.previousDives = []
		this.ActivePollId = null
		this.afterDive = afterDive
		this.poll_path = '/api/poll'
		this.csrfSelector = csrfSelector
		this.csrfHeader = csrfHeader
	}
	obj_to_fd = function(formInfo, formData) {
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
	}
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
	}
	_sendsXHROnError(resolve, reject, xhr){
		reject({
			status: xhr.status,
			statusText: xhr.statusText
		});		
	}
	sendsXHR({url, formInfo, method = "POST", xhrChangeF,
		csrfContent, csrfHeader = this.csrfHeader,
		csrfSelector = this.csrfSelector,
		confirm, withCredentials = true, responseType="json",
		onload = this._sendsXHROnLoad, onerror = this._sendsXHROnError}){

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

			//csrf
			if(!csrfContent){
				csrfContent = document.querySelector(csrfSelector).content
			}
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
	}
	isLocalUrl(url, subdomainAccuracy = -2) {
		//local includes subdomains. So if we are on x.com, x.com will work and y.x.com will work, but y.com wont.
		//change the -2 to -3, -4 etc to modify. Times where this may be an issue:
		//	- if you share domains with untrusted partys.

		let d = window.location.hostname
		let urld = (new URL(url, window.location)).hostname //url_with_default_host

		if( d.split('.').slice(subdomainAccuracy).join('.') == urld.split('.').slice(subdomainAccuracy).join('.')) {
			return true
		}

		return false
	}
	xss_pass(url){
		return this.isLocalUrl(url, -2)
	}
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

			returning = action

			if(!Array.isArray(actions)) {
				actions = [actions]
			}

			y = 0
			ottys_capabilities = new this.afterDive(baseElement, submitter, resolve, reject, isDev)

			for(action of actions) {
				//make sure we have not already processed this dive (matters with polling)
				dive_id = action.dive_id
				if(dive_id != null) {
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
				if(task == 'returning') {
					returning = data
				} else {
					try {
						out = ottys_capabilities[task](data)
						if(this.isDev){
							console.log(task, data)
						}
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
	}
	//this will default to replacing body if this css selector naught found.
	navigationReplaces = undefined

	navigationHeadMorph(tempdocHead){
		morphdom(document.head, tempdocHead)
	}

	async pageReplace(tempdoc, scroll, url){
		//standardize tempdoc (accept strings)
		if(typeof tempdoc == "string") {
			tempdoc = (new DOMParser()).parseFromString(tempdoc,  "text/html")
		}

		//switch the document's this.navigationReplace's css selector elements. if either not found,
		//default to switching bodies entirely
		let tmpOrienter, orienter
		if(this.navigationReplaces){
			tmpOrienter = tempdoc.querySelector(this.navigationReplaces)
			orienter = document.querySelector(this.navigationReplaces)
		}
		if((!orienter) || (!tmpOrienter)){
			tmpOrienter = tempdoc.querySelector('body') //.body does not work here
			orienter = document.body
			// document.body.bod.children = tempdoc.querySelector('body').children
			orienter.replaceChildren(...tmpOrienter.children)
		} else {
			orienter.replaceWith(tmpOrienter)
		}
		//morph the head to the new head. Throw into a different function for
		//any strangeness that one may encounter and 
		this.navigationHeadMorph(tempdoc.querySelector('head'))

		let shouldScrollToEl = (url && (!scroll))
		if(shouldScrollToEl && (await this.scrollToLocationHashElement(url))){
			return
		}

		window.scroll(0, scroll)
	}

	//update page state pushes current page html and url onto historyReferences,
	//	and then pushes a new state onto the browser window.
	updatePageState(url, opts = {push: false}){
		//need to create a new history state if pushing or replace if not. Promisify since
		//before following link we have to wait for the clone, but on a regular load we dont.
		let push = opts.push
		new Promise((resolve, reject) => {
			if(push){ this.historyReferenceLocation += 1 }
			this.historyReferences[this.historyReferenceLocation] = {
				page: document.documentElement.cloneNode(true),
				url: url
			}
			if(push){
				//remove futures since we just started new branch
				this.historyReferences = this.historyReferences.slice(0, this.historyReferenceLocation + 1)
				window.history.pushState({
					scroll: 0, //<- page was just loaded so
					historyReferenceLocation: this.historyReferenceLocation
				}, "", url);
			} else {
				window.history.replaceState({
					scroll: window.scrollY,
					historyReferenceLocation: this.historyReferenceLocation
				}, '', url)
			}
			resolve(true)
		})
	}

	async goto(href, opts = {}){

		if(await this.stopGoto(href)){ return }

		opts = {reload: false, ...opts}
		let f = async function(resolve, reject){
			let loc = window.location
			href = new URL(href, loc)

			//start getting the new info
			let prom = this.sendsXHR({
				url: href,
				method: "GET",
				responseType: "text",											//<- dont try to json parse results
				xhrChangeF: (xhr) => {xhr.setRequestHeader('Ottynav', 'true'); return xhr} 	//<- header so server knows regular GET vs other otty requests
			})

			//update current page state while we wait. This will take into account our ajax changes & such
			if(!(opts.reload)){
				await this.updatePageState(loc)
			}

			//get and replace page
			prom = await prom
			let page = prom.response, xhr = prom.xhr

			//in case of redirect...
			if(xhr.responseURL){
				let nhref = new URL(xhr.responseURL)
				nhref.hash = href.hash
				href = nhref
			}

			//wait for scroll to finish before updating state...
			await this.pageReplace(page, 0, href)

			//push the new page state. 
			if(!(opts.reload)){
				this.updatePageState(href, {push: true})
			} else {
				this.updatePageState(loc)
			}

			resolve(href)
		}
		return new Promise(f.bind(this))
	}

	historyReferenceLocation = 0
	historyReferences = []
	compareHistoryReference(url, ref){
		let same_loc = ( url.origin == ref.origin && url.pathname == ref.pathname)
		if(!same_loc){return false}
		let l = window.location
		let win_loc = (url.origin = l.origin && url.pathname == l.pathname)
		// so for example /posts?type=content matches /posts unless we are currently on /posts
		if((!win_loc) || url.search == ref.search){return true}
		return false
	}

	async stopGoto(href){
		//Check scroll to hash on same page
		let loc = window.location
		href = new URL(href, loc)

		//hashes
		if(loc.origin == href.origin && href.pathname == loc.pathname){
			return (await this.scrollToLocationHashElement(href))
		}

		//I wanted my subdomains to be counted too... apparently not possible...
		if(loc.origin != href.origin){
			window.location.href = href.origin
			return true
		}

		return false
	}

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
	}

	async scrollToLocationHashElement(loc){
		if(loc.hash){
			let e = document.getElementById(decodeURIComponent(loc.hash.slice(1)))
			if(e){
				e.scrollIntoView()
				return true
			}
		}
		return false
	}
	handleNavigation(){
		window.history.scrollRestoration = 'manual'
		document.addEventListener('click', this.linkClickedF.bind(this))
		window.addEventListener('popstate', ((e) => {
			console.log("popstate hit", e, e.state, "ref: ", this.historyReferenceLocation, this.historyReferences )
			//make sure everything is there and it is something we wanna handle
			if(e.state && (e.state.scroll != undefined) && (e.state.historyReferenceLocation != undefined)){
				let hr = this.historyReferences[e.state.historyReferenceLocation]
				if(hr){
					let page = hr.page
					let url = hr.url
					if(page){
						//replace page and set the location.
						this.historyReferenceLocation = e.state.historyReferenceLocation
						this.pageReplace(page.cloneNode(true), e.state.scroll, url)
						return
					}
				}
			}
			// was going to failover to page reload, but apparently safari throws popstates on page load? Weirdos.
			// Safaris such a pain. Apple. Ugh. The only people design on apple is because it fails there first.
			//
			// this.goto(window.location.href, {reload: true})
		}).bind(this))

		this.updatePageState(window.location, {push: false})

		this.scrollToLocationHashElement(window.location)
	}
	//polling is untested
	poll = (dat) => {
		if(this.ActivePollId != dat.id) { return } //check if we should stop

		let maybe_resub = ((x)=>{
			if(x == 'should_resub') {
				this.subscribeToPoll(dat.queues, dat.poll_info, dat.wait_time)
			} else if(!(x == "no_updates")) {
				dat.store = x
			}
		}).bind(this)

		let continue_polling = (()=>{
			let poll = (()=>{ this.poll(dat) }).bind(this)
			setTimeout(poll, dat.wait_time)
		}).bind(this)

		this.dives(this.poll_path, {
			formInfo: {
				'otty-store': dat.store
				//add the encrypted data we need with the queue strings
			}
		}).then(maybe_resub).finally(continue_polling)
	}
	subscribeToPoll = (queues, poll_info, wait_time) => {
		let id = Math.random()
		this.ActivePollId = id
		let dat = {
			queues: queues,
			poll_info: poll_info,
			wait_time: wait_time,
			id: id
		}
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

		this.dives('/api/pollsub', {
				formInfo: {
					queues: dat.queues,
					...dat.poll_info
				}
			}).then(poll, err_log)
	}
}
