function displayError(link, message){
	document.getElementById("error_output").innerHTML += `<p>Failed to convert <b>${link}</b> -- ${message}</p>`
}

async function addCoordinateChunk(chunk, l, errorCoordinates){
	let promises = []
	for(let i =0; i < chunk.length; i++){
		promises.push(l.addFixedCoordinates(chunk[i]))
	}
	await Promise.allSettled(promises).then(
		results => {
				for(let j = 0; j < results.length; j++){
					if(results[j].status == "rejected"){
						displayError(chunk[j].lat + "," + chunk[j].lng, results[j].reason.message)
						errorCoordinates.push(chunk[j])
					}
			}
		}
	)
}

async function fixAri(){
	document.getElementById("error_output").innerText = ""
	document.getElementById("results_output").innerText = ""
	document.getElementById("log").innerText = ""
	let l = new LocationFixer("AIzaSyAJIVVaniaWBtvDHyzsIhlVNXGSn2pwYb4")
	let rawInput = document.getElementById("links").value
	let coordinates = []
	let currentCoordinate = ""
	let parseComplete = false
	try{
		let parsedJSON = JSON.parse(rawInput)
		coordinates = parsedJSON.customCoordinates
		parseComplete = true
	}
	catch{
		parseComplete = false
	}
	if(!parseComplete){
		let linesSplit = rawInput.split(/\r?\n/)
		for(let i = 0; i < linesSplit.length; i++){
			currentCoordinate = linesSplit[i]
			try{
				currentCoordinate = l.getCoordinatesFromURL(currentCoordinate)
				coordinates.push(currentCoordinate)
			}
			catch(e){
				displayError(currentCoordinate, e.message)
			}
		}
	}
	let segmentSize = 500
	let segments = Math.ceil(coordinates.length / segmentSize)
	let errorCoordinates = []
	for(let i = 0; i < segments; i++){
		await addCoordinateChunk(coordinates.slice(i * segmentSize, (i + 1) * segmentSize), l, errorCoordinates)
		console.log(`${i} / ${segments}: ${l.newLocations.length}`)
		document.getElementById("log").innerText = `processed ${(i+1) * segmentSize} / ${coordinates.length} locations`
	}
	document.getElementById("error_output_json").innerText = JSON.stringify({"customCoordinates": errorCoordinates})
	document.getElementById("results_output").innerText = l.export()
}