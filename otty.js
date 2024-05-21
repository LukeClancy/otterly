import morphdom from 'morphdom'
class Otty {
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
	sendsXHR({url, formInfo, method = "POST", xhrChangeF,
		csrfContent, csrfHeader = this.csrfHeader,
		csrfSelector = this.csrfSelector,
		confirm, withCredentials = false}){

		return new Promise(function(resolve, reject) {
			var xhr, form_data;

			xhr = new XMLHttpRequest();
			xhr.withCredentials = withCredentials
			xhr.open(method, url)
			xhr.onload = function(){
				if(xhr.status >= 200 && xhr.status <= 302 && xhr.status != 300) {
					if(xhr.responseText) {
						let i = JSON.parse(xhr.responseText)
						i['status'] == xhr.status
						resolve(i)
					} else {
						resolve()
					}
				} else {
					reject({status: xhr.status, statusText: xhr.statusText});
				}
			}
			xhr.onerror = function() {////
				reject({
					status: xhr.status,
					statusText: xhr.statusText
				});
			}

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
			form_data.append('otty', 'true')

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
	isLocalUrl(url, subdomain_accuracy = -2) {
		//local includes subdomains. So if we are on x.com, x.com will work and y.x.com will work, but y.com wont.
		//change the -2 to -3, -4 etc to modify. Times where this may be an issue:
		//	- if you share domains with untrusted partys.

		let d = window.location.hostname
		let urld = (new URL(url, 'https://' + d)).host //url_with_default_host
		
		if( d.split('.').slice(subdomain_accuracy).join('.') == urld.split('.').slice(subdomain_accuracy).join('.')) {
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
				handle_response(obj, resolve, reject)
			}).catch((e) => {
				reject(e)
			})
		}.bind(this))
	}

// 	let context = this
// 	this.before_visit_method = (e) => {
// 		e.preventDefault()
// 		let url = new URL(e.currentTarget.getAttribute('href'),(new URL(window.location.href)).origin)
// 		context.richard_sherman(url.toString())
// 	}

// 	let arr = Array.from(this.element.querySelector('#intercept_at').querySelectorAll('a[href]'))
// 	let this_url = new URL(window.location.href)
// 	let next_url
// 	for(let linky of arr){
// 		//check to make sure the path of that link is the same as the path of this link besides
// 		//the ? values and then add the event listener
// 			//TODO
// 		next_url = new URL(linky.getAttribute('href'), this_url.origin)
// 		if(this_url.pathname == next_url.pathname && this_url.origin == next_url.origin) {
// 			linky.addEventListener('click', this.before_visit_method)
// 		}
// 	}
// }

	
	//this will default to replacing body if this css selector naught found.
	navigationReplaces = undefined

	navigationHeadMorph(tempdocHead){
		morphdom(document.head, tempdocHead)
	}

	async navigationF(e) {
		//prevent default if we do not handle
		let href = e.ct.getAttribute('href')
		if(!href){ return }
		if(!this.isLocalUrl(href)){ return }

		//cancel their thing
		e.preventDefault()
		e.stopPropagation()

		//hit our endpoint
		let d = window.location.hostname
		let url = (new URL(href, 'https://' + d)).toString()
		let out1 = this.sendsXHR({url: url, method: "GET"})

		out1 = await out1

		//switch the document's this.navigationReplace's css selector elements. if either not found,
		//default to switching bodies entirely
		let parser = new DOMParser();
		let tempdoc = parser.parseFromString(out1.body,  "text/html")
		let tmpOrienter, orienter
		if(this.navigationReplaces){
			tmpOrienter = tempdoc.querySelector(this.navigationReplaces)
			orienter = document.querySelector(this.navigationReplaces)
		}
		if((!orienter) || (!tmpOrienter)){
			tmpOrienter = tempdoc.body
			orienter = document.body
		}
		orienter.replaceWith(tmpOrienter)

		//morph the head to the new head. Throw into a different function for
		//any strangeness that one may encounter and 
		this.navigationHeadMorph(tempdoc.head)

		//push the current page on
		history.pushState({}, "", url);
	}
	addNavigationListener(){
		window.history.scrollRestoration = 'auto'
		document.addEventListener('click', this.saveStateListener)
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

export default Otty