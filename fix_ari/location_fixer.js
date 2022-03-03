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
			let coordinatesSplit = coordinates.split(",")
			if(match){
				return {"lat": coordinatesSplit[0], "lng": coordinatesSplit[1]}
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
			let coordinatesSplit = coordinates.split(",")
			return {"lat": coordinatesSplit[0], "lng": coordinatesSplit[1]}
		}
	}

	#getTileFromCoordinates(coordinates, zoomLevel = 17){
		if(Math.abs(coordinates.lat) > 90){
			throw new Error("Invalid latitude")
		}
		if(Math.abs(coordinates.lng) > 180){
			throw new Error("Invalid longitude")
		}
		let latRadian = coordinates.lat * Math.PI / 180
		let latSin = Math.sin(latRadian)
		if(Math.abs(latSin) > .9999){
			throw new Error("Can't use coordinates near the poles")
		}
		let latTransformed = Math.log((1 + latSin) / (1 - latSin))
		let x = .5 + coordinates.lng / 360
		let y = .5 - latTransformed / (4 * Math.PI)
		let scale = 2 ** zoomLevel
		return {"x": Math.floor(x * scale), "y": Math.floor(y * scale)}
	}

	#getDistanceBetweenCoordinates(coordinate1, coordinate2){ // haversine formula stuff
		const earthRadius = 6378137
		const radianMultiplier = Math.PI / 180
		const radian1 = {"lat": coordinate1.lat * radianMultiplier, "lng": coordinate1.lng*radianMultiplier}
		const radian2 = {"lat": coordinate2.lat * radianMultiplier, "lng": coordinate2.lng*radianMultiplier}
		let tempCalc = 0.5 - Math.cos(radian2.lat - radian1.lat)/2 +  Math.cos(radian1.lat) * Math.cos(radian2.lat) * (1 - Math.cos(radian2.lng - radian1.lng))/2
		return 2 * earthRadius * Math.asin(Math.sqrt(tempCalc))
	}

	#getPanosFromTile(tile){
		let url = `https://www.google.com/maps/photometa/ac/v1?pb=!1m1!1smaps_sv.tactile!6m3!1i${tile.x}!2i${tile.y}!3i17!8b1`
		return fetch(url).then(
			response => {
				return response.text()
			}
		).then(
			response => {
				response = response.split(/\r?\n/)[1]
				response = JSON.parse(response)
				if(!response[1]){
					return []
				}
				if(!response[1][1]){
					return []
				}
				response = response[1][1]
				let panoIDs = []
				for(let i = 0; i < response.length; i++){
					panoIDs.push({"id": response[i][0][0][1], "lat": response[i][0][2][0][2], "lng": response[i][0][2][0][3]})
				}
				return panoIDs
			}
		)
	}

	async addFixedCoordinates(location){
		if(location.panoId){
			this.newLocations.push(location)
			return
		}
		if(location.heading === undefined){
			location.heading = 0
		}
		if(location.pitch === undefined){
			location.pitch = 0
		}
		const url = this.baseUrl + "&location=" + location.lat + "," + location.lng
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
				let isError = false
				if(response.status !== "OK"){
					isError = true
				}
				else{
					if(response.copyright.substring(1) !== " Google"){
						isError = true
					}
				}
				if(!isError){
					const newLocation = {"heading": location.heading, "pitch": location.pitch, "zoom": 0, "panoId": response.pano_id, "lat": response.location.lat, "lng": response.location.lng, "extra": location.extra}
					this.newLocations.push(newLocation)
					return this.export(newLocation)
				}
				else{
					let tile = this.#getTileFromCoordinates(location)
					return this.#getPanosFromTile(tile).then(
						response => {
							if(response.length > 0){
								let newLocation, distance
								let minDistance = Math.min()
								for(let i = 0; i < response.length; i++){
									distance = this.#getDistanceBetweenCoordinates(location, response[i])
									if(distance < minDistance){
										newLocation = response[i]
										minDistance = distance
									}
								}
								location.panoId = newLocation.id
								location.lat = newLocation.lat
								location.lng = newLocation.lng
								this.newLocations.push(location)
								return this.export(location)
							}
							else{
								throw new Error("No replacement found")
							}
						}
					)
				}
			}
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