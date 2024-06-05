import { Generic } from './generic.js'
export default {
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