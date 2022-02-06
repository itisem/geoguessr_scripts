function displayError(link, message){
	document.getElementById("error_output").innerHTML += `<p>Failed to convert <b>${link}</b> -- ${message}</p>`
}


function fixAri(){
	document.getElementById("error_output").innerText = ""
	document.getElementById("results_output").innerText = ""
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
	let promises = []
	let segment_size = 1000
	let segments = Math.ceil(coordinates.length / segment_size)
	for(let i = 0; i < segments; i++){
		for(let j = 0; j < Math.min(segment_size, coordinates.length - i * segment_size); j++){
			promises.push(l.addFixedCoordinates(coordinates[i * segment_size + j]))
		}
		Promise.allSettled(promises).then(
			results =>
				{
					if(i == segments - 1){
						let error_coordinates = []
						document.getElementById("results_output").innerText = l.export()
						for(let j = 0; j < results.length; j++){
							if(results[j].status == "rejected"){
								displayError(coordinates[j].lat + "," + coordinates[j].lng, results[j].reason.message)
								error_coordinates.push(coordinates[j])
							}
						}
						document.getElementById("error_output_json").innerText = JSON.stringify({"customCoordinates": error_coordinates})
					}
				}
		)
	}
