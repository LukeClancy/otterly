import Generic from './generic.js'
let Debug = {
	unitName: "Debug",
	unitRemoved(){
		console.log('unitRemoved')
	},
	unitConnected(){
		console.log('unitConnected')
	},
	addUnitEvent(...args){
		Generic.addUnitEvent(...args)
		console.log('ran addUnitEvent. unitEvents:', this.unitEvents, 'args:', ...args)
	},
	removeUnitEvent(...args){
		Generic.removeUnitEvent(...args)
		console.log('ran removeUnitEvent. unitEvents:', this.unitEvents, 'args:', ...args)
	},
	log(...args){
		console.log(this, ...args)
	}
}
export {Debug}