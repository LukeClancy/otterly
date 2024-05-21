let NavigationHandler = {
	unitName: "NavigationHandler",
	locations: {},
	unitConnected(){
		if(!document.querySelector('#bodyNavigationHandlerTop')){
			document.insertAdjacentHTML('afterbegin')
		}
		document.body.insertAdjacentElement('beforeend', this.el)
		this.el.dataset.replaceElement
	}
}

export default NavigationHandler