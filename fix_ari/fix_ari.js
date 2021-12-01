function displayError(link, message){
	document.getElementById("error_output").innerHTML += `<p>Failed to convert <b>${link}</b> -- ${message}</p>`
}


function fixAri(){
	document.getElementById("error_output").innerHTML = ""
	document.getElementById("results_output").innerHTML = ""
	let l = new LocationFixer("AIzaSyAJIVVaniaWBtvDHyzsIhlVNXGSn2pwYb4")
	let rawInput = document.getElementById("links").value
	let coordinates = []
	let currentCoordinate = ""
	let parseComplete = false
	try{
		let parsedJSON = JSON.parse(rawInput)
		let coordinatesTemp = parsedJSON.customCoordinates
		parseComplete = true
		for(let i = 0; i < coordinatesTemp.length; i++){
			coordinates.push({"heading": coordinatesTemp[i].heading, "pitch": coordinatesTemp[i].pitch, "coordinate": coordinatesTemp[i]["lat"] + "," + coordinatesTemp[i]["lng"]})
		}
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
	let promises = []
	for(let i = 0; i < coordinates.length; i++){
		promises.push(l.addFixedCoordinates(coordinates[i].coordinate, coordinates[i].heading, coordinates[i].pitch))
	}
	Promise.allSettled(promises).then(
		results =>
			{
				document.getElementById("results_output").innerHTML = l.export()
				for(let j = 0; j < results.length; j++){
					if(results[j].status == "rejected")
						displayError(coordinates[j].coordinate, results[j].reason.message)
				}
			}
	)
}