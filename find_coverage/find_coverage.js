function boundByAbsoluteValue(x, bound){
	if(bound < 0){
		bound = -bound
	}
	return Math.max(Math.min(x, bound), -bound)
}

function getTileFromCoordinates(coordinates, zoomLevel = 17){
	if(Math.abs(coordinates.latitude) > 90){
		throw new Error("Invalid latitude")
	}
	if(Math.abs(coordinates.longitude) > 180){
		throw new Error("Invalid longitude")
	}
	let latRadian = coordinates.latitude * Math.PI / 180
	let latSin = Math.sin(latRadian)
	if(Math.abs(latSin) > .9999){
		throw new Error("Can't use coordinates near the poles")
	}
	let latTransformed = Math.log((1 + latSin) / (1 - latSin))
	let x = .5 + coordinates.longitude / 360
	let y = .5 - latTransformed / (4 * Math.PI)
	let scale = 2 ** zoomLevel
	return {"x": Math.floor(x * scale), "y": Math.floor(y * scale)}
}

function xToLongitude(x, scale){
	return boundByAbsoluteValue((x / scale - .5) * 360, 180)
}

function yToLatitude(y, scale){
	let yTransformed = y / scale
	let latTransformed = (.5 - yTransformed) * 4 * Math.PI
	let latSin = (Math.exp(latTransformed) - 1) / (Math.exp(latTransformed) + 1)
	let latRadian = Math.asin(latSin)
	return boundByAbsoluteValue(latRadian * 180 / Math.PI, 90)
}

function getEdgesFromTile(tile, zoomLevel = 17){
	let scale = 2 ** zoomLevel
	if(tile.x > scale || tile.y > scale){
		throw new Error("Invalid tile number")
	}
	let lng1 = xToLongitude(tile.x, scale)
	let lng2 = xToLongitude(tile.x + 1, scale)
	let lat1 = yToLatitude(tile.y, scale)
	let lat2 = yToLatitude(tile.y + 1, scale)
	let lngMin = Math.min(lng1, lng2)
	let lngMax = Math.max(lng1, lng2)
	let latMin = Math.min(lat1, lat2)
	let latMax = Math.max(lat1, lat2)
	return [{"latitude": latMin, "longitude": lngMin}, {"latitude": latMax, "longitude": lngMax}]
}

function getPanoIDsFromTile(x, y){
	let url = `https://www.google.com/maps/photometa/ac/v1?pb=!1m1!1smaps_sv.tactile!6m3!1i${x}!2i${y}!3i17!8b1`
	return fetch(url).then(
		response => {
			return response.text()
		}
	).then(
		response => {
			response = response.split(/\r?\n/)[1]
			response = JSON.parse(response)
			response = response[1][1]
			let panoIDs = []
			for(let i = 0; i < response.length; i++){
				panoIDs.push({"id": response[0][0][0][1], "lat": response[0][0][2][0][2], "longitude": response[0][0][2][0][3]})
			}
			console.log(panoIDs)
		}
	)
}