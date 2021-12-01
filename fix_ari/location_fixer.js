class LocationFixer{
	constructor(apiKey = ""){
		if(!apiKey){
			apiKey = "AIzaSyDqRTXlnHXELLKn7645Q1L_5oc4CswKZK4" // defaulting to geoguessr's own api key (only works from geoguessr.com ofc)
		}
		this.apiKey = apiKey
		this.baseUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?key=${this.apiKey}&source=outdoor`
		this.newLocations = []
	}

	getCoordinatesFromURL(_url){
		const url = new URL(_url)
		const path = url.pathname
		let coordinates = ""
		const baseRegex = "(-?[0-9]{1,2}.[0-9]+,-?[0-9]{1,3}.[0-9]+)"
		if(path === "/maps"){
		// the "https://www.google.com/maps?q&layer=c&cbll=32.38139602797509,-64.67713930153232" kind of url that geo gives
			const params = new URLSearchParams(url.search)
			coordinates = params.get("cbll")
			const regex = new RegExp("^" + baseRegex + "$")
			const match = coordinates.match(regex)
			if(match){
				return {"coordinate": coordinates, "heading": undefined, "pitch": undefined}
			}
			else{
				throw new Error("Invalid coordinates in the URL")
			}
		}
		else{
		// the final https://www.google.com/maps/@32.381396,-64.6771393,3a,75y,90t/data=!3m6!1e1!3m4!1sAF1QipPy_PNmUXIQqwy1qBy-sMGylePMnXgnezahiwcB!2e10!7i7680!8i3840 url that we are redirected to
			const regex = new RegExp("@" + baseRegex + ",")
			try{
				coordinates = url.href.match(regex)[1]
			}
			catch{
				throw new Error("Invalid URL: this link might not be an unshortened Google Maps URL")
			}
			return {"coordinate": coordinates, "heading": undefined, "pitch": undefined}
		}
	}

	async addFixedCoordinates(coordinates, heading = undefined, pitch = undefined){
		if(heading === undefined){
			heading = 0
		}
		if(pitch === undefined){
			pitch = 0
		}
		const url = this.baseUrl + "&location=" + coordinates
		return fetch(url).then(
			response => {
				if(!response.ok){
					throw new Error("The Google Maps API returned an error")
				}
				else{
					return response.json()
				}
			},
		).then(
			response => {
				if(response.status !== "OK"){
					throw new Error("No replacement image available, error code " + response.status)
				}
				console.log(response.copyright.substring(1))
				if(response.copyright.substring(1) !== " Google"){
					throw new Error("Only found unofficial coverage")
				}
				const newLocation = {"heading": heading, "pitch": pitch, "zoom": 0, "panoId": response.pano_id, "lat": response.location.lat, "lng": response.location.lng}
				this.newLocations.push(newLocation)
				return this.export(newLocation)
			},
		)
	}

	export(exported = undefined){
		let output = ""
		if(exported === undefined){
			output = {"customCoordinates": this.newLocations}
		}
		else{
			output = {"customCoordinates": [exported]}
		}
		return(JSON.stringify(output))
	}
}